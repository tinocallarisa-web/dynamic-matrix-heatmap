# AppSource Listing — Dynamic Matrix Heatmap

Copy ready to paste into Partner Center, English only. **The marketplace description is the
documentation most people read** — update it on every release.

Limits measured in Partner Center: *Search results summary* 100 characters, *Description* 5,000
characters (truncated silently), *Certification notes* 2,500 **counted with CRLF** and **cleared on
every resubmission**.

**1.1.0.0 changes the description**, because it changes what the buyer gets: a Weights field well,
counts that were wrong, per-measure display and numbers in the report's locale.

---

## Offer name

```
Dynamic Matrix Heatmap
```

---

## Search results summary

```
A matrix your readers can pivot themselves, with distinct counts that stay exact.
```

---

## Description

```
A matrix answers the question its author had. Swapping the rows for another dimension means opening the report, editing the visual and republishing, so every new question turns into a request, a ticket and a week of waiting.

Dynamic Matrix Heatmap puts the choice in the report itself. The X dimension, the Y dimension and the value are dropdowns inside the visual, so the person reading picks the combination they need and the heatmap redraws. Nobody edits anything.

That freedom is the hard part, and it is where most crosstabs quietly go wrong. Because the pair is chosen after the query has run, the numbers have to be combined again for whichever pair you picked — and not every number survives being combined. This visual is built around getting that right, and around saying so when it cannot.

PIVOT IN THE REPORT

• X, Y and the value are picked inside the visual, by whoever is reading it
• Bind up to 10 dimensions and 5 measures and let the reader explore the combinations
• A global heatmap scale across every visible cell, with your own three colours
• Row height, column width and header orientation: horizontal, vertical or diagonal
• The choice is stored in the report file, so it survives save, reopen and bookmarks

NUMBERS THAT SURVIVE THE PIVOT

• Distinct counts are computed from the raw ID column, per cell, so a customer appearing under two regions is counted once — not once per combination
• Averages can be weighted: bind a row count to Weights and the result matches the native matrix
• Counts and sums are combined exactly, at whatever pair you land on
• When a measure cannot be combined correctly — a ratio, a percentage, a distinct count bound as a measure — the visual says so while you edit, instead of showing a plausible wrong number
• The field's own format string is honoured, in your report's locale

NATIVE INTEGRATION

• Click a cell to cross-filter the report; Ctrl + click to add; click again to clear
• The filter describes the selection instead of listing it, so a cell holding five million rows costs the same as one holding five
• Bookmarks restore both the filter and what the matrix shows as selected
• "Edit interactions" is respected
• Standard and report page tooltips, and the native right-click menu

ACCESSIBLE

• Keyboard: Tab to a cell, Enter or Space to select
• High contrast: cells are redrawn in the system colours, with selection marked by an outline rather than by opacity alone
• Spanish and English throughout, including the format pane

PRO

• Up to 10 dimensions and 5 measures, instead of 3 and 2
• Distinct count of — exact unique counts for any X/Y pair
• Show value as: % of row, % of column, % of grand total, set per measure
• Total row and column, with exact distinct counts in the margins

FREE AND PRO

The free tier gives a correct result, not a cut-down one: every number it shows is a number you can take to a meeting, and nothing is watermarked in a published report. What Pro adds is reach, and the analyst readings on top. Turn on a Pro capability without a licence while editing and it is drawn working, under a "Pro preview" watermark naming it — you see your own data, not a screenshot of somebody else's. Reading view shows the free result.

Pro comes with a one-month free trial, and can be bought monthly or annually.

PRIVACY

The visual makes no network requests of any kind: no analytics, no telemetry, no external scripts, no storage. It receives the dataView and draws it. The only thing written into the report is which dimensions and value you picked. Licences are checked through Microsoft's own licensing API.

GETTING STARTED

1. Add two or more fields to Dimensions and at least one to Measures.
2. Pick the X and Y dimensions in the dropdowns at the top of the visual.
3. For exact unique counts, drag the raw ID column into Distinct count of — not a Count (Distinct) measure, which cannot be combined across the dimensions you did not pick.
4. If you show an average, bind a row count to Weights for averages.

Documentation, video and sample data: https://tinocallarisa-web.github.io/dynamic-matrix-heatmap/support.html
Support: support@tcviz.com

WHAT'S NEW IN 1.1.0.0

A counted field showed the number of groups instead of the count, and a distinct count bound as a measure was silently added up. Averages can now be weighted through a new Weights field well, and match the native matrix. Numbers follow the report's locale. Bookmarks, "Edit interactions" and Spanish in the format pane. The Aggregation and Number format settings were removed: the field well and the model already decide those, and decide them better.
```

