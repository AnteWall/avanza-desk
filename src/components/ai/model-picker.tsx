import { useNavigate } from "@tanstack/react-router";
import { cn } from "cn";
import { Check, ChevronRight, ChevronsUpDown, CircleDashed, Search, Settings } from "lucide-react";
import { useState, type KeyboardEvent, type ReactNode } from "react";

import { ProviderLogo } from "@/components/ai/provider-logo";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import type { ModelOption, Provider } from "@/lib/ai/types";
import { m } from "@/lib/i18n";

/** One provider's models, as its setup reported them. */
export type ModelSource = { provider: Provider; models: ModelOption[]; defaultModel?: string };

export type Selection = { provider: Provider; model: string | undefined };

/** Arrow keys move between the rows (search box included), like a menu. */
function moveFocus(e: KeyboardEvent<HTMLDivElement>) {
  if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
  const rows = [...e.currentTarget.querySelectorAll<HTMLElement>("[data-row]")];
  const at = rows.indexOf(document.activeElement as HTMLElement);
  const next = rows[at + (e.key === "ArrowDown" ? 1 : -1)];
  if (!next) return;
  e.preventDefault();
  next.focus();
}

function Row({
  onClick,
  children,
  selected,
  expanded,
  className,
}: {
  onClick: () => void;
  children: ReactNode;
  selected?: boolean;
  /** Set on a row that folds a list open. */
  expanded?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      data-row
      onClick={onClick}
      aria-pressed={selected}
      aria-expanded={expanded}
      className={cn(
        "hover:bg-muted/60 focus-visible:bg-muted/60 flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors outline-none",
        selected && "bg-accent",
        className,
      )}
    >
      {children}
    </button>
  );
}

/**
 * The model chip in the message box and its popover. One provider lists its models; several get
 * a folding group each, the one in use open. Older models fold under "More models", and search
 * looks through every provider at once. Picking a model of another provider switches provider;
 * picking one of the same keeps the conversation.
 */
