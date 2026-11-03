import { useQuery, useSuspenseQuery } from "@tanstack/react-query";

import { StatList } from "@/components/workspace/chart/stat-list";
import { Section } from "@/components/workspace/dossier/section";
import { ExposureTables } from "@/components/workspace/fundamentals/exposure-tables";
import { etfDetailsQuery, totalFeeQuery } from "@/lib/avanza/queries";
import { formatCountry, formatDate, formatPrice, formatShare } from "@/lib/format";

// Avanza spells the risk level as a word: "FOUR".
const riskLevels = ["ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN"];
/** "AT_LEAST_FIVE_YEARS" → "At least five years". */
const humanize = (code: string) => {
  const words = code.toLowerCase().replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/** An ETF's costs, risk, what it tracks, and what it holds: holdings, countries and sectors. */
export function EtfAbout({ orderbookId }: { orderbookId: string }) {
  const { data } = useSuspenseQuery(etfDetailsQuery(orderbookId));
  // The fee comes from the fund guide; the rest of the section doesn't wait on it.
  const { data: fee } = useQuery(totalFeeQuery(orderbookId));
  const risk = riskLevels.indexOf(data.riskScore) + 1;

  const stats = [
    { label: "Total fee / yr", value: fee == null ? "–" : formatShare(fee / 100) },
    // Percent of 10 000 is the fee times 100.
    {
      label: "Per 10 000 kr / yr",
      value: fee == null ? "–" : `${formatPrice(fee * 100)} kr`,
    },
    { label: "Risk", value: risk ? `${risk} of 7` : "–" },
    { label: "Holdings as of", value: data.portfolioDate ? formatDate(data.portfolioDate) : "–" },
  ];
  const about = [
    { label: "Tracks", value: data.underlying?.name ?? data.subCategory },
    { label: "Issuer", value: data.issuer },
    { label: "Category", value: [data.assetCategory, data.category].filter(Boolean).join(" · ") },
    { label: "Horizon", value: data.holdingPeriod ? humanize(data.holdingPeriod) : "" },
    { label: "Listed since", value: data.introDate ? formatDate(data.introDate) : "" },
  ].filter((s) => s.value);

  return (
    <Section title="ETF" flush>
      <div className="flex flex-col gap-3 border-b px-3 pb-3">
        <StatList stats={stats} />
        <StatList stats={about.map((s) => ({ ...s, text: true }))} />
        {data.description && <p className="max-w-3xl leading-relaxed">{data.description}</p>}
      </div>
      <ExposureTables
        // Holdings are fractions; countries and sectors are percent units.
        holdings={data.fundExposures.map((e) => ({
          name: e.name,
          weight: e.exposure,
          countryCode: e.countryCode ?? undefined,
          orderbookId: e.orderbookId ?? undefined,
          type: e.instrumentType ?? undefined,
        }))}
        countries={data.countryExposures.exposures.map((e) => ({
          name: e.countryName || formatCountry(e.countryCode),
          weight: e.weight / 100,
          countryCode: e.countryCode,
        }))}
        sectors={data.sectorExposures.exposures.map((e) => ({
          name: humanize(e.sector),
          weight: e.weight / 100,
        }))}
      />
    </Section>
  );
}
