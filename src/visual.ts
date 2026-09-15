"use strict";

import powerbi from "powerbi-visuals-api";
import * as d3 from "d3";
import "./../style/visual.less";

import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import { createTooltipServiceWrapper, ITooltipServiceWrapper } from "powerbi-visuals-utils-tooltiputils";
import { valueFormatter } from "powerbi-visuals-utils-formattingutils";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualEventService = powerbi.extensibility.IVisualEventService;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import DataViewCategoryColumn = powerbi.DataViewCategoryColumn;
import DataViewValueColumn = powerbi.DataViewValueColumn;
import VisualObjectInstancesToPersist = powerbi.VisualObjectInstancesToPersist;
import VisualDataChangeOperationKind = powerbi.VisualDataChangeOperationKind;
import IVisualLicenseManager = powerbi.extensibility.IVisualLicenseManager;

import { VisualFormattingSettingsModel } from "./settings";

// ------------------------------------------------------------------------------------------
// Licensing
// ------------------------------------------------------------------------------------------

/** Must match the Plan ID configured in Partner Center exactly. */
const SP_IDENTIFIER = "dynamic-matrix-heatmap-tcviz";

/** ServicePlanState.Active — referenced by value because it is a const enum. */
const SERVICE_PLAN_ACTIVE = 1;

const FREE_MAX_DIMENSIONS = 3;
const FREE_MAX_MEASURES = 2;

/**
 * Resolves the Pro entitlement.
 *
 * getAvailableServicePlans() returns an IPromise2, which cannot be chained with .catch(),
 * so it is wrapped in a real Promise that resolves false on any failure. A licensing problem
 * must never surface as a broken visual — it simply leaves the user on the Free tier.
 */
function resolveLicense(licenseManager: IVisualLicenseManager): Promise<boolean> {
    return new Promise<boolean>(resolve => {
        try {
            licenseManager.getAvailableServicePlans().then(
                (result: powerbi.extensibility.visual.LicenseInfoResult) => {
                    const plans = (result && result.plans) || [];
                    resolve(plans.some(p =>
                        p.spIdentifier === SP_IDENTIFIER &&
                        (p.state as unknown as number) === SERVICE_PLAN_ACTIVE
                    ));
                },
                () => resolve(false)
            );
        } catch (_) {
            resolve(false);
        }
    });
}

interface DimensionInfo {
    name: string;
    column: DataViewCategoryColumn;
}

interface MeasureInfo {
    name: string;
    column: DataViewValueColumn;
}

// ------------------------------------------------------------------------------------------
// Tuple filter contract
//
// Declared locally rather than pulled from "powerbi-models": the payload is a plain JSON object
// with a stable, documented shape, so depending on the package would only add an install step
// and a version to keep in sync.
// ------------------------------------------------------------------------------------------

const TUPLE_FILTER_SCHEMA = "http://powerbi.com/product/schema#tuple";
/** powerbi-models FilterType.Tuple */
const FILTER_TYPE_TUPLE = 6;

interface IFilterColumnTarget {
    table: string;
    column: string;
}

interface ITupleElementValue {
    value: powerbi.PrimitiveValue;
}

interface ITupleFilter {
    $schema: string;
    filterType: number;
    operator: string;
    target: IFilterColumnTarget[];
    values: ITupleElementValue[][];
}


/** A selectable entry in the Measure dropdown: either a DAX measure or a client-side distinct count. */
interface ValueOption {
    /** "m:<index>" for a measure, "d:<index>" for a distinct-count field */
    key: string;
    label: string;
    kind: "measure" | "distinct";
    index: number;
}

const EMPTY_STATE_CLASS = "dmh-empty-state";
const KEY_SEP = "";
const MAX_CATS = 25;
const MAX_FETCHES = 20;
// KEY_SEP above is a control character (charCode 1) that cannot occur in real category values.

function clearElement(el: HTMLElement): void {
    while (el.firstChild) { el.removeChild(el.firstChild); }
}

export class Visual implements IVisual {
    private events: IVisualEventService;
    private host: IVisualHost;
    private selectionManager: ISelectionManager;
    private tooltipServiceWrapper: ITooltipServiceWrapper;
    private formattingSettingsService: FormattingSettingsService;
    private formattingSettings: VisualFormattingSettingsModel;

    private target: HTMLElement;
    private controlsEl: HTMLElement;
    private xSelect: HTMLSelectElement;
    private ySelect: HTMLSelectElement;
    private valueSelect: HTMLSelectElement;
    private messageEl: HTMLElement;
    private noticeEl: HTMLElement;
    private scrollEl: HTMLElement;

    // Persisted selection
    private selectedX: string = null;
    private selectedY: string = null;
    private selectedValueKey: string = null;

    // In-memory
    /** Cells currently filtered, as "<x><y>" keys. Drives dimming and the filter payload. */
    private selectedCells: Set<string> = new Set<string>();
    private fetchCount: number = 0;

    // Licensing. isPro is a field initializer on purpose — the constructor must never reset it,
    // or the patched test build (which sets it to true) would be overwritten at construction.
    // High contrast, refreshed on every update because the user can toggle the OS theme
    private isHighContrast = false;
    private hcForeground = "#000000";
    private hcBackground = "#FFFFFF";
    private hcSelected = "#000000";

    private licenseManager: IVisualLicenseManager;
    private isPro = false;
    private licenseRequested = false;
    private lastDataView: powerbi.DataView = null;

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.events = options.host.eventService;
        this.selectionManager = options.host.createSelectionManager();
        this.formattingSettingsService = new FormattingSettingsService();
        this.licenseManager = options.host.licenseManager;
        this.tooltipServiceWrapper = createTooltipServiceWrapper(options.host.tooltipService, options.element);

