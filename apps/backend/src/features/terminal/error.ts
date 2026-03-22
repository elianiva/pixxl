import { Schema } from "effect";

export class TerminalError extends Schema.TaggedErrorClass<TerminalError>()("TerminalError", {
  message: Schema.String,
  cause: Schema.optionalKey(Schema.Unknown),
}) {}
