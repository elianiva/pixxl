import { Effect } from "effect";
import { AgentService } from "./service";
import { waitForActorReady } from "./actor";
import type { AgentActor } from "./actor";

import { createAgentActor, type AgentActorInput } from "./actor";

export { waitForActorReady };

export type { AgentActor, AgentActorInput };

class AgentManager {
  private actors = new Map<string, AgentActor>();

  getOrCreate(input: AgentActorInput): AgentActor {
    const existing = this.actors.get(input.agentId);
    if (existing) {
      // Check if actor is still alive
      const state = existing.getSnapshot();
      if (state && !state.matches("deleted")) {
        return existing;
      }
      // Actor died, remove it
      this.actors.delete(input.agentId);
    }

    const actor = createAgentActor(input);
    this.actors.set(input.agentId, actor);

    // Subscribe to cleanup when actor reaches final state
    actor.subscribe((state) => {
      if (state.matches("deleted")) {
        this.actors.delete(input.agentId);
      }
    });

    return actor;
  }

  get(agentId: string): AgentActor | undefined {
    const actor = this.actors.get(agentId);
    if (!actor) return undefined;

    // Check if actor is still alive
    const state = actor.getSnapshot();
    if (state && state.matches("deleted")) {
      this.actors.delete(agentId);
      return undefined;
    }

    return actor;
  }

  remove(agentId: string): void {
    const actor = this.actors.get(agentId);
    if (actor) {
      actor.send({ type: "DELETE_METADATA" });
      // The subscription will clean up from the map when it reaches "deleted" state
    }
  }

  has(agentId: string): boolean {
    const actor = this.get(agentId);
    return actor !== undefined;
  }

  getAll(): AgentActor[] {
    return Array.from(this.actors.values()).filter((actor) => {
      const state = actor.getSnapshot();
      return state && !state.matches("deleted");
    });
  }

  clear(): void {
    for (const [agentId] of this.actors) {
      this.remove(agentId);
    }
  }
}

export const agentManager = new AgentManager();

/**
 * Result of getting a ready actor.
 */
export type ReadyActorResult =
  | { ok: true; actor: AgentActor }
  | {
      ok: false;
      error: { type: "error"; sessionId: string; message: string };
    };

/**
 * Get an actor that's ready to receive prompts.
 * Ensures the agent actor exists and is in a ready/streaming state.
 */
export async function getReadyActor(projectId: string, agentId: string): Promise<ReadyActorResult> {
  const service = await Effect.gen(function* () {
    return yield* AgentService;
  })
    .pipe(Effect.provide(AgentService.layer), Effect.runPromise)
    .catch(() => null);

  if (service) {
    await Effect.gen(function* () {
      yield* service.ensureAgentActor({ projectId, agentId });
    })
      .pipe(Effect.runPromise)
      .catch(() => null);
  }

  const actor = agentManager.get(agentId);

  if (!actor) {
    return {
      ok: false as const,
      error: { type: "error" as const, sessionId: agentId, message: "Agent actor not found" },
    };
  }

  const state = actor.getSnapshot();
  if (state.matches("deleted") || state.matches("deleting")) {
    return {
      ok: false as const,
      error: { type: "error" as const, sessionId: agentId, message: "Agent is being deleted" },
    };
  }

  try {
    await waitForActorReady(actor);
  } catch (error) {
    return {
      ok: false as const,
      error: {
        type: "error" as const,
        sessionId: agentId,
        message: error instanceof Error ? error.message : "Agent is initializing",
      },
    };
  }

  return { ok: true as const, actor };
}
