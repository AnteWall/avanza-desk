// Avanza's string codes, named. Each object doubles as a type: `InstrumentType` is the union of its values.

/** Instrument type codes on positions, watchlists, search hits and transactions. */
export const InstrumentType = {
  Stock: "STOCK",
  Fund: "FUND",
  Etf: "EXCHANGE_TRADED_FUND",
  Certificate: "CERTIFICATE",
  Warrant: "WARRANT",
  FutureForward: "FUTURE_FORWARD",
  Option: "OPTION",
} as const;
export type InstrumentType = (typeof InstrumentType)[keyof typeof InstrumentType];

/** Transaction type codes for trades. */
export const TransactionSide = { Buy: "BUY", Sell: "SELL" } as const;
export type TransactionSide = (typeof TransactionSide)[keyof typeof TransactionSide];

/** Side of an order the user is about to place. */
export const OrderSide = { Buy: "buy", Sell: "sell" } as const;
export type OrderSide = (typeof OrderSide)[keyof typeof OrderSide];
