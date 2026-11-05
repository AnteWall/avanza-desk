import { useSuspenseQuery } from "@tanstack/react-query";

import { Change } from "@/components/common/change";
import { Empty } from "@/components/common/empty";
import { notesQuery } from "@/lib/avanza/queries";
import { formatDate, formatPrice } from "@/lib/format";
import { m } from "@/lib/i18n";

/** Your notes on one instrument, newest first, with the price move since each. Suspends. */
export function InstrumentNotes({ orderbookId }: { orderbookId: string }) {
  const { data } = useSuspenseQuery(notesQuery(orderbookId));
  const notes = [...data].sort((a, b) => b.createdDate.localeCompare(a.createdDate));

  if (notes.length === 0) return <Empty>{m.workspace.notes.empty}</Empty>;
  return (
    <ul className="flex flex-col">
      {notes.map((note) => (
        <li key={note.noteId} className="flex flex-col gap-1 border-b px-3 py-2">
          <p className="text-muted-foreground flex items-center gap-3 text-xs">
            <span className="num">{formatDate(note.createdDate)}</span>
            <span className="num">
              {m.workspace.notes.at(`${formatPrice(note.originalPrice)} ${note.currency}`)}
            </span>
            {/* Avanza sends percent units; Change takes a ratio. */}
            <span>
              {m.workspace.notes.since(
                <Change key="change" ratio={note.priceDevelopmentPercentage / 100} />,
              )}
            </span>
            {note.reminderDate && (
              <span className="num">
                {m.workspace.notes.reminder(formatDate(note.reminderDate))}
              </span>
            )}
          </p>
          <p className="whitespace-pre-wrap">{note.text}</p>
        </li>
      ))}
    </ul>
  );
}
