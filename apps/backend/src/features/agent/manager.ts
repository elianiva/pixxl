import { createAgentActor, type AgentActor, type AgentActorInput } from "./actor";

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
