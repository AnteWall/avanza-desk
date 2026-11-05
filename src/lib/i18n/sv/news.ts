import type { Messages } from "@/lib/i18n";

const reports: Record<string, string> = {
  INTERIM: "Kvartalsrapport",
  ANNUAL: "Bokslutskommuniké",
};

export const news: Messages["news"] = {
  thisWeek: "Den här veckan",
  nextWeek: "Nästa vecka",
  report: (type) => reports[type] ?? "Rapport",
  exDividend: (amount, currency, estimated) =>
    `X-dag ${amount} ${currency}${estimated ? " (prel.)" : ""}`,
  page: {
    title: "Nyheter",
    subtitle: "Dina innehav och bevakningslistor, senaste 7 dagarna",
    what: "nyheterna",
    article: "Artikel",
    closeArticle: "Stäng artikeln",
    theArticle: "artikeln",
    comingUp: "Kommande",
    comingUpSubtitle: "Rapporter och x-dagar",
    theCalendar: "kalendern",
  },
  openInWorkspace: "Öppna i arbetsytan",
  calendar: {
    empty: "Inga kommande rapporter eller utdelningar.",
    showLater: (n) => `Visa senare (${n})`,
  },
  feed: { empty: "Inga nyheter om dina innehav den här veckan." },
  group: {
    inPortfolio: "I din portfölj",
    stories: (n) => `${n} nyheter`,
    showFewer: "Visa färre",
    more: (n) => `+ ${n} till`,
  },
  item: {
    read: "Läs",
    readOn: (source) => `Läs på ${source}`,
  },
};
