import {
  chartPeriods,
  type ChartPeriod,
  type PerformancePeriod,
  performancePeriods,
} from "avanza-ts";

// Visual blocks in the assistant's answers: a fenced ```chart or ```instrument block holding a
// small JSON spec. The app draws them from its own data, so a chart never shows a number the
// model made up. Anything malformed renders as nothing (or a placeholder while streaming).

export type AnswerBlock =
  | { kind: "price"; orderbookId: string; type?: string; period: ChartPeriod }
  | { kind: "portfolio"; period: PerformancePeriod; mode: "return" | "value" }
  | { kind: "instrument"; orderbookId: string; type?: string };

export const BLOCK_LANGUAGES = new Set(["chart", "instrument"]);

const id = (v: unknown) => (typeof v === "string" && /^\d+$/.test(v) ? v : undefined);
const type = (v: unknown) => (typeof v === "string" && /^[A-Z_]+$/.test(v) ? v : undefined);

/** The block in a fenced code block's language and text, or undefined if it isn't valid. */
export function parseBlock(language: string, code: string): AnswerBlock | undefined {
  if (!BLOCK_LANGUAGES.has(language)) return undefined;
  let spec: Record<string, unknown>;
  try {
    spec = JSON.parse(code) as Record<string, unknown>;
  } catch {
    return undefined;
  }
  if (!spec || typeof spec !== "object") return undefined;
  const orderbookId = id(spec.orderbookId);
  if (language === "instrument") {
    return orderbookId ? { kind: "instrument", orderbookId, type: type(spec.type) } : undefined;
  }
  if (spec.kind === "portfolio") {
    const period = (performancePeriods as readonly unknown[]).includes(spec.period)
      ? (spec.period as PerformancePeriod)
      : "ONE_YEAR";
    return { kind: "portfolio", period, mode: spec.mode === "value" ? "value" : "return" };
  }
  if (!orderbookId) return undefined;
  const period = (chartPeriods as readonly unknown[]).includes(spec.period)
    ? (spec.period as ChartPeriod)
    : "one_year";
  return { kind: "price", orderbookId, type: type(spec.type), period };
}
