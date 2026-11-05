import { defineChart } from "@tanstack/charts";
import { pie, polar, radialArc, radialRule, radialText } from "@tanstack/charts/polar";
import { Chart } from "@tanstack/charts/react";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { tooltip } from "@tanstack/charts/tooltip";
import { useMemo } from "react";

import type { Slice } from "@/lib/avanza/portfolio";
import { formatInteger, formatShare } from "@/lib/format";
import { m } from "@/lib/i18n";

export type DonutSlice = Slice & { color: string };

// Slices thinner than this go unlabelled (hover still names them): their labels would collide.
const LABEL_MIN = 0.04;
const short = (name: string) => (name.length > 16 ? `${name.slice(0, 15)}…` : name);

/**
 * Share of the whole as a ring, largest first clockwise from twelve o'clock, each slice named
 * on a leader line outside the ring. `slices` arrive colored and in table order.
 */
export function AllocationDonut({ slices }: { slices: readonly DonutSlice[] }) {
  const definition = useMemo(() => donutChart(slices), [slices]);

  return (
    <div className="h-64">
      <Chart
        definition={definition}
        ariaLabel={m.portfolio.allocation.ariaLabel(
          slices.map((s) => `${s.name} ${formatShare(s.share)}`).join(", "),
        )}
        className="num text-muted-foreground text-xs"
        style={{ height: "100%" }}
      />
    </div>
  );
}

/** The ring, leaders and labels; exported so a test can render it without a DOM. */
export function donutChart(slices: readonly DonutSlice[]) {
  const arcs = pie(slices, { value: "value", gapAngle: 0.012 });
  const labelled = arcs.filter((a) => a.share >= LABEL_MIN);
  return defineChart({
    marks: [
      polar({
        // shortcut: the ring takes a fixed share of the radius, so labels need ~190px a side;
        // fit the ratio to the measured width if narrow panels truncate them.
        radiusRatio: 0.66,
        marks: [
          radialArc(arcs, {
            innerRadius: ({ radius }) => radius * 0.6,
            cornerRadius: 2,
            key: "key",
            fill: (d) => d.color,
          }),
          radialRule(labelled, {
            angle: "angle",
            radius1: 1,
            radius2: 1,
            radius1Offset: 4,
            radius2Offset: 14,
            key: "key",
            stroke: "var(--muted-foreground)",
            strokeOpacity: 0.6,
          }),
          radialText(labelled, {
            angle: "angle",
            radius: 1,
            radiusOffset: 20,
            anchor: "outside",
            dy: -6,
            text: (d) => short(d.name),
            key: "key",
            fill: "var(--foreground)",
            fontWeight: 500,
          }),
          radialText(labelled, {
            angle: "angle",
            radius: 1,
            radiusOffset: 20,
            anchor: "outside",
            dy: 8,
            text: (d) => formatShare(d.share),
            key: (d) => `${d.key}-share`,
            fill: "var(--muted-foreground)",
          }),
        ],
        // Identity scales: angles stay radians, radius 1 is the ring's outer edge.
        scales: {
          angle: { scale: scaleLinear().domain([0, 2 * Math.PI]) },
          radius: { scale: scaleLinear().domain([0, 1]) },
        },
      }),
    ],
    scales: { x: null, y: null },
    tooltip: {
      use: tooltip,
      // Your money: blurred in privacy mode like the SEK column.
      className: "sensitive",
      content: (points) => {
        const d = points[0]!.datum as DonutSlice;
        return {
          title: d.name,
          rows: [
            { label: m.portfolio.allocation.share, value: formatShare(d.share), color: d.color },
            { label: "SEK", value: formatInteger(d.value) },
          ],
        };
      },
    },
  });
}
