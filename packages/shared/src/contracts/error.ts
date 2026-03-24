import { Data, Effect, Option, Schema } from "effect";
import type { ORPCError } from "@orpc/contract";

// =============================================================================
// RPC Error Model - Universal error representation for serialization
// =============================================================================

/**
 * Standard RPC error response structure.
 * This is what gets serialized over the wire.
 */
export const RpcErrorResponse = Schema.Struct({
  success: Schema.Literal(false),
  error: Schema.Struct({
    code: Schema.String,
    message: Schema.String,
    feature: Schema.String,
    details: Schema.optionalKey(Schema.Unknown),
  }),
});
export type RpcErrorResponse = typeof RpcErrorResponse.Type;

/**
 * Create an RPC error response.
 */
export const makeRpcErrorResponse = (
  code: string,
  message: string,
  feature: string,
  details?: unknown,
): RpcErrorResponse => ({
  success: false,
  error: {
    code,
    message,
    feature,
    ...(details !== undefined ? { details } : {}),
  },
});

// =============================================================================
// Error Normalization - Convert ANY error to RpcError
// =============================================================================

/**
 * Extract error code from any error type.
 */
const extractErrorCode = (error: unknown): string => {
  // Schema/Data tagged errors
  if (
    typeof error === "object" &&
    error !== null &&
    "_tag" in error &&
    typeof error._tag === "string"
  ) {
    return error._tag;
  }

  // Standard Error constructor name
  if (error instanceof Error) {
    return error.constructor.name;
  }

  // Primitive types
  if (typeof error === "string") return "StringError";
  if (typeof error === "number") return "NumberError";
  if (typeof error === "boolean") return "BooleanError";

  return "UnknownError";
};

/**
 * Extract message from any error type.
 */
const extractErrorMessage = (error: unknown): string => {
  if (typeof error === "string") return error;
  if (typeof error === "number") return String(error);
  if (typeof error === "boolean") return String(error);

  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};

/**
 * Extract cause/details from any error type.
 */
const extractErrorDetails = (error: unknown): Option.Option<unknown> => {
  // Has explicit cause
  if (
    typeof error === "object" &&
    error !== null &&
    "cause" in error &&
    error.cause !== undefined
  ) {
    return Option.some(error.cause);
  }

  // Standard Error - use stack as details for debugging
  if (error instanceof Error && error.stack) {
    return Option.some({ stack: error.stack });
  }

  // Plain objects - include them as details
  if (typeof error === "object" && error !== null && !(error instanceof Error)) {
    const { _tag, message, ...rest } = error as Record<string, unknown>;
    if (Object.keys(rest).length > 0) {
      return Option.some(rest);
    }
  }

  return Option.none();
};

/**
 * Normalize ANY error to a structured RpcError.
 * This is the core function that handles all error types uniformly.
 */
export const normalizeError = (
  error: unknown,
  feature: string,
): {
  code: string;
  message: string;
  feature: string;
  details: Option.Option<unknown>;
} => {
  const code = extractErrorCode(error);
  const message = extractErrorMessage(error);
  const details = extractErrorDetails(error);

  return {
    code,
    message,
    feature,
    details,
  };
};

// =============================================================================
// Effect Integration - Error handling at RPC boundaries
// =============================================================================

/**
 * Options for RPC error mapping.
 */
export interface RpcErrorOptions {
  readonly feature: string;
}

/**
 * Type stub for ORPCError - avoids hard dependency on @orpc/server
 * The actual ORPCError will be provided by the caller.
 */
export type ORPCErrorShape = {
  _tag: "ORPCError";
  message: string;
  data: unknown;
};

/**
 * Type guard for ORPCError-like objects.
 */
export const isORPCError = (error: unknown): error is ORPCErrorShape =>
  typeof error === "object" &&
  error !== null &&
  "_tag" in error &&
  error._tag === "ORPCError";

/**
 * Extract RPC error response from an ORPC error.
 */
export const fromORPCError = (error: unknown): Option.Option<RpcErrorResponse> => {
  if (!isORPCError(error)) return Option.none();
  const orpcError = error as ORPCError<{ data: RpcErrorResponse }>;
  if (
    typeof orpcError.data === "object" &&
    orpcError.data !== null &&
    "data" in orpcError.data
  ) {
    return Option.some(orpcError.data.data);
  }
  return Option.none();
};

// =============================================================================
// Schema Validation - Ensure errors can be serialized
// =============================================================================

/**
 * Validate that a value is a valid RPC error response.
 */
export const validateRpcErrorResponse = Schema.decodeUnknown(RpcErrorResponse);

/**
 * Encode an RPC error response for transmission.
 */
export const encodeRpcErrorResponse = Schema.encodeUnknown(RpcErrorResponse);

// =============================================================================
// Error Result Types - For endpoints that return results
// =============================================================================

/**
 * Create a result schema that can be either success or RPC error.
 */
export const RpcResult = <A extends Schema.Schema.Any>(dataSchema: A) =>
  Schema.Union(
    Schema.Struct({
      success: Schema.Literal(true),
      data: dataSchema,
    }),
    RpcErrorResponse,
  );

export type RpcResult<A> = { success: true; data: A } | RpcErrorResponse;

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Helper function for pattern matching error codes.
 * Usage:
 * ```ts
 * matchErrorCode(error.code, {
 *   NotFoundError: () => "Not found",
 *   ValidationError: () => "Invalid input",
 *   _: () => "Unknown error", // default case
 * })
 * ```
 */
export const matchErrorCode = <T extends string, R>(
  code: T,
  matchers: { [K in T]?: () => R } & { _: () => R },
): R => {
  const matcher = matchers[code as keyof typeof matchers];
  if (typeof matcher === "function") {
    return matcher();
  }
  return matchers._();
};
