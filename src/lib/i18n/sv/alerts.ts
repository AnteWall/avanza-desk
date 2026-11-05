import type { Messages } from "@/lib/i18n";

export const alerts: Messages["alerts"] = {
  page: {
    aside: "Hantera bevakningar hos Avanza",
    tabs: {
      price: "Kurs",
      percent: "Procent",
      news: "Nyheter",
      triggered: "Utlösta",
      rules: "Regler",
    },
    yourAlerts: "dina bevakningar",
    triggeredAlerts: "utlösta bevakningar",
  },
  table: {
    when: "När",
    level: "Nivå",
    notifyBy: "Avisering",
    validUntil: "Giltig till",
    triggered: "Utlöst",
    empty: {
      priceAlerts: "Inga kursbevakningar.",
      percentAlerts: "Inga procentbevakningar.",
      newsAlerts: "Inga nyhetsbevakningar.",
      triggered: "Inga bevakningar har utlösts.",
    },
  },
  kinds: {
    price: {
      label: "Kursnivå",
      explain:
        "Kursen stiger eller faller till en nivå du väljer, t.ex. ett utbrott eller en stopp.",
    },
    "day-move": {
      label: "Stor dagsrörelse",
      explain: "En aktie eller ett innehav rör sig kraftigt upp eller ner under dagen.",
    },
    signal: {
      label: "Ny signal",
      explain: "Insynshandel, blankning, ändrat ägande eller analytiker, kommande rapporter.",
    },
    short: {
      label: "Blankning",
      explain: "Andelen av en aktie som är blankad går över en nivå.",
    },
    upside: {
      label: "Analytikers uppsida",
      explain: "Analytikernas genomsnittliga riktkurs ligger tillräckligt långt över kursen.",
    },
    loss: { label: "Förlust mot GAV", explain: "Ett innehav har fallit från vad du betalade." },
    weight: {
      label: "För stor andel",
      explain: "Ett innehav växer förbi en andel av din portfölj.",
    },
    drift: {
      label: "Avvikelse från mål",
      explain: "Ett innehav avviker från sin målvikt på sidan Ombalansera.",
    },
    ltv: {
      label: "Belåningsgrad",
      explain: "Belåningen på ett kreditkonto närmar sig gränsen.",
    },
  },
  signalKinds: {
    insider: "Insynshandel",
    short: "Blankning",
    owners: "Ägare på Avanza",
    target: "Riktkurs",
    consensus: "Analytikerkonsensus",
    report: "Kommande rapport",
  },
  describe: {
    price: (name, below, price) =>
      `${name ?? "Aktien"} ${below ? "faller till" : "stiger till"} ${price} eller ${below ? "lägre" : "högre"}`,
    dayMove: (name, t) => `${name ?? "Något innehav"} rör sig ${t} % eller mer på en dag`,
    loss: (name, t) =>
      `${name ?? "Något innehav"} har fallit ${t} % eller mer från vad du betalade`,
    weight: (name, t) => `${name ?? "Något innehav"} växer förbi ${t} % av din portfölj`,
    drift: (name, t) => `${name ?? "Något innehav"} avviker ${t} % eller mer från sitt mål`,
    ltv: (t) => `Belåningsgraden på ett kreditkonto går över ${t} %`,
    short: (name, t) => `Blankningen i ${name ?? "en ägd aktie"} går över ${t} %`,
    upside: (name, t) => `Analytikerna ser ${t} % eller mer i uppsida i ${name ?? "en ägd aktie"}`,
    signal: (name, what, t) =>
      `${name ?? "En ägd aktie"} får en signal (${what ?? "alla"}) med styrka ${t} eller mer`,
  },
  measure: {
    last: (price) => `Senast ${price}`,
    today: (change) => `${change} idag`,
    yesterday: (change) => `${change} igår`,
    on: (change, day) => `${change}, ${day.toLowerCase()}`,
    fromCost: (change) => `${change} mot GAV`,
    ofPortfolio: (share) => `${share} av portföljen`,
    fromTarget: (share) => `${share} från målet`,
    creditAccount: "Kreditkonto",
    ltv: (share) => `Belåningsgrad ${share}`,
    short: (share) => `Blankning ${share}`,
    toTarget: (change) => `${change} till riktkursen`,
  },
  dialog: {
    saved: "Regeln sparad",
    created: "Regel skapad",
    allRules: "Alla regler",
    editTitle: "Redigera regel",
    newTitle: "Ny regel",
    checks:
      "AvanzaDesk kollar detta medan appen körs och skickar en notis, högst en gång per dag och värdepapper.",
    whatToWatch: (name) => `Vad ska AvanzaDesk bevaka${name ? ` för ${name}` : ""}?`,
  },
  picker: {
    stocks: "Aktier du äger eller bevakar",
    portfolio: "Din portfölj",
  },
  form: {
    unitHint: {
      "%": "procent",
      score: "1 = värt att notera, 5 = mycket stark",
      price: "kursnivå",
    },
    pickStock: "Välj en aktie",
    everyHolding: "Alla innehav",
    everyHeldStock: "Alla ägda aktier",
    change: "Ändra",
    appliesTo: "Gäller",
    kindOfSignal: "Typ av signal",
    any: "Alla",
    priceLevel: "Kursnivå",
    now: "nu",
    direction: "Riktning",
    risesTo: "Stiger till",
    fallsTo: "Faller till",
    levelsFromPrice: "Nivåer från aktuell kurs",
    minimumStrength: "Lägsta styrka",
    threshold: "Gräns",
    presets: "Förval",
    notifiesWhen: "Meddelar när",
    saveRule: "Spara regel",
    createRule: "Skapa regel",
  },
  targets: {
    yourHoldings: "Dina innehav",
    held: "Ägda",
    watched: "Bevakade",
  },
  menu: {
    alertMe: "Bevaka",
    chooseRule: "Välj en regel…",
  },
  now: {
    reading: "Läser aktuella värden…",
    noSignals: "Inga nya signaler här. Nya meddelas när de dyker upp.",
    noTargets: "Inga målvikter sparade än: sätt dem på sidan Ombalansera.",
    noValue: "Avanza har inget aktuellt värde för detta än.",
    more: (n) => `och ${n} till`,
    holds: (n) =>
      `${n === 1 ? "Detta gäller" : `${n} av dessa gäller`} redan: du får en notis direkt.`,
  },
  suggestions: {
    title: "Förslag utifrån din portfölj",
    adjust: "Justera…",
  },
  rules: {
    rule: "Regel",
    notifiesWhen: "Meddelar när",
    since: "Sedan",
    edit: "Redigera regel",
    delete: "Ta bort regel",
    newRule: "Ny regel",
    tip: "Tips: högerklicka på en aktie eller ett innehav, eller använd klockan vid ett nyckeltal i arbetsytan, för att skapa en regel för den.",
    empty: "Inga regler än. Utgå från ett förslag ovan eller skapa en med Ny regel.",
  },
};
