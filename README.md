# Dynamic Matrix Heatmap

A Power BI custom visual: **a pivot table with a heatmap that the reader turns.** Rows, columns, the
value and how it is shown are dropdowns inside the visual — no edit rights, no request to a developer,
no DAX.

![Version](https://img.shields.io/badge/version-1.2.0.0-2B6CB0)
![API](https://img.shields.io/badge/Power%20BI%20API-5.11.1-1F4E80)

## What it does

- **X, Y and Value** chosen in the visual by whoever reads the report.
- **Show as** absolute, % of row, % of column or % of grand total, per measure *(Pro)*.
- **Group rows** by a third dimension with subtotals that open and close *(Pro)*.
- **Sorting** by name, total or by clicking a column header; days and months in calendar order.
- **Others**: the smallest categories beyond the limit are grouped, so totals always add up.
- **Order by similarity** of rows and columns *(Pro)*.
- **Exact numbers**: an ID in **Detail (rows)** makes averages exact; a Count (Distinct) measure is
  counted exactly when its column is also bound. When a number cannot be exact, a note says so.
- 12 colour schemes, colour rules, 5 style templates, format on the canvas, bookmarks, keyboard, high
  contrast, Format pane and in-visual bar in 12 languages. No network access.

## Field wells

| Well | Limit | Purpose |
|---|---|---|
| `Dimensions` | 3 Free / 10 Pro | Fields for X, Y and Group rows |
| `Measures` | 2 Free / 5 Pro | Values in the cells, aggregated as set in the field well |
| `Detail (rows)` | 3, optional | An ID per row: exact averages, distinct counts (Pro) |

## Documentation

- Guide, FAQ and troubleshooting: https://tinocallarisa-web.github.io/dynamic-matrix-heatmap/support.html
- Changelog: [CHANGELOG.md](CHANGELOG.md)
- Questions: [Discussions](https://github.com/tinocallarisa-web/dynamic-matrix-heatmap/discussions) ·
  [Issues](https://github.com/tinocallarisa-web/dynamic-matrix-heatmap/issues) · support@tcviz.com

## Build

```
npm install
node build-test.js          # test package, Pro forced, GUID + "_test"
node build-test.js --free   # test package with the real licence check, GUID + "_testfree"
```

Requires Node 18+ and powerbi-visuals-tools 7. Pro is licensed through Microsoft AppSource
(IVisualLicenseManager); the source contains no key.

© 2026 TCViz
