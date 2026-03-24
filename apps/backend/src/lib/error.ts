import { Effect, Option } from "effect";
import { ORPCError } from "@orpc/server";
import { normalizeError, makeRpcErrorResponse, type RpcErrorResponse } from "@pixxl/shared";

/**
 * Options for mapping errors to ORPCError.
 */
export interface MapToOrpcErrorOptions {
  readonly feature: string;
}

/**
 * Maps ANY Effect error (Data.TaggedError, Schema.TaggedError, Error, primitives, unknown)
 * to a structured ORPCError response.
 *
 * Usage in RPC handlers:
 * ```ts
 * Effect.gen(function* () {
 *   // ... operations that might fail with any error type
 * }).pipe(
 *   mapToOrpcError({ feature: "config" }),
 *   Effect.runPromise,
 * )
 * ```
 */
export const mapToOrpcError = <E>(options: MapToOrpcErrorOptions) =>
  Effect.mapError<E, ORPCError<{ data: RpcErrorResponse }>>((error) => {
    // normalizeError handles ANY error type uniformly
    const { code, message, feature, details } = normalizeError(error, options.feature);

    const errorResponse = makeRpcErrorResponse(
      code,
      message,
      feature,
      Option.getOrUndefined(details),
    );

    // ORPCError wraps our structured response
    return new ORPCError(code, {
      message,
      data: errorResponse,
    });
  });

/**
 * Type guard for ORPCError with our RPC error response structure.
 */
export const isRpcErrorInORPCError = (
  error: unknown,
): error is ORPCError<{ data: RpcErrorResponse }> => {
  if (!(error instanceof ORPCError)) return false;
  const data = (error as ORPCError<unknown>).data;
  return (
    typeof data === "object" &&
    data !== null &&
    "data" in data &&
    typeof data.data === "object" &&
    data.data !== null &&
    "success" in data.data &&
    data.data.success === false
  );
};

/**
 * Extract RPC error response from an ORPCError.
 */
export const getRpcErrorResponse = (error: unknown): RpcErrorResponse | null => {
  if (isRpcErrorInORPCError(error)) {
    return error.data.data;
  }
  return null;
};

// Re-export convenience functions from shared
export { normalizeError, makeRpcErrorResponse, type RpcErrorResponse };
