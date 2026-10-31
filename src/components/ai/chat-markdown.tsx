import { openUrl } from "@tauri-apps/plugin-opener";
import { cn } from "cn";
import { isValidElement, memo } from "react";
import Markdown, { type Components, defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";

import { AnswerBlockView } from "@/components/ai/answer-block";
import { AppLink } from "@/components/ai/app-link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BLOCK_LANGUAGES } from "@/lib/ai/blocks";
import { parseAppLink, PRIVATE, SCHEME } from "@/lib/ai/links";

// A cell that is only a number, percentage or amount: "1 234,50", "+2,3 %", "48 300 kr".
const NUMERIC = /^[+\-−]?[\d\s  .,]+\s?(%|kr|sek|usd|eur|nok|dkk)?$/i;
const isNumeric = (children: unknown): boolean =>
  isValidElement<{ children?: unknown }>(children)
    ? isNumeric(children.props.children) // a private amount: [48 300 kr](avanza:private)
    : typeof children === "string" && NUMERIC.test(children.trim());

// Claude's markdown drawn with the app's tokens and density (DESIGN.md): no prose plugin,
// tables use the shared table primitives and numbers get `num`.
const components: Components = {
  p: ({ children }) => <p className="leading-relaxed">{children}</p>,
  h1: ({ children }) => <h3 className="text-sm font-semibold">{children}</h3>,
  h2: ({ children }) => <h3 className="text-sm font-semibold">{children}</h3>,
  h3: ({ children }) => (
    <h4 className="text-xs font-semibold tracking-wider uppercase">{children}</h4>
  ),
  h4: ({ children }) => <h4 className="font-medium">{children}</h4>,
  ul: ({ children }) => (
    <ul className="marker:text-muted-foreground list-disc space-y-1 pl-5">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="marker:text-muted-foreground list-decimal space-y-1 pl-5">{children}</ol>
  ),
  li: ({ children }) => <li className="pl-0.5 leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="text-muted-foreground not-italic">{children}</em>,
  blockquote: ({ children }) => (
    <blockquote className="text-muted-foreground border-l-2 pl-3">{children}</blockquote>
  ),
  hr: () => <hr className="border-border/60" />,
  // Never load an image the model names: its URL could carry the user's data off to any server.
  img: ({ alt }) => <>{alt}</>,
  a: ({ href, children }) => {
    if (href === PRIVATE) return <span className="sensitive">{children}</span>;
    const link = parseAppLink(href);
    if (link) return <AppLink link={link}>{children}</AppLink>;
    return (
      <a
        href={href}
        className="text-brand decoration-brand/40 hover:decoration-brand underline underline-offset-2"
        onClick={(e) => {
          // The webview must never navigate away from the app; links open in the browser.
          e.preventDefault();
          if (href?.startsWith("https://")) void openUrl(href);
        }}
      >
        {children}
      </a>
    );
  },
  code: ({ className, children }) =>
    className ? (
      <code className={className}>{children}</code>
    ) : (
      <code className="num bg-muted rounded-sm px-1 py-0.5 text-xs">{children}</code>
    ),
  pre: ({ children }) => {
    // ```chart and ```instrument blocks become live charts and cards (blocks.ts).
    const code = isValidElement<{ className?: string; children?: unknown }>(children)
      ? children.props
      : undefined;
    const language = code?.className?.replace(/^language-/, "") ?? "";
    if (BLOCK_LANGUAGES.has(language)) {
      return <AnswerBlockView language={language} code={String(code?.children ?? "")} />;
    }
    return (
      <pre className="num bg-muted/40 overflow-x-auto rounded-md border p-2 text-xs leading-relaxed">
        {children}
      </pre>
    );
  },
  table: ({ children }) => (
    <div className="overflow-x-auto rounded-md border">
      <Table>{children}</Table>
    </div>
  ),
  thead: ({ children }) => <TableHeader className="bg-muted/40">{children}</TableHeader>,
  tbody: ({ children }) => <TableBody>{children}</TableBody>,
  tr: ({ children }) => <TableRow>{children}</TableRow>,
  th: ({ children, style }) => <TableHead style={style}>{children}</TableHead>,
  td: ({ children, style }) => (
    <TableCell style={style} className={cn(isNumeric(children) && "num text-right")}>
      {children}
    </TableCell>
  ),
};

const plugins = [remarkGfm];

// react-markdown drops unknown URL schemes; keep the app's own links (links.ts).
const urlTransform = (url: string) => (url.startsWith(SCHEME) ? url : defaultUrlTransform(url));

/** Renders Claude's markdown. Memoized: while streaming only the growing message re-renders. */
export const ChatMarkdown = memo(function ChatMarkdown({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-2.5 break-words">
      <Markdown remarkPlugins={plugins} components={components} urlTransform={urlTransform}>
        {text}
      </Markdown>
    </div>
  );
});
