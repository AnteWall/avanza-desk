# DESIGN.md

How AvanzaDesk looks and why. Read this before building UI. Tokens live in `src/index.css`;
this file explains how to use them.

**Name:** the product is written **AvanzaDesk** in all UI text (logo, window title, copy).
`avanza-desk` is only the repo/package identifier.

**Logo:** a mint rounded square with Avanza's four rising bars in white, standing on a desk line
(`AppLogo`, source `src-tauri/icons/logo.svg`). The wordmark is "Avanza" in semibold followed by "Desk" in
muted regular. To regenerate the app icons, render the SVG to a 1024px PNG and run
`pnpm tauri icon <png>`.

**Direction:** a Bloomberg-style trading terminal (dense, keyboard-first, every pixel showing
data), made modern and calm: flat panels, one accent color, no chrome. Colors come from
Avanza's own design system ("Mint"), so the app feels like Avanza.

## Principles

1. **Data first, clear hierarchy.** Numbers are the content. Labels and secondary values recede
   into muted grays; titles, symbols and key values use full contrast and a heavier weight so
   the eye finds them first.
2. **Color means something.** Blue = up/buy, red = down/sell, mint green = brand/focus/active.
   Never use these colors for decoration. Everything else is neutral.
3. **Dense but calm.** 13px body text, 32px rows, 4px gutters. Density comes from tight
   spacing and small type, never from extra borders or boxes.
4. **Aligned digits.** Every number is mono with tabular figures and right-aligned in tables,
   so columns line up and ticking values don't jitter.
5. **Keyboard reachable.** Every action has a focusable control, and global actions get a
   shortcut: `Ctrl K` search (instruments and pages), `Alt 1…9` pages, `1…6` chart ranges, `A` add instrument (Rebalance),
   `↑↓`/`j k` + `Enter` in clickable tables. Single-key shortcuts skip text fields (`isTyping`).

## Stack

- shadcn/ui on **Base UI** (`base-nova` style, `@base-ui/react`). No Radix: don't add
  `@radix-ui/*` packages or copy Radix-based snippets.
- Add primitives with `pnpm dlx shadcn@latest add <name>`. They go in `src/components/ui/`.
  Compose them into feature components; restyle with tokens and `className`, not by forking.
- Icons: `lucide-react` only, default `size-4`, `size-3.5` in compact controls.
- Resizable layout: `react-resizable-panels` via `ui/resizable`.
- **Charts: always TanStack Charts** (`@tanstack/charts`, React adapter `@tanstack/charts/react`).
  No other chart library. See "Charts" below.
- **Tables: always TanStack Table** (`@tanstack/react-table` v9) through `<DataTable>`
  (`components/common/data-table.tsx`). Never hand-roll a `<table>`.

## Themes

Dark is the default (`<html class="dark">` in `index.html`). Light must keep working: never
hardcode a hex in a component, always use a token class (`bg-card`, `text-up`, …). Both
themes are defined in `src/index.css` (`:root` = light, `.dark` = dark).

## Color tokens

Neutrals are Mint's cool, slightly teal-tinted grays.

| Token                 | Dark                | Light     | Use                                           |
| --------------------- | ------------------- | --------- | --------------------------------------------- |
| `background`          | `#090b0b`           | `#f0f4f5` | App canvas, visible in gutters between panels |
| `card`                | `#0f1415`           | `#ffffff` | Panels, top bar, rail, status bar             |
| `popover`             | `#121819`           | `#ffffff` | Menus, dialogs, tooltips                      |
| `foreground`          | `#f9fbfb`           | `#0d1112` | Data, primary text                            |
| `muted-foreground`    | `#9aa8ac`           | `#5a6569` | Labels, headers, secondary values             |
| `muted` / `accent`    | `#192224`           | `#f0f4f5` | Hover, selected row, active control           |
| `border`              | `#243133`           | `#dfe5e7` | Panel edges, row dividers                     |
| `input`               | `#243133`           | `#c0cbce` | Input borders                                 |
| `primary`             | `#f9fbfb`           | `#0d1112` | Neutral primary button (inverted)             |
| `brand` / `ring`      | `#00c281`           | `#068e6a` | Logo, active nav, focus ring, chart line      |
| `up`                  | `#4f99ed`           | `#2970c2` | Positive change, bid side                     |
| `down`                | `#df3b6b`           | `#d0184d` | Negative change, ask side                     |
| `buy`                 | `#2970c2`           | `#2970c2` | Buy button / buy side fill                    |
| `sell`                | `#d0184d`           | `#d0184d` | Sell button / sell side fill                  |
| `warning`             | `#f58f6c`           | `#d66707` | Warnings, stale data                          |
| `destructive`         | `#ef6b8f`           | `#d0184d` | Errors, destructive actions                   |
| `chart-1` … `chart-5` | Mint series strokes |           | Multi-series charts, in order                 |

