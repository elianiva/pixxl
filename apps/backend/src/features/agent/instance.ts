import { type AgentSession, type SessionManager } from "@mariozechner/pi-coding-agent";
import { Effect, PubSub, Stream } from "effect";
import { generateId, type AgentEvent, type AgentMetadata } from "@pixxl/shared";
import type { AgentModel, AgentModelRef, AgentThinkingLevel } from "@pixxl/shared";
import { getModel } from "@mariozechner/pi-ai";

export type AgentStatus = "idle" | "streaming" | "error";

interface StreamingState {
  entryId: string;
  content: string;
  reasoning?: string;
  toolCalls: { name: string; params: unknown; output?: string; error?: string }[];
}

interface PendingOptimisticIds {
  userOptimisticId?: string;
  assistantOptimisticId?: string;
}

export class AgentInstance {
  status: AgentStatus = "idle";
  error: string | undefined;
  readonly events: PubSub.PubSub<AgentEvent>;
  private unsubscribe: (() => void) | undefined;
  private pendingIds: PendingOptimisticIds = {};
  private streamingState: StreamingState | null = null;

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
      if (!mapped) return;

      // Handle both single events and arrays of events
      const events = Array.isArray(mapped) ? mapped : [mapped];
      for (const ev of events) {
        Effect.runFork(PubSub.publish(this.events, ev));
      }
    });
  }

  dispose(): void {
    this.unsubscribe?.();
    Effect.runSync(PubSub.shutdown(this.events));
  }

  async prompt(text: string, optimisticIds?: PendingOptimisticIds): Promise<void> {
    this.status = "streaming";
    this.error = undefined;
    this.pendingIds = optimisticIds ?? {};

    try {
      await this.session.prompt(text);
      this.status = "idle";
    } catch (cause) {
      this.status = "error";
      this.error = String(cause);
    } finally {
      this.pendingIds = {};
    }
  }

  abort(): void {
    void this.session.abort();
  }

  setModel(model: AgentModelRef): Effect.Effect<void, Error> {
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

  // Subscribe with entry replay - for reconnection
  subscribeWithReplay(): Stream.Stream<AgentEvent> {
    const entries = this.sessionManager.getEntries();
    const liveStream = Stream.fromPubSub(this.events);

    // Build initial snapshot events from persisted entries
    const initialEvents: AgentEvent[] = [];
    for (const entry of entries) {
      initialEvents.push({
        type: "entry_added",
        sessionId: this.metadata.id,
        entry: entry as unknown as import("@pixxl/shared").PiSessionEntry,
      });
    }

    // If currently streaming, add synthetic entry for partial state
    if (this.status === "streaming" && this.streamingState) {
      // Find the parent entry (the user message)
      const parentEntry = entries.find((e) => e.id === this.streamingState?.entryId);
      if (parentEntry) {
        // Create synthetic assistant entry
        const syntheticEntry = {
          type: "message" as const,
          id: this.streamingState.entryId, // Will be replaced on update
          parentId: parentEntry.id,
          timestamp: new Date().toISOString(),
          message: {
            role: "assistant" as const,
            content: [{ type: "text" as const, text: this.streamingState.content }],
          },
        };
        initialEvents.push({
          type: "entry_added",
          sessionId: this.metadata.id,
          entry: syntheticEntry as unknown as import("@pixxl/shared").PiSessionEntry,
        });

        // Also emit status to indicate streaming
        initialEvents.push({
          type: "status_change",
          sessionId: this.metadata.id,
          status: "streaming",
        });
      }
    }

    // Concatenate: initial snapshot + live events
    return Stream.concat(Stream.fromIterable(initialEvents), liveStream);
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

  private mapPiEvent(piEvent: unknown): AgentEvent | AgentEvent[] | null {
    if (!piEvent || typeof piEvent !== "object") return null;
    const event = piEvent as { type?: string };

    switch (event.type) {
      case "message_update": {
        const msg = piEvent as { assistantMessageEvent?: { type?: string; delta?: unknown } };
        const assistantEvent = msg.assistantMessageEvent;

        // On first delta, emit user entry and start streaming
        if (!this.streamingState) {
          const entries = this.sessionManager.getEntries();
          const latestEntry = entries.at(-1);
          if (latestEntry?.type === "message" && latestEntry.message?.role === "user") {
            // Start tracking streaming state
            this.streamingState = {
              entryId: generateId(), // Will be the assistant entry ID
              content: "",
              toolCalls: [],
            };

            // Emit user entry added + streaming status
            const events: AgentEvent[] = [
              {
                type: "entry_added",
                sessionId: this.metadata.id,
                entry: latestEntry as unknown as import("@pixxl/shared").PiSessionEntry,
              },
              {
                type: "status_change",
                sessionId: this.metadata.id,
                status: "streaming",
              },
            ];

            // Then emit the delta with entryId
            if (assistantEvent?.type === "text_delta") {
              this.streamingState.content = String(assistantEvent.delta ?? "");
              events.push({
                type: "message_delta",
                sessionId: this.metadata.id,
                entryId: this.streamingState.entryId,
                delta: String(assistantEvent.delta ?? ""),
              });
            } else if (assistantEvent?.type === "thinking_delta") {
              this.streamingState.reasoning = String(assistantEvent.delta ?? "");
              events.push({
                type: "thinking_delta",
                sessionId: this.metadata.id,
                entryId: this.streamingState.entryId,
                delta: String(assistantEvent.delta ?? ""),
              });
            }

            return events;
          }
        }

        // Normal delta handling when already streaming
        if (assistantEvent?.type === "text_delta") {
          if (this.streamingState) {
            this.streamingState.content += String(assistantEvent.delta ?? "");
          }
          return {
            type: "message_delta",
            sessionId: this.metadata.id,
            entryId: this.streamingState?.entryId ?? "",
            delta: String(assistantEvent.delta ?? ""),
          };
        }
        if (assistantEvent?.type === "thinking_delta") {
          if (this.streamingState) {
            this.streamingState.reasoning =
              (this.streamingState.reasoning ?? "") + String(assistantEvent.delta ?? "");
          }
          return {
            type: "thinking_delta",
            sessionId: this.metadata.id,
            entryId: this.streamingState?.entryId ?? "",
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

        const events: AgentEvent[] = [];
        const entries = this.sessionManager.getEntries();
        const latestEntry = entries.at(-1);

        // Emit entry_added for the assistant message
        // This replaces any synthetic partial entry
        if (
          latestEntry &&
          latestEntry.type === "message" &&
          latestEntry.message?.role === "assistant"
        ) {
          events.push({
            type: "entry_added",
            sessionId: this.metadata.id,
            entry: latestEntry as unknown as import("@pixxl/shared").PiSessionEntry,
          });
        }

        // Clear streaming state
        this.streamingState = null;

        // Emit status change LAST so entry_added events are yielded first
        events.push({
          type: "status_change",
          sessionId: this.metadata.id,
          status: msg.message.stopReason === "error" ? "error" : "idle",
        });

        // Publish all events - order matters: entry_added before status_change
        for (const ev of events) {
          Effect.runFork(PubSub.publish(this.events, ev));
        }

        // Return null - all events already published above
        return null;
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
