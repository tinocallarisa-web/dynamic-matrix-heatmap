# Changelog

All notable changes to Dynamic Matrix Heatmap are documented here.

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the Power BI
four-part version scheme (`major.minor.patch.build`).

---

## [1.1.0.0] — 2026-09-28

### Fixed

- **A counted field showed the number of groups, not the count.** With five dimensions bound and two
  chosen, a field the field well counts (`Count of total_sales`) read 52 in the matrix against 4,908 in a
  card over the same field. Power BI sends one partial count per row group, and collapsing to the chosen
  X/Y pair means adding those partials; the code returned how many groups there were instead. Row totals,
  column totals and the grand total were wrong the same way, and consistently so — which is what made the
  number look plausible.
### Removed

- **The Aggregation and Number format settings are gone from the format pane.** Both repeated a decision
  Power BI already takes, in a worse place. Aggregation belongs to the field well, where the same field can
  be bound twice — as Sum and as Count — and both appear in the visual's measure list, each aggregated by
  the engine itself. Number format belongs to the model, whose format string the visual already honours,
  now in the report's own locale. Two controls that duplicate the system are not flexibility, they are a
  second place to look and a second answer to reconcile. What is left in the card is what nothing else
  gives you here: the percentage view and the totals. Reports that set either of them keep working — the
  aggregation falls back to what the field well applied, and the format to the model's.

- **“Count of rows” is gone, because this visual cannot know it.** The data mapping is categorical, so
  Power BI groups by the cross product of every bound dimension: each row the visual receives is one unique
  combination, not a row of your table. The option returned the number of combinations — a number that
  looks like a count and is not one. There is no way to deliver what the label promised, so the option was
  removed rather than made to look right. A report saved with it selected falls back to Auto. Counting is
  still available where it is exact: apply Count in the field well, or use the Distinct count of well.

- **The banner naming the blocked feature never reached the reader.** Power BI shows one notification at
  a time and the last call replaces the previous one. `notifyFeatureBlocked` and `notifyLicenseRequired`
  were called back to back, so the message saying *which* capability was Pro was overwritten instantly by
  the generic Upgrade bar: the reader was asked to buy without being told what for. The sequence is now
  `clearLicenseNotification` → the banner naming the feature → and, about 10 s later, the Upgrade bar.
  The timer is cancelled if the licence arrives or the Pro capability is switched off in the meantime,
  and in `destroy()`, because Power BI recreates the visual on every page change.
- **Numbers ignored the report's locale.** The format string from the model was honoured, but
  `valueFormatter.create()` was called without `cultureSelector`, so the formatter fell back to its
  default culture. A reader in Spain, Germany or France saw `1,234.56` where the rest of the report
  writes `1.234,56`. It affects the cells, the tooltips and the grand total, which all come from these
  two formatters.
- **A distinct count bound as a measure was silently added up.** `Count (Distinct)` in the field well is
  computed at the grain of every bound dimension, and a distinct count cannot be collapsed: a customer who
  buys in two regions sits in two combinations, and adding them counts that customer twice. The visual
  detected it as a plain count and summed it, producing an inflated total with nothing to show for it. It
  is now treated as an operation that cannot be read, which is the truth — there is no correct way to
  combine it — and the non-additive warning appears. Counting distinct values exactly is what the
  “Distinct count of” well is for: it takes the raw ID column and counts uniques per cell, which is right
  for any X/Y pair.

- **Dragging a field into “Distinct count of (Pro)” without a licence did nothing, and said nothing.**
  The option never appeared in the measure list, and the free-tier notice always read “Showing the first 3
  dimensions and 2 measures” — which does not mention distinct counts at all. A field went into a well and
  the visual carried on as if it had not. The notice now names what was actually withheld, distinct counts
  included.

- **"Edit interactions" was ignored.** The report author can switch this visual's interactions off,
  and clicking a cell filtered the report anyway, against that decision. Selection now respects
  `hostCapabilities.allowInteractions`.

### Changed

- **The per-measure settings no longer write to the report in reading view.** Reading view has no format
  pane to keep in sync and nothing to learn: a report consumer switching measure should read what the
  author left, not have the visual persist properties into someone else's report on every change. Writing
  now happens only while editing; reading view looks the settings up and renders.

- **The Values card now names the measure it is editing.** It reads “Values — Count of total_sales”. The
  card edits the measure selected in the visual, and with the format pane open that selector is behind it,
  so “which one is this applying to?” was a fair question every time the pane was opened.

- **“Show value as” is now per measure.** It was one global setting applied to every measure bound to the
  visual, so choosing % of row for revenue turned a count into a percentage too. How a number is presented
  changes with the measure, and the visual is built around switching between them. Each measure now keeps
  its own, and the card names the one it is editing.

- **A Weights field well, so averages come out right.** The native matrix gets averages right because it
  asks the engine at every level; it can, because its hierarchy is fixed in the field wells. Here X and Y
  are picked inside the visual, after the query has run, so the only thing left is to combine what arrived
  — and combining averages without weights makes a combination of ten thousand rows count the same as one
  of a single row. Bind a row count to Weights and the collapse becomes the weighted average,
  Σ(value × weight) / Σweight, which is the same number the native matrix shows. With the well bound the
  warning below no longer appears, because there is nothing left to warn about. The well is optional and
  takes one field; leave it empty and nothing changes.

