import { Effect, Schema } from "effect";
import { ORPCError } from "@orpc/server";
import {
  createErrorResponse,
  type ErrorCode,
  type ErrorResponse,
  EntityServiceError,
} from "@pixxl/shared";

/**
 * Maps feature errors to standard error codes
 */
const errorCodeMap = new Map<string, ErrorCode>([
  // Config errors
  ["AppConfigError", "CONFIG_NOT_FOUND"],
  ["ConfigParseError", "CONFIG_PARSE_ERROR"],
  ["ConfigSerializeError", "CONFIG_SERIALIZE_ERROR"],

  // Terminal errors
  ["TerminalError", "TERMINAL_CREATE_ERROR"],

  // Agent errors
  ["AgentError", "AGENT_CREATE_ERROR"],

  // Project errors
  ["ProjectError", "PROJECT_CREATE_ERROR"],

  // Command errors
  ["CommandError", "COMMAND_CREATE_ERROR"],

  // Entity service errors - map based on message content
  ["EntityServiceError", "INTERNAL_ERROR"],
]);

/**
 * Extract error code from error instance
 */
const getErrorCode = (error: unknown, feature: string): ErrorCode => {
  if (error instanceof Schema.TaggedErrorClass) {
    const tag = error._tag;
    const mapped = errorCodeMap.get(tag);
    if (mapped) return mapped;

    // Infer from tag name patterns
    if (tag.includes("NotFound")) return "NOT_FOUND";
    if (tag.includes("Parse")) return "VALIDATION_ERROR";
    if (tag.includes("Serialize")) return "VALIDATION_ERROR";
    if (tag.includes("Unauthorized")) return "UNAUTHORIZED";
    if (tag.includes("Forbidden")) return "FORBIDDEN";
  }

  // Check error message for patterns
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("not found")) return "NOT_FOUND";
    if (msg.includes("already exists"))
      return `${feature.toUpperCase()}_ALREADY_EXISTS` as ErrorCode;
    if (msg.includes("invalid")) return "VALIDATION_ERROR";
    if (msg.includes("unauthorized")) return "UNAUTHORIZED";
    if (msg.includes("forbidden")) return "FORBIDDEN";
  }

  // Feature-specific fallback
  const featureCode = `${feature.toUpperCase()}_ERROR` as ErrorCode;
  return featureCode ?? "INTERNAL_ERROR";
};

/**
 * Extract error message from error instance
 */
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Schema.TaggedErrorClass) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

/**
 * Extract additional details from error instance
 */
const getErrorDetails = (error: unknown): unknown | undefined => {
  if (error instanceof Schema.TaggedErrorClass && "cause" in error) {
    return error.cause;
  }
  if (error instanceof Error && error.cause) {
    return error.cause;
  }
  return undefined;
};

/**
 * Options for mapping errors to ORPCError
 */
export interface MapToOrpcErrorOptions {
  feature: string;
}

/**
 * Maps Effect errors to structured ORPCError responses.
 * Use in a pipe chain: Effect.gen(...).pipe(mapToOrpcError({ feature: "config" }), Effect.runPromise)
 */
export const mapToOrpcError = <E>(options: MapToOrpcErrorOptions) =>
  Effect.mapError<E, ORPCError<{ data: ErrorResponse }>>((error) => {
    const code = getErrorCode(error, options.feature);
    const message = getErrorMessage(error);
    const details = getErrorDetails(error);

    const errorResponse = createErrorResponse(code, message, options.feature, details);

    // Return ORPCError with structured data - orpc will serialize this to the frontend
    return new ORPCError("INTERNAL_SERVER_ERROR", {
      message,
      data: errorResponse,
    });
  });

/**
 * Type guard to check if an error is an ORPCError with our error response
 */
export const isORPCErrorResponse = (error: unknown): error is ORPCError<{ data: ErrorResponse }> =>
  error instanceof ORPCError &&
  typeof error.data === "object" &&
  error.data !== null &&
  "data" in error.data;

/**
 * Extract error response from ORPCError
 */
export const getErrorResponse = (error: unknown): ErrorResponse | null => {
  if (isORPCErrorResponse(error)) {
    return error.data.data;
  }
  return null;
};

// Re-export for convenience
export { createErrorResponse, EntityServiceError };
