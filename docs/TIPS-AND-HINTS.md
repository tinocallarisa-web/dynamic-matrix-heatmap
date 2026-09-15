# Tips &amp; Hints — Dynamic Matrix Heatmap

**Version 1.0.0.0 · TCViz**
Video walkthrough: https://www.youtube.com/watch?v=vobbf6405e4

> Content for the *Tips &amp; Hints* page of the sample `.pbix`.
> Power BI text boxes do not render markdown tables — use `TIPS-AND-HINTS-PLAIN.txt` when pasting
> into the report.

---

## Getting started

1. Drop the visual on the canvas.
2. Drag two or more fields into **Dimensions**. These fill the X and Y dropdowns.
3. Drag at least one measure into **Measures**.
4. Pick an **X axis** and a **Y axis** inside the visual. The matrix appears.
5. Optional (Pro): drag a raw ID column into **Distinct count of** for exact unique counts.

Your selection is saved with the report, so it survives closing and reopening.

## Field wells

| Well | Accepts | Limit | Purpose |
|---|---|---|---|
| Dimensions | Any grouping field | 3 Free / 10 Pro | Fills the X and Y dropdowns |
| Measures | Measures or numeric columns | 2 Free / 5 Pro | Values shown in the cells |
| Distinct count of | Raw ID columns | 3 (Pro) | Exact unique counts, computed by the visual |

Aim for roughly 20–25 distinct values per dimension. Up to 25 are rendered per axis.

## Format pane

| Card | Setting | What it does |
|---|---|---|
| Values | Aggregation | How rows sharing a cell combine. *Auto* reads what Power BI applied |
| Values | Show value as *(Pro)* | Absolute, % of row, % of column, % of grand total |
| Values | Number format | *Auto* uses the model's format; override when it is wrong |
| Values | Show totals *(Pro)* | Total row and column, with exact distinct counts |
| Heatmap colors | Minimum / Middle / Maximum | Three-point scale, applied globally |
| Empty cells | Display as | Blank, dash, zero or grey fill |
| Text | Axis labels / Values / Controls | Font, size and colour, set separately |
| Layout | Row height / Column width | Sizing in pixels |
| Layout | Column header orientation | Horizontal, vertical (90°) or diagonal (45°) |

## Free vs Pro

| Capability | Free | Pro |
|---|---|---|
| Matrix with in-canvas dropdowns | ✓ | ✓ |
| Heatmap colour scale | ✓ | ✓ |
| All formatting options | ✓ | ✓ |
| Cross-filtering, tooltips, context menu | ✓ | ✓ |
| High contrast | ✓ | ✓ |
| Dimensions | up to 3 | up to 10 |
| Measures | up to 2 | up to 5 |
| Distinct count of | — | ✓ |
| Show value as % | — | ✓ |
| Row and column totals | — | ✓ |

## Tips and best practices

**Put the high-cardinality dimension on Y.** Rows scroll comfortably; columns run out of width fast.

**Use the diagonal header orientation** when column labels are long. It keeps columns narrow without
truncating text.

**Keep dimensions lean.** Every field you add multiplies the combinations Power BI has to compute.
Three or four well-chosen dimensions perform far better than ten, and the dropdowns stay usable.

**Set the heatmap midpoint deliberately.** The scale is global across every visible cell, so a single
outlier flattens everything else. If one cell dominates, consider filtering it out.

**Empty is not zero.** Use *Dash* for empty cells when absence of data means something different
from a genuine zero — they are easy to confuse in a dense matrix.

## Pro features in practice

**Distinct count of** — the reason the visual exists. Drag `customer_id` (the raw column, not a
measure) into this well. The visual counts unique values itself, so the figure is exact for every
X/Y combination. Verify it against a card with *Count (Distinct)*: the grand totals match.

Why a DAX measure cannot do this: Power BI computes the measure across all the fields in the visual,
and a customer appearing under two categories would be counted in both. Recombining those into a
two-dimensional view double counts. Counting from the raw column avoids the problem entirely.

**Show value as** — *% of grand total* answers "where is the mass of this data?" in one glance.
*% of row* and *% of column* answer "how does this row split?".

**Totals** — with distinct counts, the margins are genuine distinct counts across the whole row or
column, not the sum of the cells. That is correct, and it is why the row total is usually smaller
than adding the cells across.

## Example configurations

**Customer coverage by service level**
X = picking type · Y = delivery distance · Value = Distinct customer_id · Show totals on
→ how many distinct customers fall in each service combination, with an exact overall figure.

**Revenue concentration**
X = channel · Y = quarter · Value = Sum of sales · Show value as = % of grand total
→ which channel and quarter carry the business, as percentages totalling 100%.

**Quality scores**
X = route · Y = complexity · Value = Average of score
→ mean score per intersection. Row totals show the mean for the whole row.

## Troubleshooting

**Numbers do not match my card.** For counts of things that appear in more than one category, use
*Distinct count of* with the raw column rather than a DAX measure.

**A field shows as a percentage when it should not.** This happens when the same field is added
twice, once normally and once with *Show value as → Percent of grand total*: Power BI marks the
underlying column as a percentage and it reaches both. The visual detects and corrects this. If it
persists, set **Values → Number format → Number**.

**An average behaves like a sum.** Set **Values → Aggregation → Average**. Auto-detection reads the
field's label and query name, but a DAX measure hides its aggregation inside the DAX.

**"Showing a partial dataset".** Too many dimension combinations. Remove a dimension or two.

**Clicking does not filter another table.** In Model view, set the relationship's cross-filter
direction to **Both**.
