import { Schema } from "effect";

export class AppConfigError extends Schema.TaggedErrorClass<AppConfigError>()("AppConfigError", {
  message: Schema.String,
  cause: Schema.optionalKey(Schema.Unknown),
}) { }

export class ConfigParseError extends Schema.TaggedErrorClass<ConfigParseError>()(
  "ConfigParseError",
  {
    message: Schema.String,
    cause: Schema.optionalKey(Schema.Unknown),
  },
) { }

export class ConfigSerializeError extends Schema.TaggedErrorClass<ConfigSerializeError>()(
  "ConfigSerializeError",
  {
    message: Schema.String,
    cause: Schema.optionalKey(Schema.Unknown),
  },
) { }
