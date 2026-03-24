import { Schema } from "effect";

/**
 * Config not found at expected location
 */
export class ConfigNotFoundError extends Schema.TaggedErrorClass<ConfigNotFoundError>()(
  "ConfigNotFoundError",
  {
    configPath: Schema.String,
    cause: Schema.optionalKey(Schema.Unknown),
  },
) {}

/**
 * Failed to parse config file (invalid JSON/YAML)
 */
export class ConfigParseError extends Schema.TaggedErrorClass<ConfigParseError>()(
  "ConfigParseError",
  {
    configPath: Schema.String,
    rawContent: Schema.optionalKey(Schema.String),
    parseIssue: Schema.optionalKey(Schema.String),
    cause: Schema.optionalKey(Schema.Unknown),
  },
) {}

/**
 * Failed to serialize config to string
 */
export class ConfigSerializeError extends Schema.TaggedErrorClass<ConfigSerializeError>()(
  "ConfigSerializeError",
  {
    configPath: Schema.String,
    data: Schema.optionalKey(Schema.Unknown),
    cause: Schema.optionalKey(Schema.Unknown),
  },
) {}

/**
 * Config validation failed (schema mismatch)
 */
export class ConfigValidationError extends Schema.TaggedErrorClass<ConfigValidationError>()(
  "ConfigValidationError",
  {
    field: Schema.String,
    value: Schema.optionalKey(Schema.Unknown),
    issue: Schema.String,
    cause: Schema.optionalKey(Schema.Unknown),
  },
) {}

/**
 * Union of all config errors
 */
export type ConfigError =
  | ConfigNotFoundError
  | ConfigParseError
  | ConfigSerializeError
  | ConfigValidationError;

/**
 * Type guard for config errors
 */
export const isConfigError = (error: unknown): error is ConfigError =>
  typeof error === "object" &&
  error !== null &&
  "_tag" in error &&
  (error._tag === "ConfigNotFoundError" ||
    error._tag === "ConfigParseError" ||
    error._tag === "ConfigSerializeError" ||
    error._tag === "ConfigValidationError");