export function ModelPicker({
  sources,
  selection,
  onSelect,
  efforts,
  effort,
  onEffort,
  temporary,
  onTemporary,
}: {
  sources: ModelSource[];
  selection: Selection;
  onSelect: (selection: Selection) => void;
  /** The selected model's effort levels; none hides the effort row. */
  efforts?: string[];
  /** Undefined: the model's default. */
  effort?: string;
  onEffort: (effort: string | undefined) => void;
  temporary: boolean;
  onTemporary: (on: boolean) => void;
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  // The provider whose group is open, and the one whose older models show.
  const [openGroup, setOpenGroup] = useState<string>();
  const [moreOf, setMoreOf] = useState<string>();

  const source = sources.find((s) => s.provider === selection.provider);
  const current = selection.model ?? source?.defaultModel;
  const label = source?.models.find((m) => m.value === current)?.label ?? selection.provider.name;

  const entries = sources.flatMap((s) => s.models.map((model) => ({ ...s, model })));
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = entries.filter(({ provider, model }) =>
    words.every((w) => `${provider.name} ${model.label}`.toLowerCase().includes(w)),
  );
  const latest = words.length ? matches : matches.filter((e) => !e.model.legacy);
  const grouped = sources.length > 1 && !words.length;

  const pick = (provider: Provider, model: string) => {
    onSelect({ provider, model });
    setOpen(false);
    setQuery("");
  };

  const modelRow = (
    { provider, model, defaultModel }: (typeof entries)[number],
    logo = !grouped,
  ) => {
    const selected = provider === selection.provider && model.value === current;
    return (
      <Row
        key={`${provider.id}:${model.value}`}
        selected={selected}
        onClick={() => pick(provider, model.value)}
      >
        {logo && <ProviderLogo provider={provider} className="size-3.5" />}
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-center gap-1.5">
            {model.label}
            {model.value === defaultModel && (
              <span className="text-brand text-xs">{m.ai.picker.recommended}</span>
            )}
          </span>
          {model.description && (
            <span className="text-muted-foreground truncate text-xs">{model.description}</span>
          )}
        </span>
        {selected && <Check className="text-brand size-3.5 shrink-0" aria-hidden />}
      </Row>
    );
  };

  /** One provider's current models, then its older ones folded under "More models". */
  const modelList = (source: ModelSource) => {
    const own = entries.filter((e) => e.provider === source.provider);
    const older = own.filter((e) => e.model.legacy);
    const showMore = moreOf === source.provider.id;
    return (
      <>
        {own.filter((e) => !e.model.legacy).map((e) => modelRow(e))}
        {older.length > 0 && (
          <>
            <Row
              onClick={() => setMoreOf(showMore ? undefined : source.provider.id)}
              expanded={showMore}
              className="text-muted-foreground"
            >
              <span className="flex-1">{m.ai.picker.moreModels}</span>
              <span className="num text-xs">{older.length}</span>
              <ChevronRight
                className={cn("size-3.5 transition-transform", showMore && "rotate-90")}
                aria-hidden
              />
            </Row>
            {showMore && (
              <div className="flex flex-col gap-0.5 pl-2">{older.map((e) => modelRow(e))}</div>
            )}
          </>
        )}
      </>
    );
  };

  /** A provider's folding group: its name and the model it would use, its models when open. */
  const group = (source: ModelSource) => {
    const { provider } = source;
    const isOpen = openGroup === provider.id;
    const using = provider === selection.provider ? current : source.defaultModel;
    return (
      <div key={provider.id} className="flex flex-col gap-0.5">
        <Row onClick={() => setOpenGroup(isOpen ? undefined : provider.id)} expanded={isOpen}>
          <ProviderLogo provider={provider} className="size-3.5" />
          <span className="flex-1 font-medium">{provider.name}</span>
          <span className="text-muted-foreground truncate text-xs">
            {source.models.find((m) => m.value === using)?.label}
          </span>
          <ChevronRight
            className={cn(
              "text-muted-foreground size-3.5 shrink-0 transition-transform",
              isOpen && "rotate-90",
            )}
            aria-hidden
          />
        </Row>
        {isOpen && <div className="flex flex-col gap-0.5 pl-3">{modelList(source)}</div>}
      </div>
    );
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setOpenGroup(selection.provider.id);
          setMoreOf(undefined);
        } else setQuery("");
      }}
    >
      <PopoverTrigger
        className="hover:bg-muted focus-visible:ring-ring/50 data-popup-open:bg-muted flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-colors outline-none focus-visible:ring-3"
        aria-label={m.ai.picker.label(selection.provider.name, label)}
      >
        <ProviderLogo provider={selection.provider} className="size-3.5" />
        {label}
        <ChevronsUpDown className="text-muted-foreground size-3" aria-hidden />
      </PopoverTrigger>
      <PopoverContent side="top" align="start" sideOffset={8} className="w-80 gap-0 p-1">
        <div onKeyDown={moveFocus} className="flex flex-col">
          <label className="flex items-center gap-2 border-b px-2 pt-1 pb-2">
            <Search className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
            <input
              data-row
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && latest[0]) pick(latest[0].provider, latest[0].model.value);
              }}
              placeholder={m.ai.picker.search}
              aria-label={m.ai.picker.searchLabel}
              className="placeholder:text-muted-foreground h-6 flex-1 bg-transparent outline-none"
            />
          </label>

          <div className="flex max-h-96 flex-col gap-0.5 overflow-y-auto pt-1">
            {words.length ? (
              <>
                {latest.map((e) => modelRow(e))}
                {latest.length === 0 && (
                  <p className="text-muted-foreground px-2 py-1.5 text-xs">
                    {m.ai.picker.noMatches}
                  </p>
                )}
              </>
            ) : grouped ? (
              sources.map(group)
            ) : (
              sources[0] && modelList(sources[0])
            )}
          </div>

          {efforts && efforts.length > 0 && !words.length && (
            <div className="mt-1 flex flex-col gap-1 border-t px-2 pt-2 pb-1">
              <span className="text-muted-foreground text-xs">{m.ai.picker.effort}</span>
              <div
                className="bg-muted/50 flex rounded-md p-0.5"
                role="radiogroup"
                aria-label={m.ai.picker.effort}
              >
                {[undefined, ...efforts].map((level) => (
                  <button
                    key={level ?? "auto"}
                    type="button"
                    data-row
                    role="radio"
                    aria-checked={effort === level}
                    onClick={() => onEffort(level)}
                    className={cn(
                      "focus-visible:ring-ring/50 flex-1 rounded-sm py-0.5 text-xs capitalize transition-colors outline-none focus-visible:ring-2",
                      effort === level
                        ? "bg-card text-foreground font-medium shadow-xs"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {m.ai.picker.efforts[level ?? "auto"] ?? level}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-1 border-t pt-1">
            <label className="hover:bg-muted/60 flex items-center gap-2.5 rounded-md px-2 py-1.5">
              <CircleDashed className="text-muted-foreground size-3.5" aria-hidden />
              <span className="flex flex-1 flex-col">
                {m.ai.picker.temporary}
                <span className="text-muted-foreground text-xs">{m.ai.picker.temporaryHint}</span>
              </span>
              <Switch
                data-row
                checked={temporary}
                onCheckedChange={(on) => {
                  onTemporary(on);
                  setOpen(false);
                }}
                className="data-checked:bg-brand"
              />
            </label>
            <Row
              onClick={() => {
                setOpen(false);
                void navigate({ to: "/settings/assistant" });
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <Settings className="size-3.5" aria-hidden />
              {m.ai.picker.settings}
            </Row>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
