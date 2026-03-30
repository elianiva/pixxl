import { RiSettings3Line, RiBrainLine, RiGitBranchLine, RiPriceTagLine } from "@remixicon/react";
import type { PiSessionEntry } from "@pixxl/shared";

export function ModelChangeEntry({ entry }: { entry: PiSessionEntry & { type: "model_change" } }) {
  return (
    <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
      <RiSettings3Line className="size-3" />
      <span>
        Model changed to {entry.provider}/{entry.modelId}
      </span>
    </div>
  );
}

export function ThinkingLevelEntry({
  entry,
}: {
  entry: PiSessionEntry & { type: "thinking_level_change" };
}) {
  return (
    <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
      <RiBrainLine className="size-3" />
      <span>Thinking level: {entry.thinkingLevel}</span>
    </div>
  );
}

export function CompactionEntry({ entry }: { entry: PiSessionEntry & { type: "compaction" } }) {
  return (
    <div className="flex items-center justify-center py-2 text-xs text-muted-foreground">
      <span>Context compacted ({entry.tokensBefore} tokens → summary)</span>
    </div>
  );
}

export function BranchSummaryEntry() {
  return (
    <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
      <RiGitBranchLine className="size-3" />
      <span>Branch summary</span>
    </div>
  );
}

export function LabelEntry({ entry }: { entry: PiSessionEntry & { type: "label" } }) {
  return (
    <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
      <RiPriceTagLine className="size-3" />
      <span>{entry.label ? `Labeled: ${entry.label}` : "Label removed"}</span>
    </div>
  );
}

export function SessionInfoEntry({ entry }: { entry: PiSessionEntry & { type: "session_info" } }) {
  if (!entry.name) return null;
  return (
    <div className="flex items-center justify-center py-2 text-xs text-muted-foreground">
      <span>Session: {entry.name}</span>
    </div>
  );
}
