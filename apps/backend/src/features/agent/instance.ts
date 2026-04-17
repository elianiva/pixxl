import type {
  AgentSession,
  SessionManager,
  AgentSessionEvent,
} from "@mariozechner/pi-coding-agent";

import type {
  AgentMetadata,
  AgentModel,
  AgentModelRef,
  AgentSnapshot,
  AgentThinkingLevel,
} from "@pixxl/shared";
import { getModel } from "@mariozechner/pi-ai";

export type AgentStatus = "idle" | "streaming" | "error";

/** Hot event bus: subscribers only receive events from the time they subscribe. */
class HotEvents {
  private listeners = new Set<(e: AgentSessionEvent) => void>();

  push(event: AgentSessionEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  iterator(): AsyncIterator<AgentSessionEvent> {
    const queue: AgentSessionEvent[] = [];
    let resolve: ((e: AgentSessionEvent) => void) | null = null;

    const handler = (e: AgentSessionEvent) => {
      if (resolve) {
        resolve(e);
        resolve = null;
      } else {
        queue.push(e);
      }
    };

    this.listeners.add(handler);

    return {
      next: async (): Promise<IteratorResult<AgentSessionEvent>> => {
        if (queue.length > 0) {
          return { value: queue.shift()!, done: false };
        }
        const event = await new Promise<AgentSessionEvent>((r) => {
          resolve = r;
        });
        return { value: event, done: false };
      },
      return: async () => {
        this.listeners.delete(handler);
        return { value: undefined, done: true } as IteratorResult<AgentSessionEvent>;
      },
    };
  }
}

export class AgentInstance {
  status: AgentStatus = "idle";
  error: string | undefined;
  private eventBus = new HotEvents();
  private unsubscribe: (() => void) | undefined;

  constructor(
    readonly metadata: AgentMetadata,
    readonly sessionManager: SessionManager,
    readonly session: AgentSession,
  ) {
    this.unsubscribe = session.subscribe((event) => {
      this.eventBus.push(event as AgentSessionEvent);
    });
  }

  dispose(): void {
    this.unsubscribe?.();
  }

  async prompt(text: string): Promise<void> {
    this.status = "streaming";
    this.error = undefined;
    try {
      await this.session.prompt(text);
      this.status = "idle";
    } catch (cause) {
      console.error(`[AgentInstance:${this.metadata.id}] prompt() FAILED:`, cause);
      this.status = "error";
      this.error = String(cause);
    }
  }

  abort(): void {
    void this.session.abort();
  }

  setModel(model: AgentModelRef): Promise<void> {
    return this.session.setModel(getModel(model.provider as never, model.id as never));
  }

  setThinkingLevel(level: AgentThinkingLevel): void {
    this.session.setThinkingLevel(level);
  }

  get queuedSteering(): readonly string[] {
    return this.session.getSteeringMessages() ?? [];
  }

  get queuedFollowUp(): readonly string[] {
    return this.session.getFollowUpMessages() ?? [];
  }

  get currentModel(): AgentModel | undefined {
    const model = this.session.model;
    if (!model) return undefined;
    return {
      id: model.id,
      name: model.name ?? model.id,
      api: model.api,
      provider: model.provider,
      baseUrl: model.baseUrl,
      reasoning: model.reasoning,
      input: model.input,
      cost: model.cost,
      contextWindow: model.contextWindow,
      maxTokens: model.maxTokens,
      headers: model.headers,
    };
  }

  get thinkingLevel(): AgentThinkingLevel {
    return this.session.supportsThinking()
      ? (String(this.session.thinkingLevel) as AgentThinkingLevel)
      : "off";
  }

  getSnapshot(): AgentSnapshot {
    const entries = this.sessionManager.getEntries();
    return {
      type: "snapshot",
      entries: entries,
      status: this.status === "error" ? "error" : this.status,
      queuedSteering: [...this.queuedSteering],
      queuedFollowUp: [...this.queuedFollowUp],
    };
  }

  get events(): AsyncIterable<AgentSessionEvent> {
    return { [Symbol.asyncIterator]: () => this.eventBus.iterator() };
  }
}
