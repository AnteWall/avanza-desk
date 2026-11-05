import type { ReactNode } from "react";

export const rebalance = {
  loading: "your holdings",
  title: "Rebalance",
  intro:
    "Choose how much of your portfolio each instrument should be. AvanzaDesk works out the orders; you place them in Avanza.",
  ask: "Ask the assistant",
  askPrompt: "Suggest target weights for my rebalance plan. What I want from my portfolio: ",
  alertOnDrift: "Alert on drift",
  modes: { full: "Buy and sell", buy: "Buy only" },
  setup: {
    title: "What to rebalance",
    description: "Which holdings, how much new money, and how closely to follow the targets.",
    holdings: "Holdings",
    holdingsTip:
      "Rebalance everything, or only one of your groups (make groups by right-clicking rows below or on the Portfolio page). Each group keeps its own targets.",
    newMoney: "New money",
    newMoneyTip:
      "Cash you're adding, such as this month's savings. It's counted into the total before targets are applied and spent on what is below target. Leave it empty to rebalance what you already have.",
    newMoneyAria: "New money, SEK",
    mode: "Mode",
    fullTip: (name: ReactNode) => [
      name,
      " sells what is above its target to pay for what is below.",
    ],
    buyTip: (name: ReactNode) => [
      name,
      " never sells: only the new money is invested, split by how far below target each instrument is. Avoids tax and courtage on sales.",
    ],
    tolerance: "Tolerance",
    toleranceTip:
      "How far an instrument may drift from its target, in either direction, before it gets an order. With 2 and a 10 % target, anything from 8 % to 12 % is left alone. 0 trades every drift.",
    toleranceAria: "Tolerance, percent",
    minOrder: "Minimum order",
    minOrderTip:
      "Orders smaller than this are skipped: they cost more in courtage than they fix. 0 keeps every order.",
    minOrderAria: "Minimum order, SEK",
  },
  targets: {
    title: "Set your targets",
    description: "Targets start at today's weights. Add instruments you want to buy into.",
    menu: "Set targets",
    reset: "Reset",
    toCurrent: "To current weights",
    toEqual: "To equal weights",
    models: "Model portfolios",
    modelsLabel: "model portfolios",
    modelsTip:
      "Copy a portfolio picked by analysts: its stocks get equal targets, everything else goes to 0 %. Pick a group first so the rest of your holdings stay put.",
    paretoMeta: "10 stocks · monthly",
    sum: (share: string) => `Targets add up to ${share}`,
    sumLabel: "the target total",
    sumTip:
      "The targets should add up to 100 %. Above that there isn't money for every buy, so all buys shrink by the same share; below it, the rest stays as cash. Scale to 100 % keeps their proportions.",
    off: (percent: string) => ` (${percent} off)`,
    scale: "Scale to 100 %",
    empty: (group?: string) =>
      `No holdings${group ? ` in ${group}` : ""} yet. Add an instrument and new money to plan a buy.`,
    columns: {
      instrumentTip:
        "Right-click a row (or select several first) to add it to a group, take it out of one, or ask the assistant about it.",
      value: "Value SEK",
      now: "Now",
      nowTip: "Its share of the total value today.",
      target: "Target",
      targetTip:
        "The share of the total you want it to be, in percent, e.g. 4,5. It starts at today's weight, so nothing trades until you change it. Saved as you type.",
      bar: "Now vs target",
      barTip:
        "The bar is today's share, the tick is the target. A bar past the tick is above target and gets sold; one short of it gets bought.",
      drift: "Drift",
      driftTip:
        "Now minus target: + is above target, − below. Orange from 5 %. Grey means no order: it's within the tolerance or below the minimum order.",
    },
    added: "New",
    remove: (name: string) => `Remove ${name} from the plan`,
    removeTitle: "Remove from the plan",
    targetAria: (name: string) => `Target for ${name}, percent`,
    onTarget: "On target",
    noOrder: "No order: within the tolerance, or below the minimum order",
  },
  orders: {
    title: "Place the orders",
    description:
      "Sell first to free the cash, then buy. Each order opens in Avanza with the amount filled in.",
    counts: (sells: number, buys: number) => `${sells} sells · ${buys} buys`,
    cashLeft: (amount: ReactNode) => ["Cash left ", amount, " SEK"],
    cashLeftLabel: "cash left",
    cashLeftTip:
      "New money plus what the sells bring in, minus what the buys cost. What's left comes from rounding to whole shares, the tolerance and the minimum order.",
    empty: "Nothing to trade: you're on target.",
    columns: {
      order: "Order",
      accountTip:
        "Where you hold it. When it's in several, pick the account in Avanza: selling in an AF account is taxed, in an ISK it isn't.",
      pickInAvanza: "Pick in Avanza",
      sharesTip:
        "Whole shares, rounded down so a buy never costs more than planned. Funds trade in SEK, so they have no share count.",
      inSek: "in SEK",
      amount: "Amount SEK",
    },
    notTradable: "Not tradable in Avanza",
    open: "Open in Avanza",
  },
  addInstrument: {
    label: "Add instrument",
    title: "Add instrument (A)",
    placeholder: "Search stocks, funds, ETFs…",
    aria: "Search instrument to add",
    results: "Results",
  },
  buyingPower: {
    label: "Use buying power",
    title: "Use an account's buying power",
    none: "No account has buying power",
    all: "All accounts",
  },
  check: {
    title: "Check the orders",
    description:
      "What if you had owned the planned mix instead of today's over the chosen period? Both are replayed on real prices, bought on day one and left alone. Use it to see how the orders change your risk, not to predict returns.",
    period: "Period",
    periods: { m3: "3M", y1: "1Y", y3: "3Y" },
    priceHistory: "price history",
    tooShort: "Not enough price history to compare.",
    today: (value: string) => `Today ${value}`,
    better: " · better",
    worse: " · worse",
    volatility: "Volatility, per year",
    largestFall: "Largest fall",
    sharpe: "Sharpe ratio",
    expectedVol: "Expected volatility",
    badMonth: "Bad month, 1 in 20",
    evenHoldings: "Even holdings it equals",
    differs: "Differs from today",
    differsNote: "typical gap per year",
    todaysMix: "Today's mix",
    afterOrders: "After the orders",
    risk: "Where the risk is",
    riskLabel: "where the risk is",
    riskTip:
      "Each holding's share of the money and of the ups and downs after the orders. One that moves a lot, or with the rest, takes more risk than money. The bar is today, the tick after the orders.",
    span: (from: string, days: number) => `${from} to today, ${days} days.`,
    noOlder: (name: string) => ` ${name} has no older prices.`,
    unpriced: (names: string) => ` No price history for ${names}: counted as cash.`,
    noExpected: " Too short for expected risk.",
    howLabel: "how this is worked out",
    howHeld:
      "Both mixes are bought on the first day and left alone, so a winner grows its share as it would have in your account. Cash left over earns nothing.",
    howPast:
      "The past is no promise. Over a short period the return line is mostly luck: which stocks happened to rally. Volatility, the largest fall and the expected risk say more about the mix itself. Expected volatility uses how the holdings moved together in this period; a bad month is about 1.65 times its monthly volatility.",
    howCurrency: "Returns are in each instrument's own currency: currency moves are left out.",
  },
  riskShares: { money: "Money", risk: "Risk today → after" },
};
