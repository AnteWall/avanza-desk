import { ChevronDown } from "lucide-react";

import { Segmented } from "@/components/common/segmented";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useChartView } from "@/components/workspace/chart/use-chart-view";
import { overlayLabels, setChartView, type LowerPane, type Overlay } from "@/lib/chart-view";
import { m } from "@/lib/i18n";

const lowerLabels: Record<LowerPane, string> = {
  none: m.workspace.chart.noPane,
  rsi: "RSI 14",
  macd: "MACD",
};

/** Line or candles, and the indicators drawn over and under the price. */
export function ChartControls({ intraday }: { intraday: boolean }) {
  const view = useChartView();
  const toggle = (o: Overlay) =>
    setChartView({
      overlays: view.overlays.includes(o)
        ? view.overlays.filter((x) => x !== o)
        : [...view.overlays, o],
    });
  const count = view.overlays.length + (view.lower === "none" ? 0 : 1);

  return (
    <div className="flex items-center gap-1">
      <Segmented
        label={m.workspace.chart.style}
        options={[
          { label: m.workspace.chart.line, value: "line" },
          { label: m.workspace.chart.candles, value: "candles" },
        ]}
        value={view.style}
        onChange={(style) => setChartView({ style })}
      />
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" size="xs" />}>
          {m.workspace.chart.indicators}
          {count > 0 && <span className="num text-muted-foreground">{count}</span>}
          <ChevronDown />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              {m.workspace.chart.onPrice}
            </DropdownMenuLabel>
            {(Object.keys(overlayLabels) as Overlay[]).map((o) => (
              <DropdownMenuCheckboxItem
                key={o}
                checked={view.overlays.includes(o)}
                onCheckedChange={() => toggle(o)}
                // VWAP restarts every session, so it only means something intraday.
                disabled={o === "vwap" && !intraday}
              >
                {overlayLabels[o]}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              {m.workspace.chart.below}
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={view.lower}
              onValueChange={(lower: LowerPane) => setChartView({ lower })}
            >
              {(Object.keys(lowerLabels) as LowerPane[]).map((l) => (
                <DropdownMenuRadioItem key={l} value={l}>
                  {lowerLabels[l]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
