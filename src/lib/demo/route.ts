// The shape of a demo route; domain files (account.ts, market.ts, news.ts) export lists of them.

export type DemoRequest = {
  method: string;
  path: string;
  query: URLSearchParams;
  body: unknown;
};

export type Route = {
  method: string;
  path: RegExp;
  handle: (req: DemoRequest, match: RegExpMatchArray) => unknown;
};

export const get = (path: RegExp, handle: Route["handle"]): Route => ({
  method: "GET",
  path,
  handle,
});
export const post = (path: RegExp, handle: Route["handle"]): Route => ({
  method: "POST",
  path,
  handle,
});
