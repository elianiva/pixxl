import { Terminal } from "lucide-react";

interface BashToolProps {
  command: string;
  output?: string;
  error?: string;
  status: "running" | "complete" | "error";
}

export function BashToolDisplay({ command, output, error, status }: BashToolProps) {
  return (
    <div className="rounded-md border bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
        <Terminal className="h-4 w-4 text-white/70" />
        <code className="text-sm text-white/90 truncate flex-1">$ {command}</code>
        {status === "running" && (
          <span className="text-xs text-yellow-400 animate-pulse">running...</span>
        )}
        {status === "complete" && <span className="text-xs text-green-400">done</span>}
        {status === "error" && <span className="text-xs text-red-400">failed</span>}
      </div>

      {/* Output */}
      <div className="p-3 font-mono text-sm text-white/80 max-h-64 overflow-auto">
        {output ? (
          <pre className="whitespace-pre-wrap break-all">{output}</pre>
        ) : status === "running" ? (
          <span className="text-white/40 italic">Waiting for output...</span>
        ) : (
          <span className="text-white/40 italic">No output</span>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="border-t border-red-500/30 bg-red-500/10 px-3 py-2">
          <span className="text-xs text-red-400 font-medium">Error:</span>
          <pre className="text-xs text-red-300 mt-1 whitespace-pre-wrap">{error}</pre>
        </div>
      )}
    </div>
  );
}
