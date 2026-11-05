import type { Messages } from "@/lib/i18n";

export const layout: Messages["layout"] = {
  pages: {
    home: {
      label: "Hem",
      description:
        "Hur det går för din portfölj: idag, eller vad som hänt medan du var borta, och vad som väntar.",
    },
    workspace: {
      label: "Arbetsyta",
      description: "Bevakningslistor, grafer, orderdjup och allt om värdepappret du tittar på.",
    },
    portfolio: {
      label: "Portfölj",
      description: "Dina innehav, konton, utveckling, utdelningar och transaktioner.",
    },
    markets: {
      label: "Marknader",
      description: "Index, dagens vinnare och förlorare och en aktiescreener.",
    },
    orders: {
      label: "Ordrar",
      description: "Öppna ordrar, dagens avslut, stop-loss och fondordrar.",
    },
    news: {
      label: "Nyheter",
      description: "Nyheter om det du äger och bevakar, med kommande rapporter och utdelningar.",
    },
    alerts: {
      label: "Bevakningar",
      description: "Dina kurs- och nyhetsbevakningar hos Avanza och AvanzaDesks egna regler.",
    },
    signals: {
      label: "Signaler",
      description: "Insynshandel, blankning, ägare och analytikerändringar i dina aktier.",
    },
    analysis: {
      label: "Analys",
      description:
        "Jämförelseindex, inkomster, skatt och avgifter, fondöverlapp och dina handelsvanor.",
    },
    rebalance: {
      label: "Ombalansera",
      description: "Sätt målvikter och få ordrarna som når dit.",
    },
  },
  nav: {
    hideNames: "Dölj sidnamn",
    showNames: "Visa sidnamn",
    collapse: "Fäll ihop",
  },
  settingsMenu: {
    theme: "Tema",
    themes: { light: "Ljust", dark: "Mörkt", system: "System" },
    whatsNew: "Nyheter i appen",
    suggestFeature: "Föreslå en funktion",
    signOut: "Logga ut",
  },
  accounts: { all: "Alla konton", one: "Ett konto" },
  dailyPerformance: {
    changeToday: "Din portföljs utveckling idag",
    changeOn: (session) => `Din portföljs utveckling senaste handelsdagen (${session})`,
    what: "dagens utveckling",
  },
  indices: "index",
  history: { back: "Bakåt", forward: "Framåt" },
  privacy: { show: "Visa belopp", hide: "Dölj belopp" },
  search: {
    button: "Sök värdepapper…",
    title: "Sök värdepapper",
    placeholder: "Sök aktier, fonder, ETF:er…",
    results: "Resultat",
    what: "sökresultat",
    goTo: (page) => `Gå till ${page}`,
    newAlertRule: "Ny bevakningsregel",
    nothing: (query) => `Inget matchar ”${query}”.`,
    navigate: "bläddra",
    open: "öppna",
    close: "stäng",
  },
  exchange: (name, open, when, left) =>
    `${name} ${open ? "öppen · stänger" : "stängd · öppnar"} ${when} (om ${left}). Ordinarie öppettider, helgdagar ej medräknade.`,
  statusBar: {
    market: "Marknad",
    closesIn: (time, left) => `öppen · stänger ${time} · om ${left}`,
    closed: "stängd",
    realTime: "Realtid",
    delayed: "Fördröjd",
    github: "AvanzaDesk på GitHub",
    star: "Stjärnmärk AvanzaDesk på GitHub",
    offline: "Offline",
    unreachable: "Kan inte nå Avanza",
    connecting: "Ansluter…",
    updatedSeconds: (s) => `Uppdaterad för ${s} s sedan`,
    updatedMinutes: (min) => `Uppdaterad för ${min} min sedan`,
  },
  window: { minimize: "Minimera", maximize: "Maximera", restore: "Återställ" },
  updates: {
    available: (version) => `AvanzaDesk v${version} finns att hämta`,
    restart: "Starta om och uppdatera",
    downloading: (version) => `Laddar ner v${version}…`,
    failed: "Uppdateringen misslyckades",
  },
  whatsNew: {
    since: (count, version) => `${count} uppdateringar sedan v${version}`,
  },
  liveQuotes: {
    writeFailed: "Kunde inte skriva filen med livekurser",
    columns: {
      id: "Orderbok-id",
      change: "Utveckling %",
      bid: "Köp",
      ask: "Sälj",
      updated: "Uppdaterad",
    },
  },
  notify: {
    filled: "Order genomförd",
    bought: "Köpte",
    sold: "Sålde",
    at: (price) => ` à ${price}`,
    level: (price) => ` vid ${price}`,
    alert: "Bevakning utlöst",
    stopLoss: "Stop-loss",
    newStatus: "ny",
  },
};
