import type { Messages } from "@/lib/i18n";

export const signals: Messages["signals"] = {
  derive: {
    insider: (bought, amount, currency, buys, sells) =>
      `Insynspersoner har netto ${bought ? "köpt" : "sålt"} för ${amount} ${currency} på 30 dagar (${buys} köp, ${sells} sälj)`,
    short: (up, pp, share) =>
      `Blankningen ${up ? "upp" : "ner"} ${pp} p.e. till ${share} på 2 veckor`,
    owners: (change) => `Ägare på Avanza ${change} på en vecka`,
    target: (raised, change, price) =>
      `Genomsnittlig riktkurs ${raised ? "höjd" : "sänkt"} ${change} till ${price}`,
    consensus: (from, to) => `Andelen analytiker som säger köp gick från ${from} till ${to}`,
    report: (days) =>
      `Rapport ${days === 0 ? "idag" : days === 1 ? "imorgon" : `om ${days} dagar`}`,
  },
  tone: { up: "Positiv", down: "Negativ", neutral: "Neutral" },
  panel: {
    title: "Signaler",
    subtitle: "senaste 30 dagarna",
    stocks: "Aktier",
    held: "Ägda",
    watched: "Bevakade",
    alertMe: "Bevaka",
    yourStocks: "dina aktier",
  },
  table: {
    stock: "Aktie",
    signal: "Signal",
    readsAs: "Tolkas som",
    empty: "Inga signaler just nu.",
    meaning: {
      insider:
        "Insynspersoner är bolagets ledning och styrelse. Att de köper egna aktier ses ofta som ett tecken på förtroende; att de säljer kan ha många skäl, som skatt eller ett husköp.",
      short:
        "Blankning är andelen av aktien som investerare lånat och sålt, i tron att kursen ska falla. Stiger den är fler pessimistiska.",
      owners:
        "Hur snabbt antalet Avanzakunder som äger aktien förändras. Ett mått på popularitet, inte ett omdöme om bolaget.",
      target:
        "Kursen analytikerna i snitt väntar sig att aktien når om ungefär ett år. En höjd riktkurs betyder att de blivit mer optimistiska.",
      consensus: "Andelen analytiker som rekommenderar köp av aktien.",
      report:
        "Bolaget släpper snart sin rapport. Kursen rör sig ofta mer än vanligt kring en rapport.",
    },
    reads: { up: "Gott tecken", down: "Varningstecken", neutral: "Värt att notera" },
  },
  upside: {
    title: "Uppsida",
    subtitle: "mot riktkurs och verkligt värde",
    target: "Riktkurs",
    upside: "Uppsida",
    upsideTip:
      "Hur långt över dagens kurs analytikernas genomsnittliga riktkurs ligger. Riktkurser är bedömningar, ofta fel, och siktar ungefär ett år framåt.",
    analysts: "Analytiker",
    analystsSay: "Analytikerna säger",
    fairValue: "Verkligt värde",
    fairValueTip:
      "Vad Morningstars analytiker anser att en aktie egentligen är värd, utifrån bolagets framtida kassaflöden.",
    toFairValue: "Till verkligt värde",
    moat: "Vallgrav",
    moatTip:
      "Hur väl Morningstar tror att bolaget kan hålla konkurrenter borta: bred, smal eller ingen.",
    empty: "Inga ägda eller bevakade aktier.",
    consensus: {
      BUY: "köp",
      OUTPERFORM: "öka",
      HOLD: "behåll",
      UNDERPERFORM: "minska",
      SELL: "sälj",
    },
    moats: { Wide: "Bred", Narrow: "Smal", None: "Ingen" },
  },
};
