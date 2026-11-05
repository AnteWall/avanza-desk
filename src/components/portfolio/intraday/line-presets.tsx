import { Plus, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { m } from "@/lib/i18n";
import { getSetting, saveSetting } from "@/lib/settings";

type Preset = { name: string; keys: string[] };
const SETTING = "intraday-presets";

/**
 * Quick picks for the intraday legend: the largest holdings (`null`, follows the portfolio),
 * today's biggest movers, none, and the user's own saved picks.
 */
export function LinePresets({
  shown,
  top,
  movers,
  onPick,
}: {
  shown: string[];
  top: number;
  movers: string[];
  onPick: (keys: string[] | null) => void;
}) {
  const [presets, setPresets] = useState(() => getSetting<Preset[]>(SETTING, []));
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const save = (next: Preset[]) => {
    setPresets(next);
    void saveSetting(SETTING, next);
  };
  const add = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    save([...presets.filter((p) => p.name !== trimmed), { name: trimmed, keys: shown }]);
    setName("");
    setOpen(false);
  };

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-1 border-b px-2 py-1">
      <Button variant="outline" size="xs" onClick={() => onPick(null)}>
        {m.portfolio.intraday.top(top)}
      </Button>
      <Button variant="outline" size="xs" onClick={() => onPick(movers)}>
        {m.portfolio.intraday.movers}
      </Button>
      <Button variant="outline" size="xs" onClick={() => onPick([])}>
        {m.common.none}
      </Button>
      {presets.map((p) => (
        <span key={p.name} className="group relative">
          <Button variant="outline" size="xs" onClick={() => onPick(p.keys)}>
            {p.name}
          </Button>
          <button
            type="button"
            aria-label={m.portfolio.intraday.deletePreset(p.name)}
            onClick={() => save(presets.filter((q) => q !== p))}
            className="bg-card text-muted-foreground hover:text-foreground absolute -top-1 -right-1 hidden rounded-full border group-hover:block focus-visible:block"
          >
            <X className="size-2.5" />
          </button>
        </span>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button variant="outline" size="xs" aria-label={m.portfolio.intraday.savePreset} />
          }
        >
          <Plus className="size-3" /> {m.common.save}
        </PopoverTrigger>
        <PopoverContent align="end" className="w-56 gap-2 p-2">
          <p className="text-muted-foreground text-xs">
            {m.portfolio.intraday.saveAs(shown.length)}
          </p>
          <form
            className="flex gap-1"
            onSubmit={(e) => {
              e.preventDefault();
              add();
            }}
          >
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={m.portfolio.intraday.presetPlaceholder}
              aria-label={m.portfolio.intraday.presetName}
              className="placeholder:text-muted-foreground focus-visible:border-ring h-6 min-w-0 flex-1 rounded-sm border bg-transparent px-2 text-xs outline-none"
            />
            <Button type="submit" size="xs" disabled={!name.trim()}>
              {m.common.save}
            </Button>
          </form>
        </PopoverContent>
      </Popover>
    </div>
  );
}
