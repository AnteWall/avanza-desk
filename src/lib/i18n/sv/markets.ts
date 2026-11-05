import type { Messages } from "@/lib/i18n";

export const markets: Messages["markets"] = {
  page: {
    gainers: "Vinnare",
    losers: "Förlorare",
    trending: "Trendar",
    movers: "dagens vinnare och förlorare",
    trendingStocks: "trendande aktier",
  },
  columns: {
    stock: "Aktie",
    ytd: "I år",
    week: "Vecka",
    owners: "Ägare",
    newOwners: "Nya ägare",
    owners1w: "Ägare 1v",
    owners1m: "Ägare 1m",
    forumPosts: "Foruminlägg",
    constituent: "Aktie",
    market: "Marknad",
  },
  movers: { empty: "Inga vinnare eller förlorare än idag." },
  trending: { empty: "Inget nytt trendar." },
  screener: {
    title: "Populärt på Avanza",
    subtitle: "aktierna flest Avanzakunder äger",
    filter: "Filtrera på namn",
    filterLabel: "Filtrera aktier på namn",
    what: "aktielistan",
    empty: "Inga aktier matchar.",
    pe: "P/E",
    peTip:
      "Kurs per aktie delat med vinst per aktie: hur många år av dagens vinst kursen motsvarar. Lägre är billigare, men bolag som växer snabbt har ofta högt P/E.",
    yieldTip: "Årlig utdelning som andel av dagens kurs: vad aktien ger dig varje år du äger den.",
    marketCap: "Börsvärde",
    marketCapTip: "Vad hela bolaget är värt på börsen.",
  },
  index: {
    views: { map: "Värmekarta", list: "Lista", world: "Världen" },
    view: "Vy",
    regions: { topBar: "Toppraden", nordic: "Norden", europe: "Europa", us: "USA" },
    worldIndices: "världens index",
    theIndex: "indexet",
    noConstituents: "Avanza listar inga aktier i det här indexet.",
  },
  world: {
    status: (open, when) => `${open ? "Öppen · stänger" : "Stängd · öppnar"} ${when}`,
    hours: (exchange) => `${exchange}. Ordinarie öppettider; helgdagar ej inräknade.`,
    open: "Öppen",
    closed: "Stängd",
    hint: "Peka på en marknad för att se dess index",
  },
};
