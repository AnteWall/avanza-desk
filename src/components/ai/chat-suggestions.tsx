import { ArrowUpRight } from "lucide-react";

const suggestions = [
  "How is my portfolio doing today?",
  "What are my largest holdings and how concentrated am I?",
  "Summarize the latest news on my holdings",
  "Do I have any open orders?",
];

/** The empty chat: one line of context and a few questions to start from. */
export function ChatSuggestions({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground">
        Ask about your holdings, orders, an instrument or the news. The assistant reads your account
        but can't trade.
      </p>
      <ul className="flex flex-col">
        {suggestions.map((text) => (
          <li key={text}>
            <button
              type="button"
              onClick={() => onPick(text)}
              className="hover:bg-muted/60 focus-visible:ring-ring/50 group flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left transition-colors outline-none focus-visible:ring-3"
            >
              <span className="flex-1">{text}</span>
              <ArrowUpRight
                className="text-muted-foreground size-3.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                aria-hidden
              />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
