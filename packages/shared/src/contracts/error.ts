import { Schema } from "effect";

/**
 * Standard error codes for feature-based errors
 */
export const ErrorCode = Schema.Literal(
  // Config errors
  "CONFIG_PARSE_ERROR",
  "CONFIG_SERIALIZE_ERROR",
  "CONFIG_NOT_FOUND",

  // Terminal errors
  "TERMINAL_NOT_FOUND",
  "TERMINAL_CREATE_ERROR",
  "TERMINAL_UPDATE_ERROR",
  "TERMINAL_DELETE_ERROR",
  "TERMINAL_CONNECTION_ERROR",

  // Agent errors
  "AGENT_NOT_FOUND",
  "AGENT_CREATE_ERROR",
  "AGENT_UPDATE_ERROR",
  "AGENT_DELETE_ERROR",

  // Project errors
  "PROJECT_NOT_FOUND",
  "PROJECT_CREATE_ERROR",
  "PROJECT_DELETE_ERROR",
  "PROJECT_ALREADY_EXISTS",
  "INVALID_PROJECT_PATH",

  // Command errors
  "COMMAND_NOT_FOUND",
  "COMMAND_CREATE_ERROR",
  "COMMAND_DELETE_ERROR",

  // Generic errors
  "INTERNAL_ERROR",
  "VALIDATION_ERROR",
  "NOT_FOUND",
  "UNAUTHORIZED",
  "FORBIDDEN",
);
export type ErrorCode = typeof ErrorCode.Type;

/**
 * Standard error response structure for all RPC errors
 */
export const ErrorResponseSchema = Schema.Struct({
  success: Schema.Literal(false),
  error: Schema.Struct({
    code: ErrorCode,
    message: Schema.String,
    feature: Schema.String,
    details: Schema.optionalKey(Schema.Unknown),
  }),
});
export type ErrorResponse = typeof ErrorResponseSchema.Type;

/**
 * Helper to create an error response
 */
export const createErrorResponse = (
  code: ErrorCode,
  message: string,
  feature: string,
  details?: unknown,
): ErrorResponse => ({
  success: false,
  error: {
    code,
    message,
    feature,
    ...(details !== undefined ? { details } : {}),
  },
});

/**
 * Type guard to check if a value is an error response
 */
export const isErrorResponse = (value: unknown): value is ErrorResponse =>
  typeof value === "object" &&
  value !== null &&
  "success" in value &&
  value.success === false &&
  "error" in value;

/**
 * Result type that can be either success or error
 */
export const createResultSchema = <T extends Schema.Schema.Any>(dataSchema: T) =>
  Schema.Union(
    Schema.Struct({
      success: Schema.Literal(true),
      data: dataSchema,
    }),
    ErrorResponseSchema,
  );

/**
 * Helper type for result schemas
 */
export type Result<T> = { success: true; data: T } | ErrorResponse;
