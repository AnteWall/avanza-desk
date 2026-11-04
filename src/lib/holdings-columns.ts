import { columnPicks } from "./column-picks";
import { getDensity } from "./density";

// The holdings table's optional columns; instrument, value, today and return always show.
const labels = {
  sector: "Sector / type",
  accounts: "Accounts",
  weight: "Weight",
  profit: "Gain",
  dividendYield: "Yield",
};

/** Comfortable (new users) starts with the essentials; compact keeps the full table it had. */
export const holdingsColumns = columnPicks<keyof typeof labels>("holdings-columns", labels, () =>
  getDensity() === "comfortable"
    ? ["weight"]
    : ["sector", "accounts", "weight", "profit", "dividendYield"],
);
