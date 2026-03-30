import { RiCommandLine } from "@remixicon/react";
import { Tool, ToolHeader, ToolContent, ToolInput } from "@/components/ai-elements/tool";
import { CodeBlock } from "@/components/ai-elements/code-block";

interface CustomToolBlockProps {
  name: string;
  args: Record<string, unknown>;
  isStreaming: boolean;
  result?: { output?: string; error?: string; isError: boolean };
  toolCount: number;
}

export function CustomToolBlock({
  name,
  args,
  isStreaming,
  result,
  toolCount,
}: CustomToolBlockProps) {
  const hasResult = !!result;
  const isError = result?.isError ?? false;
  const isPending = !hasResult && isStreaming;

  const state = isPending ? "input-available" : isError ? "output-error" : "output-available";

  // If only one tool, render directly with minimal UI
  if (toolCount === 1) {
    return (
      <div className="mb-4 p-2.5 border border-border rounded-md bg-card">
        <div className="flex items-center gap-2 text-sm">
          <RiCommandLine className="size-4 text-muted-foreground" />
          <span className="font-medium">{name}</span>
          {isPending && <span className="text-xs text-muted-foreground">Running...</span>}
        </div>
        <ToolInput input={args} />
        {result?.output && (
          <div className="mt-2 pt-2 border-t border-border">
            <CodeBlock code={result.output} language="json" className="text-xs" />
          </div>
        )}
        {result?.error && (
          <div className="mt-2 pt-2 border-t border-destructive text-destructive text-xs">
            {result.error}
          </div>
        )}
      </div>
    );
  }

  return (
    <Tool className="mb-4" defaultOpen>
      <ToolHeader type="dynamic-tool" state={state} toolName={name} />
      <ToolContent>
        <ToolInput input={args} />
        {result?.output && (
          <div className="mt-2 pt-2 border-t border-border">
            <span className="text-xs text-muted-foreground">Result</span>
            <CodeBlock code={result.output} language="json" className="mt-1 text-xs" />
          </div>
        )}
        {result?.error && (
          <div className="mt-2 pt-2 border-t border-destructive">
            <span className="text-xs text-destructive">Error</span>
            <div className="mt-1 text-xs text-destructive">{result.error}</div>
          </div>
        )}
      </ToolContent>
    </Tool>
  );
}