---

## URLs to keep in sync

| Field | URL |
|---|---|
| Support / documentation | https://tinocallarisa-web.github.io/dynamic-matrix-heatmap/support.html |
| Privacy policy | https://tinocallarisa-web.github.io/dynamic-matrix-heatmap/privacy.html |
| Terms / licence | https://tinocallarisa-web.github.io/dynamic-matrix-heatmap/terms.html |
| Video | https://www.youtube.com/watch?v=vobbf6405e4 |

Canonical YouTube URL only (policy 100.3.3.3). Shorteners, `/shorts/` and `/embed/` are rejected.
**Correcting it here does not correct the offer** — the field Microsoft reviews is only in Partner
Center.

## Images

| Asset | File | Notes |
|---|---|---|
| Offer screenshot | `docs/infographic.html` -> PNG | **1366x768 is mandatory.** Open the page and press *Download PNG*. Regenerated for 1.1.0.0: the format pane row changed when Aggregation and Number format were removed. |
| Offer icon | `assets/icon_Matrix.png`, 300x300 | Uploaded by hand: it does not travel inside the package. |
| Large logo | `assets/icon_216x216.png` | Partner Center's listing logo. |
| Small logo | `assets/icon_48x48.png` | The one that was missing. Generated from the 300x300 master with LANCZOS resampling, not scaled down in the browser: at 48 px a badly resized icon just smears. `assets/icon_96x96.png` is there for whatever asks for it. |
| Package icon | `assets/icon.png`, 36x36 | Embedded in the `.pbiviz`. Do not replace it with any of the above. |

## Suggested categories and keywords

- Categories (max 2): **Comparison**, **Correlation** — a crosstab compares one dimension against
  another, and the heatmap reads as the relationship between the two.
- EULA: our own `terms.html`, which describes the Free/Pro split.
- Offer ID: `dynamic-matrix-heatmap` · Offer alias: Dynamic Matrix Heatmap

### Search keywords (max 3)

1. `distinct count matrix` — a **problem word**. Whoever types it has a distinct count that changed
   when they grouped it and does not know why. It is exactly what the `Distinct count of` well
   solves, and the description answers it in the same words.
2. `cross tab` — the **niche technical term**. Low volume, very high intent: whoever knows it needs
   no explanation of what this is.
3. `matrix heatmap` — the **generic**, and only because there is room. It competes with the native
   matrix and half the marketplace, but it is what the visual is called.

Discarded: `pivot table` brings people expecting Excel behaviour the visual does not have.
`business intelligence` is volume without intent.

## Plan

| Field | Value |
|---|---|
| Plan ID | `dynamic-matrix-heatmap-tcviz` — matched as the full Service ID or as the Plan ID on its own |
| Plan name | Dynamic Matrix Heatmap Pro |
| Plan description | Unlocks 10 dimensions and 5 measures, exact distinct counts, percentage views per measure, and the total row and column. |

---

## What must be pasted by hand in Partner Center

Editing this file changes nothing in the offer. For 1.1.0.0:

1. **Description** — the whole block above. It changed for this release.
2. **Search results summary** — it changed too.
3. **Certification notes** — `docs/CERTIFICATION-NOTES-SHORT.txt`. This field is **cleared on every
   resubmission**, so it has to be pasted again even when nothing in it changed.
4. **Offer screenshot** — regenerate from `docs/infographic.html` and upload the 1366x768 PNG.
5. **Video** — check the live field is the canonical `watch?v=` form.
