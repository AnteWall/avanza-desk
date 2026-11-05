import type { Messages } from "@/lib/i18n";
import { ai } from "@/lib/i18n/sv/ai";
import { alerts } from "@/lib/i18n/sv/alerts";
import { analysis } from "@/lib/i18n/sv/analysis";
import { auth } from "@/lib/i18n/sv/auth";
import { basket } from "@/lib/i18n/sv/basket";
import { briefing } from "@/lib/i18n/sv/briefing";
import { common } from "@/lib/i18n/sv/common";
import { errors } from "@/lib/i18n/sv/errors";
import { layout } from "@/lib/i18n/sv/layout";
import { markets } from "@/lib/i18n/sv/markets";
import { news } from "@/lib/i18n/sv/news";
import { orders } from "@/lib/i18n/sv/orders";
import { portfolio } from "@/lib/i18n/sv/portfolio";
import { rebalance } from "@/lib/i18n/sv/rebalance";
import { settings } from "@/lib/i18n/sv/settings";
import { signals } from "@/lib/i18n/sv/signals";
import { workspace } from "@/lib/i18n/sv/workspace";

// Vocabulary follows Avanza's own app, so the words match what users already know:
// holding → innehav, buy/sell → köp/sälj, courtage → courtage, dividend → utdelning,
// average price → GAV, market value → marknadsvärde, return → avkastning,
// development/change → utveckling, order book → orderdjup, watchlist → bevakningslista,
// instrument → värdepapper, account → konto, deposit → insättning, withdrawal → uttag,
// transaction → transaktion, price alert → kursbevakning, short interest → blankning,
// insider trade → insynshandel, report → rapport. ISK, KF, K4 stay as they are.
// Use "du" and plain everyday Swedish; sentence case like the English.

const sv: Messages = {
  common,
  layout,
  workspace,
  ai,
  settings,
  auth,
  portfolio,
  analysis,
  rebalance,
  basket,
  alerts,
  signals,
  markets,
  news,
  briefing,
  orders,
  errors,
};
export default sv;
