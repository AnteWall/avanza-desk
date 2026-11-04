import type {
  CalendarMonth,
  InstrumentNewsResponse,
  NewsArticle,
  NewsFeedItem,
  NewsFeedResponse,
} from "avanza-ts";

import { HOLDINGS } from "./portfolio";
import { get, type Route } from "./route";
import { instrument, type DemoInstrument } from "./universe";

// News feed, articles and the reports/dividends calendar.

type Story = {
  id: string;
  /** Orderbook ids the story is about. */
  about: string[];
  title: string;
  vignette: string;
  source: string;
  hoursAgo: number;
};

const STORIES: Story[] = [
  {
    id: "n1",
    about: ["5260"],
    title: "Saab får order på pansarvärnsvapen värd 2,1 miljarder kronor",
    vignette: "Leveranser planeras under 2027–2029.",
    source: "Direkt",
    hoursAgo: 0.6,
  },
  {
    id: "n2",
    about: ["4478"],
    title: "Nvidia hits record as data center demand outpaces supply",
    vignette: "Analysts lift price targets ahead of next week's report.",
    source: "Reuters",
    hoursAgo: 1.4,
  },
  {
    id: "n3",
    about: ["5240"],
    title: "Ericsson tappar efter svagare besked om nätverksaffären i Nordamerika",
    vignette: "Operatörerna fortsätter att hålla igen på investeringar.",
    source: "Placera",
    hoursAgo: 2.1,
  },
  {
    id: "n4",
    about: ["5247"],
    title: "Investor ökar i Atlas Copco och ABB under kvartalet",
    vignette: "Substansvärdet steg 4,2 procent sedan halvårsskiftet.",
    source: "Direkt",
    hoursAgo: 3.2,
  },
  {
    id: "n5",
    about: ["5234", "5247"],
    title: "Atlas Copco höjs till köp av Carnegie efter starka orderingångar",
    vignette: "Riktkursen höjs till 195 kronor.",
    source: "Placera",
    hoursAgo: 4.5,
  },
  {
    id: "n6",
    about: ["549768"],
    title: "Evolution pressas av ny spelskatt i Storbritannien",
    vignette: "Bolaget bedömer att effekten på rörelsemarginalen blir begränsad.",
    source: "Avanza",
    hoursAgo: 5.3,
  },
  {
    id: "n7",
    about: ["5269"],
    title: "Volvo: lastbilsleveranserna ökade 9 procent i oktober",
    vignette: "Europa och Nordamerika drev uppgången.",
    source: "Direkt",
    hoursAgo: 6.8,
  },
  {
    id: "n8",
    about: ["5568"],
    title: "Boliden lyfter med kopparpriset – högsta nivån sedan maj",
    vignette: "Råvarusektorn bäst på Stockholmsbörsen i dag.",
    source: "Placera",
    hoursAgo: 7.2,
  },
  {
    id: "n9",
    about: ["3873"],
    title: "Microsoft expands AI partnership with new cloud capacity deal",
    vignette: "Azure revenue growth beat expectations last quarter.",
    source: "Bloomberg",
    hoursAgo: 20,
  },
  {
    id: "n10",
    about: ["1102542"],
    title: "Spotify höjer priserna i 20 nya marknader",
    vignette: "Premium-abonnemanget blir upp till 10 procent dyrare.",
    source: "Avanza",
    hoursAgo: 22,
  },
  {
    id: "n11",
    about: ["5241"],
    title: "Swedbank: räntenettot bättre än väntat i tredje kvartalet",
    vignette: "Kreditförlusterna fortsätter att vara låga.",
    source: "Direkt",
    hoursAgo: 26,
  },
  {
    id: "n12",
    about: ["5271"],
    title: "Assa Abloy köper amerikanskt säkerhetsbolag för 3,4 miljarder",
    vignette: "Förvärvet väntas bidra till vinst per aktie från första året.",
    source: "Placera",
    hoursAgo: 29,
  },
  {
    id: "n13",
    about: ["5260"],
    title: "Saab höjer prognosen för organisk tillväxt till 20–24 procent",
    vignette: "Orderstocken når ny rekordnivå.",
    source: "Avanza",
    hoursAgo: 46,
  },
  {
    id: "n14",
    about: ["4478", "3873"],
    title: "Tech stocks rally as chip makers lead Nasdaq higher",
    vignette: "Semiconductor index gains 2.3 percent.",
    source: "Reuters",
    hoursAgo: 50,
  },
  {
    id: "n15",
    about: ["878733"],
    title: "Avanza Global passerar 100 miljarder kronor i förvaltat kapital",
    vignette: "Indexfonden med lägst avgift i Sverige.",
    source: "Avanza",
    hoursAgo: 70,
  },
  {
    id: "n16",
    about: ["5240"],
    title: "Ericsson tecknar 5G-avtal med indisk operatör",
    vignette: "Avtalet sträcker sig över fem år.",
    source: "Direkt",
    hoursAgo: 74,
  },
  {
    id: "n17",
    about: ["5269", "5234"],
    title: "Verkstadsbolagen leder uppgången efter starka PMI-siffror",
    vignette: "Inköpschefsindex steg till 55,1 i oktober.",
    source: "Placera",
    hoursAgo: 94,
  },
  {
    id: "n18",
    about: ["549768"],
    title: "Evolution återköper aktier för 500 miljoner euro",
    vignette: "Programmet löper till nästa årsstämma.",
    source: "Avanza",
    hoursAgo: 118,
  },
  {
    id: "n19",
    about: ["5247"],
    title: "Investor: substansvärdet 302 kronor per aktie",
    vignette: "Totalavkastningen för aktien var 18 procent hittills i år.",
    source: "Direkt",
    hoursAgo: 140,
  },
];

