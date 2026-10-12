# AppSource Listing — Dynamic Matrix Heatmap 1.2.0.0

Copy ready to paste into Partner Center, English only. **The marketplace description is the
documentation most people read** — update it on every release.

Limits measured in Partner Center: *Search results summary* 100 characters, *Description* 5,000
characters (truncated silently), *Certification notes* 2,500 **counted with CRLF** and **cleared on
every resubmission**.

**1.2.0.0 changes the description**, because it changes what the buyer gets: the matrix becomes a
pivot table (Show as in the visual, row groups with subtotals, sorting, Others), and Detail (rows)
replaces the Distinct count of and Weights wells.

Rules for this listing: no comparisons with other marketplace visuals, not even implied; compare only
with the native Power BI matrix. "Power BI" always with that capitalisation (rejection 100.7.1).

---

## Offer name

```
Dynamic Matrix Heatmap
```

Not renamed (decision 11-10-2026): the name has downloads and an OKviz entry behind it. "Pivot" goes
in the summary and the description instead.

---

## Search results summary

```
A pivot table with a heatmap that your readers turn themselves: rows, columns, % and subtotals.
```

*(95 characters)*

---

## Description

```
A Power BI matrix answers the question its author had. Readers who want the rows by product instead of region, or the value as a share of the row, have to ask for another matrix, and every new question becomes a request.

Dynamic Matrix Heatmap is a pivot table with a heatmap that the reader turns. Rows, columns, the value and how it is shown are dropdowns inside the visual: whoever reads the report picks the view they need and the heatmap redraws. Nobody edits anything, and no DAX is needed.

PIVOT IN THE REPORT

• X, Y and the value are chosen inside the visual, by whoever is reading it
• Show as: absolute, % of row, % of column or % of grand total — each measure remembers its own (Pro)
• Group rows by a third dimension, with subtotals that open and close (Pro)
• Click a column header to sort the rows by it; order by name or total; days and months in calendar order
• Others: beyond the number of rows or columns you set, the smallest categories are grouped so the totals still add up
• Order by similarity puts rows with the same pattern side by side (Pro)

NUMBERS THAT SURVIVE THE PIVOT

Because the pair is chosen after the query has run, the numbers have to be combined again for whichever pair you picked, and not every number survives that. This visual is built around getting it right, and saying so when it cannot.

• Sums, minimums, maximums and counts combine exactly, at any pair
• Add an ID to Detail (rows) — the order, ticket or customer — and averages are exact too
• A Count (Distinct) measure is counted exactly when its column is also in the visual
• When a number cannot be combined correctly — a ratio, an average without Detail — a note says so while you edit, instead of showing a plausible wrong number
• The model's format string is used, in the report's locale

LOOK

• 12 colour schemes, two of them colour-blind safe, or your own three colours
• Colour rules: paint the cells above or below a threshold
• Style templates: Classic, Clean, Tiles, Contrast, Compact; space between cells and rounded corners
• Text on dark cells turns white by itself

WORKS LIKE A NATIVE VISUAL

• Click a cell to cross-filter the report; Ctrl+click to add; click again to clear; with row groups, a cell filters by its group too
• Bookmarks restore the selected cells; "Edit interactions" is respected
• Tooltips, the native right-click menu and highlighting from other visuals
• Format on the canvas: click values, headers or the dropdown bar to format them
• Keyboard navigation and high contrast
• Format pane and the bar in the visual in 12 languages

FREE AND PRO

The free tier gives a correct result, not a cut-down one: every number it shows is one you can take to a meeting, and nothing is watermarked in a published report. Free includes the pivot itself with 3 dimensions and 2 measures, the heatmap, colour rules, templates, Others, sorting and exact averages with Detail (rows). Pro raises the limits to 10 dimensions and 5 measures and adds Show as, totals, row groups with subtotals, order by similarity and distinct counts of Detail fields. Turn on a Pro capability without a licence while editing and it is drawn working, under a "Pro preview" watermark that names it — your own data, not a screenshot. Reading view shows the free result.

Pro comes with a one-month free trial, and can be bought monthly or annually.

PRIVACY

The visual makes no network requests of any kind: no analytics, no telemetry, no external scripts. What it writes into the report is your view — the fields chosen, how each measure is shown, the sort column and which groups are closed — like a slicer selection. Licences are checked through Microsoft's own licensing API.

GETTING STARTED

1. Add two or more fields to Dimensions and at least one to Measures.
2. Pick the rows, the columns and the value in the bar at the top of the visual.
3. Showing an average? Add an ID to Detail (rows) and it is exact.

Documentation, video and FAQ: https://tinocallarisa-web.github.io/dynamic-matrix-heatmap/support.html
Questions: https://github.com/tinocallarisa-web/dynamic-matrix-heatmap/discussions
Support: support@tcviz.com

WHAT'S NEW IN 1.2.0.0

The matrix becomes a pivot table: Show as in the visual, row groups with subtotals, sorting by any column, Others so totals always add up, order by similarity, colour rules, schemes and templates, format on the canvas and 12 languages. Detail (rows) replaces Distinct count of and Weights for averages: one optional ID makes averages and distinct counts exact.
```

