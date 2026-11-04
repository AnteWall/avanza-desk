import type { FundAnalysisResponse, FundExposure, FundView } from "avanza-ts";

import { InstrumentType } from "@/lib/avanza/codes";

import { POSITIONS } from "./account-data";

// Avanza's look-through of the demo customer's funds (positions.fundAnalysis).

const FEES: Record<string, [fee: number, risk: number, rating: number, threeYears: number]> = {
  "878733": [0.09, 4, 4, 52.1],
  "41567": [0, 4, 3, 38.4],
  "1949": [0.59, 4, 5, 46.8],
  "325406": [0.24, 5, 3, 21.7],
};

const views: FundView[] = POSITIONS.filter((p) => p.inst.type === InstrumentType.Fund).map((p) => {
  const [fee, risk, rating, threeYears] = FEES[p.orderbookId] ?? [0.3, 4, 3, 25];
  return {
    name: p.inst.name,
    isin: p.inst.isin,
    fundRisk: risk,
    rating,
    managementFee: fee,
    productFee: fee,
    sharpeRatio: 0.9,
    standardDeviation: 14.2,
    changeSinceThreeYears: threeYears,
    marketValue: p.value,
    revenue: null,
    accountMarketValue: [],
    lowCarbon: true,
    carbonRisk: 7.4,
    percentAumCoveredCarbon: 96,
    fossilFuelInvolvement: 3.1,
    sustainabilityScore: 21.4,
    environmentalScore: 4.1,
    socialScore: 8.9,
    governanceScore: 6.3,
  };
});

const total = views.reduce((s, v) => s + v.marketValue, 0);
const avg = (pick: (v: FundView) => number) =>
  views.reduce((s, v) => s + pick(v) * v.marketValue, 0) / total;

const exposure = (name: string, y: number, extra: Partial<FundExposure> = {}): FundExposure => ({
  name,
  y,
  color: "",
  currency: "",
  type: "",
  countryCode: "",
  riskStatus: "",
  fundList: views,
  ...extra,
});

export const FUND_ANALYSIS: FundAnalysisResponse = {
  nrOfFunds: views.length,
  averageFundRisk: avg((v) => v.fundRisk),
  averageRating: avg((v) => v.rating),
  averageManagementFee: avg((v) => v.managementFee ?? 0),
  averageProductFee: avg((v) => v.productFee ?? 0),
  averageSharpeRatio: 0.9,
  averageStandardDeviation: 14.2,
  averageRevenue: 0,
  averageChangeSinceThreeYears: avg((v) => v.changeSinceThreeYears ?? 0),
  averageCarbonRiskScore: 7.4,
  averagePercentAumCoveredCarbon: 96,
  averageFossilFuelInvolvement: 3.1,
  averageSustainabilityScore: 21.4,
  averageEnvironmentalScore: 4.1,
  averageSocialScore: 8.9,
  averageGovernanceScore: 6.3,
  noOfLowCarbonFunds: views.length,
  industryChartData: [
    exposure("Teknik", 27.4),
    exposure("Finans", 16.8),
    exposure("Industri", 14.2),
    exposure("Hälsovård", 10.1),
    exposure("Sällanköpsvaror", 9.6),
    exposure("Övrigt", 21.9),
  ],
  stockChartData: [
    exposure("Microsoft", 4.1),
    exposure("NVIDIA", 3.9),
    exposure("Apple", 3.6),
    exposure("Investor B", 3.2),
    exposure("Atlas Copco A", 2.4),
  ],
  regionChartData: [
    exposure("Nordamerika", 46.2),
    exposure("Norden", 31.5),
    exposure("Europa", 11.4),
    exposure("Asien", 10.9),
  ],
  countryChartData: [
    exposure("USA", 44.1, { countryCode: "US" }),
    exposure("Sverige", 30.2, { countryCode: "SE" }),
    exposure("Japan", 4.6, { countryCode: "JP" }),
    exposure("Storbritannien", 3.8, { countryCode: "GB" }),
    exposure("Övriga", 17.3),
  ],
  currencyChartData: [
    exposure("SEK", 32.4, { currency: "SEK" }),
    exposure("USD", 45.8, { currency: "USD" }),
    exposure("EUR", 9.7, { currency: "EUR" }),
    exposure("JPY", 4.6, { currency: "JPY" }),
    exposure("Övriga", 7.5),
  ],
  fundViews: views,
};
