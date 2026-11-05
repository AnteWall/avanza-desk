import type { ReactNode } from "react";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export const briefing = {
  views: { visit: "Since last visit", today: "Today" },
  homeView: "Home view",
  openInWorkspace: "Open in the workspace",
  viewAll: "View all",
  masthead: {
    sinceLastVisit: "Since last visit",
    away: (days: number, day: string) => `${plural(days, "day")} away · ${day} to today`,
    flatToday: "Your portfolio is about where it started the day.",
    flatSince: "Your portfolio is about where you left it.",
    /** "You're up 1 234 SEK today." `amount` is the colored figure. */
    moved: (up: boolean, amount: ReactNode, today: boolean, since: string) => [
      `You're ${up ? "up" : "down"} `,
      amount,
      ` ${today ? "today" : `since ${since}`}.`,
    ],
    /** "Volvo B led, up 4 %, while …" */
    led: (name: ReactNode, change: ReactNode, more: boolean) => [
      name,
      " led, up ",
      change,
      more ? ", while " : ". ",
    ],
    fell: (name: ReactNode, change: ReactNode) => [name, " fell ", change, ". "],
    trades: (n: number) => plural(n, "trade"),
    dividends: (n: number) => plural(n, "dividend"),
    alerts: (n: number) => `${plural(n, "alert")} triggered`,
    meanwhile: (facts: string) => `Meanwhile: ${facts}. `,
    upcoming: (n: number) =>
      `${plural(n, "holding")} ${n === 1 ? "reports or goes" : "report or go"} ex-dividend in the next two weeks.`,
    valueNow: "Value now",
    result: "Result",
    withdrawn: "Withdrawn",
    deposited: "Deposited",
    returnThisYear: "Your return this year",
    yourReturn: "your return",
  },
  sections: {
    moved: "What moved",
    movedSince: "your holdings, since then",
    movedToday: "your holdings, today",
    away: "While you were away",
    activity: "trades, dividends and alerts",
    ahead: "The next two weeks",
    aheadDek: "reports and ex-dividend dates",
  },
  movers: { gained: "Gained", fell: "Fell" },
  timeline: {
    bought: "Bought",
    sold: "Sold",
    dividend: "Dividend from",
    alert: "Alert on",
    at: (price: string) => `at ${price}`,
  },
  done: {
    title: "You're all caught up",
    today:
      "Next time you sign in, or open AvanzaDesk after 12 hours away, Home also shows what changed while you were gone.",
    since:
      "This page stays as it is until your next visit: when you sign in again, or open AvanzaDesk after 12 hours away.",
    openWorkspace: "Open the workspace",
  },
};