const HOUR = 3_600_000;
const publishTime = (s: Story) => new Date(Date.now() - s.hoursAgo * HOUR).toISOString();
const articlePath = (s: Story) => `/placera/telegram/${s.id}`;

const feedOrderbook = (i: DemoInstrument) => ({
  id: i.orderbookId,
  name: i.name,
  instrumentType: i.type,
  flagCode: i.country,
  dailyPerformance: i.change * 100,
});

const feedItem = (s: Story): NewsFeedItem => ({
  id: s.id,
  title: s.title,
  vignette: s.vignette,
  text: s.vignette,
  subject: instrument(s.about[0]).name,
  source: s.source,
  url: articlePath(s),
  externalLink: false,
  tag: "NEWS",
  category: null,
  mainCategory: "NEWS",
  publishDateTime: publishTime(s),
  orderbooks: s.about.map((id) => feedOrderbook(instrument(id))),
});

function article(id: string): NewsArticle {
  const s = STORIES.find((x) => x.id === id) ?? STORIES[0];
  const name = instrument(s.about[0]).name;
  return {
    url: articlePath(s),
    type: "Telegram",
    title: s.title,
    vignette: s.vignette,
    source: s.source,
    publishDate: publishTime(s),
    body: [
      `<p>Beskedet kom under förmiddagen och aktien i ${name} reagerade direkt. Flera analytiker beskriver nyheten som ett tecken på att efterfrågan håller i sig, även om konjunkturen fortsatt är osäker.</p>`,
      `<p>– Vi ser en tydlig förbättring jämfört med föregående kvartal, och marginalerna ser hållbara ut, säger en marknadsbedömare till nyhetsbyrån.</p>`,
      `<p>Bolaget presenterar sin nästa rapport inom de kommande veckorna. Där väntas ledningen ge mer detaljer om utsikterna för nästa år.</p>`,
    ].join(""),
    orderbooks: s.about.map((oid) => {
      const i = instrument(oid);
      return {
        id: i.orderbookId,
        name: i.name,
        currency: i.currency,
        instrumentType: i.type,
        flagCode: i.country,
        change: i.price * i.change,
        changePercent: i.change * 100,
        lastPrice: i.price,
        highestPrice: i.price * 1.012,
        lowestPrice: i.price * 0.985,
        totalVolumeTraded: 1_240_000,
        updated: new Date().toISOString(),
        tradable: true,
        buyable: true,
        sellable: true,
      };
    }),
  };
}