Rules:

- **Up is blue, not green.** Like Avanza, which keeps red/green colorblind-safe and green free
  for the brand. Flat (0) is `muted-foreground`.
- Use `<Change ratio={…} />` (`components/common/change.tsx`) for any signed percentage
  instead of picking the color yourself.
- Tints: use opacity on the token for backgrounds (`bg-up/15` for depth bars,
  `bg-muted/60` for row hover). Never invent a new gray.
- Text on `buy`/`sell` fills is `text-white`.

## Typography

- **Roboto** (UI) and **Roboto Mono** (numbers), via `@fontsource-variable`. Avanza uses
  Roboto; their slab headline font is proprietary and not used.
- The type scale is redefined for density: `text-sm` = **13px** (the body default, set on
  `body`), `text-xs` = **11px**. shadcn primitives use `text-sm`, so they come out dense
  automatically.

| Role                     | Classes                                                          |
| ------------------------ | ---------------------------------------------------------------- |
| Body, table cells        | inherit (`text-sm`)                                              |
| Panel title              | `text-xs font-semibold tracking-wider uppercase` (full contrast) |
| Panel subtitle           | `text-xs text-muted-foreground`, next to the title               |
| Tab trigger (panel tabs) | `font-semibold`                                                  |
| Column header            | `text-xs font-medium text-muted-foreground`                      |
| Field label, status bar  | `text-xs text-muted-foreground`                                  |
| Instrument symbol        | `font-medium`; `text-base font-semibold` in an instrument header |
| Key value in a row       | `font-medium` (e.g. position value, best bid/ask)                |
| Hero price               | `num text-3xl font-semibold` + `<Change badge />`                |
| Stat (label over value)  | `dt` `text-xs text-muted-foreground`, `dd` `num font-medium`     |

- Weights: 400 body, 500 emphasis, 600 titles and hero numbers. No 700+, no italics.
- **Numbers:** add the `num` utility (mono + tabular figures) to every price, quantity,
  percentage, time and keyboard hint. Right-align numeric table columns.
- **Formatting:** Swedish, via `src/lib/format.ts` (`formatPrice`, `formatInteger`,
  `formatPercent`): `1 234,50`, `+1,23 %`. Never call `toFixed` or build number strings by hand.
  Times are `Europe/Stockholm`, 24h.

## Spacing and sizing

