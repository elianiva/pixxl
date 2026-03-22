import { Schema } from "effect";

export class CommandError extends Schema.TaggedErrorClass<CommandError>()("CommandError", {
  message: Schema.String,
  cause: Schema.optionalKey(Schema.Unknown),
}) {}
