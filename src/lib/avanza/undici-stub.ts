// avanza-ts imports undici's fetch for Node; the webview always passes `tauriFetch` instead,
// so vite.config.ts aliases undici here to keep ~1 MB of Node-only code out of the bundle.
export function fetch(): never {
  throw new Error("undici is not available in the webview");
}
