export const news = {
  thisWeek: "This week",
  nextWeek: "Next week",
  /** A calendar report, by Avanza's report type code ("INTERIM"). */
  report: (type: string) =>
    `${type.charAt(0)}${type.slice(1).toLowerCase().replaceAll("_", " ")} report`,
  exDividend: (amount: string, currency: string, estimated: boolean) =>
    `Ex-dividend ${amount} ${currency}${estimated ? " (est.)" : ""}`,
  page: {
    title: "News",
    subtitle: "Your holdings and watchlists, last 7 days",
    what: "news",
    article: "Article",
    closeArticle: "Close article",
    theArticle: "the article",
    comingUp: "Coming up",
    comingUpSubtitle: "Reports and ex-dates",
    theCalendar: "the calendar",
  },
  openInWorkspace: "Open in the workspace",
  calendar: {
    empty: "No upcoming reports or dividends.",
    showLater: (n: number) => `Show later (${n})`,
  },
  feed: { empty: "No news on your holdings this week." },
  group: {
    inPortfolio: "In your portfolio",
    stories: (n: number) => `${n} stories`,
    showFewer: "Show fewer",
    more: (n: number) => `+ ${n} more`,
  },
  item: {
    read: "Read",
    readOn: (source: string) => `Read on ${source}`,
  },
};
