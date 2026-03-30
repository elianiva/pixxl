import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { SessionEntry } from "./session-entry";
import type { PiSessionEntry } from "@pixxl/shared";

interface MessageListProps {
  entries: readonly PiSessionEntry[];
  isStreaming: boolean;
}

const ESTIMATED_ITEM_HEIGHT = 80;
const OVERSCAN = 5;

export function MessageList({ entries, isStreaming }: MessageListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ESTIMATED_ITEM_HEIGHT,
    overscan: OVERSCAN,
    measureElement: (element: HTMLElement) => element.getBoundingClientRect().height,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const shouldVirtualize = entries.length > 20;

  if (!shouldVirtualize) {
    return (
      <div className="space-y-1">
        {entries.map((entry) => (
          <SessionEntry
            key={entry.id}
            entry={entry}
            isStreaming={isStreaming}
            allEntries={entries}
          />
        ))}
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
            const entry = entries[virtualRow.index];
            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
              >
                <SessionEntry entry={entry} isStreaming={isStreaming} allEntries={entries} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