Base unit 4px (Tailwind's scale). Fixed heights keep rows aligned across panels:

| Element                | Size                                                     |
| ---------------------- | -------------------------------------------------------- |
| Top bar                | `h-10` (40px)                                            |
| Nav rail               | `w-12` (48px), `size-8` icon buttons                     |
| Status bar             | `h-6` (24px)                                             |
| Panel header / tab bar | `h-8` (32px), `px-3`, `bg-muted/40` strip                |
| Table row and header   | `h-8` (32px), cell `px-3`                                |
| Small control          | `h-7` (28px)                                             |
| Panel gutter           | `p-1` / 4px resize handles                               |
| Panel inner padding    | `p-3` for forms and free content; tables go edge-to-edge |

Radius is small (`--radius: 0.375rem`): `rounded-md` for panels, `rounded-sm` for controls
inside them. No shadows on panels; separation comes from the gutter and `border`.

## Layout

```
┌──────────────────────────────────────────────────────────┐
│ TopBar: logo · search (Ctrl K) ·· index tickers          │ h-10
├────┬─────────────────────────────────────────────────────┤
│Nav │ Workspace: resizable columns                        │
│Rail│ ┌ Watchlist ┐┌ Overview (dossier) ──┐┌ Depth/Trades ┐│
│ w12│ │           ││ header · chart       ││              ││
│    │ │           ││ returns · at a glance│├ Pre-trade ───┤│
│    │ │           ││ sections, scrolls ↓  ││              ││
│    │ └───────────┘└──────────────────────┘└──────────────┘│
├────┴─────────────────────────────────────────────────────┤
│ StatusBar: market state · clock ·· connection · version  │ h-6
└──────────────────────────────────────────────────────────┘
```

- `components/layout/`: `AppShell` (CSS grid wrapping the router `Outlet`), `TopBar`,
  `NavRail`, `StatusBar`. Rendered once by `routes/__root.tsx`.
- `components/workspace/`: `Workspace` (the panel grid) and one file per panel.
- The Overview panel (`workspace/dossier/`) is one scrolling page about the focused instrument,
  most decisive first: chart, period returns, "At a glance" facts in plain words (valuation vs
  its own history, analysts, next report, dividend, insider flow), then `Section`s paired two
  per row by `SectionRow` when the panel is wide (container query). Each section loads and
  fails on its own and renders nothing when Avanza has no data for it.
- Every panel uses `<Panel title subtitle actions>` (`components/workspace/panel.tsx`): a
  tinted title bar (title, muted subtitle such as the instrument, right-aligned actions) and a
  scrolling body. When a panel has several views use `<TabbedPanel tabs aside>`
  (`components/workspace/tabbed-panel.tsx`): a line-variant tab bar in place of the title bar.
- Panels never scroll the page: the shell is `h-svh overflow-hidden` and each panel body
  scrolls on its own. Table headers are `sticky top-0 bg-card`.
- The window minimum is 1024×640 (`tauri.conf.json`).

## Components and states

- **Tables:** `<DataTable columns data getRowId selectedRowId />`. Define columns once at module
  scope with `const col = dataTableColumns<Row>()` and `col.columns([...])` (stable references
  matter to TanStack). Per column: `cell` formats the value (`formatPrice`, `<Change>`),
  `meta.align: "end"` right-aligns header and cells (all numeric columns), `meta.className`
  styles the cells (`num`, `font-medium`, `text-muted-foreground`). The look lives in
  `ui/table.tsx`: sticky header, `border-border/60` row dividers, hover `bg-muted/60`, selected
  row `bg-accent` with a 2px brand bar on the left. No zebra stripes, no vertical borders.
- **Toggles vs actions.** Picking one of a few options (chart ranges, views, years, presets)
  is always `<Segmented>` (`components/common/segmented.tsx`): a framed `h-6` group whose
  chosen segment is filled `bg-muted` with `font-medium`. A one-off action (reset, create,
  alert) is a `Button variant="outline" size="xs"` with an icon; related actions go in one
  dropdown ("Reset targets ▾"). Never style either as bare ghost text: a bright label reads
  as "selected", not "clickable".
- **Explaining a field:** a muted ⓘ, `<InfoTip label>` (`components/common/info-tip.tsx`),
  right after the label or control, never inside a `<label>`. Hover, click or Enter opens a
  short popover: what it is, what to type, an example. In a table header use
  `header: infoHeader(title, tip)`. Use it where a value needs a sentence to be understood,
  not on every label.
- **Active state** (nav rail): `data-active` → `bg-accent text-brand`.
- **Buy/sell:** segmented toggle on `bg-muted`; the selected side is filled `bg-buy`/`bg-sell`.
  The submit button takes the side's color and names the action ("Buy VOLV B").
- **Focus:** keep the shadcn focus ring (`ring` = brand). Never remove outlines.
- **Empty state:** one muted sentence in `p-3` ("No open orders."). No illustrations.
  The one exception is a feature that is off until set up (the assistant panel,
  `AssistantOff`): a small illustration drawn from tokens, a line on what it does and one button
  to its Settings page. The setup itself lives only in Settings.
- **Status dots:** `size-1.5 rounded-full`, `bg-brand` = ok/live, `bg-warning` = delayed,
  `bg-destructive` = disconnected.
- **Create from where you are.** Anything the user can make (alert rules today) has one
  dialog, opened from anywhere with what that place already knows filled in
  (`openRuleDialog({ kind, target })`). Offer it where the data is: the instrument
  right-click menu (`AskMenu` → "Alert me"), a hover bell (`Bell size-3`, `opacity-0
  group-hover:opacity-100 focus-visible:opacity-100`) on a stat, an "Alert me" outline button
  in a panel's actions, and the Ctrl K palette. The dialog guides: pick a kind (icon, label,
  one-line explanation), then the details with presets, live current values and a plain
  sentence of what will happen. The list page suggests items from the user's own numbers
  (one click to add, "Adjust…" to open the dialog).
- **Cross-links land on the right tab:** `useOpenTab()(page, panelId, tab)` switches a
  `TabbedPanel` from anywhere.

## Charts

- Build each chart as a component with a memoized `defineChart(...)` (`useMemo` on its inputs);
  reference: `components/common/price-chart.tsx`.
