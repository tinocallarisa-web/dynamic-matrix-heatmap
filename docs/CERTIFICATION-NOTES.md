# Certification Notes — Dynamic Matrix Heatmap

**Version 1.0.1.0 · TCViz**

> The text to paste into *Notes for certification* is `docs/CERTIFICATION-NOTES-SHORT.txt`: that field
> truncates at 2,500 characters without warning. This file is the full reference, reached through the
> `certification` branch.

---

## 1. Source code

| Item | Value |
|---|---|
| Repository | https://github.com/tinocallarisa-web/dynamic-matrix-heatmap |
| **Certification branch** | https://github.com/tinocallarisa-web/dynamic-matrix-heatmap/tree/certification |
| Branch contents | Exactly the code that produced the submitted package. No `node_modules`, `dist` or `.tmp`. |
| Build command | `npm install` then `npx pbiviz package` |
| Lint / audit | `npm run eslint` (0 errors), `npm audit` (0 vulnerabilities) |
| API version | 5.11.1 · `powerbi-visuals-tools` 7.2.1 |

## 2. Public pages

| Page | URL |
|---|---|
| Support &amp; documentation | https://tinocallarisa-web.github.io/dynamic-matrix-heatmap/support.html |
| Privacy policy | https://tinocallarisa-web.github.io/dynamic-matrix-heatmap/privacy.html |
| Terms &amp; licence | https://tinocallarisa-web.github.io/dynamic-matrix-heatmap/terms.html |
| Demo video | https://www.youtube.com/watch?v=vobbf6405e4 |
| Issue tracker | https://github.com/tinocallarisa-web/dynamic-matrix-heatmap/issues |
| Changelog | https://github.com/tinocallarisa-web/dynamic-matrix-heatmap/blob/main/CHANGELOG.md |

## 3. What changed in 1.0.1.0

1.0.0.0 is published. An internal audit found that its package never queried the licence, so Pro could
not be unlocked, and that free users had no purchase path.

| Problem in 1.0.0.0 | Fix in 1.0.1.0 |
|---|---|
| No `getAvailableServicePlans()` call in the published package | Licence requested once, deferred, outside the render path |
| Plan compared with strict equality, Active only | `matchesPlan()` accepts the full Service ID or the Plan ID `dynamic-matrix-heatmap-tcviz`; Active and Warning accepted |
| `isLicenseUnsupportedEnv` / `isLicenseInfoAvailable` not read | Honoured: no purchase prompt where a Pro customer cannot be recognised |
| Own licensing text: "Free tier … Pro unlocks …" | Neutral note "Showing the first 3 dimensions and 2 measures."; purchase path is `notifyFeatureBlocked` (en/es, under 500 characters) plus `notifyLicenseRequired(General)` |
| Pro settings unlabelled | "(Pro)" on *Show value as*, *Show totals*, *Distinct count of* |
| No ESLint script; `npm audit` warnings | `eslint` script, 0 errors; `overrides` for `qs` and `uuid`, 0 vulnerabilities |
| `assets/icon.png` missing from the source tree | Restored |

