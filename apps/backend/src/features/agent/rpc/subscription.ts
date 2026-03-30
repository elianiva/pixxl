import { Effect, Option } from "effect";
import { AsyncIteratorClass } from "@orpc/server";
import { os } from "@/contract";
import { runtime } from "@/runtime";
import { mapToOrpcError } from "@/lib/error";
import { AgentService } from "../service";
import type { AgentInstance } from "../instance";
import { AgentNotFoundError } from "../error";
import type { AgentStreamItem } from "@pixxl/shared";

// Get instance using the runtime directly - avoids Effect fiber issues with streaming
export async function getAgentInstance(agentId: string): Promise<AgentInstance> {
  return Effect.gen(function* () {
    const service = yield* AgentService;
    const instanceOpt = yield* service.getInstance({ agentId });
    if (Option.isNone(instanceOpt)) {
      return yield* new AgentNotFoundError({ agentId });
    }
    return instanceOpt.value;
  })
    .pipe(runtime.runPromise)
    .catch(mapToOrpcError);
}

export const subscribeAgentRpc = os.agent.subscribeAgent.handler(async ({ input }) => {
  console.log("[SUBSCRIBE] agent:", input.agentId);

  // Get instance - outside of streaming context to avoid Effect fiber issues
  const instance = await getAgentInstance(input.agentId);

  // Create AsyncIteratorClass for oRPC streaming
  let snapshotSent = false;
  let eventIterator: AsyncIterator<AgentStreamItem> | null = null;
  let closed = false;

  return new AsyncIteratorClass<AgentStreamItem, void>(
    // next function - called by oRPC to get each item
    async () => {
      // Send snapshot first
      if (!snapshotSent) {
        snapshotSent = true;
        const snapshot = instance.getSnapshot();
        console.log("[SUBSCRIBE] yielding snapshot with", snapshot.entries.length, "entries");
        return { value: snapshot, done: false };
      }

      // Then stream events
      if (!eventIterator) {
        console.log("[SUBSCRIBE] starting event stream");
        eventIterator = instance.events[Symbol.asyncIterator]();
      }

      if (closed) {
        return { value: undefined, done: true } as IteratorResult<AgentStreamItem, void>;
      }

      try {
        const result = await eventIterator.next();
        if (result.done) {
          console.log("[SUBSCRIBE] iterator done");
          return { value: undefined, done: true } as IteratorResult<AgentStreamItem, void>;
        }
        console.log(
          "[SUBSCRIBE] yielding event:",
          (result.value as { type?: string }).type ?? "unknown",
        );
        return { value: result.value, done: false };
      } catch (error) {
        console.error("[SUBSCRIBE] error:", error);
        return { value: undefined, done: true } as IteratorResult<AgentStreamItem, void>;
      }
    },
    // cleanup function - called when stream ends
    async (reason: string) => {
      console.log("[SUBSCRIBE] cleanup called:", reason);
      closed = true;
    },
  );
});
