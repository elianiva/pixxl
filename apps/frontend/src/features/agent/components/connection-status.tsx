import { cn } from "@/lib/utils";

type ConnectionStatus = "idle" | "streaming" | "error";

interface ConnectionStatusProps {
  status: ConnectionStatus;
}

export function ConnectionStatus({ status }: ConnectionStatusProps) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span
        className={cn(
          "size-1.5 rounded-full",
          status === "idle" && "bg-muted-foreground",
          status === "streaming" && "animate-pulse bg-green-500",
          status === "error" && "bg-destructive",
        )}
      />
      <span>
        {status === "idle" && "Ready"}
        {status === "streaming" && "Streaming"}
        {status === "error" && "Error"}
      </span>
    </div>
  );
}