---

## URLs to keep in sync

| Field | URL |
|---|---|
| Support / documentation | https://tinocallarisa-web.github.io/dynamic-matrix-heatmap/support.html |
| Privacy policy | https://tinocallarisa-web.github.io/dynamic-matrix-heatmap/privacy.html |
| Terms / licence | https://tinocallarisa-web.github.io/dynamic-matrix-heatmap/terms.html |
| Video | https://www.youtube.com/watch?v=pPf0Bu0H11U |

Canonical YouTube URL only (policy 100.3.3.3). Shorteners, `/shorts/` and `/embed/` are rejected.
**Correcting it here does not correct the offer** — the field Microsoft reviews is only in Partner
Center.

## Images

| Asset | File | Notes |
|---|---|---|
| Offer screenshot 1 | `assets/infographic.png` (from `docs/infographic.html`) | **1366x768 is mandatory.** General guide, 1.2.0.0. |
| Offer screenshot 2 | `assets/infographic-styles.png` (from `docs/infographic-styles.html`) | 1366x768. Templates, schemes and colour rules, captured from the 1.2 build. |
| Offer icon | `assets/icon_Matrix.png`, 300x300 | Uploaded by hand: it does not travel inside the package. |
| Large logo | `assets/icon_216x216.png` | Partner Center's listing logo. |
| Small logo | `assets/icon_48x48.png` | Generated with LANCZOS from the 300x300 master. |
| Package icon | `assets/icon.png`, 36x36 | Embedded in the `.pbiviz`. |

## Categories and keywords

- Categories (max 2): **Comparison**, **Correlation**.
- EULA: our own `terms.html`, which describes the Free/Pro split.
- Offer ID: `dynamic-matrix-heatmap` · Offer alias: Dynamic Matrix Heatmap

### Search keywords (max 3)

1. `pivot table` — the **problem word** for whoever comes from Excel and wants readers to turn the
   table themselves. **A bet, written down on 12-10-2026:** until 1.1 it was discarded because people
   would expect Excel behaviour the visual did not have. 1.2 closes most of that gap (rows, columns,
   value and Show as chosen by the reader, row groups with subtotals, sorting). It is still not Excel:
   one level of row grouping, no column groups, one value at a time. Watch reviews and questions for
   "where are the nested rows".
2. `cross tab` — the **niche technical term**. Low volume, very high intent.
3. `heatmap` — the **generic**, and the type OKviz files the visual under, which is the one we can lead.

Dropped: `distinct count matrix` — it named a problem the visual now solves without asking the user to
know it (Detail (rows) and exact Count (Distinct)), so it no longer earns one of three slots.

## Plan

| Field | Value |
|---|---|
| Plan ID | `dynamic-matrix-heatmap-tcviz` — matched as the full Service ID or as the Plan ID on its own |
| Plan name | Dynamic Matrix Heatmap Pro |
| Plan description | 10 dimensions and 5 measures, Show as (% of row, column or total), totals, row groups with subtotals, order by similarity and distinct counts of Detail fields. |

---

## What must be pasted by hand in Partner Center

Editing this file changes nothing in the offer. For 1.2.0.0:

1. **Description** — the whole block above. It changed for this release.
2. **Search results summary** — it changed.
3. **Keywords** — `pivot table`, `cross tab`, `heatmap`.
4. **Plan description** — if Partner Center allows editing it on the live plan.
5. **Certification notes** — `docs/CERTIFICATION-NOTES-SHORT.txt`. Cleared on every resubmission.
6. **Offer screenshots** — upload `assets/infographic.png` and `assets/infographic-styles.png` (1366x768), replacing the 1.1 one.
8. **Offer logo** — `assets/icon_Matrix.png` (300x300, new Nord style): it does not travel in the package.
7. **Video** — `https://www.youtube.com/watch?v=pPf0Bu0H11U` (new for 1.2).
