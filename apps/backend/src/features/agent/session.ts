import { Effect } from "effect";
import type { AgentSession, SessionManager } from "@mariozechner/pi-coding-agent";
import type { AgentThinkingLevel } from "@pixxl/shared";
import { getModel } from "@mariozechner/pi-ai";
import { extractLastConfig } from "./utils";
import { PiSessionCreateError } from "./error";

/**
 * Result of creating or configuring a session.
 */
export interface SessionWithConfig {
  session: AgentSession;
  model?: { provider: string; id: string };
  thinkingLevel?: string;
}

/**
 * Create a new session with the session manager and apply last config from entries.
 */
export function createSessionWithConfig(
  sessionManager: SessionManager,
  projectPath: string,
): Effect.Effect<SessionWithConfig, PiSessionCreateError> {
  return Effect.gen(function* () {
    const { createAgentSession } = yield* Effect.tryPromise({
      try: () => import("@mariozechner/pi-coding-agent"),
      catch: (cause) =>
        new PiSessionCreateError({
          projectPath,
          cause: cause instanceof Error ? cause.message : String(cause),
        }),
    });

    const { session } = yield* Effect.tryPromise({
      try: () => createAgentSession({ sessionManager, cwd: projectPath }),
      catch: (cause) =>
        new PiSessionCreateError({
          projectPath,
          cause: cause instanceof Error ? cause.message : String(cause),
        }),
    });

    // Apply last config from session entries (model_change, thinking_level_change)
    const entries = sessionManager.getEntries();
    const { model, thinkingLevel } = extractLastConfig(entries);

    if (model) {
      yield* Effect.tryPromise({
        try: async () => {
          const piModel = getModel(model.provider as never, model.id as never);
          await session.setModel(piModel);
        },
        catch: () => {
          // If model not available, keep default
        },
      });
    }

    if (thinkingLevel && session.supportsThinking()) {
      session.setThinkingLevel(thinkingLevel as AgentThinkingLevel);
    }

    return { session, model, thinkingLevel };
  });
}
