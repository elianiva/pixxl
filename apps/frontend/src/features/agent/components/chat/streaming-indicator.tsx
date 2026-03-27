export function StreamingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-muted-foreground">
        <div className="flex gap-1">
          <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:0ms]" />
          <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:150ms]" />
          <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:300ms]" />
        </div>
        <span className="text-xs">Thinking...</span>
      </div>
    </div>
  );
}
