import type { Messages } from "@/lib/i18n";

export const rebalance: Messages["rebalance"] = {
  loading: "dina innehav",
  title: "Ombalansera",
  intro:
    "Välj hur stor del av portföljen varje värdepapper ska vara. AvanzaDesk räknar fram ordrarna; du lägger dem i Avanza.",
  ask: "Fråga assistenten",
  askPrompt: "Föreslå målvikter för min ombalansering. Det här vill jag med min portfölj: ",
  alertOnDrift: "Bevaka avvikelse",
  modes: { full: "Köp och sälj", buy: "Bara köp" },
  setup: {
    title: "Vad ska ombalanseras",
    description: "Vilka innehav, hur mycket nya pengar och hur nära målen du vill ligga.",
    holdings: "Innehav",
    holdingsTip:
      "Ombalansera allt, eller bara en av dina grupper (skapa grupper genom att högerklicka på rader nedan eller på Portfölj-sidan). Varje grupp har sina egna målvikter.",
    newMoney: "Nya pengar",
    newMoneyTip:
      "Pengar du sätter in, till exempel månadens sparande. De räknas in i totalen innan målvikterna tillämpas och går till det som ligger under sitt mål. Lämna tomt för att ombalansera det du redan har.",
    newMoneyAria: "Nya pengar, SEK",
    mode: "Läge",
    fullTip: (name) => [
      name,
      " säljer det som ligger över sitt mål för att betala det som ligger under.",
    ],
    buyTip: (name) => [
      name,
      " säljer aldrig: bara de nya pengarna investeras, fördelade efter hur långt under målet varje värdepapper ligger. Slipper skatt och courtage på försäljningar.",
    ],
    tolerance: "Tolerans",
    toleranceTip:
      "Hur långt ett värdepapper får avvika från sitt mål, åt något håll, innan det får en order. Med 2 och ett mål på 10 % lämnas allt från 8 % till 12 % i fred. 0 handlar vid varje avvikelse.",
    toleranceAria: "Tolerans, procent",
    minOrder: "Minsta order",
    minOrderTip:
      "Ordrar som är mindre än så hoppas över: de kostar mer i courtage än de rättar till. 0 behåller alla ordrar.",
    minOrderAria: "Minsta order, SEK",
  },
  targets: {
    title: "Sätt dina målvikter",
    description: "Målvikterna utgår från dagens vikter. Lägg till värdepapper du vill köpa.",
    menu: "Sätt målvikter",
    reset: "Återställ",
    toCurrent: "Till dagens vikter",
    toEqual: "Till lika vikter",
    models: "Modellportföljer",
    modelsLabel: "modellportföljer",
    modelsTip:
      "Kopiera en portfölj som analytiker valt: dess aktier får lika målvikter och allt annat går till 0 %. Välj en grupp först så att resten av dina innehav lämnas orörda.",
    paretoMeta: "10 aktier · månadsvis",
    sum: (share) => `Målvikterna blir ${share} totalt`,
    sumLabel: "målvikternas summa",
    sumTip:
      "Målvikterna ska bli 100 % totalt. Över det räcker inte pengarna till alla köp, så alla köp minskar lika mycket; under det blir resten kvar som likvida medel. Skala till 100 % behåller proportionerna.",
    off: (percent) => ` (avviker ${percent})`,
    scale: "Skala till 100 %",
    empty: (group) =>
      `Inga innehav${group ? ` i ${group}` : ""} än. Lägg till ett värdepapper och nya pengar för att planera ett köp.`,
    columns: {
      instrumentTip:
        "Högerklicka på en rad (eller markera flera först) för att lägga den i en grupp, ta ut den ur en, eller fråga assistenten om den.",
      value: "Värde SEK",
      now: "Nu",
      nowTip: "Dess andel av det totala värdet idag.",
      target: "Mål",
      targetTip:
        "Den andel av totalen du vill att den ska vara, i procent, t.ex. 4,5. Den börjar på dagens vikt, så inget handlas förrän du ändrar den. Sparas medan du skriver.",
      bar: "Nu mot mål",
      barTip:
        "Stapeln är dagens andel, strecket är målet. En stapel förbi strecket ligger över målet och säljs; en som inte når fram köps.",
      drift: "Avvikelse",
      driftTip:
        "Nu minus mål: + är över målet, − under. Orange från 5 %. Grå betyder ingen order: den är inom toleransen eller under minsta order.",
    },
    added: "Ny",
    remove: (name) => `Ta bort ${name} från planen`,
    removeTitle: "Ta bort från planen",
    targetAria: (name) => `Mål för ${name}, procent`,
    onTarget: "På målvikt",
    noOrder: "Ingen order: inom toleransen eller under minsta order",
  },
  orders: {
    title: "Lägg ordrarna",
    description:
      "Sälj först för att frigöra pengar, köp sedan. Varje order öppnas i Avanza med beloppet ifyllt.",
    counts: (sells, buys) => `${sells} sälj · ${buys} köp`,
    cashLeft: (amount) => ["Kvar ", amount, " SEK"],
    cashLeftLabel: "pengar kvar",
    cashLeftTip:
      "Nya pengar plus det försäljningarna ger, minus det köpen kostar. Det som blir kvar kommer från avrundning till hela aktier, toleransen och minsta order.",
    empty: "Inget att handla: du ligger på målvikt.",
    columns: {
      order: "Order",
      accountTip:
        "Var du äger den. Finns den på flera konton väljer du konto i Avanza: försäljning på ett AF-konto beskattas, på ett ISK inte.",
      pickInAvanza: "Välj i Avanza",
      sharesTip:
        "Hela aktier, avrundat nedåt så att ett köp aldrig kostar mer än planerat. Fonder handlas i SEK och har inget antal.",
      inSek: "i SEK",
      amount: "Belopp SEK",
    },
    notTradable: "Går inte att handla i Avanza",
    open: "Öppna i Avanza",
  },
  addInstrument: {
    label: "Lägg till värdepapper",
    title: "Lägg till värdepapper (A)",
    placeholder: "Sök aktier, fonder, ETF:er…",
    aria: "Sök värdepapper att lägga till",
    results: "Resultat",
  },
  buyingPower: {
    label: "Använd köpkraft",
    title: "Använd ett kontos köpkraft",
    none: "Inget konto har köpkraft",
    all: "Alla konton",
  },
  check: {
    title: "Kontrollera ordrarna",
    description:
      "Tänk om du hade ägt den planerade fördelningen i stället för dagens under perioden? Båda spelas upp på verkliga kurser, köpta första dagen och sedan orörda. Använd det för att se hur ordrarna ändrar din risk, inte för att förutsäga avkastning.",
    period: "Period",
    periods: { m3: "3 mån", y1: "1 år", y3: "3 år" },
    priceHistory: "kurshistorik",
    tooShort: "För lite kurshistorik för att jämföra.",
    today: (value) => `Idag ${value}`,
    better: " · bättre",
    worse: " · sämre",
    volatility: "Volatilitet per år",
    largestFall: "Största nedgång",
    sharpe: "Sharpekvot",
    expectedVol: "Förväntad volatilitet",
    badMonth: "Dålig månad, 1 på 20",
    evenHoldings: "Motsvarar lika stora innehav",
    differs: "Skiljer sig från idag",
    differsNote: "typisk skillnad per år",
    todaysMix: "Dagens fördelning",
    afterOrders: "Efter ordrarna",
    risk: "Var risken ligger",
    riskLabel: "var risken ligger",
    riskTip:
      "Varje innehavs andel av pengarna och av upp- och nedgångarna efter ordrarna. Ett som rör sig mycket, eller med resten, tar mer risk än pengar. Stapeln är idag, strecket efter ordrarna.",
    span: (from, days) => `${from} till idag, ${days} dagar.`,
    noOlder: (name) => ` ${name} saknar äldre kurser.`,
    unpriced: (names) => ` Ingen kurshistorik för ${names}: räknas som likvida medel.`,
    noExpected: " För kort för förväntad risk.",
    howLabel: "hur det räknas ut",
    howHeld:
      "Båda fördelningarna köps första dagen och lämnas orörda, så en vinnare växer sin andel som den hade gjort på ditt konto. Pengar som blir över ger ingen avkastning.",
    howPast:
      "Historiken är inget löfte. Över en kort period är avkastningslinjen mest tur: vilka aktier som råkade gå upp. Volatiliteten, största nedgången och den förväntade risken säger mer om själva fördelningen. Förväntad volatilitet bygger på hur innehaven rörde sig tillsammans under perioden; en dålig månad är ungefär 1,65 gånger dess månadsvolatilitet.",
    howCurrency: "Avkastningen är i varje värdepappers egen valuta: valutarörelser är inte med.",
  },
  riskShares: { money: "Pengar", risk: "Risk idag → efter" },
};
