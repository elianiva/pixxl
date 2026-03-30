import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { MessageBubble } from "./message-bubble";
import { ActionItem } from "./action-item";
import type { Message, TimelineItem, ActionItem as ActionItemType } from "../../hooks";

interface TimelineProps {
  items: TimelineItem[];
  isStreaming: boolean;
  onFork?: (content: string) => void;
}

type DisplayMessage = Message;
type DisplayAction = { kind: "action"; id: string; action: ActionItemType["action"] };
type DisplayItem = DisplayMessage | DisplayAction;

function isDisplayAction(item: DisplayItem): item is DisplayAction {
  return "kind" in item && item.kind === "action";
}

function actionsEqual(a: ActionItemType["action"], b: ActionItemType["action"]): boolean {
  if (a.type !== b.type) return false;

  switch (a.type) {
    case "model_change":
      return (
        a.provider === (b as Extract<typeof a, { type: "model_change" }>).provider &&
        a.modelId === (b as Extract<typeof a, { type: "model_change" }>).modelId
      );
    case "thinking_level_change":
      return (
        a.thinkingLevel ===
        (b as Extract<typeof a, { type: "thinking_level_change" }>).thinkingLevel
      );
    case "compaction":
      return (
        a.firstKeptEntryId === (b as Extract<typeof a, { type: "compaction" }>).firstKeptEntryId
      );
    case "branch_summary":
      return a.fromId === (b as Extract<typeof a, { type: "branch_summary" }>).fromId;
    case "session_info":
      return a.name === (b as Extract<typeof a, { type: "session_info" }>).name;
    case "label":
      return (
        a.targetId === (b as Extract<typeof a, { type: "label" }>).targetId &&
        a.label === (b as Extract<typeof a, { type: "label" }>).label
      );
    case "custom":
      return a.customType === (b as Extract<typeof a, { type: "custom" }>).customType;
    case "custom_message":
      return a.customType === (b as Extract<typeof a, { type: "custom_message" }>).customType;
    default:
      return false;
  }
}

/**
 * Process timeline items for display:
 * - Merge consecutive assistant messages
 * - Deduplicate consecutive identical actions
 * - Actions remain as-is (interleaved)
 */
function processTimelineItems(items: TimelineItem[]): DisplayItem[] {
  const result: DisplayItem[] = [];
  let currentAssistantGroup: Message[] = [];
  let lastAction: DisplayAction | undefined;

  const flushAssistantGroup = () => {
    if (currentAssistantGroup.length === 0) return;

    if (currentAssistantGroup.length === 1) {
      result.push(currentAssistantGroup[0]);
    } else {
      const mergedContent: string[] = [];
      const mergedToolCalls: NonNullable<Message["toolCalls"]> = [];
      const mergedBlocks: NonNullable<Message["blocks"]> = [];

      for (const msg of currentAssistantGroup) {
        if (msg.content) mergedContent.push(msg.content);
        if (msg.toolCalls) mergedToolCalls.push(...msg.toolCalls);
        if (msg.blocks) mergedBlocks.push(...msg.blocks);
      }

      result.push({
        id: currentAssistantGroup[0].id,
        role: "assistant",
        content: mergedContent.join(""),
        isStreaming: currentAssistantGroup.some((m) => m.isStreaming),
        toolCalls: mergedToolCalls.length > 0 ? mergedToolCalls : undefined,
        blocks: mergedBlocks.length > 0 ? mergedBlocks : undefined,
      });
    }

    currentAssistantGroup = [];
  };

  for (const item of items) {
    if (item.kind === "action") {
      flushAssistantGroup();

      const newAction: DisplayAction = {
        kind: "action",
        id: item.data.id,
        action: item.data.action,
      };

      // Skip if identical to last action
      if (lastAction && actionsEqual(lastAction.action, newAction.action)) {
        continue;
      }

      lastAction = newAction;
      result.push(newAction);
    } else {
      lastAction = undefined;
      const message = item.data;
      if (message.role === "assistant") {
        currentAssistantGroup.push(message);
      } else {
        flushAssistantGroup();
        result.push(message);
      }
    }
  }

  flushAssistantGroup();
  return result;
}

// Estimate height for initial render (will be adjusted dynamically)
const ESTIMATED_ITEM_HEIGHT = 80;
// Number of items to render outside viewport
const OVERSCAN = 5;

export function Timeline({ items, isStreaming, onFork }: TimelineProps) {
  const processedItems = processTimelineItems(items);
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: processedItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ESTIMATED_ITEM_HEIGHT,
    overscan: OVERSCAN,
    // Dynamic measurement for variable height content
    measureElement: (element: HTMLElement) => element.getBoundingClientRect().height,
  });

  const virtualItems = virtualizer.getVirtualItems();

  // Don't virtualize if small number of items (prevents unnecessary overhead)
  const shouldVirtualize = processedItems.length > 20;

  if (!shouldVirtualize) {
    return (
      <div className="space-y-1">
        {processedItems.map((item) =>
          isDisplayAction(item) ? (
            <ActionItem key={item.id} action={item.action} />
          ) : (
            <MessageBubble key={item.id} message={item} onFork={onFork} />
          ),
        )}
      </div>
    );
  }

  return (
    <div ref={parentRef} className="space-y-1 overflow-hidden">
      <div
        style={{
          height: virtualizer.getTotalSize(),
          width: "100%",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            transform: `translateY(${virtualItems[0]?.start ?? 0}px)`,
          }}
        >
          {virtualItems.map((virtualRow) => {
            const item = processedItems[virtualRow.index];
            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
              >
                {isDisplayAction(item) ? (
                  <ActionItem action={item.action} />
                ) : (
                  <MessageBubble message={item} onFork={onFork} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Kept as alias for migration convenience
export const MessageList = Timeline;
