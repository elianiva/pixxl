import { Option, Schema } from "effect";

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

const extractErrorCode = (error: unknown): string => {
  if (
    typeof error === "object" &&
    error !== null &&
    "_tag" in error &&
    typeof error._tag === "string"
  ) {
    return error._tag;
  }
  if (error instanceof Error) {
    return error.constructor.name;
  }
  if (typeof error === "string") return "StringError";
  if (typeof error === "number") return "NumberError";
  if (typeof error === "boolean") return "BooleanError";
  return "UnknownError";
};

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

const extractErrorDetails = (error: unknown): Option.Option<unknown> => {
  if (
    typeof error === "object" &&
    error !== null &&
    "cause" in error &&
    error.cause !== undefined
  ) {
    return Option.some(error.cause);
  }
  if (error instanceof Error && error.stack) {
    return Option.some({ stack: error.stack });
  }
  if (typeof error === "object" && error !== null && !(error instanceof Error)) {
    const { _tag, message, ...rest } = error as Record<string, unknown>;
    if (Object.keys(rest).length > 0) {
      return Option.some(rest);
    }
  }
  return Option.none();
};

export const normalizeError = (
  error: unknown,
  feature: string,
): {
  code: string;
  message: string;
  feature: string;
  details: Option.Option<unknown>;
} => ({
  code: extractErrorCode(error),
  message: extractErrorMessage(error),
  feature,
  details: extractErrorDetails(error),
});