**Pro preview.** Following the publishing guidelines ("use watermarks only for paid features used
without a valid licence"), a free user **editing** a report, whose licence has resolved, in an
environment that supports licensing, sees Pro capabilities working under a "Pro preview" watermark. In
reading view (`viewMode` 0), before the licence resolves, or where it cannot be read, the free result
renders with no watermark. Free features never carry a watermark.

No data role name, property name or default changed, so existing reports keep their settings.

## 4. What the visual does

A matrix where the **report reader** chooses the crosstab. Three dropdowns rendered inside the canvas
select the X dimension, the Y dimension and the value; cells are coloured by a global heatmap scale.

The visual **aggregates client-side**. The `Distinct count of` field well takes a raw ID column and the
visual counts unique values itself, so the figure is exact for any pair of dimensions.

## 5. Privacy and network access

**The visual makes no network requests of any kind.** `"privileges": []`; no `fetch`, `XMLHttpRequest`
or WebSocket; no external scripts, fonts, analytics or telemetry; no local files, cookies or storage.

Persisted only inside the `.pbix` via `persistProperties`: `selectionState.xDimension`,
`selectionState.yDimension`, `selectionState.valueKey` — field names, never data values. Clicking a cell
writes a standard filter through `applyJsonFilter`, as a slicer does.

The `TupleFilter` `$schema` value (`http://powerbi.com/product/schema#tuple`) is a schema identifier,
not a URL that is requested.

Bundled dependencies: `d3`, `powerbi-visuals-utils-formattingmodel`, `powerbi-visuals-utils-formattingutils`,
`powerbi-visuals-utils-tooltiputils`. None reach the network. The visual's own code does not use
`innerHTML`.

## 6. Licence validation

Official `IVisualLicenseManager` only. TCViz operates no licence server.

- `getAvailableServicePlans()` (IPromise2, consumed with `then(ok, err)`) is requested once, deferred with
  `setTimeout(..., 0)`, after `update()` has emitted its rendering events.
- Pro when a plan matches `dynamic-matrix-heatmap-tcviz` with state Active (1) or Warning (2).
- On error or unsupported environment: Free, and no purchase prompt.

**Testing Pro without a purchase.** Build `node build-test.js`: it replaces `private isPro = false;` with
`true`, appends `_test` to the GUID, packages and restores the source. `node build-test.js --free` builds
the free behaviour under `_testfree`. Nothing else differs from the submitted package.

## 7. Free and Pro features

**Free:** matrix with in-canvas X / Y / Value dropdowns; global three-colour heatmap; empty cells, fonts,
colours, sizing, header orientation; tooltips, cross-filtering, context menu, keyboard (Tab / Enter /
Space on cells); high contrast; up to **3 dimensions** and **2 measures**.

**Pro:** up to **10 dimensions** and **5 measures**; **Distinct count of**; **Show value as** % of row /
column / grand total; **row and column totals**.

## 8. Certification requirements

| Requirement | Status |
|---|---|
| `supportsHighlight` | ✅ non-highlighted cells dimmed to 0.3 opacity |
| `supportsSynchronizingFilterState` | ✅ |
| `supportsLandingPage` | ✅ guidance shown before fields are assigned, including the Pro plan features |
| `supportsKeyboardFocus` | ✅ cells focusable; Enter and Space activate |
| `supportsMultiVisualSelection` | ✅ |
| Rendering events | ✅ on every path of `update()`; licence request and notification run after the try/catch |
| No arbitrary code | ✅ no `eval`, `Function`, `innerHTML` in the visual's code |
| High contrast | ✅ `colorPalette.isHighContrast` honoured |
| Tooltips / context menu | ✅ |

## 9. Testing instructions

### Free tier (submitted package, no active plan)

1. Add the visual: the landing message explains the field wells and the Pro plan.
2. Drag **four or more** fields into `Dimensions` and **three or more** measures into `Measures`.
3. **Edit mode:** all fields are available and a "Pro preview" watermark is shown; Power BI raises its
   licence banner and icon.
4. **Reading view (Power BI Service):** the note reads *"Showing the first 3 dimensions and 2 measures."*,
   only those appear in the dropdowns, and there is no watermark.
5. Select an X and a Y. The matrix renders.
6. Edit mode: **Values → Show totals (Pro)** on and **Show value as (Pro)** = *% of row* render under the
   watermark; in reading view both are ignored.
7. Click a cell: other visuals filter to that intersection. Click again to clear.
8. Right click a cell: the native Power BI context menu. Tab into the matrix and press Enter: same as a click.

### Pro tier (same package, active `dynamic-matrix-heatmap-tcviz` plan)

1. All fields available; no note, no watermark, no licence notification.
2. Drag a raw ID column into `Distinct count of (Pro)`; select *"Distinct customer_id"*: each cell shows
   unique IDs.
3. **Show totals** on: the grand total equals a card visual with *Count (Distinct)* of the same column.
4. **Show value as** = *% of grand total*: percentages.

## 10. Known limitations, stated deliberately

- **Average is an unweighted approximation** when dimensions beyond the selected pair are loaded.
- A distinct count produced by a DAX measure cannot be recombined correctly; `Distinct count of` exists for that.
- Up to **25 distinct values** are rendered per axis.
- Row-level detail loads in segments (`fetchMoreData`) up to a bounded number of windows; a note states when the dataset is partial.
- Build warning, not a gap: none for Format Pane (the visual uses `getFormattingModel`).

## 11. Contact

TCViz — support@tcviz.com
