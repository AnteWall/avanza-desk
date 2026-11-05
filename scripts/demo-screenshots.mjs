#!/usr/bin/env node
// Screenshots of the app on demo data (src/lib/demo), for the README and the website.
//   node scripts/demo-screenshots.mjs [name…]     # all shots, or only the named ones
// Starts `pnpm demo` itself unless DEMO_URL points at a running one. Needs Chromium (CHROME=path).
// Talks to Chromium over the DevTools protocol with Node's built-in WebSocket: no Playwright.
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { accountShots } from "./demo-shots/account.mjs";
import { assistantShots } from "./demo-shots/assistant.mjs";
import { marketShots } from "./demo-shots/market.mjs";

const SHOTS = [...accountShots, ...marketShots, ...assistantShots];

const OUT = process.env.OUT ?? new URL("../docs/screenshots/", import.meta.url).pathname;
const CHROME = process.env.CHROME ?? "chromium";
const WIDTH = 2000;
const HEIGHT = 1200;
const only = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const children = [];
const cleanup = () => children.forEach((c) => c.kill());
process.on("exit", cleanup);
process.on("SIGINT", () => process.exit(130));

async function waitFor(url, timeout = 60_000) {
  for (const end = Date.now() + timeout; Date.now() < end; await sleep(250)) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
    } catch {}
  }
  throw new Error(`timed out waiting for ${url}`);
}

let base = process.env.DEMO_URL;
if (!base) {
  base = "http://localhost:1440";
  children.push(spawn("pnpm", ["demo"], { stdio: "ignore", detached: false }));
}
await waitFor(base);

// Port 0: Chromium picks a free one and writes it to DevToolsActivePort, so runs can overlap.
const profile = mkdtempSync(join(tmpdir(), "demo-shots-"));
children.push(
  spawn(CHROME, [
    "--headless=new",
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    `--window-size=${WIDTH},${HEIGHT}`,
    "about:blank",
  ]),
);
const portFile = join(profile, "DevToolsActivePort");
for (let i = 0; i < 200 && !existsSync(portFile); i++) await sleep(100);
const port = readFileSync(portFile, "utf8").split("\n")[0];
await waitFor(`http://127.0.0.1:${port}/json/version`);
const target = await (
  await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" })
).json();

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let nextId = 0;
const pending = new Map();
const problems = [];
/** Resolves on the next CDP event named `method`. */
const waiters = new Map();
const nextEvent = (method) => new Promise((resolve) => waiters.set(method, resolve));
ws.addEventListener("message", ({ data }) => {
  const msg = JSON.parse(data);
  if (msg.method && waiters.has(msg.method)) {
    waiters.get(msg.method)(msg.params);
    waiters.delete(msg.method);
  }
  if (msg.id !== undefined) {
    const p = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) p.reject(new Error(msg.error.message));
    else p.resolve(msg.result);
  } else if (
    msg.method === "Runtime.consoleAPICalled" &&
    ["warning", "error"].includes(msg.params.type)
  ) {
    problems.push(
      `${msg.params.type}: ${msg.params.args.map((a) => a.value ?? a.description).join(" ")}`,
    );
  } else if (msg.method === "Runtime.exceptionThrown") {
    problems.push(
      `exception: ${msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text}`,
    );
  }
});
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });

/** Runs `expression` in the page (async allowed) and returns its value. */
const evaluate = async (expression) => {
  const { result, exceptionDetails } = await send("Runtime.evaluate", {
    expression: `(async () => { ${expression} })()`,
    awaitPromise: true,
    returnByValue: true,
  });
  if (exceptionDetails)
    throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
  return result.value;
};

await send("Runtime.enable");
await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: WIDTH,
  height: HEIGHT,
  deviceScaleFactor: 1,
  mobile: false,
});
// Freeze the clock's look: no blinking caret or running animations in the shots.
await send("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-reduced-motion", value: "reduce" }],
});

// Helpers the shots' `run` scripts can call in the page.
const PAGE_HELPERS = `
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const waitFor = async (selector, timeout = 15000) => {
    for (const end = Date.now() + timeout; Date.now() < end; await sleep(100)) {
      const el = document.querySelector(selector);
      if (el) return el;
    }
    throw new Error("no element " + selector);
  };
  const byText = (text, selector = "button, a, [role=tab], [role=menuitem]") =>
    [...document.querySelectorAll(selector)].find((el) => el.textContent.trim() === text);
  const click = async (text, selector) => {
    for (let i = 0; i < 50 && !byText(text, selector); i++) await sleep(100);
    const el = byText(text, selector);
    if (!el) throw new Error("nothing to click: " + text);
    el.click();
  };
  const key = (k, opts = {}) => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, ...opts }));
  };
`;

const withTimeout = (promise, ms, what) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${what} timed out after ${ms} ms`)), ms),
    ),
  ]);

let failed = 0;
for (const shot of SHOTS) {
  if (only.length && !only.includes(shot.name)) continue;
  for (const theme of shot.themes ?? ["dark"]) {
    problems.length = 0;
    // The README and website are English; LANG_UI=sv takes the shots in Swedish.
    const settings = { theme, language: process.env.LANG_UI ?? "en", ...shot.settings };
    const url = `${base}${shot.path}?demo=${encodeURIComponent(JSON.stringify(settings))}`;
    const file = theme === "dark" ? `${shot.name}.png` : `${shot.name}-${theme}.png`;
    try {
      // A blank page between shots drops the last one's menus and state; the timeout turns a
      // stuck page into one failed shot instead of a hung run.
      for (const target of ["about:blank", url]) {
        const loaded = nextEvent("Page.loadEventFired");
        await send("Page.navigate", { url: target });
        await withTimeout(loaded, 30_000, `loading ${target}`);
      }
      await withTimeout(
        evaluate(`${PAGE_HELPERS} await waitFor("#root > *"); ${shot.run ?? ""}`),
        45_000,
        "shot script",
      );
      // Let queries settle, logos load and charts lay out.
      await sleep(shot.settle ?? 2500);
      // `clip`: a CSS selector; the shot is cropped to that element plus `pad` pixels around it.
      const clip = shot.clip
        ? await evaluate(`
            const r = document.querySelector(${JSON.stringify(shot.clip)})?.getBoundingClientRect();
            if (!r) throw new Error("no element to clip to: " + ${JSON.stringify(shot.clip)});
            const pad = ${shot.pad ?? 0};
            const x = Math.max(0, r.left - pad), y = Math.max(0, r.top - pad);
            return { x, y, width: Math.min(innerWidth, r.right + pad) - x, height: Math.min(innerHeight, r.bottom + pad) - y, scale: 1 };`)
        : undefined;
      const { data } = await send("Page.captureScreenshot", {
        format: "png",
        ...(clip && { clip }),
      });
      writeFileSync(join(OUT, file), Buffer.from(data, "base64"));
      console.log(`✓ ${file}`);
    } catch (e) {
      failed++;
      console.log(`✗ ${file}: ${e.message}`);
    }
    for (const p of new Set(problems)) console.log(`    ${p}`);
  }
}
ws.close();
process.exit(failed ? 1 : 0);
