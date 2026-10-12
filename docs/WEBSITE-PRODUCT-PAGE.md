# Dynamic Matrix Heatmap — Product Page Content

**Version 1.2.0.0 · TCViz**
Video: https://www.youtube.com/watch?v=pPf0Bu0H11U

Content for the four tabs of the product page on the TCViz website. Rules: compare only with the
native Power BI matrix, never with other marketplace visuals; "Power BI" always capitalised so.

---

# TAB 1 — OVERVIEW

## The problem

A Power BI matrix answers the question its author had. You choose the rows, the columns and the
measure, and everyone who opens the report gets that view. When a colleague asks "can I see this by
product instead of by region?" or "as a share of the row?", someone with edit rights has to change it
— or you build a fifth near-identical matrix and the page fills up.

There is a second problem, quieter. Power BI evaluates a measure at the grain of *every* field in the
visual. If the reader shows only two of them, the numbers have to be combined again. Sums, minimums,
maximums and counts combine exactly. **Averages and distinct counts do not**: an average of averages
is not the average, and a customer who appears under two service levels is counted twice.

## How it works

Dynamic Matrix Heatmap is a pivot table with a heatmap that the reader turns. A panel inside the visual
offers **X axis**, **Y axis**, **Value** and **Show as**; whoever reads the report picks the view they
need and the heatmap redraws. No edit rights, no model change, no DAX.

Rows can be **grouped by a third dimension** with subtotals that open and close. A click on a column
header sorts the rows by it. Beyond the number of rows or columns you set, the smallest categories are
grouped in **Others**, so totals still add up.

For accuracy, add one ID — order, ticket, customer — to **Detail (rows)** and averages are exact for any
pair. A measure set to Count (Distinct) is counted exactly when its column is also in the visual. When
a number cannot be combined correctly, a note says so while you edit, instead of showing a plausible
wrong figure.

## Who it is for

- **Report authors** whose readers ask for one more cross every week
- **Analysts** who keep rebuilding the same matrix with different fields
- **Business users coming from Excel** who expect to pivot the table themselves
- **Anyone** who has had an average or a distinct count silently disagree with a card

## At a glance

| | |
|---|---|
| Type | Pivot table with heatmap colouring |
| Free tier | A correct pivot: 3 dimensions, 2 measures, heatmap, rules, templates, Others, sorting, exact averages |
| Pro tier | 10 dimensions, 5 measures, Show as, totals, row groups, order by similarity, distinct counts of Detail fields |
| Network access | None |
| Data collected | None |
| Languages | 12 |
| Power BI API | 5.11.1 |

---

# TAB 2 — FEATURES

## Pivot in the report

- **Side panel** with X axis, Y axis, Value, Show as and Group rows; it folds to a thin strip and starts
  folded on narrow visuals. Format → Layout → Controls moves it to a top bar or hides it in reading view
- **Show as** *(Pro)* — absolute, % of row, % of column, % of grand total; each measure remembers its own
- **Group rows** *(Pro, with 3+ dimensions)* — subtotal rows that open and close, coloured on their own
  scale; a corner button opens or closes all; clicking a subtotal selects that column for the group
- **Totals** *(Pro)* — a tick box in the panel; the Format pane sets how the report opens
- The view is saved with the report, like a slicer selection

## Order and size

- **Click a column header** to sort the rows by it: highest first, lowest first, off
- Row and column order by name or by total; days and months in calendar order in six languages
- **Others** — beyond Maximum rows / columns (25 by default, up to 200) the smallest categories are
  grouped so totals still add up; Others does not stretch the colour scale
- **Order by similarity** *(Pro)* — rows or columns with the same pattern side by side

## Numbers that survive the pivot

- Sum, minimum, maximum and count combine exactly at any pair
- **Detail (rows)** — an optional ID makes averages exact. Free
- A **Count (Distinct)** measure is exact when its column is also in Dimensions or Detail (rows);
  distinct counts of Detail fields can be chosen as the value *(Pro)*
- Ratios and other non-additive measures are flagged with a note while editing
- The model's format string is used, in the report's locale

## Look

- **12 colour schemes** — 11 presets (Viridis and Cividis are colour-blind safe) or your own three colours
- **Colour rules** — up to three thresholds with their own colour, over the gradient
- **Style templates** — Classic, Clean, Tiles, Contrast, Compact; a template only fills what you have not set
- Space between cells, rounded corners, row height, column width, header orientation and background
- Text on dark cells turns white automatically
- Empty cells: blank, dash, zero or grey fill

## Works like a native visual

