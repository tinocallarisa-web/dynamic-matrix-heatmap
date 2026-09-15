# Dynamic Matrix Heatmap

A Power BI custom visual that lets report *readers* choose their own crosstab.

Instead of building one matrix per combination of fields, you drop in the dimensions once. Everyone
reading the report picks the X dimension, the Y dimension and the value from dropdowns inside the
visual — no edit rights, no request to a developer, no reconfiguring the model.

![Version](https://img.shields.io/badge/version-1.0.0.0-C96442)
![API](https://img.shields.io/badge/Power%20BI%20API-5.11.1-B05730)

---

## Why it exists

Power BI's native matrix is fixed at design time. Field parameters help, but they need modelling
work and a slicer per report. This visual moves the choice into the canvas.

The harder problem it solves is correctness. Power BI computes a measure at the granularity of *all*
the fields in a visual. Show only two of them and the rest have to be recombined — sums, minimums,
maximums and counts recombine exactly, but **a distinct count does not**: a customer appearing under
two pickings gets counted twice.

So the visual keeps the underlying rows and aggregates them itself. Give it the raw ID column in the
`Distinct count of` well and it counts unique values in memory for whichever pair of dimensions is on
screen. The grand total matches your card visual, for every combination.

## Field wells

| Well | Accepts | Limit | Purpose |
|---|---|---|---|
| `Dimensions` | Any grouping field | 3 Free / 10 Pro | Populates the X and Y dropdowns |
| `Measures` | Measures or numeric columns | 2 Free / 5 Pro | Values shown in the cells |
| `Distinct count of` | Raw ID columns | 3 (Pro) | Exact unique counts, computed by the visual |

Keep cardinality to roughly 20–25 values per dimension; up to 25 are rendered per axis.

## Free vs Pro

Free renders a complete matrix with the heatmap scale, all formatting options, cross-filtering,
tooltips, keyboard navigation and high contrast — no watermark, no time limit.

Pro raises the field limits and adds `Distinct count of`, the percentage display modes and totals.
See [terms.html](terms.html) for the full breakdown.

## Building

```bash
npm install
npx pbiviz package
```

The `.pbiviz` lands in `dist/`.

## Documentation

- [Support &amp; documentation](https://tinocallarisa-web.github.io/dynamic-matrix-heatmap/support.html)
- [Privacy policy](https://tinocallarisa-web.github.io/dynamic-matrix-heatmap/privacy.html)
- [Terms &amp; licence](https://tinocallarisa-web.github.io/dynamic-matrix-heatmap/terms.html)
- [Changelog](CHANGELOG.md)

## Privacy

No network access of any kind. The `privileges` array in `capabilities.json` is empty, so Power BI
blocks outbound connections at the platform level. Nothing is collected, transmitted or stored
outside your own report file.

## Support

[Open an issue](https://github.com/tinocallarisa-web/dynamic-matrix-heatmap/issues) for bugs and
feature requests. Licensing questions: support@tcviz.com

---

© 2026 TCViz
