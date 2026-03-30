import { memo } from "react";
import { UserMessageEntry } from "./user-message";
import { AssistantMessageEntry } from "./assistant-message";
import {
  ModelChangeEntry,
  ThinkingLevelEntry,
  CompactionEntry,
  BranchSummaryEntry,
  LabelEntry,
  SessionInfoEntry,
} from "./system-entries";
import type { SessionEntryProps } from "./types";

export const SessionEntry = memo(function SessionEntry({
  entry,
  isStreaming,
  allEntries,
}: SessionEntryProps) {
  switch (entry.type) {
    case "message": {
      const msg = entry.message as { role?: string } | undefined;
      const role = msg?.role;

      if (role === "user") {
        const content = (msg as { content?: unknown }).content;
        return <UserMessageEntry content={content} />;
      }

      if (role === "assistant") {
        // For assistant messages, we need all entries to look up tool results
        // This is a simplified approach - in message-list.tsx we'd pass entries down
        return (
          <AssistantMessageEntry entry={entry} isStreaming={isStreaming} allEntries={allEntries} />
        );
      }

      return null;
    }

    case "model_change":
      return <ModelChangeEntry entry={entry} />;

    case "thinking_level_change":
      return <ThinkingLevelEntry entry={entry} />;

    case "compaction":
      return <CompactionEntry entry={entry} />;

    case "branch_summary":
      return <BranchSummaryEntry />;

    case "label":
      return <LabelEntry entry={entry} />;

    case "session_info":
      return <SessionInfoEntry entry={entry} />;

    case "custom":
    case "custom_message":
      return null;

    default:
      return null;
  }
});

export * from "./types";
