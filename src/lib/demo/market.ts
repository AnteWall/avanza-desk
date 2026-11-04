import { OMXS30 } from "./market-data";
import { instrumentRoutes, setEtfMembers } from "./market-instrument";
import { listRoutes } from "./market-lists";
import type { Route } from "./route";

// Quotes, charts, order books, indices, screener and watchlists.

setEtfMembers(() => OMXS30);

export const marketRoutes: Route[] = [...instrumentRoutes, ...listRoutes];
