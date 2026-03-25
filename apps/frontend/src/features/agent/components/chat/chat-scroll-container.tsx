import { useCallback, useRef, useState, type ReactNode } from "react";
import { ScrollToBottomButton } from "./scroll-to-bottom-button";

interface ChatScrollContainerProps {
  children: ReactNode;
  className?: string;
}

export function ChatScrollContainer({ children, className }: ChatScrollContainerProps) {
  const [isScrollButtonVisible, setIsScrollButtonVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    setIsScrollButtonVisible(!isNearBottom);
  }, []);

  const scrollToBottom = useCallback(() => {
    containerRef.current?.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, []);

  return (
    <>
      <div ref={containerRef} onScroll={handleScroll} className={className}>
        {children}
      </div>
      {isScrollButtonVisible && <ScrollToBottomButton onClick={scrollToBottom} />}
    </>
  );
}
