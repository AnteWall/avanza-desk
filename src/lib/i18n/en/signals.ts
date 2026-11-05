export const signals = {
  /** Signal texts, from lib/signals. Amounts come formatted. */
  derive: {
    insider: (bought: boolean, amount: string, currency: string, buys: number, sells: number) =>
      `Insiders net ${bought ? "bought" : "sold"} ${amount} ${currency} in 30 days (${buys} buys, ${sells} sells)`,
    short: (up: boolean, pp: string, share: string) =>
      `Short interest ${up ? "up" : "down"} ${pp} pp to ${share} in 2 weeks`,
    owners: (change: string) => `Avanza owners ${change} in a week`,
    target: (raised: boolean, change: string, price: string) =>
      `Average price target ${raised ? "raised" : "cut"} ${change} to ${price}`,
    consensus: (from: string, to: string) => `Analysts rating it buy went from ${from} to ${to}`,
    report: (days: number) =>
      `Reports ${days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`}`,
  },
  tone: { up: "Positive", down: "Negative", neutral: "Neutral" },
  panel: {
    title: "Signals",
    subtitle: "last 30 days",
    stocks: "Stocks",
    held: "Held",
    watched: "Watched",
    alertMe: "Alert me",
    yourStocks: "your stocks",
  },
  table: {
    stock: "Stock",
    signal: "Signal",
    readsAs: "Reads as",
    empty: "No signals right now.",
    meaning: {
      insider:
        "Insiders are the company's executives and board members. Buying their own stock is often read as confidence; selling can have many reasons, like taxes or a house.",
      short:
        "Short interest is the share of the stock investors have borrowed and sold, betting the price will fall. Rising means more are pessimistic.",
      owners:
        "How fast the number of Avanza customers who own the stock is changing. Popularity, not a verdict on the company.",
      target:
        "The average price analysts expect the stock to reach in about a year. A raised target means they've grown more optimistic.",
      consensus: "The share of analysts who recommend buying the stock.",
      report:
        "The company publishes its results soon. Prices often move more than usual around a report.",
    },
    reads: { up: "Good sign", down: "Warning sign", neutral: "Heads-up" },
  },
  upside: {
    title: "Upside",
    subtitle: "vs analyst target and fair value",
    target: "Target",
    upside: "Upside",
    upsideTip:
      "How far the analysts' average price target is above today's price. Targets are opinions, often wrong, and look about a year ahead.",
    analysts: "Analysts",
    analystsSay: "Analysts say",
    fairValue: "Fair value",
    fairValueTip:
      "What Morningstar's analysts think one share is really worth, based on the company's future cash flows.",
    toFairValue: "To fair value",
    moat: "Moat",
    moatTip:
      "How well Morningstar thinks the company can keep competitors away: wide, narrow or none.",
    empty: "No held or watched stocks.",
    /** Avanza's consensus codes. Unknown codes show as lowercased words. */
    consensus: {
      BUY: "buy",
      OUTPERFORM: "outperform",
      HOLD: "hold",
      UNDERPERFORM: "underperform",
      SELL: "sell",
    } as Record<string, string>,
    /** Morningstar's moat values, shown as given when not listed. */
    moats: { Wide: "Wide", Narrow: "Narrow", None: "None" } as Record<string, string>,
  },
};
