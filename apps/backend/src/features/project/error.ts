import { Schema } from "effect";

/**
 * Project not found by ID or path
 */
export class ProjectNotFoundError extends Schema.TaggedErrorClass<ProjectNotFoundError>()(
  "ProjectNotFoundError",
  {
    projectId: Schema.optionalKey(Schema.String),
    projectPath: Schema.optionalKey(Schema.String),
    cause: Schema.optionalKey(Schema.Unknown),
  },
) {}

/**
 * Project already exists at the specified path
 */
export class ProjectAlreadyExistsError extends Schema.TaggedErrorClass<ProjectAlreadyExistsError>()(
  "ProjectAlreadyExistsError",
  {
    projectPath: Schema.String,
    cause: Schema.optionalKey(Schema.Unknown),
  },
) {}

/**
 * Invalid project path (not a directory, no permissions, etc)
 */
export class InvalidProjectPathError extends Schema.TaggedErrorClass<InvalidProjectPathError>()(
  "InvalidProjectPathError",
  {
    projectPath: Schema.String,
    cause: Schema.optionalKey(Schema.Unknown),
  },
) {}

/**
 * Failed to create project directory structure
 */
export class ProjectCreateError extends Schema.TaggedErrorClass<ProjectCreateError>()(
  "ProjectCreateError",
  {
    projectPath: Schema.String,
    cause: Schema.optionalKey(Schema.Unknown),
  },
) {}

/**
 * Failed to delete project
 */
export class ProjectDeleteError extends Schema.TaggedErrorClass<ProjectDeleteError>()(
  "ProjectDeleteError",
  {
    projectPath: Schema.optionalKey(Schema.String),
    projectId: Schema.optionalKey(Schema.String),
    cause: Schema.optionalKey(Schema.Unknown),
  },
) {}

/**
 * Failed to read project metadata
 */
export class ProjectReadError extends Schema.TaggedErrorClass<ProjectReadError>()(
  "ProjectReadError",
  {
    projectPath: Schema.String,
    cause: Schema.optionalKey(Schema.Unknown),
  },
) {}

/**
 * Failed to write project metadata
 */
export class ProjectWriteError extends Schema.TaggedErrorClass<ProjectWriteError>()(
  "ProjectWriteError",
  {
    projectPath: Schema.String,
    cause: Schema.optionalKey(Schema.Unknown),
  },
) {}

/**
 * Workspace configuration error
 */
export class WorkspaceError extends Schema.TaggedErrorClass<WorkspaceError>()("WorkspaceError", {
  directory: Schema.optionalKey(Schema.String),
  cause: Schema.optionalKey(Schema.Unknown),
}) {}

/**
 * Union of all project errors
 */
export type ProjectError =
  | ProjectNotFoundError
  | ProjectAlreadyExistsError
  | InvalidProjectPathError
  | ProjectCreateError
  | ProjectDeleteError
  | ProjectReadError
  | ProjectWriteError
  | WorkspaceError;

/**
 * Type guard for project errors
 */
export const isProjectError = (error: unknown): error is ProjectError =>
  typeof error === "object" &&
  error !== null &&
  "_tag" in error &&
  (error._tag === "ProjectNotFoundError" ||
    error._tag === "ProjectAlreadyExistsError" ||
    error._tag === "InvalidProjectPathError" ||
    error._tag === "ProjectCreateError" ||
    error._tag === "ProjectDeleteError" ||
    error._tag === "ProjectReadError" ||
    error._tag === "ProjectWriteError" ||
    error._tag === "WorkspaceError");
