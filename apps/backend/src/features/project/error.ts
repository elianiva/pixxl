import { Schema } from "effect";

export class ProjectError extends Schema.TaggedErrorClass<ProjectError>()("ProjectError", {
  message: Schema.String,
  cause: Schema.optionalKey(Schema.Unknown),
}) { }
