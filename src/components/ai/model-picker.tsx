import { useNavigate } from "@tanstack/react-router";
import { cn } from "cn";
import { Check, ChevronRight, ChevronsUpDown, CircleDashed, Search, Settings } from "lucide-react";
import { useState, type KeyboardEvent, type ReactNode } from "react";

import { ProviderLogo } from "@/components/ai/provider-logo";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import type { ModelOption, Provider } from "@/lib/ai/types";

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
  className,
}: {
  onClick: () => void;
  children: ReactNode;
  selected?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      data-row
      onClick={onClick}
      aria-pressed={selected}
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
 * The model chip in the message box and its popover: every provider's models in one list with
 * the provider's logo, a search, and older models folded under "More models". Picking a model
 * of another provider switches provider; picking one of the same keeps the conversation.
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
  const [showMore, setShowMore] = useState(false);

  const source = sources.find((s) => s.provider === selection.provider);
  const current = selection.model ?? source?.defaultModel;
  const label = source?.models.find((m) => m.value === current)?.label ?? selection.provider.name;

  const entries = sources.flatMap((s) => s.models.map((model) => ({ ...s, model })));
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = entries.filter(({ provider, model }) =>
    words.every((w) => `${provider.name} ${model.label}`.toLowerCase().includes(w)),
  );
  const latest = words.length ? matches : matches.filter((e) => !e.model.legacy);
  const legacy = words.length ? [] : matches.filter((e) => e.model.legacy);

  const pick = (provider: Provider, model: string) => {
    onSelect({ provider, model });
    setOpen(false);
    setQuery("");
  };

  const modelRow = ({ provider, model, defaultModel }: (typeof entries)[number]) => {
    const selected = provider === selection.provider && model.value === current;
    return (
      <Row
        key={`${provider.id}:${model.value}`}
        selected={selected}
        onClick={() => pick(provider, model.value)}
      >
        <ProviderLogo provider={provider} className="size-3.5" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-center gap-1.5">
            {model.label}
            {model.value === defaultModel && (
              <span className="text-brand text-xs">Recommended</span>
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

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger
        className="hover:bg-muted focus-visible:ring-ring/50 data-popup-open:bg-muted flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-colors outline-none focus-visible:ring-3"
        aria-label={`Model: ${selection.provider.name} ${label}`}
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
              placeholder="Search models…"
              aria-label="Search models"
              className="placeholder:text-muted-foreground h-6 flex-1 bg-transparent outline-none"
            />
          </label>

          <div className="flex max-h-96 flex-col gap-0.5 overflow-y-auto pt-1">
            <span className="text-muted-foreground px-2 pt-1 pb-0.5 text-xs">Models</span>
            {latest.map(modelRow)}
            {latest.length === 0 && (
              <p className="text-muted-foreground px-2 py-1.5 text-xs">No models match.</p>
            )}
            {legacy.length > 0 && (
              <>
                <Row onClick={() => setShowMore((s) => !s)} className="text-muted-foreground">
                  <span className="flex-1">More models</span>
                  <ChevronRight
                    className={cn("size-3.5 transition-transform", showMore && "rotate-90")}
                    aria-hidden
                  />
                </Row>
                {showMore && (
                  <div className="flex flex-col gap-0.5 pl-2">{legacy.map(modelRow)}</div>
                )}
              </>
            )}
            {!words.length && (
              <div className="text-muted-foreground flex items-center gap-2.5 px-2 py-1.5">
                <CircleDashed className="size-3.5" aria-hidden />
                <span className="flex-1">More providers</span>
                <span className="text-xs tracking-wider uppercase">Soon</span>
              </div>
            )}
          </div>

          {efforts && efforts.length > 0 && !words.length && (
            <div className="mt-1 flex flex-col gap-1 border-t px-2 pt-2 pb-1">
              <span className="text-muted-foreground text-xs">Effort</span>
              <div
                className="bg-muted/50 flex rounded-md p-0.5"
                role="radiogroup"
                aria-label="Effort"
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
                    {level === "xhigh" ? "X-high" : (level ?? "Auto")}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-1 border-t pt-1">
            <label className="hover:bg-muted/60 flex items-center gap-2.5 rounded-md px-2 py-1.5">
              <CircleDashed className="text-muted-foreground size-3.5" aria-hidden />
              <span className="flex flex-1 flex-col">
                Temporary chat
                <span className="text-muted-foreground text-xs">Not saved to your history</span>
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
              Assistant settings
            </Row>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
