// Shots of News, the assistant and the Basket.

// Claude Code connected and the panel open; the showcase chat is opened from the history list.
const assistant = {
  "ai:connected": ["claude"],
  "ai:provider": "claude",
  "ai:claude:model": "opus",
  "ai:open": true,
};
const openHistory = `(await waitFor('[aria-label="Chat history"]')).click();`;
const openShowcase = `${openHistory}
  const title = [...document.querySelectorAll("button span")].find((s) => s.textContent === "Portfolio vs OMXS30 this year")
    ?? (await sleep(1500), [...document.querySelectorAll("button span")].find((s) => s.textContent === "Portfolio vs OMXS30 this year"));
  if (!title) throw new Error("showcase chat not in the history list");
  title.closest("button").click();
  // Start of the answer in view: the question, the work steps and the chart.
  await sleep(2500);
  const scroller = [...document.querySelectorAll(".overflow-y-auto")].find((el) => el.textContent.includes("spread my risk"));
  scroller?.scrollTo({ top: 0 });`;

// Sets a React-controlled input the way typing would.
const typeInto = (label, value) => `
  const input = await waitFor('[aria-label="${label}"]');
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, "${value}");
  input.dispatchEvent(new Event("input", { bubbles: true }));`;

const basket = [
  ["5361", "AstraZeneca", "STOCK", "GB0009895292", "SEK", 2],
  ["5263", "Essity B", "STOCK", "SE0009922164", "SEK", 1],
  ["5447", "ABB Ltd", "STOCK", "CH0012221716", "SEK", 1],
  ["325406", "Länsförsäkringar Tillväxtmarknad Indexnära", "FUND", "SE0005993078", "SEK", 1.5],
  ["238449", "Apple", "STOCK", "US0378331005", "USD", 1],
].map(([orderbookId, name, type, isin, currency, weight]) => ({
  orderbookId,
  name,
  type,
  isin,
  currency,
  weight,
}));

// The chat's scroller, tagged `data-shot="chat"`, and the panel around it, `data-shot="panel"`.
const tagChat = `
  const chat = [...document.querySelectorAll(".overflow-y-auto")].find((el) => el.textContent.includes("spread my risk"));
  if (!chat) throw new Error("showcase chat not open");
  chat.dataset.shot = "chat";
  chat.closest('[style*="width"]').dataset.shot = "panel";`;
/** Scrolls the chat so the element matching `find` (a JS expression over `chat`) sits near the top. */
const scrollChatTo = (find, offset = 12) => `${tagChat}
  const target = ${find};
  if (!target) throw new Error("nothing to scroll to");
  chat.scrollTo({ top: target.getBoundingClientRect().top - chat.getBoundingClientRect().top + chat.scrollTop - ${offset} });
  await sleep(600);`;
const roomy = { ...assistant, "ai:width": 720 };