        this.target = options.element;
        this.target.classList.add("dmh-root");

        this.controlsEl = document.createElement("div");
        this.controlsEl.className = "dmh-controls";
        this.target.appendChild(this.controlsEl);

        this.noticeEl = document.createElement("div");
        this.noticeEl.className = "dmh-notice";
        this.noticeEl.style.display = "none";
        this.target.appendChild(this.noticeEl);

        this.messageEl = document.createElement("div");
        this.messageEl.className = EMPTY_STATE_CLASS;
        this.target.appendChild(this.messageEl);

        this.scrollEl = document.createElement("div");
        this.scrollEl.className = "dmh-scroll";
        this.target.appendChild(this.scrollEl);

        // Context menu on empty areas of the visual clears down to the visual-level menu
        this.target.addEventListener("contextmenu", (ev: MouseEvent) => {
            ev.preventDefault();
            this.selectionManager.showContextMenu({}, { x: ev.clientX, y: ev.clientY });
        });

    }

    public update(options: VisualUpdateOptions): void {
        this.events.renderingStarted(options);
        try {
            const dataView = options.dataViews && options.dataViews[0];

            if (options.operationKind === VisualDataChangeOperationKind.Create) {
                this.fetchCount = 0;
            }

            this.renderFromDataView(dataView);
            this.events.renderingFinished(options);

            // Resolve the licence only after something has been painted
            this.requestLicenseDeferred();
        } catch (error) {
            console.error("Error rendering Dynamic Matrix Heatmap", error);
            this.events.renderingFailed(options, String(error));
        }
    }

    /**
     * The whole render, decoupled from the update lifecycle so that it can be replayed when the
     * Pro entitlement resolves after first paint.
     */
    private renderFromDataView(dataView: powerbi.DataView): void {
        this.lastDataView = dataView;
        this.readHighContrast();

        this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(
            VisualFormattingSettingsModel,
            dataView
        );

        if (!dataView || !dataView.categorical) {
            this.renderLandingPage();
            return;
        }

        {
            // ---- Segmented loading: pull additional windows of row-level data ----------------
            const moreDataAvailable = !!(dataView.metadata && dataView.metadata.segment);
            if (moreDataAvailable && this.fetchCount < MAX_FETCHES) {
                this.fetchCount++;
                this.host.fetchMoreData(true);
            }

            const categorical = dataView.categorical;
            const allCategories: DataViewCategoryColumn[] = categorical.categories || [];
            const values: DataViewValueColumn[] = (categorical.values as unknown as DataViewValueColumn[]) || [];

            // Split the category columns by the role they were assigned to
            const allDimensions: DimensionInfo[] = allCategories
                .filter(c => c.source.roles && c.source.roles["dimensions"])
                .map(c => ({ name: c.source.displayName, column: c }));

            const allDistinctCols: DimensionInfo[] = allCategories
                .filter(c => c.source.roles && c.source.roles["distinctFields"])
                .map(c => ({ name: c.source.displayName, column: c }));

            const allMeasures: MeasureInfo[] = values.map(v => ({ name: v.source.displayName, column: v }));

            // ---- Free tier limits ------------------------------------------------------------
            const dimensions = this.isPro ? allDimensions : allDimensions.slice(0, FREE_MAX_DIMENSIONS);
            const measures = this.isPro ? allMeasures : allMeasures.slice(0, FREE_MAX_MEASURES);
            const distinctCols = this.isPro ? allDistinctCols : [];

            // True only when something was actually withheld, so the notice never appears on Pro
            const limited =
                allDimensions.length > dimensions.length ||
                allMeasures.length > measures.length ||
                allDistinctCols.length > distinctCols.length;

            // ---- Validation ----------------------------------------------------------------
            if (dimensions.length === 0) {
                this.showMessage("Add at least one dimension.");
                this.clearAll();
                return;
            }
            if (dimensions.length < 2) {
                this.showMessage("You need at least 2 dimensions to generate the matrix.");
                this.clearAll();
                return;
            }
            if (measures.length === 0 && distinctCols.length === 0) {
                this.showMessage(this.isPro
                    ? "Add a measure, or a raw ID column to \"Distinct count of\"."
                    : "Add at least one measure.");
                this.clearAll();
                return;
            }

            // ---- Build the list of selectable values ----------------------------------------
            const valueOptions: ValueOption[] = [];
            measures.forEach((m, i) => {
                valueOptions.push({ key: "m:" + i, label: m.name, kind: "measure", index: i });
            });
            distinctCols.forEach((d, i) => {
                valueOptions.push({ key: "d:" + i, label: "Distinct " + d.name, kind: "distinct", index: i });
            });

            // ---- Restore persisted selection -------------------------------------------------
            const persisted = dataView.metadata && dataView.metadata.objects && dataView.metadata.objects["selectionState"];
            const dimNames = dimensions.map(d => d.name);
            if (this.selectedX === null && persisted && typeof persisted["xDimension"] === "string" && dimNames.indexOf(persisted["xDimension"] as string) > -1) {
                this.selectedX = persisted["xDimension"] as string;
            }
            if (this.selectedY === null && persisted && typeof persisted["yDimension"] === "string" && dimNames.indexOf(persisted["yDimension"] as string) > -1) {
                this.selectedY = persisted["yDimension"] as string;
            }
            if (persisted && typeof persisted["valueKey"] === "string" && persisted["valueKey"]) {
                this.selectedValueKey = persisted["valueKey"] as string;
            }

            // Invalidate stale selections
            if (this.selectedX !== null && dimNames.indexOf(this.selectedX) === -1) { this.selectedX = null; }
            if (this.selectedY !== null && dimNames.indexOf(this.selectedY) === -1) { this.selectedY = null; }
            if (this.selectedX !== null && this.selectedX === this.selectedY) { this.selectedY = null; }
            if (!valueOptions.some(v => v.key === this.selectedValueKey)) {
                this.selectedValueKey = valueOptions[0].key;
            }

            this.hideMessage();
            this.renderControls(dimensions, valueOptions);
            this.renderNotice(moreDataAvailable, this.fetchCount, limited);

            if (!this.selectedX || !this.selectedY) {
                this.showMessage("Select X and Y to begin.");
                clearElement(this.scrollEl);
                return;
            }

            const activeValue = valueOptions.find(v => v.key === this.selectedValueKey);
            const highlightSource = activeValue.kind === "measure"
                ? (measures[activeValue.index].column.highlights || null)
                : (measures.length > 0 ? (measures[0].column.highlights || null) : null);

            this.renderMatrix(dimensions, measures, distinctCols, activeValue, highlightSource);
        }
    }

    // ==========================================================================================
    // Controls (X / Y / Value dropdowns)
    // ==========================================================================================

    private renderControls(dimensions: DimensionInfo[], valueOptions: ValueOption[]): void {
        clearElement(this.controlsEl);

        const text = this.formattingSettings.textCard;
        this.controlsEl.style.backgroundColor = this.isHighContrast
            ? this.hcBackground
            : text.controlsBackground.value.value;

        const buildLabeledSelect = (labelText: string): HTMLSelectElement => {
            const wrap = document.createElement("label");
            wrap.className = "dmh-control";
            const span = document.createElement("span");
            span.textContent = labelText;
            span.style.fontFamily = text.controlsFontFamily.value;
            span.style.fontSize = text.controlsFontSize.value + "px";
            span.style.color = this.isHighContrast ? this.hcForeground : text.controlsFontColor.value.value;
            wrap.appendChild(span);
            const select = document.createElement("select");
            select.tabIndex = 0;
            select.setAttribute("aria-label", labelText);
            wrap.appendChild(select);
            this.controlsEl.appendChild(wrap);
            return select;
        };

        this.xSelect = buildLabeledSelect("X axis");
        this.ySelect = buildLabeledSelect("Y axis");
        this.valueSelect = buildLabeledSelect("Value");

        const fillDimensionOptions = (select: HTMLSelectElement, excludeName: string | null, selectedName: string | null) => {
            clearElement(select);
            const placeholder = document.createElement("option");
            placeholder.value = "";
            placeholder.textContent = "-- select --";
            select.appendChild(placeholder);
            dimensions.forEach(d => {
                if (d.name === excludeName) { return; }
                const opt = document.createElement("option");
                opt.value = d.name;
                opt.textContent = d.name;
                if (d.name === selectedName) { opt.selected = true; }
                select.appendChild(opt);
            });
        };

        fillDimensionOptions(this.xSelect, this.selectedY, this.selectedX);
        fillDimensionOptions(this.ySelect, this.selectedX, this.selectedY);

        clearElement(this.valueSelect);
        valueOptions.forEach(v => {
            const opt = document.createElement("option");
            opt.value = v.key;
            opt.textContent = v.label;
            if (v.key === this.selectedValueKey) { opt.selected = true; }
            this.valueSelect.appendChild(opt);
        });

        this.xSelect.onchange = () => {
            this.selectedX = this.xSelect.value || null;
            if (this.selectedX && this.selectedX === this.selectedY) { this.selectedY = null; }
            this.persistSelection();
        };
        this.ySelect.onchange = () => {
            this.selectedY = this.ySelect.value || null;
            if (this.selectedY && this.selectedY === this.selectedX) { this.selectedX = null; }
            this.persistSelection();
        };
        this.valueSelect.onchange = () => {
            this.selectedValueKey = this.valueSelect.value;
            this.persistSelection();
        };
    }

    private persistSelection(): void {
        const instance: VisualObjectInstancesToPersist = {
            merge: [{
                objectName: "selectionState",
                selector: undefined,
                properties: {
                    xDimension: this.selectedX || "",
                    yDimension: this.selectedY || "",
                    valueKey: this.selectedValueKey || ""
                }
            }]
        };
        this.host.persistProperties(instance);
    }

    // ==========================================================================================
    // High contrast
    // ==========================================================================================

    /**
     * In high contrast mode the OS supplies the only colours that are allowed to appear, so the
     * heatmap scale is dropped entirely: cells fall back to the system background with system
     * foreground text, and magnitude is carried by the value itself rather than by hue.
     */
    private readHighContrast(): void {
        const palette = this.host.colorPalette;
        this.isHighContrast = !!(palette && palette.isHighContrast);
        if (!this.isHighContrast) { return; }
        this.hcForeground = (palette.foreground && palette.foreground.value) || "#000000";
        this.hcBackground = (palette.background && palette.background.value) || "#FFFFFF";
        this.hcSelected = (palette.foregroundSelected && palette.foregroundSelected.value) || this.hcForeground;
    }

    // ==========================================================================================
    // Licensing
    // ==========================================================================================

    /**
     * Kicks off entitlement resolution off the render path. Called only after a render has
     * already produced output, so a slow or failing licence service never delays first paint.
     */
    private requestLicenseDeferred(): void {
        if (this.licenseRequested || this.isPro || !this.licenseManager) { return; }
        this.licenseRequested = true;
        setTimeout(() => {
            try {
                resolveLicense(this.licenseManager).then(isPro => this.applyLicense(isPro));
            } catch (_) {
                /* stay on the Free tier */
            }
        }, 0);
    }

    /** Only ever upgrades Free -> Pro. On failure the DOM is left untouched. */
    private applyLicense(isPro: boolean): void {
        if (!isPro || this.isPro) { return; }
        this.isPro = true;
        if (this.lastDataView) {
            try {
                this.renderFromDataView(this.lastDataView);
            } catch (_) {
                /* keep whatever is already on screen */
            }
        }
    }

    private renderNotice(moreDataAvailable: boolean, fetchCount: number, limited: boolean): void {
        if (moreDataAvailable && fetchCount >= MAX_FETCHES) {
            this.noticeEl.textContent = "Showing a partial dataset — the row limit was reached. Reduce the number of dimensions for exact values.";
            this.noticeEl.style.display = "block";
        } else if (limited) {
            this.noticeEl.textContent =
                "Free tier: showing the first " + FREE_MAX_DIMENSIONS + " dimensions and " +
                FREE_MAX_MEASURES + " measures. Pro unlocks 10 dimensions, 5 measures, " +
                "distinct counts, percentages and totals.";
            this.noticeEl.style.display = "block";
        } else {
            this.noticeEl.style.display = "none";
        }
    }

    // ==========================================================================================
    // Matrix rendering — client-side aggregation engine
    // ==========================================================================================

    private renderMatrix(
        dimensions: DimensionInfo[],
        measures: MeasureInfo[],
        distinctCols: DimensionInfo[],
        activeValue: ValueOption,
        highlights: powerbi.PrimitiveValue[]
    ): void {
        const xDim = dimensions.find(d => d.name === this.selectedX);
        const yDim = dimensions.find(d => d.name === this.selectedY);

        const xValues = xDim.column.values;
        const yValues = yDim.column.values;
        const rowCount = xValues.length;

        const xCats = this.uniqueOrdered(xValues, MAX_CATS);
        const yCats = this.uniqueOrdered(yValues, MAX_CATS);

        // ---- Index every source row into its cell / row / column bucket -----------------------
        // This is what makes the visual correct: we keep the underlying rows and aggregate them
        // ourselves for whichever X/Y projection the user picked, instead of re-summing values
        // Power BI already collapsed at a different granularity.
        const cellRows: Map<string, number[]> = new Map();
        const rowBucket: Map<string, number[]> = new Map();
        const colBucket: Map<string, number[]> = new Map();
        const allRows: number[] = [];
        const cellHasHighlight: Map<string, boolean> = new Map();

        const xCatSet = new Set(xCats.map(String));
        const yCatSet = new Set(yCats.map(String));

        for (let i = 0; i < rowCount; i++) {
            const xv = xValues[i];
            const yv = yValues[i];
            if (xv === null || xv === undefined || yv === null || yv === undefined) { continue; }
            const xs = String(xv);
            const ys = String(yv);
            if (!xCatSet.has(xs) || !yCatSet.has(ys)) { continue; }

            const key = xs + KEY_SEP + ys;
            const cell = cellRows.get(key);
            if (cell) { cell.push(i); } else { cellRows.set(key, [i]); }

            const rb = rowBucket.get(ys);
            if (rb) { rb.push(i); } else { rowBucket.set(ys, [i]); }

            const cb = colBucket.get(xs);
            if (cb) { cb.push(i); } else { colBucket.set(xs, [i]); }

            allRows.push(i);

            if (highlights && highlights[i] !== null && highlights[i] !== undefined) {
                cellHasHighlight.set(key, true);
            }
        }

        // ---- The aggregation engine ------------------------------------------------------------
        // Each measure resolves its own aggregation: the author's override if set, otherwise the
        // aggregation Power BI itself applied to the field (parsed from its queryName).
        const aggMode = activeValue.kind === "measure"
            ? this.resolveAggregation(measures[activeValue.index].column)
            : "sum";
        const measureValues = activeValue.kind === "measure" ? measures[activeValue.index].column.values : null;
        const distinctValues = activeValue.kind === "distinct" ? distinctCols[activeValue.index].column.values : null;

        const evaluate = (indices: number[]): number | null => {
            if (!indices || indices.length === 0) { return null; }

            // Distinct count: computed from the raw column, so it is exact at ANY X/Y projection
            // and never double-counts entities that appear in several dimension combinations.
            if (distinctValues) {
                const seen = new Set<string>();
                for (const i of indices) {
                    const v = distinctValues[i];
                    if (v !== null && v !== undefined) { seen.add(String(v)); }
                }
                return seen.size;
            }

            let sum = 0;
            let cnt = 0;
            let mn = Infinity;
            let mx = -Infinity;
            for (const i of indices) {
                const v = measureValues[i] as number;
                if (v === null || v === undefined || isNaN(v)) { continue; }
                sum += v;
                cnt++;
                if (v < mn) { mn = v; }
                if (v > mx) { mx = v; }
            }
            if (cnt === 0) { return null; }
            switch (aggMode) {
                case "average": return sum / cnt;
                case "min":     return mn;
                case "max":     return mx;
                case "count":   return cnt;
                default:        return sum;
            }
        };

        // ---- Display mode (absolute / % of row / column / grand total) --------------------------
        // Percentage modes are a Pro feature; the Free tier always shows absolute values.
        const displayMode = this.isPro
            ? this.formattingSettings.valuesCard.displayMode.value.value as string
            : "absolute";
        const isPct = displayMode !== "absolute";
        const grandTotal = evaluate(allRows);

        const displayValue = (raw: number | null, xs: string, ys: string): number | null => {
            if (raw === null) { return null; }
            if (displayMode === "absolute") { return raw; }
            let denom: number | null = null;
            if (displayMode === "pctRow")   { denom = evaluate(rowBucket.get(ys) || []); }
            if (displayMode === "pctCol")   { denom = evaluate(colBucket.get(xs) || []); }
            if (displayMode === "pctTotal") { denom = grandTotal; }
            if (denom === null || denom === 0) { return null; }
            return raw / denom;
        };

        // ---- Formatters ---------------------------------------------------------------------------
        // absFmt always renders the underlying magnitude; fmt renders what the cell shows.
        const absFormatString = this.resolveFormatString(activeValue, measures, aggMode);
        const absFmt = valueFormatter.create({ format: absFormatString });
        const fmt = isPct ? valueFormatter.create({ format: "0.0%" }) : absFmt;

        // ---- Precompute all displayed cell values (also drives the color scale) ------------------
        const displayed: Map<string, number> = new Map();
        let globalMin = Infinity;
        let globalMax = -Infinity;
        yCats.forEach(yv => {
            const ys = String(yv);
            xCats.forEach(xv => {
                const xs = String(xv);
                const key = xs + KEY_SEP + ys;
                const raw = evaluate(cellRows.get(key));
                const dv = displayValue(raw, xs, ys);
                if (dv !== null && !isNaN(dv)) {
                    displayed.set(key, dv);
                    if (dv < globalMin) { globalMin = dv; }
                    if (dv > globalMax) { globalMax = dv; }
                }
            });
        });
        if (globalMin === Infinity) { globalMin = 0; globalMax = 0; }
        if (globalMin === globalMax) { globalMax = globalMin + 1; }

        const hasAnyHighlight = highlights !== null && highlights !== undefined;

        const heatmap = this.formattingSettings.heatmapCard;
        const emptyMode = this.formattingSettings.emptyCellsCard.mode.value.value as string;
        const text = this.formattingSettings.textCard;
        const layout = this.formattingSettings.layoutCard;
        // Totals are a Pro feature
        const showTotals = this.isPro && this.formattingSettings.valuesCard.showTotals.value;

        const rowHeight = Math.max(16, layout.rowHeight.value);
        const colWidth = Math.max(40, layout.columnWidth.value);
        const orientation = layout.columnHeaderOrientation.value.value as string;

        clearElement(this.scrollEl);
        const table = document.createElement("table");
        table.className = "dmh-table";
        table.style.setProperty("--dmh-row-height", rowHeight + "px");
        table.style.setProperty("--dmh-col-width", colWidth + "px");

        // ---- Header -----------------------------------------------------------------------------
        const thead = document.createElement("thead");
        const headRow = document.createElement("tr");
        const corner = document.createElement("th");
        corner.className = "dmh-corner";
        headRow.appendChild(corner);
        xCats.forEach(xv => {
            const th = document.createElement("th");
            th.className = "dmh-col-header dmh-orient-" + orientation;
            th.textContent = String(xv);
            th.style.fontFamily = text.labelFontFamily.value;
            th.style.fontSize = text.labelFontSize.value + "px";
            th.style.color = this.isHighContrast ? this.hcForeground : text.labelColor.value.value;
            if (this.isHighContrast) {
                th.style.backgroundColor = this.hcBackground;
                th.style.borderColor = this.hcForeground;
            }
            headRow.appendChild(th);
        });
        if (showTotals) {
            const th = document.createElement("th");
            th.className = "dmh-col-header dmh-total-header dmh-orient-" + orientation;
            th.textContent = "Total";
            th.style.fontFamily = text.labelFontFamily.value;
            th.style.fontSize = text.labelFontSize.value + "px";
            th.style.color = this.isHighContrast ? this.hcForeground : text.labelColor.value.value;
            if (this.isHighContrast) {
                th.style.backgroundColor = this.hcBackground;
                th.style.borderColor = this.hcForeground;
            }
            headRow.appendChild(th);
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        // ---- Body -------------------------------------------------------------------------------
        const tbody = document.createElement("tbody");
        yCats.forEach(yv => {
            const ys = String(yv);
            const tr = document.createElement("tr");
            const rowHeader = document.createElement("th");
            rowHeader.className = "dmh-row-header";
            rowHeader.textContent = ys;
            rowHeader.style.fontFamily = text.labelFontFamily.value;
            rowHeader.style.fontSize = text.labelFontSize.value + "px";
            rowHeader.style.color = this.isHighContrast ? this.hcForeground : text.labelColor.value.value;
            if (this.isHighContrast) {
                rowHeader.style.backgroundColor = this.hcBackground;
                rowHeader.style.borderColor = this.hcForeground;
            }
            tr.appendChild(rowHeader);

            xCats.forEach(xv => {
                const xs = String(xv);
                const key = xs + KEY_SEP + ys;
                const td = document.createElement("td");
                td.className = "dmh-cell";
                td.tabIndex = 0;
                td.setAttribute("data-cell-key", key);

                if (displayed.has(key)) {
                    const dv = displayed.get(key);
                    if (this.isHighContrast) {
                        td.style.backgroundColor = this.hcBackground;
                        td.style.color = this.hcForeground;
                        td.style.borderColor = this.hcForeground;
                    } else {
                        const normalized = (dv - globalMin) / (globalMax - globalMin);
                        td.style.backgroundColor = this.colorForValue(
                            normalized,
                            heatmap.minColor.value.value,
                            heatmap.midColor.value.value,
                            heatmap.maxColor.value.value
                        );
                        td.style.color = text.valueColor.value.value;
                    }
                    td.textContent = fmt.format(dv);
                    td.style.fontFamily = text.valueFontFamily.value;
                    td.style.fontSize = text.valueFontSize.value + "px";

                    if (this.selectedCells.size > 0) {
                        const isSelected = this.selectedCells.has(key);
                        td.style.opacity = isSelected ? "1" : "0.3";
                        // Opacity alone is not a reliable cue in high contrast, so selection is
                        // also marked with a system-coloured outline.
                        if (this.isHighContrast && isSelected) {
                            td.style.outline = "2px solid " + this.hcSelected;
                            td.style.outlineOffset = "-2px";
                        }
                    } else if (hasAnyHighlight) {
                        td.style.opacity = cellHasHighlight.get(key) === true ? "1" : "0.3";
                    }

                    const indices = cellRows.get(key) || [];
                    td.addEventListener("click", (ev: MouseEvent) => {
                        this.onCellClick(key, indices, xDim, yDim, ev.ctrlKey || ev.metaKey);
                    });

                    // Native Power BI context menu (Include / Exclude / Drill through / ...)
                    td.addEventListener("contextmenu", (ev: MouseEvent) => {
                        ev.preventDefault();
                        ev.stopPropagation();
                        // One anchor id is enough to give the menu its data context
                        const anchor = indices.length
                            ? this.host.createSelectionIdBuilder()
                                .withCategory(xDim.column, indices[0])
                                .withCategory(yDim.column, indices[0])
                                .createSelectionId()
                            : {};
                        this.selectionManager.showContextMenu(anchor, { x: ev.clientX, y: ev.clientY });
                    });

                    // Keyboard activation for accessibility
                    td.addEventListener("keydown", (ev: KeyboardEvent) => {
                        if (ev.key === "Enter" || ev.key === " ") {
                            ev.preventDefault();
                            this.onCellClick(key, indices, xDim, yDim, ev.ctrlKey || ev.metaKey);
                        }
                    });

                    // Tooltip always shows the absolute value alongside the displayed one
                    const rawAbs = evaluate(cellRows.get(key));

                    this.tooltipServiceWrapper.addTooltip(
                        d3.select(td),
                        () => {
                            const items = [
                                { displayName: xDim.name, value: xs },
                                { displayName: yDim.name, value: ys },
                                { displayName: activeValue.label, value: absFmt.format(rawAbs) }
                            ];
                            if (isPct) {
                                items.push({ displayName: this.displayModeLabel(displayMode), value: fmt.format(dv) });
                            }
                            return items;
                        }
                    );
                } else {
                    this.applyEmptyCellStyle(td, emptyMode);
                }

                tr.appendChild(td);
            });

            if (showTotals) {
                const totalTd = document.createElement("td");
                totalTd.className = "dmh-cell dmh-total-cell";
                const rowTotal = evaluate(rowBucket.get(ys) || []);
                totalTd.textContent = rowTotal === null ? "" : this.formatTotal(rowTotal, grandTotal, displayMode, fmt, absFmt);
                totalTd.style.fontFamily = text.valueFontFamily.value;
                totalTd.style.fontSize = text.valueFontSize.value + "px";
                totalTd.style.color = text.valueColor.value.value;
                tr.appendChild(totalTd);
            }

            tbody.appendChild(tr);
        });

        // ---- Totals row ---------------------------------------------------------------------------
        if (showTotals) {
            const tr = document.createElement("tr");
            tr.className = "dmh-total-row";
            const th = document.createElement("th");
            th.className = "dmh-row-header dmh-total-header";
            th.textContent = "Total";
            th.style.fontFamily = text.labelFontFamily.value;
            th.style.fontSize = text.labelFontSize.value + "px";
            th.style.color = this.isHighContrast ? this.hcForeground : text.labelColor.value.value;
            if (this.isHighContrast) {
                th.style.backgroundColor = this.hcBackground;
                th.style.borderColor = this.hcForeground;
            }
            tr.appendChild(th);

            xCats.forEach(xv => {
                const td = document.createElement("td");
                td.className = "dmh-cell dmh-total-cell";
                const colTotal = evaluate(colBucket.get(String(xv)) || []);
                td.textContent = colTotal === null ? "" : this.formatTotal(colTotal, grandTotal, displayMode, fmt, absFmt);
                td.style.fontFamily = text.valueFontFamily.value;
                td.style.fontSize = text.valueFontSize.value + "px";
                td.style.color = text.valueColor.value.value;
                tr.appendChild(td);
            });

            const gt = document.createElement("td");
            gt.className = "dmh-cell dmh-total-cell dmh-grand-total";
            // The grand total is always meaningful in absolute terms, whatever the display mode
            gt.textContent = grandTotal === null ? "" : absFmt.format(grandTotal);
            gt.style.fontFamily = text.valueFontFamily.value;
            gt.style.fontSize = text.valueFontSize.value + "px";
            gt.style.color = text.valueColor.value.value;
            tr.appendChild(gt);

            tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        this.scrollEl.appendChild(table);
    }

    /** Totals use the measure's own format in absolute mode, and a share of the grand total otherwise. */
    private formatTotal(
        total: number,
        grandTotal: number | null,
        displayMode: string,
        pctFormatter: valueFormatter.IValueFormatter,
        absFormatter: valueFormatter.IValueFormatter
    ): string {
        if (displayMode === "absolute") {
            return absFormatter.format(total);
        }
        if (grandTotal === null || grandTotal === 0) { return ""; }
        return pctFormatter.format(total / grandTotal);
    }

    private displayModeLabel(mode: string): string {
        switch (mode) {
            case "pctRow":   return "% of row";
            case "pctCol":   return "% of column";
            case "pctTotal": return "% of grand total";
            default:         return "Value";
        }
    }

    private applyEmptyCellStyle(td: HTMLElement, mode: string): void {
        td.classList.add("dmh-cell-empty");
        switch (mode) {
            case "dash": td.textContent = "-"; break;
            case "zero": td.textContent = "0"; break;
            case "gray": td.style.backgroundColor = "#E1E1E1"; td.textContent = ""; break;
            default:     td.textContent = ""; break;
        }
    }

    /**
     * Splits a queryName such as "Sales.Region" into a filter target.
     * Only the first dot separates table from column, so column names containing dots survive.
     */
    private toFilterTarget(column: DataViewCategoryColumn): IFilterColumnTarget | null {
        const qn = column.source && column.source.queryName;
        if (!qn) { return null; }
        const dot = qn.indexOf(".");
        if (dot <= 0 || dot === qn.length - 1) { return null; }
        return {
            table: qn.substring(0, dot),
            column: qn.substring(dot + 1)
        };
    }

    /**
     * Cross-filters by describing the selection instead of enumerating it.
     *
     * A categorical dataView shares one composite identity per row, so a selection id resolves to
     * a single source row rather than to a cell — covering a cell that way would mean emitting one
     * id per underlying row, which does not scale past a few thousand.
     *
     * A TupleFilter states the condition itself: (X = a AND Y = b) OR (X = c AND Y = d) ... Its cost
     * is proportional to the number of selected cells, not to the number of rows behind them, so a
     * cell holding five million rows is as cheap as one holding five. Power BI excludes the visual
     * that owns the filter, so the matrix keeps showing every category.
     */
    private applyCellFilter(xDim: DimensionInfo, yDim: DimensionInfo): void {
        const xTarget = this.toFilterTarget(xDim.column);
        const yTarget = this.toFilterTarget(yDim.column);

        if (!xTarget || !yTarget || this.selectedCells.size === 0) {
            this.host.applyJsonFilter(null, "general", "filter", powerbi.FilterAction.remove);
            return;
        }

        const values: ITupleElementValue[][] = [];
        this.selectedCells.forEach(cellKey => {
            const parts = cellKey.split(KEY_SEP);
            if (parts.length !== 2) { return; }
            values.push([{ value: parts[0] }, { value: parts[1] }]);
        });

        const filter: ITupleFilter = {
            $schema: TUPLE_FILTER_SCHEMA,
            filterType: FILTER_TYPE_TUPLE,
            operator: "In",
            target: [xTarget, yTarget],
            values: values
        };

        this.host.applyJsonFilter(
            filter as unknown as powerbi.IFilter,
            "general",
            "filter",
            powerbi.FilterAction.merge
        );
    }

    private onCellClick(cellKey: string, indices: number[], xDim: DimensionInfo, yDim: DimensionInfo, multiSelect: boolean): void {
        if (!indices.length) { return; }

        if (multiSelect) {
            // Ctrl/Cmd+click toggles this cell in or out of the current set
            if (this.selectedCells.has(cellKey)) {
                this.selectedCells.delete(cellKey);
            } else {
                this.selectedCells.add(cellKey);
            }
        } else if (this.selectedCells.size === 1 && this.selectedCells.has(cellKey)) {
            // Clicking the only selected cell clears the filter
            this.selectedCells.clear();
        } else {
            this.selectedCells.clear();
            this.selectedCells.add(cellKey);
        }

        this.applyCellFilter(xDim, yDim);
        this.applySelectionDimming();
    }

    /** Dims cells outside the current selection. Our own dataView is not filtered, so we do this ourselves. */
    private applySelectionDimming(): void {
        const anySelected = this.selectedCells.size > 0;
        this.scrollEl.querySelectorAll<HTMLElement>(".dmh-cell").forEach(el => {
            if (el.classList.contains("dmh-total-cell")) { return; }
            const key = el.getAttribute("data-cell-key");
            if (!anySelected || !key) {
                el.style.opacity = "1";
            } else {
                el.style.opacity = this.selectedCells.has(key) ? "1" : "0.3";
            }
        });
    }

    // ==========================================================================================
    // Helpers
    // ==========================================================================================

    private colorForValue(t: number, minColor: string, midColor: string, maxColor: string): string {
        const clamped = Math.max(0, Math.min(1, t));
        return clamped <= 0.5
            ? this.interpolateColor(minColor, midColor, clamped / 0.5)
            : this.interpolateColor(midColor, maxColor, (clamped - 0.5) / 0.5);
    }

    private interpolateColor(c1: string, c2: string, t: number): string {
        const a = this.hexToRgb(c1);
        const b = this.hexToRgb(c2);
        if (!a || !b) { return c1; }
        return "rgb(" +
            Math.round(a.r + (b.r - a.r) * t) + "," +
            Math.round(a.g + (b.g - a.g) * t) + "," +
            Math.round(a.b + (b.b - a.b) * t) + ")";
    }

    private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
        const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec((hex || "").trim());
        return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : null;
    }

    private uniqueOrdered(values: powerbi.PrimitiveValue[], cap: number): powerbi.PrimitiveValue[] {
        const seen = new Set<string>();
        const result: powerbi.PrimitiveValue[] = [];
        for (const v of values) {
            if (v === null || v === undefined) { continue; }
            const key = String(v);
            if (!seen.has(key)) {
                seen.add(key);
                result.push(v);
                if (result.length >= cap) { break; }
            }
        }
        return result;
    }

    // ==========================================================================================
    // Empty / landing states
    // ==========================================================================================

    private showMessage(msg: string): void {
        this.messageEl.textContent = msg;
        this.messageEl.style.display = "flex";
    }

    private hideMessage(): void {
        this.messageEl.style.display = "none";
    }

    private clearAll(): void {
        clearElement(this.controlsEl);
        clearElement(this.scrollEl);
        this.noticeEl.style.display = "none";
    }

    private renderLandingPage(): void {
        this.clearAll();
        this.showMessage("Add Dimensions (at least 2) plus a Measure or a \"Distinct count of\" field to build the dynamic matrix.");
    }

    // ==========================================================================================
    // Per-measure aggregation
    // ==========================================================================================

    /**
     * Parses the aggregation Power BI applied to a field from its queryName.
     * A column dragged in with "Summarize by > Sum" arrives as e.g. "Sum(Sales.Amount)";
     * a DAX measure arrives as a bare reference, so this returns null and Sum is assumed.
     */
    private detectNativeAggregation(column: DataViewValueColumn): string | null {
        const src = column.source;
        if (!src) { return null; }

        const map = (token: string): string | null => {
            switch (token.toLowerCase()) {
                case "sum":
                case "suma":           return "sum";
                case "avg":
                case "average":
                case "promedio":
                case "media":          return "average";
                case "min":
                case "minimum":
                case "mínimo":
                case "minimo":         return "min";
                case "max":
                case "maximum":
                case "máximo":
                case "maximo":         return "max";
                case "count":
                case "countnonnull":
                case "recuento":       return "count";
                default:               return null;
            }
        };

        // The label is checked first, and deliberately so. queryName is the query alias assigned
        // when the field was first added, and Power BI does not always regenerate it when the
        // author changes "Summarize by" — a field shown as "Average of CVI" can still carry
        // queryName "Sum(Fact_Scores.CVI)". The label is what Power BI presents and what the
        // author intends, so it wins when the two disagree.
        if (src.displayName) {
            const m = /^(Sum|Average|Avg|Min|Minimum|Max|Maximum|Count|Suma|Promedio|Media|Mínimo|Minimo|Máximo|Maximo|Recuento)\s+(of|de)\s+/i
                .exec(src.displayName);
            if (m) {
                const fromLabel = map(m[1]);
                if (fromLabel) { return fromLabel; }
            }
        }

        // Fallback: the aggregate function wrapping the column reference, e.g. "Avg(Sales.CVI)"
        if (src.queryName) {
            const m = /^([A-Za-z]+)\s*\(/.exec(src.queryName);
            if (m) {
                const fromQuery = map(m[1]);
                if (fromQuery) { return fromQuery; }
            }
        }

        return null;
    }

    /**
     * The aggregation used when projecting the N-dimension result down to the selected X/Y pair:
     * whatever Power BI applied to the field, falling back to Sum.
     *
     * Sum, Min, Max and Count re-aggregate exactly. Average is an unweighted approximation. A
     * native Distinct Count cannot be re-aggregated at all — that is what the "Distinct count of"
     * field is for, where the visual counts unique values from the raw column itself.
     */
    private resolveAggregation(column: DataViewValueColumn): string {
        const override = this.formattingSettings.valuesCard.aggregation.value.value as string;
        if (override !== "auto") { return override; }
        return this.detectNativeAggregation(column) || "sum";
    }

    /**
     * The format string for the displayed value: the field's own format from the model, except
     * where the aggregation changes what the number means — a row count is always a whole number.
     */
    /** True when a format string multiplies by 100, ignoring escaped or quoted literal % signs. */
    private isPercentageFormat(format: string): boolean {
        if (!format) { return false; }
        const withoutLiterals = format
            .replace(/\\./g, "")
            .replace(/'[^']*'/g, "")
            .replace(/"[^"]*"/g, "");
        return withoutLiterals.indexOf("%") >= 0;
    }

    /** "Sum(Fact_Scores.total_sales)" -> "Fact_Scores.total_sales" */
    private baseColumnRef(queryName: string): string | null {
        const m = /^[A-Za-z]+\s*\(\s*([^(),]+?)\s*\)/.exec(queryName || "");
        return m ? m[1].trim() : null;
    }

    /**
     * Detects the "same field added twice, one shown as % of grand total" case.
     *
     * Power BI marks the underlying model column as a percentage when that display option is used,
     * and the mark reaches every instance of the field — so the plain Sum instance arrives carrying
     * a percentage format it should not have. The percentage instance is recognisable by its
     * queryName: a Divide(...) over a ScopedEval(...), which is how "% of grand total" is expressed.
     * A plain aggregate sitting next to such a sibling therefore has an untrustworthy format.
     */
    private hasShowValueAsSibling(column: DataViewValueColumn, measures: MeasureInfo[]): boolean {
        const ref = this.baseColumnRef(column.source && column.source.queryName);
        if (!ref) { return false; }
        return measures.some(other => {
            if (other.column === column) { return false; }
            const qn = (other.column.source && other.column.source.queryName) || "";
            return /ScopedEval\s*\(/i.test(qn) && qn.indexOf(ref) >= 0;
        });
    }

    private resolveFormatString(activeValue: ValueOption, measures: MeasureInfo[], aggMode: string): string {
        // An explicit choice always wins, whatever the model says
        const override = this.formattingSettings.valuesCard.numberFormat.value.value as string;
        switch (override) {
            case "number":  return "#,0.##";
            case "integer": return "#,0";
            case "percent": return "0.00%";
        }

        if (activeValue.kind === "distinct") { return "#,0"; }
        if (aggMode === "count") { return "#,0"; }

        const column = measures[activeValue.index].column;
        const modelFormat = column.source && column.source.format;
        if (!modelFormat) { return "#,0.##"; }

        const isPlainAggregate = /^(Sum|Avg|Average|Min|Minimum|Max|Maximum|Count|CountNonNull)\s*\(/i
            .test((column.source && column.source.queryName) || "");

        if (isPlainAggregate &&
            this.isPercentageFormat(modelFormat) &&
            this.hasShowValueAsSibling(column, measures)) {
            return "#,0.##";
        }

        return modelFormat;
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }
}
