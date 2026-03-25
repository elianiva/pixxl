import { Effect, Option } from "effect";
import { SessionManager, type SessionInfo } from "@mariozechner/pi-coding-agent";
import { AgentAttachError, PiSessionCreateError, PiSessionValidationError } from "./error";

/**
 * Create a new persistent Pi session for a project.
 * Returns the session file path.
 */
export const createPiSession = Effect.fn("createPiSession")(function* (projectPath: string) {
  const sessionManager = SessionManager.create(projectPath);

  // Initialize the session - this writes the header to disk
  const sessionId = sessionManager.newSession();

  if (!sessionId) {
    return yield* new PiSessionCreateError({
      projectPath,
      cause: "Failed to initialize new session",
    });
  }

  const sessionFile = sessionManager.getSessionFile();

  if (!sessionFile) {
    return yield* new PiSessionCreateError({
      projectPath,
      cause: "SessionManager did not return a session file path",
    });
  }

  return { sessionManager, sessionFile };
});

/**
 * Open an existing Pi session from a session file.
 * Validates that the session file exists and has a valid header.
 */
export const openPiSession = Effect.fn("openPiSession")(function* (
  sessionFile: string,
  expectedCwd: string,
) {
  // First validate the session file matches expected project
  const validation = yield* validateSessionFile(sessionFile, expectedCwd);

  if (Option.isNone(validation)) {
    return yield* new PiSessionValidationError({
      sessionFile,
      cause: "Session file validation failed",
    });
  }

  return validation.value;
});

/**
 * List all Pi sessions for a project directory.
 */
export const listPiSessions = Effect.fn("listPiSessions")(function* (projectPath: string) {
  const sessions = yield* Effect.tryPromise({
    try: () => SessionManager.list(projectPath),
    catch: (cause) =>
      new PiSessionValidationError({
        sessionFile: projectPath,
        cause,
      }),
  });

  return sessions;
});

/**
 * Validate that a session file:
 * 1. Exists and is readable
 * 2. Has a valid session header
 * 3. Has cwd matching expected project path (no cross-project attach)
 */
export const validateSessionFile = Effect.fn("validateSessionFile")(function* (
  sessionFile: string,
  expectedCwd: string,
) {
  const inner = Effect.gen(function* () {
    // Try to open the session to validate it
    const sessionManager = SessionManager.open(sessionFile);

    // Check header cwd matches expected project
    const header = sessionManager.getHeader();
    if (!header) {
      return yield* new PiSessionValidationError({
        sessionFile,
        cause: "Session file has no valid header",
      });
    }

    if (header.cwd !== expectedCwd) {
      return yield* new AgentAttachError({
        agentId: "",
        projectId: "",
        cause: `Session cwd "${header.cwd}" does not match project path "${expectedCwd}". Cross-project session attachment is not allowed.`,
      });
    }

    return sessionManager;
  }).pipe(
    Effect.mapError(
      (cause) =>
        new PiSessionValidationError({
          sessionFile,
          cause: cause instanceof Error ? cause.message : String(cause),
        }),
    ),
  );

  return yield* inner.pipe(Effect.option);
});

/**
 * Delete a Pi session file (used for compensating cleanup on create failure).
 * Returns true if deleted, false if file didn't exist.
 */
export const deletePiSessionFile = Effect.fn("deletePiSessionFile")(function* (
  sessionFile: string,
) {
  return yield* Effect.try({
    try: () => {
      // Check if file exists
      const fs = require("fs");
      if (!fs.existsSync(sessionFile)) {
        return false;
      }

      // Delete the file
      fs.unlinkSync(sessionFile);
      return true;
    },
    catch: (cause) =>
      new PiSessionCreateError({
        cause: `Failed to cleanup session file ${sessionFile}: ${String(cause)}`,
      }),
  });
});

/**
 * Convert Pi SessionInfo to our PiSessionInfo format.
 */
export function convertPiSessionInfo(info: SessionInfo) {
  return {
    path: info.path,
    id: info.id,
    cwd: info.cwd,
    name: info.name,
    parentSessionPath: info.parentSessionPath,
    created: info.created,
    modified: info.modified,
    messageCount: info.messageCount,
    firstMessage: info.firstMessage,
  };
}
