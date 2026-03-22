import { createTerminalActor, type TerminalActor } from "./actor";
import type { TerminalActorInput } from "./actor";

class TerminalManager {
  private actors = new Map<string, TerminalActor>();

  getOrCreate(input: TerminalActorInput): TerminalActor {
    const existing = this.actors.get(input.terminalId);
    if (existing) {
      // Check if actor is still alive
      const state = existing.getSnapshot();
      if (state && !state.matches("closed")) {
        return existing;
      }
      // Actor died, remove it
      this.actors.delete(input.terminalId);
    }

    const actor = createTerminalActor(input);
    this.actors.set(input.terminalId, actor);

    // Subscribe to cleanup when actor reaches final state
    actor.subscribe((state) => {
      if (state.matches("closed")) {
        this.actors.delete(input.terminalId);
      }
    });

    return actor;
  }

  get(terminalId: string): TerminalActor | undefined {
    return this.actors.get(terminalId);
  }

  remove(terminalId: string): void {
    const actor = this.actors.get(terminalId);
    if (actor) {
      actor.send({ type: "CLOSE" });
      this.actors.delete(terminalId);
    }
  }

  has(terminalId: string): boolean {
    return this.actors.has(terminalId);
  }
}

export const terminalManager = new TerminalManager();
