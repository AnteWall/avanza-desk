import type { Messages } from "@/lib/i18n";

export const basket: Messages["basket"] = {
  title: "Korg",
  intro:
    "Samla det du vill köpa. När du har pengar fördelar AvanzaDesk dem över korgen; du lägger ordrarna i Avanza. Det du redan äger räknas inte.",
  menu: {
    aria: (n) => `Korg, ${n} värdepapper`,
    empty: "Tom. Lägg till det du vill köpa från en bevakningslista, eller sök på Korg-sidan.",
    split: "Fördela pengarna",
    open: "Öppna korgen",
  },
  contextMenu: {
    add: "Lägg i korgen",
    remove: "Ta bort ur korgen",
    added: (name) => `${name} lades i korgen`,
    failed: (name) => `Kunde inte lägga till ${name}, försök igen`,
  },
  watchlist: {
    label: "Från bevakningslista",
    addAll: "Lägg till alla",
    addNotOwned: "Lägg till de du inte äger",
    added: (n, list) => `Lade till ${n} från ${list}`,
    allIn: (list) => `Allt från ${list} finns redan i korgen`,
  },
  pick: {
    title: "Det du vill köpa",
    description:
      "Sök efter värdepapper eller hämta dem från en bevakningslista. Vikterna avgör vem som får mest.",
    empty: "Töm",
    isEmpty: "Korgen är tom.",
  },
  split: {
    title: "Fördela pengarna",
    description: "Varje order öppnas i Avanza med antalet ifyllt.",
    minOrderTip:
      "Köp som är mindre än så hoppas över: de kostar mer i courtage än de är värda. 0 behåller alla köp.",
    toSpend: "Att investera",
    toSpendAria: "Belopp att investera, SEK",
    buy: (amount) => ["Köp ", amount, " SEK"],
    left: (amount) => ["Kvar ", amount, " SEK"],
    leftLabel: "pengar kvar",
    leftTip: "Det som blir över av avrundning till hela aktier och minsta order.",
    skipped: (n, minOrder) =>
      `${n} hoppades över: deras andel är under minsta order (${minOrder} SEK) eller en aktie`,
    tooSmall: "Inga ordrar: beloppet är för litet.",
    enterAmount: "Ange hur mycket du vill investera.",
  },
  table: {
    owned: "Ägs",
    weight: "Vikt",
    weightTip:
      "Hur mycket av pengarna den får jämfört med de andra: 2 får dubbelt så mycket som 1, 0 får inget. Sparas medan du skriver.",
    weightAria: (name) => `Vikt för ${name}`,
    share: "Andel",
    shareTip: "Dess andel av pengarna: dess vikt delat med alla vikter.",
    remove: (name) => `Ta bort ${name} ur korgen`,
    removeTitle: "Ta bort ur korgen",
  },
  emptied: "Korgen tömdes",
  undo: "Ångra",
};
