# Changelog

All notable changes to Dynamic Matrix Heatmap are documented here.

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the Power BI
four-part version scheme (`major.minor.patch.build`).

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
