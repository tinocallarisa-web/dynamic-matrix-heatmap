# Dynamic Matrix Heatmap — Product Page Content

**Version 1.1.0.0 · TCViz**
Video: https://www.youtube.com/watch?v=vobbf6405e4

Content for the four tabs of the product page on the TCViz website.

---

# TAB 1 — OVERVIEW

## The problem

A Power BI matrix is fixed at design time. You choose the rows, the columns and the measure, and
everyone who opens the report gets that view. When a colleague asks "can I see this by route instead
of by channel?", someone with edit rights has to change it — or you build a fifth near-identical
matrix and the page fills up.

Field parameters help, but they need modelling work and a slicer per report, and they still leave
the choice outside the visual.

There is a second problem, quieter and more damaging. Power BI evaluates a measure at the
granularity of *every* field in the visual. If you show only two of them, the rest have to be
recombined. Sums, minimums, maximums and counts recombine exactly. **A distinct count does not.** A
customer who appears under two service levels is counted in both, and the total no longer matches
the card sitting next to it. Most people discover this when a number looks wrong and nobody can
explain why.

## How it works

Dynamic Matrix Heatmap renders three dropdowns inside the visual: **X axis**, **Y axis** and
**Value**. Anyone reading the report picks the combination they need — no edit rights, no model
change, no request to a developer. The selection is saved with the report, so it survives closing
and reopening.

Cells are coloured by a global heatmap scale, so the shape of the data reads before the numbers do.

For the accuracy problem, the visual keeps the underlying rows and aggregates them itself. Give it
the raw ID column in the **Distinct count of** well and it counts unique values in memory for
whichever pair of dimensions is on screen. The grand total matches your card visual, for every
combination.

## Who it is for

- **Analysts** who keep rebuilding the same matrix with different fields
- **Report authors** whose users ask for one more cross every week
- **Business users** who want to explore without filing a ticket
- **Anyone** who has had a distinct count silently disagree with itself

## What makes it different

Most matrix visuals are a nicer-looking native matrix. This one moves the field choice into the
canvas *and* fixes the aggregation underneath it. The client-side aggregation engine is what makes
exact distinct counts possible for any projection — something no purely declarative visual can do,
because the correction has to happen after Power BI has already aggregated.

We document the limits rather than hide them: average is an unweighted approximation, and a distinct
count from a DAX measure cannot be recombined by any client. The visual tells you what it can and
cannot guarantee.

## At a glance

| | |
|---|---|
| Type | Matrix / pivot with heatmap colouring |
| Free tier | Fully functional, 3 dimensions and 2 measures |
| Pro tier | 10 dimensions, 5 measures, distinct counts, percentages, totals |
| Network access | None |
| Data collected | None |
| Power BI API | 5.11.1 |

---

# TAB 2 — FEATURES

## Reader-driven pivoting

- **In-canvas dropdowns** for X dimension, Y dimension and value
- The Y dropdown **excludes whatever is selected in X**, so an invalid combination cannot be built
- Selection **persists in the report file** and survives save and reopen
- Guided empty states: the visual says what is missing rather than rendering blank

## Aggregation and accuracy

- **Automatic aggregation detection.** Reads the aggregation Power BI applied to a field from its
  label and query name, so *Average of CVI* averages and *Sum of sales* sums, with no configuration
- **`Weights for averages`** — bind a row count and averages are combined as a weighted average, the
  same number the native matrix shows. Without it the visual says, while you edit, that the average is
  unweighted rather than showing it as if it were right
- **`Distinct count of`** *(Pro)* — counts unique values from a raw column, exact for any X/Y pair.
  A distinct count bound as a measure cannot be combined at all — a customer buying in two regions
  would be counted twice — and the visual says so instead of adding them up
- **Format correction.** When the same field is added twice, once with *Show value as → Percent of
  grand total*, Power BI marks the underlying column as a percentage and it reaches both instances.
  The visual detects that case and corrects the display automatically

## Display

- **Global heatmap scale** with three configurable colours, computed across every visible cell
- **Show value as** *(Pro)* — absolute, % of row, % of column, % of grand total
- **Row and column totals** *(Pro)*, with exact distinct counts in the margins
- **Empty cell handling** — blank, dash, zero or grey fill
- **Column header orientation** — horizontal, vertical (90°) or diagonal (45°)
- Header height is a minimum, not a fixed value, so long labels push the row down instead of being
  clipped
- Independent font, size and colour for axis labels, cell values and the controls bar
- Configurable row height and column width, with scrolling rather than shrinking

## Interaction

- **Click a cell** to cross-filter the rest of the page to that intersection
- **Click again** to clear
- **Ctrl / Cmd + click** to build a multi-cell selection
- Filtering is expressed as a **declarative tuple filter**, so the cost is proportional to the number
  of selected cells rather than to the rows behind them — a cell holding millions of rows is as cheap
  as one holding five
- **Native context menu** on right click: Include, Exclude, Drill through
- **Keyboard navigation** — Tab to move, Enter or Space to activate
- **Standard and report tooltips**

## Accessibility

