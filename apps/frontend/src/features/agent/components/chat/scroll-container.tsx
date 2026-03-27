import { useCallback, useRef, useState, type ReactNode } from "react";
import { ScrollArea, ScrollAreaViewport } from "@/components/ui/scroll-area";
import { ScrollToBottomButton } from "./scroll-button";

interface ChatScrollContainerProps {
  children: ReactNode;
  className?: string;
}

export function ChatScrollContainer({ children, className }: ChatScrollContainerProps) {
  const [isScrollButtonVisible, setIsScrollButtonVisible] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const isNearBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 100;
    setIsScrollButtonVisible(!isNearBottom);
  }, []);

  const scrollToBottom = useCallback(() => {
    viewportRef.current?.scrollTo({
      top: viewportRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, []);

  return (
    <>
      <ScrollArea className={className}>
        <ScrollAreaViewport ref={viewportRef} onScroll={handleScroll}>
          {children}
        </ScrollAreaViewport>
      </ScrollArea>
      {isScrollButtonVisible && <ScrollToBottomButton onClick={scrollToBottom} />}
    </>
  );
}
