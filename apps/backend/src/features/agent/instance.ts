import { type AgentSession, type SessionManager } from "@mariozechner/pi-coding-agent";
import { Effect, PubSub, Stream } from "effect";
import type { AgentEvent, AgentMetadata } from "@pixxl/shared";
import type { AgentModel, AgentThinkingLevel } from "@pixxl/shared";
import { getModel } from "@mariozechner/pi-ai";

export type AgentStatus = "idle" | "streaming" | "error";

export class AgentInstance {
  status: AgentStatus = "idle";
  error: string | undefined;
  readonly events: PubSub.PubSub<AgentEvent>;
  private unsubscribe: (() => void) | undefined;

  constructor(
    readonly metadata: AgentMetadata,
    readonly sessionManager: SessionManager,
    readonly session: AgentSession,
  ) {
    // Unbounded pubsub for fan-out to multiple clients
    this.events = Effect.runSync(PubSub.unbounded<AgentEvent>());

    // Subscribe to Pi events and fan out
    this.unsubscribe = session.subscribe((event) => {
      const mapped = this.mapPiEvent(event);
      if (mapped) {
        Effect.runFork(PubSub.publish(this.events, mapped));
      }
    });
  }

  dispose(): void {
    this.unsubscribe?.();
    Effect.runSync(PubSub.shutdown(this.events));
  }

  async prompt(text: string): Promise<void> {
    this.status = "streaming";
    this.error = undefined;

    try {
      await this.session.prompt(text);
      this.status = "idle";
    } catch (cause) {
      this.status = "error";
      this.error = String(cause);
    }
  }

  abort(): void {
    void this.session.abort();
  }

  setModel(model: AgentModel): Effect.Effect<void, Error> {
    return Effect.tryPromise({
      try: () => this.session.setModel(getModel(model.provider as never, model.id as never)),
      catch: (cause) => new Error(`Failed to set model: ${String(cause)}`),
    });
  }

  setThinkingLevel(level: AgentThinkingLevel): void {
    this.session.setThinkingLevel(level);
  }

  subscribe(): Stream.Stream<AgentEvent> {
    return Stream.fromPubSub(this.events);
  }

  get queuedSteering(): readonly string[] {
    return this.session.getSteeringMessages() ?? [];
  }

  get queuedFollowUp(): readonly string[] {
    return this.session.getFollowUpMessages() ?? [];
  }

  get currentModel(): { provider: string; id: string; name: string } | undefined {
    const model = this.session.model;
    if (!model) return undefined;
    return {
      provider: String(model.provider),
      id: String(model.id),
      name: String(model.name ?? model.id),
    };
  }

  get thinkingLevel(): AgentThinkingLevel {
    return this.session.supportsThinking()
      ? (String(this.session.thinkingLevel) as AgentThinkingLevel)
      : "off";
  }

  private mapPiEvent(piEvent: unknown): AgentEvent | null {
    if (!piEvent || typeof piEvent !== "object") return null;
    const event = piEvent as { type?: string };

    switch (event.type) {
      case "message_update": {
        const msg = piEvent as { assistantMessageEvent?: { type?: string; delta?: unknown } };
        const assistantEvent = msg.assistantMessageEvent;
        if (assistantEvent?.type === "text_delta") {
          return {
            type: "message_delta",
            sessionId: this.metadata.id,
            delta: String(assistantEvent.delta ?? ""),
          };
        }
        if (assistantEvent?.type === "thinking_delta") {
          return {
            type: "thinking_delta",
            sessionId: this.metadata.id,
            delta: String(assistantEvent.delta ?? ""),
          };
        }
        return null;
      }

      case "message_end": {
        const msg = piEvent as {
          message?: { role?: unknown; stopReason?: unknown; errorMessage?: unknown };
        };
        if (msg.message?.role !== "assistant") return null;

        return {
          type: "status_change",
          sessionId: this.metadata.id,
          status: msg.message.stopReason === "error" ? "error" : "idle",
        };
      }

      case "tool_execution_start": {
        const tool = piEvent as { toolName?: unknown; args?: unknown };
        return {
          type: "tool_start",
          sessionId: this.metadata.id,
          toolName: String(tool.toolName ?? "unknown"),
          params: tool.args ?? {},
        };
      }

      case "tool_execution_update": {
        const update = piEvent as { partialResult?: unknown };
        const output = this.extractToolOutput(update.partialResult);
        if (!output) return null;
        return {
          type: "tool_update",
          sessionId: this.metadata.id,
          output,
        };
      }

      case "tool_execution_end": {
        const end = piEvent as { result?: unknown; isError?: boolean };
        return {
          type: "tool_end",
          sessionId: this.metadata.id,
          result: end.result ?? null,
          error: end.isError ? this.extractErrorMessage(end.result) : undefined,
        };
      }

      case "auto_compaction_end": {
        const compact = piEvent as { errorMessage?: string };
        if (compact.errorMessage) {
          return {
            type: "error",
            sessionId: this.metadata.id,
            message: compact.errorMessage,
          };
        }
        return null;
      }

      default:
        return null;
    }
  }

  private extractToolOutput(partialResult: unknown): string | null {
    if (typeof partialResult === "string") return partialResult;
    if (!partialResult || typeof partialResult !== "object") return null;

    const value = partialResult as { content?: unknown; output?: unknown; details?: unknown };

    if (Array.isArray(value.content)) {
      const text = value.content
        .filter((c) => c?.type === "text")
        .map((c) => c.text)
        .join("");
      if (text) return text;
    }

    if (typeof value.output === "string") return value.output;
    if (typeof value.details === "string") return value.details;

    return null;
  }

  private extractErrorMessage(value: unknown): string | undefined {
    if (typeof value === "string") return value;
    if (value instanceof Error) return value.message;
    if (!value || typeof value !== "object") return undefined;

    const err = value as { message?: unknown; errorMessage?: unknown };
    if (typeof err.errorMessage === "string" && err.errorMessage) return err.errorMessage;
    if (typeof err.message === "string" && err.message) return err.message;

    return undefined;
  }
}