- Paint with tokens, not hex: `stroke: "var(--brand)"`, `var(--up)`/`var(--down)` for signed
  data, `var(--muted-foreground)` for reference rules. Multi-series charts use the palette,
  which `index.css` maps to `chart-1…5` via `--ts-chart-N`.
- Host classes `num text-xs text-muted-foreground`: axes and labels are muted mono, the data
  carries the contrast. Fill a panel with `style={{ height: "100%" }}`.
- Price charts: brand line (1.5px) over a brand gradient area (0 → 35%), y-axis `grid`, dashed
  previous-close `ruleY`, `crosshair` with labels, `focus: "group-x"` and the built-in `tooltip`.
- Format ticks with `src/lib/format.ts`. Compact scales only (`linear`, `band`, `point`); add
  `d3-scale` only when a chart needs a real time scale.

## Privacy mode

The eye button in the top bar blurs everything marked with the `sensitive` class: amounts and
quantities you own (values, cash, P/L, holdings, transactions, order quantities). Market data
(prices, percentages) stays readable. Add `sensitive` to any new element showing your money;
in a `DataTable`, put it in the column's `meta.className`.

## Motion

Minimal. `transition-colors` on hover and active states. No entrance animations on data.
A live price that changes flashes its `up`/`down` tint for 600ms: wrap it in `<Flash value>`
(`components/common/flash.tsx`); it is off under `prefers-reduced-motion`.

The one orchestrated moment is the BankID sign-in overlay (`components/auth/`): it slides up
over the app (`ease-sheet`, 500ms), draws a brand check on success, then slides down. Its
keyframes live in `index.css`; under `prefers-reduced-motion` it only fades. The BankID QR
sits on a `bg-white` tile with black modules in both themes, because scanners need dark on
light. That is the only place a raw white surface is allowed.

## Assistant

The AI assistant (`components/ai/`, `lib/ai/`) is the one place that reads as a conversation
rather than a terminal, so it bends a few rules on purpose. Keep these exceptions inside it.

- **Panel:** a column right of the page (Ctrl J), resizable from its left edge (min 320px, the
  app keeps 480px) with a wide reading mode. Messages and the message box cap at `max-w-3xl` so
  lines stay readable when wide. Header: "Assistant", then the chat's title as a button that
  opens the history list in place.
- **Rounder shapes:** the message box is `rounded-xl`; send/stop, the model chip and the jump
  button are `rounded-full`; your messages are `rounded-2xl rounded-br-md` bubbles on
  `bg-muted`. Everything else in the assistant (popovers, chips, code, tables) keeps the
  small radius.
- **Answers** are full-width Markdown with no bubble: `ChatMarkdown` maps headings, lists,
  tables (the shared `ui/table` primitives, numeric cells get `num` and right alignment) and
  code onto tokens. No prose plugin.
- **Work steps** (tool calls) are quiet `text-xs` lines above the answer: a spinner and a
  shimmering present tense ("Reading your holdings…") while running, a muted check and past
  tense after, expandable to the raw input and result. The status line ("Thinking…") uses
  the same pattern with a seconds counter.
- **Shimmer** (`motion-safe:text-shimmer motion-safe:animate-shimmer`) is the assistant's only
  ambient motion and means "working". Never use it elsewhere; it is off under reduced motion.
- **Context chips** (`ContextChip`): dashed `border-dashed bg-muted/50` chips, `h-6 text-xs`,
  with an icon or logo. In the message box they are removable (what goes with the next
  message); above a sent question they are static (what it was asked with). Dashed means
  "attached context", so don't use dashed borders for anything else.
- **In-app links** (`AppLink`): instruments and articles named in answers are compact chips
  (`bg-muted/60`, logo or newspaper icon) that open the item in the app; external articles add
  `ArrowUpRight`. Web links stay `text-brand` underlined text.
- **Visual blocks:** ` ```chart ` and ` ```instrument ` blocks render as a bordered
  `rounded-md` frame with a live `PriceChart` (h-44) or an instrument card, drawn from app
  data. While streaming they show a dashed placeholder, never raw JSON.
- **Brand logos** (provider marks from svgl.app) are the one place a hex color may appear,
  and only inside the SVG asset files in `src/assets/providers/`, never in components. A
  mark that vanishes on dark (OpenAI's black knot) ships a `-dark` file as `logoDark`.
- **Privacy mode** blurs answers and tool results (`sensitive`): they quote your amounts.

## Don'ts

- No hex values, `text-[Npx]` sizes or new grays in components: use tokens and the scale.
- No green for "up", no red/blue for decoration.
- No cards inside panels, no shadows, no gradients.
- No Radix packages.