export const assistantShots = [
  { name: "news", path: "/news" },
  {
    name: "news-article",
    path: "/news",
    run: `await click("Saab får order på pansarvärnsvapen värd 2,1 miljarder kronor", "button, a, span, p");
      await sleep(400);
      await click("Read");`,
  },
  { name: "assistant", path: "/", settings: assistant, run: openShowcase, settle: 1500 },
  { name: "assistant-hero", path: "/briefing", settings: roomy, run: openShowcase, settle: 2500 },
  {
    name: "assistant-steps",
    path: "/briefing",
    settings: { ...assistant, "ai:width": 560 },
    run: `${openShowcase} ${tagChat}
      const step = [...chat.querySelectorAll("details")].find((d) => d.textContent.includes("Read your portfolio's performance"));
      step.open = true;
      await sleep(300);
      // Clip from the question down to the end of the work steps.
      const box = document.createElement("div");
      const from = chat.querySelector("p").closest("div").getBoundingClientRect();
      const to = [...chat.querySelectorAll("details")].at(-1).getBoundingClientRect();
      Object.assign(box.style, { position: "fixed", left: chat.getBoundingClientRect().left + "px", width: chat.clientWidth + "px", top: from.top - 8 + "px", height: to.bottom - from.top + 16 + "px", pointerEvents: "none" });
      box.dataset.shot = "steps";
      document.body.append(box);`,
    clip: '[data-shot="steps"]',
    settle: 800,
  },
  {
    name: "assistant-answer",
    path: "/briefing",
    settings: roomy,
    run: `${openShowcase} ${scrollChatTo('[...chat.querySelectorAll("*")].find((el) => /^what drove it$/i.test(el.textContent.trim()))', 40)}
      // From the table's heading down to the instrument card, the end of the rich part.
      const head = [...chat.querySelectorAll("*")].find((el) => /^what drove it$/i.test(el.textContent.trim())).getBoundingClientRect();
      const next = [...chat.querySelectorAll("p")].find((el) => el.textContent.startsWith("If you want to put new money")).getBoundingClientRect();
      const c = chat.getBoundingClientRect();
      const frame = document.createElement("div");
      Object.assign(frame.style, { position: "fixed", left: c.left + "px", width: chat.clientWidth + "px", top: head.top - 14 + "px", height: next.top - head.top + 6 + "px", pointerEvents: "none" });
      frame.dataset.shot = "answer";
      document.body.append(frame);`,
    clip: '[data-shot="answer"]',
    settle: 1500,
  },
  {
    name: "assistant-targets",
    path: "/briefing",
    settings: roomy,
    run: `${openShowcase} ${scrollChatTo('[...chat.querySelectorAll("p")].find((el) => el.textContent.startsWith("If you want to put new money"))')}
      let frame = byText("Use as rebalance targets", "button");
      while (frame && !(frame.textContent.includes("AstraZeneca") && frame.textContent.includes("Total"))) frame = frame.parentElement;
      const box = document.createElement("div");
      const start = [...chat.querySelectorAll("p")].find((el) => el.textContent.startsWith("If you want to put new money")).getBoundingClientRect();
      const end = frame.getBoundingClientRect();
      Object.assign(box.style, { position: "fixed", left: end.left - 16 + "px", width: end.width + 32 + "px", top: start.top - 16 + "px", height: end.bottom - start.top + 32 + "px", pointerEvents: "none" });
      box.dataset.shot = "targets";
      document.body.append(box);`,
    clip: '[data-shot="targets"]',
    settle: 1200,
  },
  {
    name: "assistant-mention",
    path: "/portfolio",
    settings: { ...assistant, "ai:width": 560 },
    run: `const box = await waitFor('[aria-label="Message the assistant"]');
      box.focus();
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set.call(box, "How does @");
      box.setSelectionRange(10, 10);
      box.dispatchEvent(new Event("input", { bubbles: true }));
      const list = await waitFor('[aria-label="Mention an instrument"]');
      // The composer plus the list above it.
      const panel = box.closest('[style*="width"]');
      const composer = box.closest(".rounded-xl") ?? box.parentElement;
      const r1 = list.getBoundingClientRect(), r2 = composer.getBoundingClientRect();
      const frame = document.createElement("div");
      Object.assign(frame.style, { position: "fixed", left: r2.left - 16 + "px", width: r2.width + 32 + "px", top: r1.top - 16 + "px", height: r2.bottom - r1.top + 32 + "px", pointerEvents: "none" });
      frame.dataset.shot = "mention";
      document.body.append(frame);
      void panel;`,
    clip: '[data-shot="mention"]',
    settle: 1500,
  },
  {
    name: "assistant-ask",
    path: "/",
    settings: { ...assistant, "ai:open": false },
    run: `await sleep(1500);
      const row = [...document.querySelectorAll("tr")].find((tr) => tr.textContent.includes("SAAB B"));
      if (!row) throw new Error("no SAAB B row");
      const r = row.getBoundingClientRect();
      row.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: r.left + 120, clientY: r.top + r.height / 2, button: 2 }));
      const menu = await waitFor('[data-slot="context-menu-content"]');
      await sleep(400);
      const m = menu.getBoundingClientRect();
      const frame = document.createElement("div");
      const left = Math.min(r.left, m.left) - 16, top = Math.min(r.top, m.top) - 16;
      Object.assign(frame.style, { position: "fixed", left: left + "px", top: top + "px", width: Math.max(r.right, m.right) + 16 - left + "px", height: Math.max(r.bottom, m.bottom) + 16 - top + "px", pointerEvents: "none" });
      frame.dataset.shot = "ask";
      document.body.append(frame);`,
    clip: '[data-shot="ask"]',
    settle: 800,
  },
  {
    name: "assistant-models",
    path: "/portfolio",
    settings: { ...assistant, "ai:connected": ["claude", "codex"] },
    run: `(await waitFor('[aria-label^="Model:"]')).click();
      const pop = await waitFor('[data-slot="popover-content"]');
      await sleep(400);
      pop.dataset.shot = "models";`,
    clip: '[data-shot="models"]',
    pad: 16,
    settle: 800,
  },
  {
    name: "assistant-setup",
    path: "/settings/assistant",
    settings: { ...assistant, "ai:open": false },
    run: `await waitFor("textarea");
      const nav = byText("General", "a, button");
      const connect = [...document.querySelectorAll("button")].filter((b) => b.textContent.trim() === "Connect").at(-1);
      const n = nav.getBoundingClientRect(), c = connect.getBoundingClientRect(), a = document.querySelector("textarea").getBoundingClientRect();
      const frame = document.createElement("div");
      Object.assign(frame.style, { position: "fixed", left: n.left - 12 + "px", top: "52px", width: c.right + 24 - n.left + "px", height: a.bottom + 36 - 52 + "px", pointerEvents: "none" });
      frame.dataset.shot = "setup";
      document.body.append(frame);`,
    clip: '[data-shot="setup"]',
    settle: 1500,
  },
  { name: "assistant-history", path: "/", settings: assistant, run: openHistory },
  {
    name: "basket",
    path: "/basket",
    settings: { "basket:items": basket },
    run: typeInto("Money to spend, SEK", "25000"),
  },
];