- Click a cell to cross-filter the page; Ctrl / Cmd + click to add; click again to clear
- With row groups, a cell filters by column, row and group; a cell in Others filters by all its categories
- Bookmarks restore the selected cells; "Edit interactions" is respected
- Highlighting from other visuals, native context menu, standard and report tooltips
- **Format on the canvas** — click the values, the headers or the controls to format them
- Keyboard navigation and high contrast
- Format pane and the panel in 12 languages

## Free vs Pro

| Capability | Free | Pro |
|---|---|---|
| Pivot with the panel in the visual | ✓ | ✓ |
| Heatmap, 12 schemes, colour rules, templates | ✓ | ✓ |
| Others, sorting, calendar order | ✓ | ✓ |
| Exact averages with Detail (rows) | ✓ | ✓ |
| Cross-filtering, bookmarks, tooltips, format on the canvas | ✓ | ✓ |
| Dimensions | up to 3 | up to 10 |
| Measures | up to 2 | up to 5 |
| **Show as %** | — | ✓ |
| **Totals** | — | ✓ |
| **Group rows with subtotals** | — | ✓ |
| **Order by similarity** | — | ✓ |
| **Distinct counts of Detail fields** | — | ✓ |

Turn on a Pro capability without a licence while editing and it is drawn working, under a "Pro preview"
watermark that names it. Reading view shows the free result, without watermark. Pro comes with a
one-month free trial, monthly or annual.

---

# TAB 3 — TECHNICAL

## Specifications

| | |
|---|---|
| Power BI API version | 5.11.1 |
| Visual type | Categorical |
| Package size | Under 100 KB |
| External dependencies | None at runtime |
| Bundled libraries | d3, Power BI formatting, tooltip and on-object utilities |

## Field wells

| Well | Kind | Limit | Notes |
|---|---|---|---|
| `Dimensions` | Grouping | 3 Free / 10 Pro | Offered in X axis, Y axis and Group rows |
| `Measures` | Measure | 2 Free / 5 Pro | Aggregated as set in the field well |
| `Detail (rows)` | Grouping | 3, optional | An ID per row: exact averages; distinct counts of these fields (Pro) |

## Performance

- Row-level detail is loaded in segments through `fetchMoreData`, up to a bounded number of windows.
  When the limit is reached, a notice says the dataset is partial rather than showing wrong figures
- Every field added multiplies the combinations Power BI computes: bind only what readers may need
- Cross-filtering uses a tuple filter, so selecting a dense cell costs the same as a sparse one

## Licensing

Pro entitlement is resolved through Microsoft's official `IVisualLicenseManager`. TCViz operates no
licence server. Licences are sold and billed by Microsoft through AppSource.

## Privacy

No network access of any kind: the `privileges` array in `capabilities.json` is empty. No analytics, no
telemetry, no external scripts, no cookies. What the visual writes into your own report is the view —
the fields chosen, how each measure is shown, the sort column and which groups are closed — like a
slicer selection.

## Known limitations

- Averages are exact only with an ID in Detail (rows); without it, the visual shows an average of
  averages and says so
- A distinct count from a DAX measure cannot be recombined by any client
- One level of row grouping; no column groups; one value at a time
- With Show as %, totals show each row's and column's share of the grand total, and the corner shows
  the grand total itself
- With distinct counts, percentages of a row need not total 100: an entity present in several columns
  is counted in each

---

# TAB 4 — CHANGELOG

## 1.2.0.0 — 12 October 2026

The matrix becomes a pivot table.

- Side panel with the controls; Show as in the visual, per measure *(Pro)*
- Group rows with subtotals that open and close, coloured on their own scale *(Pro)*
- Totals as a tick box in the panel *(Pro)*; order by similarity *(Pro)*
- Detail (rows) replaces Distinct count of and Weights for averages: one ID makes averages exact
- Others instead of silently dropping categories beyond 25; up to 200 per axis
- Sort by clicking a column header; calendar order for days and months
- 12 colour schemes, colour rules, 5 style templates, cell gap and radius, header background
- Format on the canvas; 12 languages

## 1.1.0.0 — 28 September 2026

- Fixed: a counted field showed the number of groups instead of the count
- Removed the Aggregation and Number format settings (the field well and the model decide)
- Removed "Count of rows", which the visual cannot know
- Numbers in the report's locale; the Pro banner names the blocked feature before the Upgrade bar

## 1.0.0.0 — 3 August 2026

First public release: in-canvas X, Y and Value dropdowns, client-side aggregation, heatmap colouring,
cross-filtering by tuple filter, context menu, keyboard navigation, tooltips and high contrast.
