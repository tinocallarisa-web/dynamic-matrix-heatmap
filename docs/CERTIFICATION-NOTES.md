# Certification Notes — Dynamic Matrix Heatmap

**Version 1.0.0.0 · TCViz · First submission**

> Paste the whole of this document into the *Notes for certification* field in Partner Center.
> That field is cleared on every resubmission, which is why the text lives in the repository.

---

## 1. Source code

| Item | Value |
|---|---|
| Repository | https://github.com/tinocallarisa-web/dynamic-matrix-heatmap |
| **Certification branch** | https://github.com/tinocallarisa-web/dynamic-matrix-heatmap/tree/certification |
| Branch contents | Exactly the code that produced the submitted package. No build output, no `node_modules`, no `dist`, no `.tmp`. |
| Build command | `npm install` then `npx pbiviz package` |
| API version | 5.11.1 |

The repository is public. The `certification` branch is a direct merge of `main` at the release
commit, with `isPro` resolved by `licenseManager` and the GUID carrying no suffix.

## 2. Public pages

| Page | URL |
|---|---|
| Support &amp; documentation | https://tinocallarisa-web.github.io/dynamic-matrix-heatmap/support.html |
| Privacy policy | https://tinocallarisa-web.github.io/dynamic-matrix-heatmap/privacy.html |
| Terms &amp; licence | https://tinocallarisa-web.github.io/dynamic-matrix-heatmap/terms.html |
| Demo video | https://www.youtube.com/watch?v=vobbf6405e4 |
| Issue tracker | https://github.com/tinocallarisa-web/dynamic-matrix-heatmap/issues |
| Changelog | https://github.com/tinocallarisa-web/dynamic-matrix-heatmap/blob/main/CHANGELOG.md |

All pages are served by GitHub Pages from the repository root and are live at the time of submission.

## 3. What the visual does

A matrix where the **report reader** chooses the crosstab. Three dropdowns rendered inside the
canvas select the X dimension, the Y dimension and the value; cells are coloured by a global
heatmap scale. No edit rights and no model changes are needed to change the view.

The distinguishing capability is that the visual **aggregates client-side**. Power BI evaluates a
measure at the granularity of every field in the visual; projecting that onto two chosen dimensions
requires recombining the rest. Sums, minimums, maximums and counts recombine exactly, but a distinct
count does not. The `Distinct count of` field well takes a raw ID column and the visual counts unique
values itself, so the figure is exact for any pair of dimensions and the grand total matches a card
visual.

## 4. Privacy and network access

**The visual makes no network requests of any kind.**

- `"privileges": []` in `capabilities.json` — Power BI blocks outbound connections at platform level
- No `fetch`, no `XMLHttpRequest`, no WebSocket
- No external scripts, no CDN fonts, no analytics, no telemetry, no error reporting
- No local file reads
- No cookies, `localStorage` or `sessionStorage`

**What is persisted**, and only inside the user's own `.pbix` via `persistProperties`:

| Property | Content |
|---|---|
| `selectionState.xDimension` | Field *name* selected in the X dropdown |
| `selectionState.yDimension` | Field *name* selected in the Y dropdown |
| `selectionState.valueKey` | Key of the entry selected in the Value dropdown |

These are field names, never data values. They exist so the selection survives saving and reopening.

Clicking a cell writes a standard Power BI filter through `applyJsonFilter` (object `general`,
property `filter`), exactly as a slicer does. Nothing leaves the report.

Third-party dependencies are limited to `d3`, `powerbi-visuals-utils-formattingmodel`,
`powerbi-visuals-utils-formattingutils` and `powerbi-visuals-utils-tooltiputils`. All are bundled;
none reach the network.

## 5. Licence validation

Implemented with Microsoft's official `IVisualLicenseManager`. **TCViz operates no licence server
and receives no call from the visual.**

- Plan ID (`spIdentifier`): `dynamic-matrix-heatmap-tcviz`
- Constant `SP_IDENTIFIER` in `src/visual.ts` matches this exactly
- `ServicePlanState.Active` is compared by numeric value (1) because it is a `const enum`
- `getAvailableServicePlans()` returns an `IPromise`, so it is wrapped in a real `Promise` that
  resolves `false` on any failure

**Resolution never blocks rendering.** `requestLicenseDeferred()` is called from `update()` *after*
`renderingFinished`, and defers through `setTimeout(..., 0)`. `applyLicense()` only ever upgrades
Free → Pro; if the check fails the DOM is left untouched and the user stays on the Free tier. A
licensing outage can therefore never present as a broken visual.

## 6. Free and Pro features

### Free

