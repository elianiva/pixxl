interface UserMessageEntryProps {
  content: unknown;
}

export function UserMessageEntry({ content }: UserMessageEntryProps) {
  const text = typeof content === "string" ? content : "";
  return (
    <div className="flex justify-end">
      <div className="max-w-4/5 bg-accent/50 border border-accent px-3 py-2 rounded-lg">
        <p className="whitespace-pre-wrap break-words">{text}</p>
      </div>
    </div>
  );
}
