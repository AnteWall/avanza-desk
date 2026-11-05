import type { Messages } from "@/lib/i18n";

const days = (n: number) => (n === 1 ? "1 dag" : `${n} dagar`);

export const briefing: Messages["briefing"] = {
  views: { visit: "Sedan senaste besöket", today: "Idag" },
  homeView: "Vy för Hem",
  openInWorkspace: "Öppna i arbetsytan",
  viewAll: "Visa alla",
  masthead: {
    sinceLastVisit: "Sedan senaste besöket",
    away: (n, day) => `${days(n)} borta · ${day} till idag`,
    flatToday: "Din portfölj ligger ungefär där den började dagen.",
    flatSince: "Din portfölj ligger ungefär där du lämnade den.",
    moved: (up, amount, today, since) => [
      `Du har ${up ? "tjänat" : "förlorat"} `,
      amount,
      // Swedish short months end in a period already ("2 nov."): don't add a second.
      ` ${today ? "idag" : `sedan ${since}`}.`.replace("..", "."),
    ],
    led: (name, change, more) => [name, " ledde, upp ", change, more ? ", medan " : ". "],
    fell: (name, change) => [name, " föll ", change, ". "],
    trades: (n) => (n === 1 ? "1 affär" : `${n} affärer`),
    dividends: (n) => (n === 1 ? "1 utdelning" : `${n} utdelningar`),
    alerts: (n) => (n === 1 ? "1 bevakning utlöst" : `${n} bevakningar utlösta`),
    meanwhile: (facts) => `Dessutom: ${facts}. `,
    upcoming: (n) => `${n} innehav har rapport eller x-dag de kommande två veckorna.`,
    valueNow: "Värde nu",
    result: "Resultat",
    withdrawn: "Uttaget",
    deposited: "Insatt",
    returnThisYear: "Din avkastning i år",
    yourReturn: "din avkastning",
  },
  sections: {
    moved: "Vad som rörde sig",
    movedSince: "dina innehav, sedan dess",
    movedToday: "dina innehav, idag",
    away: "Medan du var borta",
    activity: "affärer, utdelningar och bevakningar",
    ahead: "De kommande två veckorna",
    aheadDek: "rapporter och x-dagar",
  },
  movers: { gained: "Steg", fell: "Föll" },
  timeline: {
    bought: "Köpte",
    sold: "Sålde",
    dividend: "Utdelning från",
    alert: "Bevakning på",
    at: (price) => `vid ${price}`,
  },
  done: {
    title: "Du är ikapp",
    today:
      "Nästa gång du loggar in, eller öppnar AvanzaDesk efter 12 timmar borta, visar Hem också vad som hänt medan du var borta.",
    since:
      "Sidan står kvar som den är till ditt nästa besök: när du loggar in igen, eller öppnar AvanzaDesk efter 12 timmar borta.",
    openWorkspace: "Öppna arbetsytan",
  },
};
