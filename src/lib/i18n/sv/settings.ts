import type { Messages } from "@/lib/i18n";

export const settings: Messages["settings"] = {
  language: {
    label: "Språk",
    hint: "Språket i AvanzaDesk. Appen laddas om när du byter.",
  },
  saveFailed: {
    title: "Kunde inte spara inställningarna",
    description: (error) => `Ändringarna kan försvinna när appen startas om. ${error}`,
  },
  categories: {
    label: "Inställningskategorier",
    general: "Allmänt",
    data: "Data",
    notifications: "Notiser",
    statusBar: "Statusfält",
    shortcuts: "Kortkommandon",
    assistant: "Assistent",
  },
  general: {
    appearance: "Utseende",
    theme: {
      label: "Tema",
      hint: "Hur AvanzaDesk ser ut. System följer ljust eller mörkt läge i datorn.",
    },
    textSize: {
      label: "Textstorlek",
      hint: "Luftig är lättare att läsa. Kompakt får plats med fler rader, som en handelsterminal.",
      comfortable: "Luftig",
      compact: "Kompakt",
    },
    workspace: {
      label: "Arbetsyta",
      hint: "Enkel visar din bevakningslista och allt om värdepappret. Handel lägger till orderdjup och en uppskattning före affären.",
      simple: "Enkel",
      trading: "Handel",
    },
    window: "Fönster",
    openOn: {
      label: "Öppna på",
      hint: "Sidan du ser när du har loggat in. Hem sammanfattar din portfölj, Arbetsyta har grafer och orderdjup.",
    },
    inAppFrame: {
      label: "Fönsterknappar i appen",
      hint: "Minimera, maximera och stäng i toppfältet i stället för systemets titelrad",
    },
    updates: "Uppdateringar",
    privacy: "Integritet",
    startPrivate: {
      label: "Starta i integritetsläge",
      hint: "Gör belopp suddiga varje gång AvanzaDesk öppnas, för skärmdelning",
    },
  },
  update: {
    checking: "Söker efter uppdateringar…",
    failed: (error) => `Kunde inte söka efter uppdateringar: ${error}`,
    available: (version) => `v${version} finns att hämta`,
    latest: "Du har den senaste versionen",
    installing: "Uppdaterar…",
    install: "Uppdatera och starta om",
    check: "Sök efter uppdateringar",
  },
  seconds: (label) => `${label}, sekunder`,
  data: {
    refreshIntervals: "Uppdateringsintervall",
    fields: {
      positions: { label: "Innehav", hint: "Innehav och kontovärden" },
      alerts: { label: "Bevakningar", hint: "Kursbevakningar hos Avanza" },
      news: { label: "Nyheter", hint: "Nyhetsflödet och nyheter om värdepapper" },
      market: { label: "Vinnare och förlorare", hint: "Dagens största rörelser" },
      indices: { label: "Indexlist", hint: "Index i toppfältet" },
    },
    withDefault: (hint, seconds) => `${hint} · standard ${seconds} s`,
    spreadsheets: "Kalkylark",
    quotesFile: {
      label: "Fil med livekurser",
      writing: (path) =>
        `Skriver kurserna i dina bevakningslistor till ${path} medan AvanzaDesk körs.`,
      hint: "En CSV med kurserna i dina bevakningslistor som skrivs om när priserna rör sig. Peka Excel eller Google Kalkylark mot den och uppdatera.",
      change: "Byt fil…",
      choose: "Välj fil…",
      stop: "Stoppa",
    },
    writeEvery: {
      label: "Skriv var",
      hint: (seconds) => `Hur ofta filen skrivs om när priserna rör sig · standard ${seconds} s`,
      aria: "Skriv filen med livekurser var",
    },
    reset: {
      title: "Återställ",
      button: "Återställ",
      layouts: {
        label: "Panellayout",
        hint: "Panelernas storlek tillbaka till standard. Laddar om fönstret.",
      },
      tabs: {
        label: "Öppna flikar",
        hint: "Varje sida öppnas på sin första flik. Laddar om fönstret.",
      },
    },
  },
  notifications: {
    desktop: "Skrivbordsnotiser",
    events: {
      fills: { label: "Order genomförd", hint: "När en av dina ordrar blir avslut" },
      alerts: { label: "Avanzas bevakningar", hint: "Kursbevakningar du lagt hos Avanza" },
      stopLosses: { label: "Stop-loss", hint: "När en stop-loss läggs, utlöses eller avslutas" },
      rules: { label: "Bevakningsregler", hint: "Dina lokala regler under Bevakningar › Regler" },
    },
    content: "Innehåll",
    quantities: {
      label: "Visa antal",
      hint: "Antal aktier i notiser om avslut. Döljs alltid i integritetsläge.",
    },
  },
  statusBar: {
    title: "Statusfält",
    exchanges: { label: "Börser", hint: "Ordinarie öppettider, i svensk tid" },
  },
  shortcuts: {
    general: "Allmänt",
    pages: "Gå till sida",
    fixed: "Inne på sidor (fasta)",
    actions: {
      search: { label: "Sök", hint: "Hitta ett värdepapper eller en sida var du än är." },
      assistant: { label: "Assistent", hint: "Öppna eller stäng assistentpanelen." },
    },
    fixedRows: {
      chartRange: { label: "Grafens period", hint: "I arbetsytans översikt." },
      tables: { label: "Tabeller", hint: "Flytta mellan rader och öppna en." },
      addInstrument: { label: "Lägg till värdepapper", hint: "På sidan Ombalansera." },
    },
    recorder: {
      taken: "Sidorna använder den tangenten ensam. Lägg till Ctrl eller Alt.",
      moved: (from) => `Flyttad från ${from}`,
      recording: "Spelar in: tryck de nya tangenterna",
      change: "Ändra kortkommando",
      pressKeys: "Tryck tangenter…",
      none: "Inget",
      restore: "Återställ standard",
      escToCancel: "Esc för att avbryta",
    },
  },
  assistant: {
    title: "Assistent",
    providers: "Leverantörer",
    disconnect: "Koppla från",
    disconnectHint: (name) => `Sluta använda ${name}. Dina chattar och inställningar finns kvar.`,
    locate: (program) => `Hitta ${program}`,
    connected: "Ansluten",
    details: (program) => `Detaljer om ${program}`,
    removeKey: "Ta bort API-nyckel",
    chosenByYou: "Vald av dig",
    autoDetected: "Hittad automatiskt",
    change: "Byt…",
    useAutoDetect: "Hitta automatiskt",
    answers: "Svar",
    language: {
      label: "Språk",
      hint: "Auto svarar på språket du skriver på",
      auto: "Auto",
    },
    length: {
      label: "Längd",
      hint: "Hur detaljerade svaren är som standard",
      aria: "Svarslängd",
      brief: "Kort",
      balanced: "Lagom",
      detailed: "Utförlig",
    },
    tools: "Verktyg",
    webSearch: {
      label: "Webbsökning",
      hint: "Slå upp det Avanza inte har, som bakgrund",
    },
    externalArticles: {
      label: "Externa artiklar",
      hint: "Läs artiklar från Placera, Direkt och andra i dina nyheter på deras sajter",
    },
    about: {
      title: "Om dig",
      hint: "Dina mål, din placeringshorisont och riskvilja, eller annat assistenten alltid ska tänka på.",
      placeholder:
        "T.ex. Långsiktig sparare med 20+ års horisont. Föredrar utdelningsaktier och indexfonder. Undviker krypto.",
    },
  },
};
