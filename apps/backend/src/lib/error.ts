import { Effect, Option } from "effect";
import { ORPCError } from "@orpc/server";
import { normalizeError, makeRpcErrorResponse, type RpcErrorResponse } from "@pixxl/shared";

export interface MapToOrpcErrorOptions {
  readonly feature: string;
}

export const mapToOrpcError = <E>(options: MapToOrpcErrorOptions) =>
  Effect.mapError<E, ORPCError<{ data: RpcErrorResponse }>>((error) => {
    const { code, message, feature, details } = normalizeError(error, options.feature);
    const errorResponse = makeRpcErrorResponse(
      code,
      message,
      feature,
      Option.getOrUndefined(details),
    );
    return new ORPCError(code, { message, data: errorResponse });
  });

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

export const getRpcErrorResponse = (error: unknown): RpcErrorResponse | null => {
  if (isRpcErrorInORPCError(error)) {
    return error.data.data;
  }
  return null;
};

export { normalizeError, makeRpcErrorResponse, type RpcErrorResponse };
