# Changelog

What changed in each AvanzaDesk release. Generated from commit messages by git-cliff.

## 0.5.0 (2026-11-02)

### New

- **Workspace:** Candlestick chart with moving averages, VWAP, RSI and MACD
- **Alerts:** Get notified when a stock rises or falls to a price level, set right from the chart
- **Workspace:** Pick watchlist columns like bid, ask, spread and turnover to use it as a live quote board
- **Workspace:** Price ladder shows the book with your open orders and stop-loss triggers at their prices
- **Workspace:** Order book shows cumulative depth and brokers show their share of the day's volume
- **Data:** Export any table as CSV and keep a live quotes file that spreadsheets refresh from
- **Workspace:** Pop an instrument's chart and order book out into its own window for a second screen
- **Markets:** See an index as a heatmap of today's moves
- **App:** Rebind the search, assistant and page shortcuts in Settings

### Fixed

- **Markets:** Index panel only offers indices Avanza lists members for

## 0.4.0 (2026-11-02)

### New

- **App:** Star AvanzaDesk on GitHub from the status bar or the what's new dialog
- **App:** Suggest a feature from the settings menu, posted as an idea on GitHub Discussions
- **Briefing:** See what changed since your last visit when you sign in again or come back after a while
- **App:** Hover a page in the nav rail to see what it's for and its Alt shortcut

### Fixed

- **Portfolio:** Top bar portfolio value includes cash and matches the portfolio page's total

## 0.3.0 (2026-11-02)

### New

- **Portfolio:** Today tab charts each holding's day so far against your portfolio and OMXS30
- **Portfolio:** Holdings, daily result, quotes and today charts update live as prices move
- **Workspace:** Trading in Avanza opens the order with your quantity filled in, and funds go straight to their buy or sell page
- **Analysis:** Rebalance orders open in Avanza with the share count filled in
- **Tables:** Select rows by click, drag, shift and cmd, and copy them with cmd+c
- **Portfolio:** Group holdings across accounts and filter the portfolio and rebalancing by group
- **Rebalance:** Rebalance gets its own page: add instruments, set a tolerance and minimum order, and place the orders step by step
- **Rebalance:** Follow Pareto's monthly model portfolio with one click from the targets menu
- **Navigation:** Go back and forward between pages with the top-bar arrows, mouse side buttons or ⌘[ and ⌘]
- **Rebalance:** Ask the assistant for target weights and apply its suggestion to the plan in one click
- **Rebalance:** Check the orders against your current mix: past return, volatility, largest fall and where the risk sits

### Fixed

- **Analysis:** Trading profile no longer crashes when trade dates include a time
- **Markets:** No stuck error for instruments without live data, like Oslo stocks
- **Analysis:** Insider trades show every trade when two look identical

## 0.2.0 (2026-11-01)

### New

- Add one-line install scripts
- **Analysis:** Trading profile finds habits in your trades and shows whether they're changing
- What's new dialog after an update, also in the settings menu

### Fixed

- **Charts:** Tooltips show labeled values instead of raw x and y

## 0.1.0 (2026-10-31)

### New

- Add auto-update via GitHub Releases