- **A warning when an average cannot be collapsed.** `sum`, `min`, `max` and `count` all survive the
  second collapse the visual performs: partial sums add, a minimum of minimums is the minimum, and so on.
  An average does not. Power BI averages at the grain of every bound dimension, and combining those
  averages makes each combination count the same whether it holds one row or ten thousand. The weights
  are not in the dataView, so the visual cannot correct for it — only say so, which it now does while you
  edit. It stays quiet when the user picked Average themselves over a summed field, because the mean per
  combination is a legitimate question to ask.

- **A warning when a measure is being collapsed in the visual.** Because X and Y are chosen inside the
  visual, Power BI cannot aggregate to that pair: it aggregates at the grain of every bound dimension and
  the visual combines the rest. That is only valid for an additive measure. A distinct count, a ratio or
  a percentage cannot be collapsed correctly by any aggregation — adding two percentages does not give a
  percentage, and averaging them ignores the weights. No setting fixes this, so the visual now says so
  while you edit, when the active measure is a DAX measure whose aggregation cannot be read and some cell
  really does hold more than one source row. Reading view stays clean.

- **Bookmark support.** The selected cells lived only in memory. Power BI persists the filter — a
  bookmark stores it and it survives a page change — but it recreates the visual, so the selection came
  back empty: the report stayed filtered while the matrix showed nothing selected and every cell at full
  opacity. The selection is now rebuilt from `jsonFilters`, so the two agree again.
- **Spanish in the format pane.** `stringResources` was declared as an empty array and no localization
  manager was created, so `displayNameKey` did nothing: the pane was English whatever the report's
  language. Cards, settings, descriptions and dropdown options are now translated, with the dropdown
  options handled separately because the formatting-model utility has no key mechanism for enum members.

---

## [1.0.1.0] — 2026-09-15

### Fixed

- **Pro could not be unlocked.** The published 1.0.0.0 package never queried the licence. The check now
  runs through `IVisualLicenseManager`, matches the plan `dynamic-matrix-heatmap-tcviz` as the full
  Service ID or the Plan ID on its own, and accepts the Warning (payment grace period) state.
- **No purchase path.** Power BI's `notifyFeatureBlocked` (English / Spanish) and licence icon are raised
  when a Pro capability is used without a licence, only once the licence has resolved and never where
  licences cannot be checked (Publish to Web, embedding, export).
- **Licensing text of our own removed.** The notice "Free tier … Pro unlocks …" is now a neutral note:
  "Showing the first 3 dimensions and 2 measures."
- The icon file referenced by `pbiviz.json` (`assets/icon.png`) was missing from the source tree.

### Added

- **Pro preview while editing.** Without a licence, in edit mode, Pro capabilities render under a
  "Pro preview" watermark. In reading view the free result is shown.
- "(Pro)" on *Show value as*, *Show totals* and *Distinct count of*; the free limits are stated in the
  Dimensions and Measures descriptions.

### Changed

- ESLint script added; `npm audit` clean (`overrides` for `qs` and `uuid` in the build toolchain).

---

## [1.0.0.0] — 2026-08-03

First public release.

### Added

- **In-canvas dimension switching.** X axis, Y axis and Value dropdowns rendered inside the visual,
  so report readers can pivot without edit rights. The Y dropdown excludes whatever is selected in X.
- **Client-side aggregation engine.** The visual indexes the source rows and aggregates them itself
  for the selected X/Y projection, rather than re-summing values Power BI collapsed at a different
  granularity.
- **`Distinct count of` field well** (Pro). Counts unique values from a raw ID column, so the result
  is exact for any X/Y combination and the grand total matches a card visual.
- **Automatic aggregation detection.** Reads the aggregation Power BI applied to a field from its
  label and query name, with a manual override for DAX measures where it is not readable.
- **Show value as** (Pro): absolute, % of row, % of column, % of grand total.
- **Row and column totals** (Pro), with exact distinct counts in the margins.
- Global three-colour heatmap scale, configurable from the format pane.
- Empty cell handling: blank, dash, zero or grey fill.
- Column header orientation: horizontal, vertical (90°) or diagonal (45°).
- Separate font, size and colour for axis labels, cell values and the controls bar.
- Configurable row height and column width, with horizontal and vertical scrolling.
- Cross-filtering by declarative tuple filter, so cost is proportional to the number of selected
  cells rather than to the rows behind them.
- Native context menu, keyboard navigation (Tab / Enter / Space) and standard tooltips.
- Report tooltip support.
- High contrast support, honouring the system palette.
- Segmented data loading for row-level detail.
- Selection of X, Y and Value persisted in the report file.

### Known limitations

- Average is an unweighted approximation when dimensions beyond the selected pair are loaded.
  Sum, minimum, maximum and count re-aggregate exactly.
- Up to 25 distinct values are rendered per axis.
- With distinct counts, percentages of a row need not total 100 — an entity present in several
  columns is counted in each.
