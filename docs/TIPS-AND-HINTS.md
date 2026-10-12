# Dynamic Matrix Heatmap — Tips & Hints (v1.2.0.0)

A pivot table with a heatmap that **the reader turns**: rows, columns, the value and how it is shown are
chosen inside the visual. This page is the short version of everything worth knowing.
Full documentation, with search: https://tinocallarisa-web.github.io/dynamic-matrix-heatmap/support.html

---

## Quick start

1. Drag two or more fields into **Dimensions** and at least one into **Measures**.
2. Pick the **X axis**, the **Y axis** and the **Value** in the bar at the top of the visual.
3. Showing an average? Put an ID in **Detail (rows)** — order, ticket or customer — and it is exact.

> **The most common surprise:** an average that does not match the native matrix. Without Detail
> (rows), Power BI sends averages at the grain of every bound dimension and the visual can only combine
> them. One ID in Detail (rows) fixes it; a note says so while you edit.

---

## Field wells

| Well | Limit | What it does |
|---|---|---|
| **Dimensions** | 10 (Free: 3) | Fields offered in X axis, Y axis and Group rows. |
| **Measures** | 5 (Free: 2) | Aggregated as set in the field well; the model's format is used. |
| **Detail (rows)** | 3, optional | An ID per row: exact averages, and distinct counts of these fields in Value (Pro). |

---

## The bar in the visual

- **X axis · Y axis · Value** — anyone reading the report can change them.
- **Show as** *(Pro)* — absolute, % of row, % of column, % of grand total. Each measure remembers its own:
  never add the same measure twice (Power BI treats both copies as one).
- **Group rows** *(Pro, with 3+ dimensions)* — a third dimension with subtotal rows that open and close;
  the corner button opens or closes all.

---

## Exact numbers

- **Sum, Min, Max, Count** — always exact.
- **Average** — exact with Detail (rows).
- **Count (Distinct)** — choose it in the field well; exact when the same column is also in Dimensions
  or Detail (rows).
- **Ratios and non-additive DAX** — flagged with a note; bind only the dimensions you compare.

---

## Sorting and Others

- **Click a column header** to sort the rows by it: highest first, lowest first, off.
- **Automatic** order keeps the data order and puts days and months in calendar order.
- **Others (N)** groups the smallest categories beyond Maximum rows / columns (25 by default, up to 200)
  so totals still add up; it does not stretch the color scale.
- **Order by similarity** *(Pro)* puts rows or columns with the same pattern together.

---

## Format pane

- **Style template** — Classic, Clean, Tiles, Contrast, Compact; your own settings win.
- **Values** — Show totals *(Pro)*.
- **Heatmap colors** — 12 schemes (Viridis and Cividis are colour-blind safe) or Custom.
- **Color rules** — up to three thresholds with their own color; percentages as fractions (0.25).
- **Rows and columns** — order, maximums, Others, similarity.
- **Empty cells**, **Text**, **Layout** (row height, column width, header orientation, cell gap and radius).
- Text on dark cells turns white automatically unless you set the value color.

---

## Filtering

- Click a cell to filter the page; click again to clear; **Ctrl+click** to add.
- With row groups, a cell filters by column, row **and** group.
- A cell in Others filters by all of its categories.
- **Bookmarks** restore the selected cells.

---

## Free and Pro

Free is a correct pivot, not a cut-down one: 3 dimensions and 2 measures, heatmap, rules, templates,
Others, sorting and exact averages. Pro adds 10 dimensions and 5 measures, Show as, totals, row groups,
order by similarity and distinct counts of Detail fields. While editing without a licence, Pro features
are drawn working under a *Pro preview* watermark; reading view shows the free result.

---

## What changed in 1.2

- **Distinct count of → Detail (rows).** Fields already there stay.
- **Weights for averages is gone.** Use an ID in Detail (rows) instead.
- **Controls** now sit in a folding panel on the left (or a top bar, or hidden in reading view).
- **Show value as** moved from the Format pane to **Show as** in the visual; reports keep their mode.

---

Questions: https://github.com/tinocallarisa-web/dynamic-matrix-heatmap/discussions · support@tcviz.com