function instrumentNews(orderbookId: string): InstrumentNewsResponse {
  const mine = STORIES.filter((s) => s.about.includes(orderbookId));
  return {
    articles: (mine.length ? mine : STORIES.slice(0, 4)).map((s) => ({
      headline: s.title,
      vignette: s.vignette,
      intro: s.vignette,
      articleType: "TELEGRAM",
      category: "NEWS",
      newsSource: s.source,
      fullArticleLink: articlePath(s),
      externalLink: false,
      timePublished: publishTime(s),
      timePublishedMillis: Date.now() - s.hoursAgo * HOUR,
    })),
  };
}

/** `yyyy-MM-dd` about `daysAhead` from today, moved off the weekend: companies report on weekdays. */
const ymd = (daysAhead: number) => {
  const d = new Date(Date.now() + daysAhead * 86_400_000);
  const day = d.getUTCDay();
  if (day === 6 || day === 0) d.setUTCDate(d.getUTCDate() + (day === 6 ? 2 : 1));
  return d.toISOString().slice(0, 10);
};
const calOrderbook = (id: string) => {
  const i = instrument(id);
  return { id, name: i.name, instrumentType: i.type, flagCode: i.country };
};

function calendar(): CalendarMonth[] {
  const reports = [
    { id: "5568", days: 1, type: "INTERIM" },
    { id: "4478", days: 6, type: "INTERIM" },
    { id: "5260", days: 9, type: "INTERIM" },
    { id: "1102542", days: 12, type: "INTERIM" },
    { id: "549768", days: 14, type: "INTERIM" },
    { id: "5240", days: 23, type: "INTERIM" },
    { id: "5269", days: 38, type: "ANNUAL" },
  ].map((r) => ({
    orderbook: calOrderbook(r.id),
    date: ymd(r.days),
    reportType: r.type,
    companyName: instrument(r.id).name,
  }));
  const held = (id: string) =>
    HOLDINGS.filter((h) => h.orderbookId === id).reduce((s, h) => s + h.volume, 0);
  const dividends = [
    { id: "5241", days: 2, amount: 7.65 },
    { id: "5271", days: 3, amount: 2.4 },
    { id: "5247", days: 11, amount: 2.6 },
    { id: "5269", days: 15, amount: 4.5 },
    { id: "3873", days: 17, amount: 0.91 },
  ].map((d) => {
    const i = instrument(d.id);
    return {
      orderbook: calOrderbook(d.id),
      price: d.amount,
      volume: held(d.id),
      amount: d.amount,
      currency: i.currency,
      exclusiveDividendDate: ymd(d.days),
      paymentDate: ymd(d.days + 4),
      established: d.id !== "5247",
    };
  });
  // One month row is enough: the app flattens and dates every event itself.
  return [
    {
      yearMonth: ymd(0).slice(0, 7),
      reports,
      upcomingDividends: {
        upcomingDividends: dividends,
        totalAmountSek: dividends.reduce((s, d) => s + d.amount * d.volume, 0),
      },
    },
  ];
}

export const newsRoutes: Route[] = [
  get(/^\/_api\/customer-news-feed-v2\/news$/, (): NewsFeedResponse => ({
    news: STORIES.map(feedItem),
    currentDateTime: new Date().toISOString(),
  })),
  get(/^\/_api\/news\/article\/.*\/([^/]+)$/, (_req, m) => article(m[1])),
  get(/^\/_api\/market-guide\/news\/([^/]+)$/, (_req, m) => instrumentNews(m[1])),
  get(/^\/_api\/customer-calendar\/calendar$/, calendar),
];
