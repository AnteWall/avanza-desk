// The demo customer: three accounts and what they hold. Shared by every fixture, so the
// portfolio, the briefing, the assistant's answers and the workspace all tell one story.

export type DemoAccount = {
  id: string;
  name: string;
  /** Avanza's account type code. */
  type: "INVESTERINGSSPARKONTO" | "KAPITALFORSAKRING" | "AKTIEFONDKONTO";
  cash: number;
};

export const ACCOUNTS: DemoAccount[] = [
  { id: "9001001", name: "Långsiktigt", type: "INVESTERINGSSPARKONTO", cash: 24_650 },
  { id: "9001002", name: "Pension", type: "KAPITALFORSAKRING", cash: 8_120 },
  { id: "9001003", name: "Trading", type: "INVESTERINGSSPARKONTO", cash: 41_380 },
];

export type DemoHolding = {
  accountId: string;
  orderbookId: string;
  volume: number;
  /** Average purchase price in the instrument's currency. */
  averagePrice: number;
};

export const HOLDINGS: DemoHolding[] = [
  // Långsiktigt: funds and Swedish blue chips.
  { accountId: "9001001", orderbookId: "878733", volume: 812.4, averagePrice: 196.2 },
  { accountId: "9001001", orderbookId: "1949", volume: 210.5, averagePrice: 498.6 },
  { accountId: "9001001", orderbookId: "5247", volume: 320, averagePrice: 241.8 },
  { accountId: "9001001", orderbookId: "5234", volume: 420, averagePrice: 142.6 },
  { accountId: "9001001", orderbookId: "5269", volume: 260, averagePrice: 231.4 },
  { accountId: "9001001", orderbookId: "5271", volume: 150, averagePrice: 298.0 },
  { accountId: "9001001", orderbookId: "5241", volume: 280, averagePrice: 212.5 },
  // Pension: global index exposure.
  { accountId: "9001002", orderbookId: "41567", volume: 96.2, averagePrice: 905.3 },
  { accountId: "9001002", orderbookId: "325406", volume: 640.8, averagePrice: 151.9 },
  { accountId: "9001002", orderbookId: "5510", volume: 180, averagePrice: 268.2 },
  { accountId: "9001002", orderbookId: "3873", volume: 24, averagePrice: 402.1 },
  // Trading: growth and themes.
  { accountId: "9001003", orderbookId: "5260", volume: 260, averagePrice: 289.5 },
  { accountId: "9001003", orderbookId: "4478", volume: 140, averagePrice: 118.4 },
  { accountId: "9001003", orderbookId: "549768", volume: 60, averagePrice: 891.2 },
  { accountId: "9001003", orderbookId: "1102542", volume: 18, averagePrice: 412.0 },
  { accountId: "9001003", orderbookId: "5240", volume: 900, averagePrice: 71.3 },
  { accountId: "9001003", orderbookId: "5568", volume: 110, averagePrice: 352.8 },
];

/** The default watchlist: holdings worth watching plus a few the customer doesn't own yet. */
export const WATCHLIST = [
  "5260",
  "5240",
  "5247",
  "4478",
  "3873",
  "238449",
  "238656",
  "5364",
  "5580",
  "982295",
  "5254",
  "5249",
];