- Matrix with in-canvas X / Y / Value dropdowns
- Global three-colour heatmap scale
- Empty cell handling, fonts, colours, row and column sizing
- Column header orientation (horizontal / vertical / diagonal)
- Tooltips, cross-filtering, context menu, keyboard navigation
- High contrast support
- Up to **3 dimensions** and **2 measures**

### Pro

- Up to **10 dimensions** and **5 measures**
- **`Distinct count of`** — exact unique counts for any X/Y combination
- **Show value as** — % of row, % of column, % of grand total
- **Row and column totals**, with exact distinct counts in the margins

Nothing is watermarked or time limited. The Free tier renders a complete, usable matrix.

## 7. Certification requirements

| Requirement | Status |
|---|---|
| `supportsHighlight` | ✅ true — non-highlighted cells dimmed to 0.3 opacity |
| `supportsSynchronizingFilterState` | ✅ true |
| `supportsLandingPage` | ✅ true — guidance shown before fields are assigned |
| `supportsKeyboardFocus` | ✅ true — cells are focusable, Enter and Space activate |
| `supportsMultiVisualSelection` | ✅ true |
| Rendering events | ✅ `renderingStarted` / `renderingFinished` / `renderingFailed` on every exit path of `update()`, including early returns and the catch block |
| No arbitrary code execution | ✅ no `eval`, no `Function` constructor, no `innerHTML` with data |
| No external resources | ✅ everything bundled |
| High contrast | ✅ `host.colorPalette.isHighContrast` honoured; colour scale dropped for system foreground/background, selection marked with an outline |
| Tooltips | ✅ `host.tooltipService` via `ITooltipServiceWrapper`; report tooltips declared |
| Context menu | ✅ `selectionManager.showContextMenu()` on cells and on empty areas |

## 8. Testing instructions

### Sample data

Any fact table works. The included sample uses order rows with several descriptive dimensions
(complexity, distance, delivery effort) plus `customer_id` and `total_sales`.

### Free tier

1. Add the visual to a report page.
2. Drag **four or more** fields into `Dimensions`.
3. Drag **three or more** measures into `Measures`.
4. Expected: an amber notice reads *"Free tier: showing the first 3 dimensions and 2 measures…"*, and
   only those appear in the dropdowns.
5. Select an X and a Y. The matrix renders with the heatmap scale.
6. In the format pane, set **Values → Show totals** on and **Show value as** to *% of row*.
   Expected: both are ignored — the matrix stays absolute with no totals.
7. Click a cell. Expected: other visuals on the page filter to that intersection. Click again to clear.
8. Right click a cell. Expected: the native Power BI context menu.
9. Tab into the matrix and press Enter on a cell. Expected: the same as a click.

### Pro tier

With an active `dynamic-matrix-heatmap-tcviz` plan:

1. Same setup as above. Expected: no amber notice; all fields available in the dropdowns.
2. Drag a raw ID column (for example `customer_id`) into `Distinct count of`. It appears in the
   Value dropdown as *"Distinct customer_id"*.
3. Select it. Expected: each cell shows the number of unique IDs in that intersection.
4. Turn on **Values → Show totals**. Expected: the grand total equals the distinct count over the
   whole dataset — compare against a card visual with *Count (Distinct)* of the same column. They
   match exactly. Note that the row and column totals are **not** the sum of their cells, because an
   entity present in several cells is counted once per margin.
5. Set **Show value as** to *% of grand total*. Expected: percentages, totalling 100% for an
   additive measure.
6. Switch the OS to a high contrast theme. Expected: the colour scale is replaced by system
   foreground and background; the selected cell carries an outline.

### Verifying aggregation

Select a measure whose label begins *"Average of"*. Expected: cells show means, and a row total is
the mean of that entire row — not the mean of the cell means, and not their sum.

## 9. Known limitations, stated deliberately

- **Average is an unweighted approximation** when dimensions beyond the selected pair are loaded.
  Sum, minimum, maximum and count re-aggregate exactly. This is documented in `terms.html`,
  `support.html` and the changelog.
- A distinct count produced by a **DAX measure** cannot be recombined correctly by any client. The
  `Distinct count of` well exists precisely to avoid that, and the documentation directs users there.
- Up to **25 distinct values** are rendered per axis.
- With distinct counts, percentages of a row need not total 100 — an entity present in several
  columns is counted in each. Inherent to distinct counting, not a defect.
- Row-level detail is loaded in segments (`fetchMoreData`) up to a bounded number of windows. When
  the limit is reached an amber notice states that the dataset is partial.

## 10. Contact

Tino Callarisa — tinocallarisa@gmail.com
