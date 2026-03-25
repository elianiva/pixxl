import { RiMessage2Line } from "@remixicon/react";

export function EmptyChatState() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <div className="mb-4 bg-muted p-3">
        <RiMessage2Line className="size-6 text-muted-foreground" />
      </div>
      <h3 className="mb-1 font-medium text-foreground">Start a conversation</h3>
      <p className="max-w-xs text-sm text-muted-foreground leading-loose">
        Ask questions, get help with code, or explore your project with AI assistance.
      </p>
    </div>
  );
}
