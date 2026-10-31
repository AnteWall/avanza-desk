import { useCallback, useEffect, useRef, useState } from "react";

// Within this many pixels of the end counts as "at the bottom".
const SLACK = 48;

/**
 * Keeps a scroll area pinned to its end while content grows (a streaming answer), unless you
 * scrolled up to read; `atBottom` drives the "jump to latest" button.
 */
export function useStickToBottom<S extends HTMLElement, C extends HTMLElement>() {
  const scrollRef = useRef<S>(null);
  const contentRef = useRef<C>(null);
  const stick = useRef(true);
  const [atBottom, setAtBottom] = useState(true);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    stick.current = true;
    setAtBottom(true);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    const content = contentRef.current;
    if (!el || !content) return;
    const onScroll = () => {
      const bottom = el.scrollHeight - el.scrollTop - el.clientHeight <= SLACK;
      stick.current = bottom;
      setAtBottom(bottom);
    };
    const grow = new ResizeObserver(() => {
      if (stick.current) el.scrollTop = el.scrollHeight;
    });
    el.addEventListener("scroll", onScroll, { passive: true });
    grow.observe(content);
    return () => {
      el.removeEventListener("scroll", onScroll);
      grow.disconnect();
    };
  }, []);

  return { scrollRef, contentRef, atBottom, scrollToBottom };
}
