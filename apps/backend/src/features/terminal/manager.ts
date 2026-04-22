import { Effect, Layer, ServiceMap } from "effect";
import * as SynchronizedRef from "effect/SynchronizedRef";
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

type TerminalManagerServiceShape = {
  readonly getOrCreate: (input: TerminalActorInput) => Effect.Effect<TerminalActor>;
  readonly get: (terminalId: string) => Effect.Effect<TerminalActor | undefined>;
  readonly getSessionState: (terminalId: string) => Effect.Effect<SessionInfo["state"] | "none">;
  readonly listAll: () => Effect.Effect<SessionInfo[]>;
  readonly listDetached: () => Effect.Effect<SessionInfo[]>;
  readonly remove: (terminalId: string) => Effect.Effect<boolean>;
  readonly has: (terminalId: string) => Effect.Effect<boolean>;
  readonly disposeAll: () => Effect.Effect<void>;
};

const isStale = (actor: TerminalActor): boolean => {
  const state = actor.getSnapshot();
  return !state || state.matches("dead") || state.matches("closed");
};

export class TerminalManagerService extends ServiceMap.Service<
  TerminalManagerService,
  TerminalManagerServiceShape
>()("@pixxl/TerminalManagerService", {
  make: Effect.gen(function* () {
    const actorsRef = yield* SynchronizedRef.make(new Map<string, TerminalActor>());

    const getOrCreate = (input: TerminalActorInput): Effect.Effect<TerminalActor> =>
      SynchronizedRef.modifyEffect(actorsRef, (actors) => {
        const existing = actors.get(input.terminalId);
        if (existing && !isStale(existing)) {
          return Effect.succeed([existing, actors] as const);
        }

        const next = new Map(actors);
        if (existing) {
          next.delete(input.terminalId);
        }

        const actor = createTerminalActor(input);
        next.set(input.terminalId, actor);
        return Effect.succeed([actor, next] as const);
      });

    const get = (terminalId: string): Effect.Effect<TerminalActor | undefined> =>
      SynchronizedRef.modifyEffect(actorsRef, (actors) => {
        const actor = actors.get(terminalId);
        if (!actor || isStale(actor)) {
          if (!actor) {
            return Effect.succeed([undefined, actors] as const);
          }
          const next = new Map(actors);
          next.delete(terminalId);
          return Effect.succeed([undefined, next] as const);
        }
        return Effect.succeed([actor, actors] as const);
      });

    const pruneAndRead = (): Effect.Effect<Map<string, TerminalActor>> =>
      SynchronizedRef.updateAndGet(actorsRef, (actors) => {
        const pruned = new Map<string, TerminalActor>();
        for (const [id, actor] of actors) {
          if (!isStale(actor)) {
            pruned.set(id, actor);
          }
        }
        return pruned;
      });

    const getSessionState = (terminalId: string): Effect.Effect<SessionInfo["state"] | "none"> =>
      Effect.gen(function* () {
        const actor = yield* get(terminalId);
        if (!actor) return "none";
        const state = actor.getSnapshot();
        if (!state) return "none";
        if (state.matches("active")) return "active";
        if (state.matches("detached")) return "detached";
        if (state.matches("dead")) return "dead";
        if (state.matches("closed")) return "closed";
        return "none";
      });

    const listAll = (): Effect.Effect<SessionInfo[]> =>
      Effect.gen(function* () {
        const actors = yield* pruneAndRead();
        const sessions: SessionInfo[] = [];

        for (const [terminalId, actor] of actors) {
          const snapshot = actor.getSnapshot();
          if (!snapshot) continue;

          const ctx = snapshot.context;

          sessions.push({
            terminalId,
            shell: ctx.shell,
            cwd: ctx.cwd,
            state: (yield* getSessionState(terminalId)) as SessionInfo["state"],
            attachedClients: ctx.clients.size,
            scrollbackSize: ctx.scrollback.size,
            createdAt: ctx.metadata.createdAt,
            lastActivity: ctx.metadata.lastActivity,
            attachCount: ctx.metadata.attachCount,
            exitCode: ctx.metadata.exitCode,
          });
        }

        return sessions;
      });

    const listDetached = (): Effect.Effect<SessionInfo[]> =>
      Effect.map(listAll(), (sessions) => sessions.filter((s) => s.state === "detached"));

    const remove = (terminalId: string): Effect.Effect<boolean> =>
      SynchronizedRef.get(actorsRef).pipe(
        Effect.map((actors) => {
          const actor = actors.get(terminalId);
          if (!actor) return false;
          actor.send({ type: "CLOSE" });
          return true;
        }),
      );

    const has = (terminalId: string): Effect.Effect<boolean> =>
      Effect.map(getSessionState(terminalId), (state) => state !== "none");

    const disposeAll = (): Effect.Effect<void> =>
      Effect.gen(function* () {
        const actors = yield* SynchronizedRef.get(actorsRef);
        for (const [, actor] of actors) {
          const snapshot = actor.getSnapshot();
          if (!snapshot || snapshot.matches("dead") || snapshot.matches("closed")) continue;
          const pty = snapshot.context.terminal;
          if (pty) {
            try { pty.kill(); } catch { /* ignore */ }
            try { pty.close(); } catch { /* ignore */ }
          }
          actor.send({ type: "CLOSE" });
        }
        yield* Effect.sleep("200 millis");
      });

    return {
      getOrCreate,
      get,
      getSessionState,
      listAll,
      listDetached,
      remove,
      has,
      disposeAll,
    } as const;
  }),
}) {
  static layer = Layer.effect(TerminalManagerService, TerminalManagerService.make);
}

