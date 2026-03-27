import { Button } from "@/components/ui/button";

interface ScrollToBottomButtonProps {
  onClick: () => void;
}

export function ScrollToBottomButton({ onClick }: ScrollToBottomButtonProps) {
  return (
    <Button
      variant="outline"
      size="icon"
      className="absolute bottom-32 right-4 z-10 size-8 rounded-full shadow-md"
      onClick={onClick}
    >
      <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          d="M19 14l-7 7m0 0l-7-7m7 7V3"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
        />
      </svg>
    </Button>
  );
}
