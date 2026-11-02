# Changelog

What changed in each AvanzaDesk release. Generated from commit messages by git-cliff.

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

