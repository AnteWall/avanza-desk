import type { ReactNode } from "react";

export const basket = {
  title: "Basket",
  intro:
    "Collect what you want to buy. When you have money, AvanzaDesk splits it over the basket; you place the orders in Avanza. What you already hold doesn't count.",
  menu: {
    aria: (n: number) => `Basket, ${n} items`,
    empty: "Empty. Add what you want to buy from a watchlist, or search on the Basket page.",
    split: "Split the money",
    open: "Open the basket",
  },
  contextMenu: {
    add: "Add to basket",
    remove: "Remove from basket",
    added: (name: string) => `Added ${name} to the basket`,
    failed: (name: string) => `Couldn't add ${name}, try again`,
  },
  watchlist: {
    label: "From watchlist",
    addAll: "Add all",
    addNotOwned: "Add the ones you don't own",
    added: (n: number, list: string) => `Added ${n} from ${list}`,
    allIn: (list: string) => `Everything from ${list} is already in`,
  },
  pick: {
    title: "What you want to buy",
    description:
      "Search for instruments or take them from a watchlist. Weights decide who gets more.",
    empty: "Empty",
    isEmpty: "The basket is empty.",
  },
  split: {
    title: "Split the money",
    description: "Each order opens in Avanza with the shares filled in.",
    minOrderTip:
      "Buys smaller than this are skipped: they cost more in courtage than they're worth. 0 keeps every buy.",
    toSpend: "To spend",
    toSpendAria: "Money to spend, SEK",
    buy: (amount: ReactNode) => ["Buy ", amount, " SEK"],
    left: (amount: ReactNode) => ["Left ", amount, " SEK"],
    leftLabel: "money left",
    leftTip: "What rounding to whole shares and the minimum order leave over.",
    skipped: (n: number, minOrder: string) =>
      `${n} skipped: their share is below the minimum order (${minOrder} SEK) or one share`,
    tooSmall: "No orders: the amount is too small.",
    enterAmount: "Enter how much to spend.",
  },
  table: {
    owned: "Owned",
    weight: "Weight",
    weightTip:
      "How much of the money it gets compared to the others: 2 gets twice as much as 1, 0 gets nothing. Saved as you type.",
    weightAria: (name: string) => `Weight for ${name}`,
    share: "Share",
    shareTip: "Its share of the money: its weight over all weights.",
    remove: (name: string) => `Remove ${name} from the basket`,
    removeTitle: "Remove from the basket",
  },
  emptied: "Basket emptied",
  undo: "Undo",
};
