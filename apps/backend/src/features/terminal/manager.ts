import { createTerminalActor, type TerminalActor, type TerminalActorInput } from "./actor";

export interface SessionInfo {
  terminalId: string;
  shell: string;
  cwd?: string;
  state: "active" | "detached" | "dead" | "closed";
  attachedClients: number;
  scrollbackSize: number;
  createdAt: Date;
  lastActivity: Date;
  attachCount: number;
  exitCode?: number;
}

class TerminalManager {
  private actors = new Map<string, TerminalActor>();

  getOrCreate(input: TerminalActorInput): TerminalActor {
    const existing = this.actors.get(input.terminalId);
    console.log(`[TerminalManager] getOrCreate for ${input.terminalId}, existing=${!!existing}`);
    if (existing) {
      const state = existing.getSnapshot();
      console.log(`[TerminalManager] existing state: ${state?.value ?? "null"}`);
      if (!state) {
        console.log(`[TerminalManager] deleting - no state`);
        this.actors.delete(input.terminalId);
      } else if (state.matches("dead") || state.matches("closed")) {
        // Dead or closed sessions need recreation
        console.log(`[TerminalManager] deleting - dead or closed`);
        this.actors.delete(input.terminalId);
      } else {
        // Active or detached - return existing
        console.log(`[TerminalManager] returning existing actor`);
        return existing;
      }
    }

    const actor = createTerminalActor(input);
    this.actors.set(input.terminalId, actor);

    // Subscribe to cleanup when actor reaches final states
    actor.subscribe((state) => {
      if (state.matches("closed") || state.matches("dead")) {
        this.actors.delete(input.terminalId);
      }
    });

    return actor;
  }

  get(terminalId: string): TerminalActor | undefined {
    const actor = this.actors.get(terminalId);
    if (!actor) return undefined;

    // Don't return dead/closed actors
    const state = actor.getSnapshot();
    if (state && (state.matches("dead") || state.matches("closed"))) {
      this.actors.delete(terminalId);
      return undefined;
    }

    return actor;
  }

  getSessionState(terminalId: string): "active" | "detached" | "dead" | "closed" | "none" {
    const actor = this.actors.get(terminalId);
    if (!actor) return "none";

    const state = actor.getSnapshot();
    if (!state) return "none";

    if (state.matches("active")) return "active";
    if (state.matches("detached")) return "detached";
    if (state.matches("dead")) return "dead";
    if (state.matches("closed")) return "closed";

    return "none";
  }

  listAll(): SessionInfo[] {
    const sessions: SessionInfo[] = [];

    for (const [terminalId, actor] of this.actors) {
      const snapshot = actor.getSnapshot();
      if (!snapshot) continue;

      const ctx = snapshot.context;

      sessions.push({
        terminalId,
        shell: ctx.shell,
        cwd: ctx.cwd,
        state: this.getSessionState(terminalId) as SessionInfo["state"],
        attachedClients: ctx.clients.size,
        scrollbackSize: ctx.scrollback.size,
        createdAt: ctx.metadata.createdAt,
        lastActivity: ctx.metadata.lastActivity,
        attachCount: ctx.metadata.attachCount,
        exitCode: ctx.metadata.exitCode,
      });
    }

    return sessions;
  }

  listDetached(): SessionInfo[] {
    return this.listAll().filter((s) => s.state === "detached");
  }

  remove(terminalId: string): boolean {
    const actor = this.actors.get(terminalId);
    if (!actor) return false;

    actor.send({ type: "CLOSE" });
    this.actors.delete(terminalId);
    return true;
  }

  has(terminalId: string): boolean {
    return this.getSessionState(terminalId) !== "none";
  }
}

export const terminalManager = new TerminalManager();
