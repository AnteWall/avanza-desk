export const alerts = {
  page: {
    aside: "Manage alerts in Avanza",
    tabs: {
      price: "Price",
      percent: "Percent",
      news: "News",
      triggered: "Triggered",
      rules: "Rules",
    },
    yourAlerts: "your alerts",
    triggeredAlerts: "triggered alerts",
  },
  table: {
    when: "When",
    level: "Level",
    notifyBy: "Notify by",
    validUntil: "Valid until",
    triggered: "Triggered",
    empty: {
      priceAlerts: "No price alerts.",
      percentAlerts: "No percent alerts.",
      newsAlerts: "No news alerts.",
      triggered: "No alerts have triggered.",
    },
  },
  kinds: {
    price: {
      label: "Price level",
      explain: "The price rises to or falls to a level you pick, e.g. a breakout or a stop.",
    },
    "day-move": {
      label: "Big day move",
      explain: "A stock or holding moves sharply up or down during the day.",
    },
    signal: {
      label: "New signal",
      explain: "Insider trades, short interest, owner or analyst changes, upcoming reports.",
    },
    short: {
      label: "Short interest",
      explain: "The share of a stock that is sold short goes above a level.",
    },
    upside: {
      label: "Analyst upside",
      explain: "The average analyst price target is far enough above the price.",
    },
    loss: { label: "Loss from cost", explain: "A holding is down from what you paid for it." },
    weight: {
      label: "Too large a share",
      explain: "A holding grows past a share of your portfolio.",
    },
    drift: {
      label: "Rebalance drift",
      explain: "A holding drifts from its target weight on the Rebalance page.",
    },
    ltv: {
      label: "Loan-to-value",
      explain: "Borrowing on a credit account gets close to the margin limit.",
    },
  },
  signalKinds: {
    insider: "Insider trades",
    short: "Short interest",
    owners: "Avanza owners",
    target: "Price target",
    consensus: "Analyst consensus",
    report: "Upcoming report",
  },
  /** Rule sentences: "Volvo B moves 5 % or more in a day". `t` is the formatted threshold. */
  describe: {
    price: (name: string | undefined, below: boolean, price: string) =>
      `${name ?? "The stock"} ${below ? "falls to" : "rises to"} ${price} or ${below ? "lower" : "higher"}`,
    dayMove: (name: string | undefined, t: string) =>
      `${name ?? "Any holding"} moves ${t} % or more in a day`,
    loss: (name: string | undefined, t: string) =>
      `${name ?? "Any holding"} is down ${t} % or more from what you paid`,
    weight: (name: string | undefined, t: string) =>
      `${name ?? "Any holding"} grows past ${t} % of your portfolio`,
    drift: (name: string | undefined, t: string) =>
      `${name ?? "Any holding"} drifts ${t} % or more from its rebalance target`,
    ltv: (t: string) => `Loan-to-value on a credit account goes over ${t} %`,
    short: (name: string | undefined, t: string) =>
      `Short interest in ${name ?? "a held stock"} goes over ${t} %`,
    upside: (name: string | undefined, t: string) =>
      `Analysts see ${t} % or more upside in ${name ?? "a held stock"}`,
    signal: (name: string | undefined, what: string | undefined, t: string) =>
      `${name ?? "A held stock"} gets a signal (${what ?? "any"}) scoring ${t} or more`,
  },
  /** What a rule's subject stands at now. */
  measure: {
    last: (price: string) => `Last ${price}`,
    today: (change: string) => `${change} today`,
    yesterday: (change: string) => `${change} yesterday`,
    on: (change: string, day: string) => `${change} on ${day}`,
    fromCost: (change: string) => `${change} from cost`,
    ofPortfolio: (share: string) => `${share} of the portfolio`,
    fromTarget: (share: string) => `${share} from target`,
    creditAccount: "Credit account",
    ltv: (share: string) => `Loan-to-value ${share}`,
    short: (share: string) => `Short interest ${share}`,
    toTarget: (change: string) => `${change} to target`,
  },
  dialog: {
    saved: "Rule saved",
    created: "Alert rule created",
    allRules: "All rules",
    editTitle: "Edit alert rule",
    newTitle: "New alert rule",
    checks:
      "AvanzaDesk checks this while it runs and sends a desktop notification, at most once a day per instrument.",
    whatToWatch: (name?: string) => `What should AvanzaDesk watch${name ? ` for ${name}` : ""}?`,
  },
  picker: {
    stocks: "Stocks you hold or watch",
    portfolio: "Your portfolio",
  },
  form: {
    unitHint: {
      "%": "percent",
      score: "1 = just notable, 5 = very strong",
      price: "price level",
    },
    pickStock: "Pick a stock",
    everyHolding: "Every holding",
    everyHeldStock: "Every held stock",
    change: "Change",
    appliesTo: "Applies to",
    kindOfSignal: "Kind of signal",
    any: "Any",
    priceLevel: "Price level",
    now: "now",
    direction: "Direction",
    risesTo: "Rises to",
    fallsTo: "Falls to",
    levelsFromPrice: "Levels from the current price",
    minimumStrength: "Minimum strength",
    threshold: "Threshold",
    presets: "Presets",
    notifiesWhen: "Notifies when",
    saveRule: "Save rule",
    createRule: "Create rule",
  },
  targets: {
    yourHoldings: "Your holdings",
    held: "Held",
    watched: "Watched",
  },
  menu: {
    alertMe: "Alert me",
    chooseRule: "Choose a rule…",
  },
  now: {
    reading: "Reading current values…",
    noSignals: "No recent signals here. New ones will notify as they appear.",
    noTargets: "No rebalance targets saved yet: set them on the Rebalance page.",
    noValue: "Avanza has no current value for this yet.",
    more: (n: number) => `and ${n} more`,
    holds: (n: number) =>
      `${n === 1 ? "This holds" : `${n} of these hold`} already: you'll be notified right away.`,
  },
  suggestions: {
    title: "Suggested from your portfolio",
    adjust: "Adjust…",
  },
  rules: {
    rule: "Rule",
    notifiesWhen: "Notifies when",
    since: "Since",
    edit: "Edit rule",
    delete: "Delete rule",
    newRule: "New rule",
    tip: "Tip: right-click any stock or holding, or use the bell on a stat in the workspace, to create a rule for it.",
    empty: "No rules yet. Start from a suggestion above or create one with New rule.",
  },
};
