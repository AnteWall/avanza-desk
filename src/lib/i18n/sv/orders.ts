import type { Messages } from "@/lib/i18n";

export const orders: Messages["orders"] = {
  page: {
    aside: (account) => `${account} · hantera ordrar hos Avanza`,
    tabs: {
      open: "Aktiva",
      deals: "Dagens affärer",
      stopLoss: "Stop-loss",
      fund: "Fondordrar",
      cancelled: "Makulerade",
    },
    what: {
      orders: "dina ordrar",
      deals: "dagens affärer",
      stopLoss: "stop-loss-ordrar",
      fund: "fondordrar",
      cancelled: "makulerade ordrar",
    },
  },
  columns: {
    time: "Tid",
    placed: "Lagd",
    side: "Köp/sälj",
    amount: "Belopp",
    filled: "Avslut / antal",
    limit: "Kurs",
    state: "Status",
    validUntil: "Giltig till",
    trigger: "Utlösare",
    thenSide: "Sedan",
    orderPrice: "Orderkurs",
    status: "Status",
  },
  empty: {
    deals: "Inga affärer idag.",
    orders: "Inga aktiva ordrar.",
    fundOrders: "Inga fondordrar.",
    cancelledOrders: "Inga makulerade ordrar.",
    stopLoss: "Inga stop-loss-ordrar.",
  },
};