- **High contrast support.** In high contrast the colour scale is dropped for system foreground and
  background, and selection is marked with an outline rather than by hue alone
- Focusable cells with visible focus
- Screen-reader labels on the dropdowns

## Free vs Pro

| Capability | Free | Pro |
|---|---|---|
| Matrix with in-canvas dropdowns | ✓ | ✓ |
| Global heatmap colour scale | ✓ | ✓ |
| All formatting options | ✓ | ✓ |
| Cross-filtering, tooltips, context menu | ✓ | ✓ |
| Keyboard navigation, high contrast | ✓ | ✓ |
| Automatic aggregation detection | ✓ | ✓ |
| Dimensions | up to 3 | up to 10 |
| Measures | up to 2 | up to 5 |
| **Distinct count of** | — | ✓ |
| **Show value as %** | — | ✓ |
| **Row and column totals** | — | ✓ |

No watermark, no time limit, no nag screen.

---

# TAB 3 — TECHNICAL

## Specifications

| | |
|---|---|
| Power BI API version | 5.11.1 |
| Visual type | Categorical |
| Package size | Under 1 MB |
| External dependencies | None at runtime |
| Bundled libraries | d3, Power BI formatting and tooltip utilities |

## Field wells

| Well | Kind | Limit | Notes |
|---|---|---|---|
| `Dimensions` | Grouping | 3 Free / 10 Pro | Populates the X and Y dropdowns |
| `Measures` | Measure | 2 Free / 5 Pro | Values shown in the cells |
| `Distinct count of` | Grouping | 3 (Pro) | Raw ID columns, counted by the visual |

Recommended cardinality is roughly 20–25 distinct values per dimension. Up to 25 are rendered per
axis; beyond that the remainder are omitted.

## Performance

- Row-level detail is loaded in segments through `fetchMoreData`, up to a bounded number of windows.
  When the limit is reached, an amber notice states that the dataset is partial rather than showing
  wrong figures silently
- Every field added multiplies the combinations Power BI computes. Three or four dimensions perform
  substantially better than ten
- Cross-filtering uses a tuple filter, so selecting a dense cell costs the same as a sparse one

## Integration with Power BI

- Respects slicers and cross-filtering from other visuals natively
- Participates in highlighting: non-highlighted cells dim to 30% opacity
- Filter state synchronises with the report
- Supports bookmarks through persisted selection state
- Report tooltips can be bound to the dimension fields

## Compatibility

Power BI Desktop, Power BI Service and Power BI Embedded. Mobile is supported for viewing; the
dropdowns are usable but the matrix is designed for a larger canvas.

## Licensing

Pro entitlement is resolved through Microsoft's official `IVisualLicenseManager`. TCViz operates no
licence server. Resolution happens asynchronously *after* the first render, so a slow or failing
licence service never delays or breaks the visual — it simply stays on the Free tier.

Licences are sold and billed by Microsoft through AppSource.

## Privacy

No network access of any kind. The `privileges` array in `capabilities.json` is empty, so Power BI
blocks outbound connections at platform level. No `fetch`, no external scripts, no CDN fonts, no
analytics, no telemetry, no cookies, no browser storage.

The only persisted values are the three field *names* chosen in the dropdowns, written into your own
`.pbix` through `persistProperties`.

## Known limitations

- **Average is an unweighted approximation** when dimensions beyond the selected pair are loaded.
  Sum, minimum, maximum and count re-aggregate exactly
- A **distinct count from a DAX measure** cannot be recombined correctly by any client — use the
  `Distinct count of` well
- Up to 25 distinct values per axis
- With distinct counts, percentages of a row need not total 100: an entity present in several columns
  is counted in each. Inherent to distinct counting

## Support

Documentation, FAQ and troubleshooting at the support page. Bugs and feature requests through GitHub
issues with structured templates. Licensing questions by email.

---

# TAB 4 — CHANGELOG

## 1.0.0.0 — 3 August 2026

First public release.

**Added**

- In-canvas X, Y and Value dropdowns, so report readers can pivot without edit rights
- Client-side aggregation engine that indexes source rows and aggregates them for the selected
  projection, rather than re-summing values Power BI collapsed at another granularity
- `Distinct count of` field well *(Pro)* for exact unique counts
- Automatic aggregation detection from field label and query name, with manual override
- Automatic correction of percentage formats leaked between duplicate field instances
- Show value as: absolute, % of row, % of column, % of grand total *(Pro)*
- Row and column totals with exact distinct counts *(Pro)*
- Global three-colour heatmap scale
- Empty cell handling: blank, dash, zero or grey fill
- Column header orientation: horizontal, vertical, diagonal
- Independent typography for labels, values and the controls bar
- Configurable row height and column width with scrolling
- Cross-filtering by declarative tuple filter
- Native context menu, keyboard navigation, standard and report tooltips
- High contrast support
- Segmented loading of row-level detail with a clear notice when truncated
- Selection persisted in the report file

**Known limitations**

- Average is an unweighted approximation when extra dimensions are loaded
- Up to 25 distinct values rendered per axis
- Percentages of a row need not total 100 when using distinct counts
