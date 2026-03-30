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

// Simple event buffer that supports async iteration
class EventBuffer {
  private events: AgentSessionEvent[] = [];
  private resolvers: Array<(e: AgentSessionEvent) => void> = [];

  push(event: AgentSessionEvent): void {
    console.log(
      `[EventBuffer] push event #${this.events.length}:`,
      (event as { type?: string }).type ?? "unknown",
      `(${this.resolvers.length} waiting resolvers)`,
    );
    this.events.push(event);
    // Resolve any waiting iterators
    while (this.resolvers.length > 0) {
      const resolve = this.resolvers.shift()!;
      resolve(event);
    }
  }

  async *iter(fromIndex = 0): AsyncGenerator<AgentSessionEvent> {
    let index = fromIndex;
    while (true) {
      if (index < this.events.length) {
        yield this.events[index++];
      } else {
        // Wait for next event
        const event = await new Promise<AgentSessionEvent>((resolve) => {
          this.resolvers.push(resolve);
        });
        yield event;
        index++;
      }
    }
  }

  snapshot(): AgentSessionEvent[] {
    return [...this.events];
  }
}

export class AgentInstance {
  status: AgentStatus = "idle";
  error: string | undefined;
  private eventBuffer = new EventBuffer();
  private unsubscribe: (() => void) | undefined;

  constructor(
    readonly metadata: AgentMetadata,
    readonly sessionManager: SessionManager,
    readonly session: AgentSession,
  ) {
    // Subscribe directly to Pi events
    this.unsubscribe = session.subscribe((event) => {
      this.eventBuffer.push(event as AgentSessionEvent);
    });
  }

  dispose(): void {
    this.unsubscribe?.();
  }

  async prompt(text: string): Promise<void> {
    console.log(
      `[AgentInstance:${this.metadata.id}] prompt() called with text:`,
      text.slice(0, 50),
    );
    this.status = "streaming";
    this.error = undefined;
    try {
      await this.session.prompt(text);
      console.log(`[AgentInstance:${this.metadata.id}] prompt() completed successfully`);
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

  // Get all buffered events as async iterable
  get events(): AsyncIterable<AgentSessionEvent> {
    return this.eventBuffer.iter();
  }
}
