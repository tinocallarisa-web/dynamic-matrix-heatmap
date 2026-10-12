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
import {
    HtmlSubSelectableClass, HtmlSubSelectionHelper, SubSelectableDisplayNameAttribute,
    SubSelectableObjectNameAttribute, SubSelectableTypeAttribute,
} from "powerbi-visuals-utils-onobjectutils";

/** Esquemas de color de tres puntos (bajo, medio, alto). "custom" usa los colores de la tarjeta. */
const SCHEMES: Record<string, [string, string, string]> = {
    orange: ["#FFFFFF", "#FDBE85", "#D94701"],
    blues: ["#F7FBFF", "#6BAED6", "#08306B"],
    greens: ["#F7FCF5", "#74C476", "#00441B"],
    purples: ["#FCFBFD", "#9E9AC8", "#3F007D"],
    greys: ["#FFFFFF", "#969696", "#252525"],
    trafficUp: ["#D73027", "#FEE08B", "#1A9850"],
    trafficDown: ["#1A9850", "#FEE08B", "#D73027"],
    diverging: ["#2166AC", "#F7F7F7", "#B2182B"],
    viridis: ["#440154", "#21918C", "#FDE725"],
    cividis: ["#00224E", "#7D7C78", "#FEE838"],
    github: ["#EBEDF0", "#40C463", "#216E39"]
};

/**
 * Plantillas de estilo: [tarjeta, propiedad, valor]. Solo se aplican a lo que el autor no ha
 * tocado (lo que no está en metadata.objects), así que un ajuste a mano siempre gana.
 */
const TEMPLATES: Record<string, [string, string, any][]> = {
    classic: [],
    clean: [["layout", "cellGap", 2], ["layout", "cellRadius", 4], ["heatmap", "scheme", "blues"]],
    tiles: [["layout", "cellGap", 4], ["layout", "cellRadius", 8], ["layout", "rowHeight", 40], ["layout", "columnWidth", 72], ["heatmap", "scheme", "github"]],
    contrast: [["heatmap", "scheme", "trafficUp"], ["text", "valueFontSize", 13], ["layout", "cellGap", 1]],
    compact: [["layout", "rowHeight", 20], ["layout", "columnWidth", 56], ["text", "valueFontSize", 10], ["text", "labelFontSize", 10]]
};

/** Clave interna de la categoría "Otros": no puede coincidir con un valor real. */
const OTH = "\u0002others";

/** Orden natural de días y meses (en, es, pt, fr, de, it), completos y abreviados. */
const CALENDARS: string[][] = [
    ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
    ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
    ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"],
    ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"],
    ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"],
    ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"],
    ["montag", "dienstag", "mittwoch", "donnerstag", "freitag", "samstag", "sonntag"],
    ["lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato", "domenica"],
    ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"],
    ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"],
    ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
    ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"],
    ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"],
    ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"],
    ["januar", "februar", "märz", "april", "mai", "juni", "juli", "august", "september", "oktober", "november", "dezember"],
    ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"]
];

// ------------------------------------------------------------------------------------------
// Licensing
// ------------------------------------------------------------------------------------------

/** Plan ID tal como aparece en Partner Center (verificado 2026-09-15). */
const PLAN_ID = "dynamic-matrix-heatmap-tcviz";

/** ServicePlanState es un const enum: en runtime hacen falta los numeros. */
const STATE_ACTIVE = 1;
const STATE_WARNING = 2;

// spIdentifier = Service ID completo (editor.oferta.plan); se acepta también el Plan ID solo
function matchesPlan(spIdentifier: unknown, planId: string): boolean {
    const sp = String(spIdentifier ?? "");
    return sp === planId || sp.endsWith("." + planId);
}

// La API de licencias exige localizar el texto del aviso (maximo 500 caracteres).
const ES_LABELS: Record<string, string> = {
    "more than 3 dimensions": "más de 3 dimensiones",
    "more than 2 measures":   "más de 2 medidas",
    "distinct counts":        "los recuentos distintos",
    "percentage values":      "los valores en porcentaje",
    "totals":                 "los totales",
    "row groups":             "los grupos de filas",
    "similarity order":       "el orden por similitud"
};

const FREE_MAX_DIMENSIONS = 3;
const FREE_MAX_MEASURES = 2;

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

// Identificador del esquema TupleFilter, no una URL que se pida. Se compone para que la regla
// no-http-string de ESLint no lo tome por un enlace inseguro; el valor es el que exige Power BI.
const TUPLE_FILTER_SCHEMA = "http" + "://powerbi.com/product/schema#tuple";
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


/**
 * Lo que el visual decide por medida.
 *
 * Que significa un numero -agregacion y formato- lo decide el sistema: el pozo de campos y el
 * modelo, donde Power BI ya lo hace y lo hace mejor. Lo que no existe en ningun otro sitio es
 * COMO se presenta aqui, y eso si cambia con cada medida: los ingresos como % de la fila y el
 * recuento en absoluto, en la misma matriz.
 */
interface ValueSettings {
    mode: string;
}

/** A selectable entry in the Measure dropdown: either a DAX measure or a client-side distinct count. */
interface ValueOption {
    /** "m:<i>" medida, "d:<i>" recuento distinto de un campo de Detalle (filas) */
    key: string;
    label: string;
    kind: "measure" | "distinct";
    index: number;
    /** Columna cuyos valores distintos se cuentan (solo kind "distinct"). */
    col?: DataViewCategoryColumn;
    /**
     * Identidad estable para guardar sus ajustes: el campo (queryName) y qué aparición es.
     * Por nombre, dos "Sum of Sales" compartían el ajuste y renombrar una lo dejaba colgado.
     */
    settingsKey: string;
}

/** Un recuento distinto, en los nombres que le da Power BI en cada idioma. */
const DISTINCT_RE = /distinct|distint|eindeutig|uniek|unikat|個別|非重复|고유/i;

const EMPTY_STATE_CLASS = "dmh-empty-state";
const KEY_SEP = "";
/** Tope duro por eje: más allá, una tabla deja de ser legible y el DOM se resiente. */
const MAX_CATS_LIMIT = 200;
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
    private localization: powerbi.extensibility.ILocalizationManager;
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
    /** Ajustes por medida, indexados por su etiqueta, que es lo que el usuario ve y elige. */
    private perValue: { [label: string]: ValueSettings } = {};
    /** La medida que el panel estaba editando en el render anterior. */
    private perValueLoaded = false;
    /** "Show value as" del panel antiguo (hasta 1.1): modo por defecto de las medidas sin ajuste propio. */
    private legacyMode = "absolute";
    private modeSelect: HTMLSelectElement | null = null;
    private mainEl: HTMLElement;
    /** Panel lateral: null = automático (plegado si el visual es estrecho); si no, lo que eligió el usuario. */
    private panelOpen: boolean | null = null;
    private panelLoaded = false;
    /** Totales elegidos por el lector en el panel; null = lo que diga el panel de formato. */
    private totalsOn: boolean | null = null;
    private vpWidth = 0;
    /** Aviso de medida no aditiva colapsada en el cliente. Solo se pinta en edicion. */
    private aggWarning: string = null;
    /** Que se ha retenido por el tier gratuito, en palabras, para el aviso. */
    private limitedDetail = "";
    /** Nombre de la medida activa, para que la tarjeta diga a cual esta aplicando. */
    private activeLabel: string = null;
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
    private licenseResolved = false;
    private licenseEnvUnsupported = false;
    private noticeShown = false;
    private lastBlockedSig = "";
    /** Temporizador de la barra de Upgrade. Vive fuera de update() porque Power BI
     *  destruye y recrea el visual al cambiar de pagina, y un timer suelto dispararia
     *  sobre un visual que ya no existe. */
    private upgradeTimer = 0;
    private attemptedPro: string[] = [];
    private lastOptions: VisualUpdateOptions = null;
    private lastDataView: powerbi.DataView = null;
    private watermarkEl: HTMLElement;

    /** Orden por el valor de una columna (clic en su cabecera). */
    private sortKey: string | null = null;
    private sortDir: "desc" | "asc" = "desc";
    private sortLoaded = false;
    /** Miembros agrupados en "Otros" por eje, para filtrar y para el aviso. */
    private othersX: string[] = [];
    private othersY: string[] = [];
    private trimNotice = "";
    /** Agrupar filas por una tercera dimensión (Pro), y qué grupos están cerrados. */
    private selectedG: string | null = null;
    private collapsedGroups: Set<string> = new Set<string>();
    private groupLoaded = false;
    /** El aviso de datos parciales manda sobre los demás. */
    private partialShown = false;
    /** Lo retenido por el tier gratuito, para recomponer el aviso al final del dibujo. */
    private lastLimitedText = "";

    public visualOnObjectFormatting: powerbi.extensibility.visual.VisualOnObjectFormatting;
    private subSelectionHelper: HtmlSubSelectionHelper;
    private formatMode = false;

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.events = options.host.eventService;
        this.selectionManager = options.host.createSelectionManager();
        // Sin el gestor de localizacion, el util ignora displayNameKey y el panel de formato
        // sale en ingles aunque los recursos existan: son las dos mitades de lo mismo.
        this.localization = options.host.createLocalizationManager();
        this.formattingSettingsService = new FormattingSettingsService(this.localization);
        this.licenseManager = options.host.licenseManager;
        this.tooltipServiceWrapper = createTooltipServiceWrapper(options.host.tooltipService, options.element);

        this.target = options.element;
        this.target.classList.add("dmh-root");

        this.controlsEl = document.createElement("div");
        this.controlsEl.className = "dmh-controls";
        this.target.appendChild(this.controlsEl);
        // Columna principal: avisos, mensajes y matriz. A su izquierda, el panel de controles.
        this.mainEl = document.createElement("div");
        this.mainEl.className = "dmh-main";
        this.target.appendChild(this.mainEl);

        this.noticeEl = document.createElement("div");
        this.noticeEl.className = "dmh-notice";
        this.noticeEl.style.display = "none";
        this.mainEl.appendChild(this.noticeEl);

        this.messageEl = document.createElement("div");
        this.messageEl.className = EMPTY_STATE_CLASS;
        this.mainEl.appendChild(this.messageEl);

        this.scrollEl = document.createElement("div");
        this.scrollEl.className = "dmh-scroll";
        this.mainEl.appendChild(this.scrollEl);

        // Marca de agua de la vista previa Pro: solo sobre funciones de pago usadas sin licencia
        this.watermarkEl = document.createElement("div");
        this.watermarkEl.className = "dmh-watermark";
        this.watermarkEl.setAttribute("aria-hidden", "true");
        this.watermarkEl.textContent = "Pro preview";
        this.watermarkEl.style.cssText =
            "position:absolute;left:0;top:0;right:0;bottom:0;display:none;align-items:center;" +
            "justify-content:center;pointer-events:none;z-index:5;font:700 32px 'Segoe UI',sans-serif;" +
            "color:#FFFFFF;opacity:0.55;transform:rotate(-20deg);" +
            "text-shadow:0 0 2px rgba(51,51,51,0.85),0 1px 3px rgba(51,51,51,0.65);";
        this.target.style.position = "relative";
        this.target.appendChild(this.watermarkEl);

        // Formato sobre el lienzo: cabeceras, valores y barra de controles se formatean con un clic.
        this.subSelectionHelper = HtmlSubSelectionHelper.createHtmlSubselectionHelper({
            hostElement: options.element,
            subSelectionService: options.host.subSelectionService,
            selectionIdCallback: () => undefined,
        });
        this.visualOnObjectFormatting = {
            getSubSelectionStyles: (subs) => this.getSubSelectionStyles(subs),
            getSubSelectionShortcuts: (subs) => this.getSubSelectionShortcuts(subs),
            getSubSelectables: (filter) => this.subSelectionHelper.getAllSubSelectables(filter),
        };

        // Context menu on empty areas of the visual clears down to the visual-level menu
        this.target.addEventListener("contextmenu", (ev: MouseEvent) => {
            ev.preventDefault();
            this.selectionManager.showContextMenu({}, { x: ev.clientX, y: ev.clientY });
        });

    }

    public update(options: VisualUpdateOptions): void {
        this.events.renderingStarted(options);
        this.lastOptions = options;
        try {
            const dataView = options.dataViews && options.dataViews[0];

            if (options.operationKind === VisualDataChangeOperationKind.Create) {
                this.fetchCount = 0;
            }

            this.formatMode = !!(options as any).formatMode;
            this.vpWidth = options.viewport?.width || 0;
            this.subSelectionHelper.setFormatMode(this.formatMode);
            this.syncSelectionFromFilters(options);
            this.renderFromDataView(dataView);
            if (this.formatMode) {
                const subs = (options as any).subSelections as powerbi.visuals.CustomVisualSubSelection[] | undefined;
                this.subSelectionHelper.updateOutlinesFromSubSelections(subs ?? [], true);
            }
            this.events.renderingFinished(options);
        } catch (error) {
            console.error("Error rendering Dynamic Matrix Heatmap", error);
            this.events.renderingFailed(options, String(error));
        }
        // Fuera del try: un fallo de licencia nunca convierte un render correcto en renderingFailed.
        this.requestLicenseDeferred();
        this.syncLicenseNotification();
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

        this.applyTemplate(dataView?.metadata?.objects);

        if (!dataView || !dataView.categorical) {
            this.renderLandingPage();
            return;
        }

        if (!this.sortLoaded) {
            const st = dataView.metadata?.objects?.["selectionState"];
            if (st && typeof st["sortKey"] === "string" && st["sortKey"]) {
                this.sortKey = st["sortKey"] as string;
                this.sortDir = st["sortDir"] === "asc" ? "asc" : "desc";
            }
            this.sortLoaded = true;
        }
        if (!this.panelLoaded) {
            const st = dataView.metadata?.objects?.["selectionState"];
            const v = st ? st["panel"] : undefined;
            if (v === "open") { this.panelOpen = true; } else if (v === "closed") { this.panelOpen = false; }
            const tt = st ? st["totals"] : undefined;
            if (tt === "on") { this.totalsOn = true; } else if (tt === "off") { this.totalsOn = false; }
            this.panelLoaded = true;
        }
        if (!this.groupLoaded) {
            const st = dataView.metadata?.objects?.["selectionState"];
            if (st && typeof st["groupDimension"] === "string" && st["groupDimension"]) { this.selectedG = st["groupDimension"] as string; }
            if (st && typeof st["collapsedGroups"] === "string" && st["collapsedGroups"]) {
                try { const a = JSON.parse(st["collapsedGroups"] as string); if (Array.isArray(a)) { this.collapsedGroups = new Set(a.map(String)); } } catch (_) { /* se ignora */ }
            }
            this.groupLoaded = true;
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

            const allMeasures: MeasureInfo[] = values
                .filter(v => v.source.roles && v.source.roles["measures"])
                .map(v => ({ name: v.source.displayName, column: v }));

            // ---- Free tier limits ------------------------------------------------------------
            const pro = this.isProActive();
            const dimensions = pro ? allDimensions : allDimensions.slice(0, FREE_MAX_DIMENSIONS);
            const measures = pro ? allMeasures : allMeasures.slice(0, FREE_MAX_MEASURES);
            // Detalle (filas) es gratis: no añade una función, hace exactos los números que ya se ven.
            // Su rol interno sigue llamándose distinctFields para que los informes publicados con un
            // ID en el antiguo "Distinct count of" no pierdan el campo.
            const detailCols = allDistinctCols;

            // Lo que el usuario ha pedido y el tier gratuito no da: alimenta el aviso y la marca.
            const vc = this.formattingSettings.valuesCard;
            const attempted: string[] = [];
            if (allDimensions.length > FREE_MAX_DIMENSIONS) { attempted.push("more than 3 dimensions"); }
            if (allMeasures.length > FREE_MAX_MEASURES) { attempted.push("more than 2 measures"); }
            if (this.wantTotals()) { attempted.push("totals"); }
            this.attemptedPro = this.isPro ? [] : attempted;
            this.updateWatermark();

            // True only when something was actually withheld, so the notice never appears on Pro
            const limited =
                allDimensions.length > dimensions.length ||
                allMeasures.length > measures.length;

            // El aviso tiene que nombrar lo que se ha retenido. Decia siempre "las primeras 3
            // dimensiones y 2 medidas", asi que quien arrastraba un campo a "Distinct count of"
            // sin licencia no veia aparecer la opcion NI una sola palabra que lo explicara: el
            // campo entraba en el pozo y no pasaba nada.
            const retenido: string[] = [];
            if (allDimensions.length > dimensions.length) {
                retenido.push(`the first ${FREE_MAX_DIMENSIONS} of ${allDimensions.length} dimensions`);
            }
            if (allMeasures.length > measures.length) {
                retenido.push(`the first ${FREE_MAX_MEASURES} of ${allMeasures.length} measures`);
            }
            this.limitedDetail = retenido.length ? "Showing " + retenido.join(", ") + "." : "";

            // ---- Validation ----------------------------------------------------------------
            if (dimensions.length === 0) {
                this.showMessage(this.texto("Visual_Msg_AddDimension", "Add at least one dimension."));
                this.clearAll();
                return;
            }
            if (dimensions.length < 2) {
                this.showMessage(this.texto("Visual_Msg_TwoDimensions", "You need at least 2 dimensions to generate the matrix."));
                this.clearAll();
                return;
            }
            // ---- Build the list of selectable values ----------------------------------------
            // Recuentos distintos (Pro) de los campos de Detalle (filas): se cuentan sobre los valores
            // que llegan, así que son exactos para cualquier par X/Y.
            const valueOptions: ValueOption[] = [];
            const vistos: Record<string, number> = {};
            measures.forEach((m, i) => {
                const q = m.column.source?.queryName || m.name;
                vistos[q] = (vistos[q] || 0) + 1;
                valueOptions.push({ key: "m:" + i, label: m.name, kind: "measure", index: i, settingsKey: q + "#" + vistos[q] });
            });
            if (pro) {
                const pref = this.texto("Visual_DistinctPrefix", "Distinct");
                // Solo de lo que el autor puso en Detalle (filas): una opción por dimensión llenaba el
                // desplegable de recuentos que nadie había pedido. Para contar distintos de una
                // dimensión, lo natural es la medida "Recuento (distintivo)" del pozo, que se cuenta
                // exacta sola.
                detailCols.forEach((d, i) => {
                    valueOptions.push({ key: "d:" + i, label: pref + " " + d.name, kind: "distinct", index: i, col: d.column,
                        settingsKey: "distinct:" + (d.column.source?.queryName || d.name) });
                });
            }
            if (valueOptions.length === 0) {
                this.showMessage(this.texto("Visual_Msg_AddMeasure", "Add at least one measure."));
                this.clearAll();
                return;
            }

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
            const legado = dataView.metadata?.objects?.["values"]?.["displayMode"];
            if (typeof legado === "string" && legado) { this.legacyMode = legado; }
            if (!this.perValueLoaded && persisted && typeof persisted["perValue"] === "string" && persisted["perValue"]) {
                try {
                    const leido = JSON.parse(persisted["perValue"] as string);
                    if (leido && typeof leido === "object") { this.perValue = leido; }
                } catch (_) { /* un mapa ilegible se descarta */ }
            }
            this.perValueLoaded = true;

            // Invalidate stale selections
            if (this.selectedX !== null && dimNames.indexOf(this.selectedX) === -1) { this.selectedX = null; }
            if (this.selectedY !== null && dimNames.indexOf(this.selectedY) === -1) { this.selectedY = null; }
            if (this.selectedX !== null && this.selectedX === this.selectedY) { this.selectedY = null; }
            if (this.selectedG !== null && (dimNames.indexOf(this.selectedG) === -1 || this.selectedG === this.selectedX || this.selectedG === this.selectedY)) {
                this.selectedG = null;
            }
            if (this.selectedG && !this.isPro && this.attemptedPro.indexOf("row groups") < 0) {
                this.attemptedPro = this.attemptedPro.concat(["row groups"]);
                this.updateWatermark();
            }
            const ax = this.formattingSettings.axesCard;
            if ((ax.clusterRows.value || ax.clusterCols.value) && !this.isPro && this.attemptedPro.indexOf("similarity order") < 0) {
                this.attemptedPro = this.attemptedPro.concat(["similarity order"]);
                this.updateWatermark();
            }
            if (!valueOptions.some(v => v.key === this.selectedValueKey)) {
                this.selectedValueKey = valueOptions[0].key;
            }

            this.hideMessage();
            this.renderControls(dimensions, valueOptions);
            this.renderNotice(moreDataAvailable, this.fetchCount, limited);

            if (!this.selectedX || !this.selectedY) {
                this.showMessage(this.texto("Visual_Msg_SelectXY", "Select X and Y to begin."));
                clearElement(this.scrollEl);
                return;
            }

            const activeValue = valueOptions.find(v => v.key === this.selectedValueKey);
            // Los ajustes son de la medida, no del visual: hasta saber cual esta activa no se
            // puede decir si se ha pedido un porcentaje, que es Pro.
            const valueSettings = this.resolveValueSettings(activeValue);
            if (!this.isPro && activeValue.kind === "distinct" &&
                this.attemptedPro.indexOf("distinct counts") < 0) {
                this.attemptedPro = this.attemptedPro.concat(["distinct counts"]);
                this.updateWatermark();
            }
            if (!this.isPro && valueSettings.mode !== "absolute" &&
                this.attemptedPro.indexOf("percentage values") < 0) {
                this.attemptedPro = this.attemptedPro.concat(["percentage values"]);
                this.updateWatermark();
            }
            const highlightSource = activeValue.kind === "measure"
                ? (measures[activeValue.index].column.highlights || null)
                : (measures.length > 0 ? (measures[0].column.highlights || null) : null);

            this.renderMatrix(dimensions, measures, detailCols, activeValue, highlightSource, valueSettings);
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

        // Posición de los controles: panel a la izquierda (por defecto), barra arriba, u ocultos en
        // lectura (vista fija que decide el autor; editando siguen visibles para poder elegirla).
        const pos = (this.formattingSettings.layoutCard.controlsPosition.value.value as string) || "left";
        const oculto = pos === "hidden" && !this.isEditing();
        this.target.classList.toggle("dmh-pos-left", pos !== "top" && !oculto);
        this.target.classList.toggle("dmh-pos-top", pos === "top");
        this.controlsEl.style.display = oculto ? "none" : "";
        if (oculto) { return; }
        const izquierda = pos !== "top";
        // Sin X o Y elegidos, el panel se abre: si no, no habría por dónde empezar.
        const abierto = !this.selectedX || !this.selectedY ? true
            : this.panelOpen === null ? this.vpWidth === 0 || this.vpWidth >= 420 : this.panelOpen;
        this.controlsEl.classList.toggle("dmh-collapsed", izquierda && !abierto);
        const fg = this.isHighContrast ? this.hcForeground : text.controlsFontColor.value.value;
        if (izquierda) {
            const head = document.createElement("div");
            head.className = "dmh-panel-head";
            const toggle = document.createElement("button");
            toggle.className = "dmh-panel-toggle";
            toggle.type = "button";
            toggle.style.color = fg;
            // Sigue el formato de los controles, como el resto del panel.
            toggle.style.fontFamily = text.controlsFontFamily.value;
            toggle.style.fontSize = text.controlsFontSize.value + "px";
            toggle.textContent = abierto ? "⚙ " + this.texto("Visual_Ctl_Title", "View") + "  «" : "⚙";
            const etiqueta = abierto ? this.texto("Visual_Ctl_Hide", "Hide controls") : this.texto("Visual_Ctl_Show", "Show controls");
            toggle.title = etiqueta;
            toggle.setAttribute("aria-label", etiqueta);
            toggle.setAttribute("aria-expanded", String(abierto));
            toggle.addEventListener("click", () => {
                this.panelOpen = !abierto;
                this.persistSelection();
                this.repaint();
            });
            head.appendChild(toggle);
            this.controlsEl.appendChild(head);
            if (!abierto) {
                // Plegado: la matriz usa todo el ancho; los desplegables siguen existiendo para el
                // estado, pero no se pintan.
                this.xSelect = document.createElement("select");
                this.ySelect = document.createElement("select");
                this.valueSelect = document.createElement("select");
                this.modeSelect = null;
                return;
            }
        }

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
            // El valor elegido también sigue la fuente de los controles, no solo la etiqueta.
            select.style.fontFamily = text.controlsFontFamily.value;
            select.style.fontSize = text.controlsFontSize.value + "px";
            select.setAttribute("aria-label", labelText);
            wrap.appendChild(select);
            this.controlsEl.appendChild(wrap);
            return select;
        };

        this.xSelect = buildLabeledSelect(this.texto("Visual_Ctl_X", "X axis"));
        this.ySelect = buildLabeledSelect(this.texto("Visual_Ctl_Y", "Y axis"));
        this.valueSelect = buildLabeledSelect(this.texto("Visual_Ctl_Value", "Value"));
        // Show as (Pro): absoluto o porcentaje, por medida, elegido en el lienzo.
        this.modeSelect = this.isProActive() ? buildLabeledSelect(this.texto("Visual_Ctl_ShowAs", "Show as")) : null;
        // Agrupar filas (Pro): solo con una tercera dimensión, y en vista previa mientras se edita.
        let gSelect: HTMLSelectElement | null = null;
        if (dimensions.length >= 3 && this.isProActive()) {
            gSelect = buildLabeledSelect(this.texto("Visual_Ctl_Group", "Group rows"));
        }
        this.subSelectable(this.controlsEl, "controls", this.texto("Visual_Ctl_Bar", "Controls bar"), powerbi.visuals.SubSelectionStylesType.Text);

        const fillDimensionOptions = (select: HTMLSelectElement, excludeName: string | null, selectedName: string | null) => {
            clearElement(select);
            const placeholder = document.createElement("option");
            placeholder.value = "";
            placeholder.textContent = this.texto("Visual_Ctl_Select", "-- select --");
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
        // Totales (Pro): una casilla en el panel, para el lector; el panel de formato da el valor inicial.
        if (this.isProActive()) {
            const wrap = document.createElement("label");
            wrap.className = "dmh-control dmh-check";
            const box = document.createElement("input");
            box.type = "checkbox";
            box.checked = this.wantTotals();
            const span = document.createElement("span");
            span.textContent = this.texto("Visual_Ctl_Totals", "Totals");
            span.style.fontFamily = text.controlsFontFamily.value;
            span.style.fontSize = text.controlsFontSize.value + "px";
            span.style.color = this.isHighContrast ? this.hcForeground : text.controlsFontColor.value.value;
            box.addEventListener("change", () => {
                this.totalsOn = box.checked;
                this.persistSelection();
                this.repaint();
            });
            wrap.append(box, span);
            this.controlsEl.appendChild(wrap);
        }
        if (gSelect) {
            clearElement(gSelect);
            const none = document.createElement("option");
            none.value = "";
            none.textContent = this.texto("Visual_Ctl_None", "(none)");
            gSelect.appendChild(none);
            dimensions.forEach(d => {
                if (d.name === this.selectedX || d.name === this.selectedY) { return; }
                const opt = document.createElement("option");
                opt.value = d.name; opt.textContent = d.name;
                if (d.name === this.selectedG) { opt.selected = true; }
                gSelect.appendChild(opt);
            });
            gSelect.onchange = () => {
                this.selectedG = gSelect.value || null;
                this.collapsedGroups.clear();
                this.persistSelection();
            };
        }

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
        const activa = valueOptions.find(v => v.key === this.selectedValueKey);
        if (this.modeSelect && activa) {
            const ms = this.modeSelect;
            clearElement(ms);
            const actual = this.resolveValueSettings(activa).mode;
            for (const m of ["absolute", "pctRow", "pctCol", "pctTotal"]) {
                const opt = document.createElement("option");
                opt.value = m;
                opt.textContent = m === "absolute" ? this.texto("Visual_Item_absolute", "Absolute") : this.displayModeLabel(m);
                if (m === actual) { opt.selected = true; }
                ms.appendChild(opt);
            }
            ms.onchange = () => {
                this.perValue[activa.settingsKey] = { mode: ms.value };
                this.persistSelection();
                this.repaint();
            };
        }
    }

    /**
     * Decide que ajustes manda: los de la medida activa, no los del panel a secas.
     *
     * El panel de formato de Power BI no sabe de "la medida activa": tiene un solo juego de
     * controles. Asi que aqui se usa como EDITOR de la medida que esta seleccionada en la barra
     * del visual, y cada medida guarda los suyos.
     *
     * - Si sigue la misma medida, lo que haya cambiado en el panel es una edicion suya y se guarda.
     * - Si el usuario ha cambiado de medida, el panel tiene que pasar a mostrar los de la nueva.
     *
     * La escritura al panel provoca otro update, pero en ese ya coinciden los dos lados y no se
     * vuelve a escribir: no hay bucle.
     */
    /**
     * Cómo se muestra la medida activa: lo elige el lector en el desplegable "Show as" del visual
     * y cada medida lo recuerda. Antes lo decidía el panel de formato, que tiene un solo juego de
     * controles: para ver la misma medida en absoluto y en % había que poner el campo dos veces,
     * y Power BI trata dos veces el mismo campo como uno solo (renombrar uno renombra el otro).
     */
    private resolveValueSettings(activeValue: ValueOption): ValueSettings {
        const key = activeValue.settingsKey;
        // Informes guardados antes de 1.2: el ajuste estaba bajo el nombre visible.
        if (!this.perValue[key] && this.perValue[activeValue.label]) {
            this.perValue[key] = this.perValue[activeValue.label];
        }
        return this.perValue[key] || { mode: this.legacyMode };
    }

    private persistSelection(): void {
        const instance: VisualObjectInstancesToPersist = {
            merge: [{
                objectName: "selectionState",
                selector: undefined,
                properties: {
                    xDimension: this.selectedX || "",
                    yDimension: this.selectedY || "",
                    valueKey: this.selectedValueKey || "",
                    perValue: JSON.stringify(this.perValue),
                    sortKey: this.sortKey || "",
                    sortDir: this.sortDir,
                    groupDimension: this.selectedG || "",
                    panel: this.panelOpen === null ? "" : (this.panelOpen ? "open" : "closed"),
                    totals: this.totalsOn === null ? "" : (this.totalsOn ? "on" : "off"),
                    collapsedGroups: JSON.stringify(Array.from(this.collapsedGroups))
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

    /** Modo edicion (ViewMode: View=0, Edit=1, InFocusEdit=2). Sin viewMode se trata como lectura. */
    /** Texto localizado con respaldo: si falta el recurso, se usa el ingles, nunca la clave. */
    private texto(clave: string, respaldo: string): string {
        const s = this.localization?.getDisplayName(clave);
        return (!s || s === clave) ? respaldo : s;
    }

    private isEditing(): boolean {
        const vm = (this.lastOptions as any)?.viewMode;
        return typeof vm === "number" && vm !== 0;
    }

    /**
     * Vista previa Pro: Free, editando, con la licencia ya resuelta y en un entorno que puede
     * leerla. Las funciones de pago se muestran con marca de agua, que las directrices de
     * publicacion permiten para funciones de pago. En lectura, antes de resolver, o donde la
     * licencia no se puede leer (Publish to Web, exportacion) se pinta el resultado gratuito.
     */
    private isPreview(): boolean {
        return !this.isPro && this.isEditing() && this.licenseResolved && !this.licenseEnvUnsupported;
    }

    private isProActive(): boolean {
        return this.isPro || this.isPreview();
    }

    private updateWatermark(): void {
        const show = this.isPreview() && this.attemptedPro.length > 0;
        this.watermarkEl.style.display = show ? "flex" : "none";
        if (!show) { return; }
        // El tamaño sigue al ancho del visual: si no, se pierde en un visual grande.
        const width = this.target.clientWidth || 0;
        const size = Math.max(20, Math.min(72, Math.round(width * 0.09)));
        this.watermarkEl.style.fontSize = `${size}px`;
    }

    /** Pide la licencia una vez, fuera del camino critico. Si no resuelve, se queda en Free. */
    private requestLicenseDeferred(): void {
        if (this.licenseRequested || this.isPro) { return; }
        this.licenseRequested = true;
        setTimeout(() => {
            try {
                const lm = this.licenseManager as any;
                if (!lm) { this.licenseEnvUnsupported = true; this.licenseResolved = true; return; }
                // getAvailableServicePlans devuelve IPromise2: se consume con then(ok, err).
                lm.getAvailableServicePlans().then(
                    (result: any) => {
                        if (result?.isLicenseUnsupportedEnv === true || result?.isLicenseInfoAvailable === false) {
                            this.licenseEnvUnsupported = true;
                        }
                        this.licenseResolved = true;
                        const plans: any[] = result?.plans ?? [];
                        // Warning es periodo de gracia por un problema de pago: sigue siendo usable.
                        if (plans.some(p => matchesPlan(p.spIdentifier, PLAN_ID) &&
                            (p.state === STATE_ACTIVE || p.state === STATE_WARNING))) {
                            this.isPro = true;
                        }
                        // Repinta: de Free a Pro, o a la vista previa si toca.
                        this.repaint();
                        this.syncLicenseNotification();
                    },
                    () => { this.licenseEnvUnsupported = true; this.licenseResolved = true; });
            } catch (_) {
                this.licenseEnvUnsupported = true;
                this.licenseResolved = true;
            }
        }, 0);
    }

    /** Repinta con el ultimo dataView fuera de update(): no emite rendering events. */
    private repaint(): void {
        if (!this.lastDataView) { return; }
        try {
            this.renderFromDataView(this.lastDataView);
        } catch (_) {
            /* keep whatever is already on screen */
        }
    }

    /** La ruta de compra la pone Power BI, nunca el visual. */
    private syncLicenseNotification(): void {
        const lm = this.licenseManager as any;
        if (!lm) { return; }
        try {
            if (this.isPro || this.attemptedPro.length === 0) {
                if (this.noticeShown) {
                    this.noticeShown = false;
                    this.lastBlockedSig = "";
                    this.cancelUpgradeTimer();
                    lm.clearLicenseNotification?.();
                }
                return;
            }
            // Hasta que la licencia responde no se sabe si el usuario paga.
            if (!this.licenseResolved || this.licenseEnvUnsupported) { return; }
            const sig = this.attemptedPro.join("|");
            if (sig === this.lastBlockedSig) { return; }
            this.lastBlockedSig = sig;
            this.noticeShown = true;
            const n = this.attemptedPro.length;
            const es = (this.host.locale || "").toLowerCase().startsWith("es");
            const items = es ? this.attemptedPro.map(a => ES_LABELS[a] || a) : this.attemptedPro;
            const list = n === 1 ? items[0]
                : items.slice(0, -1).join(", ") + (es ? " y " : " and ") + items[n - 1];
            const msg = es
                ? `Dynamic Matrix Heatmap: ${list} ${n === 1 ? "forma" : "forman"} parte del plan Pro y se muestran como vista previa con marca de agua mientras editas.`
                : `Dynamic Matrix Heatmap: ${list} ${n === 1 ? "is" : "are"} part of the Pro plan, shown as a watermarked preview while editing.`;
            // Power BI muestra UNA notificacion a la vez y la ultima sustituye a la anterior.
            // Encadenadas sin espera, notifyLicenseRequired se comia el banner que nombra la
            // funcion bloqueada: el usuario veia "Upgrade" sin saber a cambio de que. Primero
            // se limpia lo que hubiera, luego se nombra la funcion, y la barra de compra entra
            // cuando ese banner ya ha cumplido sus ~10 s.
            lm.clearLicenseNotification?.();
            lm.notifyFeatureBlocked?.(msg.slice(0, 500));
            this.cancelUpgradeTimer();
            this.upgradeTimer = window.setTimeout(() => {
                this.upgradeTimer = 0;
                try {
                    // Entre medias el usuario ha podido quitar la funcion o llegar la licencia.
                    if (this.isPro || this.attemptedPro.length === 0) { return; }
                    lm.notifyLicenseRequired?.(0 /* LicenseNotificationType.General */);
                } catch (_) { /* la notificacion nunca rompe el render */ }
            }, 10500);
        } catch (_) {
            /* la notificacion nunca rompe el render */
        }
    }

    private cancelUpgradeTimer(): void {
        if (this.upgradeTimer) {
            window.clearTimeout(this.upgradeTimer);
            this.upgradeTimer = 0;
        }
    }

    /** Power BI recrea el visual al cambiar de pagina: el temporizador no puede sobrevivirle. */
    public destroy(): void {
        this.cancelUpgradeTimer();
    }

    private renderNotice(moreDataAvailable: boolean, fetchCount: number, limited: boolean): void {
        this.partialShown = moreDataAvailable && fetchCount >= MAX_FETCHES;
        this.lastLimitedText = limited ? (this.limitedDetail ||
            ("Showing the first " + FREE_MAX_DIMENSIONS + " dimensions and " + FREE_MAX_MEASURES + " measures.")) : "";
        if (moreDataAvailable && fetchCount >= MAX_FETCHES) {
            this.noticeEl.textContent = this.texto("Visual_Notice_Partial", "Showing a partial dataset — the row limit was reached. Reduce the number of dimensions for exact values.");
            this.noticeEl.style.display = "block";
        } else if (this.aggWarning) {
            this.noticeEl.textContent = this.aggWarning;
            this.noticeEl.style.display = "block";
        } else if (limited) {
            // Nota neutra, sin llamada a comprar: la ruta de compra es la notificacion de Power BI.
            this.noticeEl.textContent = this.limitedDetail ||
                ("Showing the first " + FREE_MAX_DIMENSIONS + " dimensions and " +
                 FREE_MAX_MEASURES + " measures.");
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
        detailCols: DimensionInfo[],
        activeValue: ValueOption,
        highlights: powerbi.PrimitiveValue[],
        valueSettings: ValueSettings
    ): void {
        // Con Detalle (filas) cada fila que llega es una fila de verdad: promedios, mínimos y
        // máximos se calculan exactos sobre ellas, en vez de combinar lo que Power BI ya agregó.
        const hasDetail = detailCols.length > 0;
        const xDim = dimensions.find(d => d.name === this.selectedX);
        const yDim = dimensions.find(d => d.name === this.selectedY);
        // Agrupar filas: Pro, o vista previa mientras se edita.
        const gDim = this.selectedG && this.isProActive() ? (dimensions.find(d => d.name === this.selectedG) || null) : null;

        const xValues = xDim.column.values;
        const yValues = yDim.column.values;
        const rowCount = xValues.length;

        // ---- The aggregation engine ------------------------------------------------------------
        // Each measure resolves its own aggregation: the author's override if set, otherwise the
        // aggregation Power BI itself applied to the field (parsed from its queryName).
        const aggMode = activeValue.kind === "measure"
            ? this.resolveAggregation(measures[activeValue.index].column)
            : "sum";
        const measureValues = activeValue.kind === "measure" ? measures[activeValue.index].column.values : null;
        // Una medida "Recuento (distintivo) de X" no se puede volver a agregar. Si la columna X está
        // en Dimensiones o en Detalle (filas), sus valores llegan con los datos y el visual la cuenta
        // él mismo, exacta. Si no está, salta el aviso de medida no aditiva.
        let autoDistinct: DataViewCategoryColumn | null = null;
        if (activeValue.kind === "measure") {
            const src = measures[activeValue.index].column.source;
            const esDistinto = DISTINCT_RE.test((src?.displayName || "") + " " + (src?.queryName || ""));
            if (esDistinto) {
                const ref = this.baseColumnRef(src?.queryName || "");
                const pool = dimensions.concat(detailCols);
                // Por la referencia de la consulta ("X(Tabla.Columna)") o, si no, por el nombre del
                // campo al final de la etiqueta ("Count (Distinct) of Cliente").
                const cand = (ref && pool.find(d => d.column.source?.queryName === ref)) ||
                    pool.find(d => (src?.displayName || "").toLowerCase().endsWith(" " + (d.name || "").toLowerCase()));
                if (cand) { autoDistinct = cand.column; }
            }
        }
        const distinctValues = activeValue.kind === "distinct" && activeValue.col
            ? activeValue.col.values
            : (autoDistinct ? autoDistinct.values : null);

        // "count" solo puede venir ya del pozo: Power BI aplico Count al campo y cada fila que
        // llega ES un recuento parcial, asi que colapsar al par X/Y elegido es SUMARLOS. Antes se
        // devolvia el numero de filas, que es cuantos grupos hay y no cuantas cosas hay dentro:
        // con cinco dimensiones enlazadas y dos elegidas, 52 en vez de 4.908.

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
                // Con Detalle (filas) es la media exacta de las filas; sin él, promedio de promedios
                // (y el aviso lo dice).
                case "average": return sum / cnt;
                case "min":     return mn;
                case "max":     return mx;
                case "count":   return sum;  // parciales de Power BI: se suman
                default:        return sum;
            }
        };


        // ---- Categorías: Otros, Top N y orden ---------------------------------------------------
        // Antes se cortaba cada eje en las 25 primeras categorías que aparecían, sin aviso, y los
        // totales solo sumaban lo visible. Ahora se quedan las de mayor total y el resto se agrupa
        // en "Otros", así que los totales siguen cuadrando; el aviso dice cuántas se agruparon.
        const axes = this.formattingSettings.axesCard;
        const othersOn = !!axes.others.value;
        const allBucket = (values: powerbi.PrimitiveValue[]) => {
            const m: Map<string, number[]> = new Map();
            const order: string[] = [];
            for (let i = 0; i < rowCount; i++) {
                const v = values[i];
                if (v === null || v === undefined) { continue; }
                const s = String(v);
                const arr = m.get(s);
                if (arr) { arr.push(i); } else { m.set(s, [i]); order.push(s); }
            }
            return { m, order };
        };
        const xb = allBucket(xValues);
        const yb = allBucket(yValues);
        const trim = (b: { m: Map<string, number[]>; order: string[] }, max: number) => {
            const cap = Math.max(1, Math.min(MAX_CATS_LIMIT, Math.round(max) || 25));
            if (b.order.length <= cap) { return { keep: new Set(b.order), members: [] as string[] }; }
            const keepN = othersOn ? cap - 1 : cap;
            const ranked = b.order.slice().sort((p, q) =>
                Math.abs(evaluate(b.m.get(q)) ?? 0) - Math.abs(evaluate(b.m.get(p)) ?? 0));
            const keep = new Set(ranked.slice(0, keepN));
            return { keep, members: b.order.filter(s => !keep.has(s)) };
        };
        const tx = trim(xb, axes.maxCols.value);
        const ty = trim(yb, axes.maxRows.value);
        this.othersX = tx.members;
        this.othersY = ty.members;
        const mapX = (s: string): string | null => tx.keep.has(s) ? s : (othersOn && tx.members.length ? OTH : null);
        const mapY = (s: string): string | null => ty.keep.has(s) ? s : (othersOn && ty.members.length ? OTH : null);

        const avisos: string[] = [];
        const avisa = (dim: DimensionInfo, total: number, n: number) => {
            avisos.push(othersOn
                ? this.texto("Visual_Notice_Others", "{dim}: {n} of {total} values grouped as Others.")
                    .replace("{dim}", dim.name).replace("{n}", String(n)).replace("{total}", String(total))
                : this.texto("Visual_Notice_Hidden", "{dim}: {n} of {total} values left out, and out of the totals.")
                    .replace("{dim}", dim.name).replace("{n}", String(n)).replace("{total}", String(total)));
        };
        if (tx.members.length) { avisa(xDim, xb.order.length, tx.members.length); }
        if (ty.members.length) { avisa(yDim, yb.order.length, ty.members.length); }
        this.trimNotice = avisos.join(" ");

        const order = (keys: string[], mode: string, bucket: Map<string, number[]>): string[] => {
            const k = keys.slice();
            const coll = new Intl.Collator(this.host.locale || undefined, { numeric: true, sensitivity: "base" });
            if (mode === "nameAsc") { k.sort((p, q) => coll.compare(p, q)); }
            else if (mode === "nameDesc") { k.sort((p, q) => coll.compare(q, p)); }
            else if (mode === "valueDesc" || mode === "valueAsc") {
                const tot = (s: string) => evaluate(bucket.get(s)) ?? -Infinity;
                k.sort((p, q) => mode === "valueDesc" ? tot(q) - tot(p) : tot(p) - tot(q));
            } else {
                // Automático: el orden de los datos, salvo días de la semana y meses, en su orden natural.
                const low = k.map(s => s.toLowerCase().trim());
                const cal = CALENDARS.find(c => low.every(s => c.indexOf(s) >= 0));
                if (cal) { k.sort((p, q) => cal.indexOf(p.toLowerCase().trim()) - cal.indexOf(q.toLowerCase().trim())); }
            }
            return k;
        };
        const xKept = xb.order.filter(s => tx.keep.has(s));
        const yKept = yb.order.filter(s => ty.keep.has(s));
        const xCats: string[] = order(xKept, axes.colsOrder.value.value as string, xb.m);
        const yCats: string[] = order(yKept, axes.rowsOrder.value.value as string, yb.m);
        if (othersOn && tx.members.length) { xCats.push(OTH); }
        if (othersOn && ty.members.length) { yCats.push(OTH); }
        const othersLabel = this.texto("Visual_OthersLabel", "Others");
        const labelOf = (k: string, n: number) => k === OTH ? `${othersLabel} (${n})` : k;

        // ---- Index every source row into its cell / row / column bucket -----------------------
        // This is what makes the visual correct: we keep the underlying rows and aggregate them
        // ourselves for whichever X/Y projection the user picked, instead of re-summing values
        // Power BI already collapsed at a different granularity.
        const cellRows: Map<string, number[]> = new Map();
        const rowBucket: Map<string, number[]> = new Map();
        const colBucket: Map<string, number[]> = new Map();
        const allRows: number[] = [];
        const cellHasHighlight: Map<string, boolean> = new Map();

        for (let i = 0; i < rowCount; i++) {
            const xv = xValues[i];
            const yv = yValues[i];
            if (xv === null || xv === undefined || yv === null || yv === undefined) { continue; }
            const xs = mapX(String(xv));
            const ys = mapY(String(yv));
            if (xs === null || ys === null) { continue; }

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

        // ---- Aviso: lo que no se puede colapsar bien ---------------------------------------------
        // El visual deja elegir X e Y aqui dentro, asi que Power BI no puede agregar a ese par:
        // agrega al grano de TODAS las dimensiones enlazadas y el visual colapsa el resto.
        //
        // Cual de las operaciones aguanta ese segundo colapso:
        //   sum    parciales que se suman      -> correcto
        //   min    minimo de minimos           -> correcto
        //   max    maximo de maximos           -> correcto
        //   count  parciales que se suman      -> correcto desde que se arreglo
        //   avg    promedio de promedios       -> NO: cada combinacion pesaria igual tenga una
        //          fila o diez mil, y los pesos no viajan en el dataView, asi que no hay forma
        //          de corregirlo aqui
        // y una medida DAX cuya operacion no se puede leer puede ser cualquiera de las cosas
        // que no se colapsan: un recuento distinto, un ratio, un porcentaje.
        //
        // Solo se avisa si el colapso ocurre de verdad: con una fila por celda no se combina nada.
        let colapsa = false;
        cellRows.forEach(filas => { if (filas.length > 1) { colapsa = true; } });

        const detectada = activeValue.kind === "measure"
            ? this.detectNativeAggregation(measures[activeValue.index].column)
            : "sum";
        const esDax = activeValue.kind === "measure" && detectada === null && !autoDistinct;
        this.activeLabel = activeValue.label;
        // Promedio que puso Power BI, no el usuario: quien elige "Promedio" sobre un campo sumado
        // esta pidiendo la media por combinacion, que es una pregunta legitima.
        // Con Detalle (filas) el promedio es exacto: no hay que avisar.
        const promedioNativo = detectada === "average" && !hasDetail;

        this.aggWarning = null;
        if (colapsa && this.isEditing()) {
            if (promedioNativo) {
                this.aggWarning = this.texto("Visual_Notice_AvgOfAvg", "This is an average of averages. Power BI averaged the field at the grain of every bound dimension, and those averages are combined here, so each combination counts the same whether it holds one row or ten thousand. The weights are not in the data the visual receives, so it cannot correct for them. Add an ID to Detail (rows) — the order, ticket or customer — and the visual computes the exact average.");
            } else if (esDax) {
                this.aggWarning = this.texto("Visual_Notice_NonAdditive", "This measure is being collapsed in the visual: Power BI aggregated it at the grain of every bound dimension, and the rest is combined here. If the measure is not additive \u2014 a distinct count, a ratio, a percentage \u2014 the number may not be the one you expect. For a distinct count, put that column in Dimensions or Detail (rows) and it is counted exactly; otherwise bind only the dimensions you compare, or use an additive measure.");
            }
        }

        // ---- Display mode (absolute / % of row / column / grand total) --------------------------
        // Percentage modes are a Pro feature; the Free tier always shows absolute values.
        const displayMode = this.isProActive()
            ? valueSettings.mode
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
        // cultureSelector: sin el, el formateador usa la cultura por defecto en vez de la del
        // informe. El formato del modelo se respetaba, pero los separadores no: un lector en
        // Espana, Alemania o Francia veia 1,234.56 donde su informe escribe 1.234,56. Afecta a
        // las celdas, a los tooltips y al total general, que salen todos de estos dos.
        const cultura = this.host.locale;
        const absFmt = valueFormatter.create({ format: absFormatString, cultureSelector: cultura });
        const fmt = isPct
            ? valueFormatter.create({ format: "0.0%", cultureSelector: cultura })
            : absFmt;

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
                    // "Otros" suma muchas categorías: no debe estirar la escala de color de las reales.
                    if (xs === OTH || ys === OTH) { return; }
                    if (dv < globalMin) { globalMin = dv; }
                    if (dv > globalMax) { globalMax = dv; }
                }
            });
        });
        if (this.sortKey !== null && xCats.indexOf(this.sortKey) >= 0) {
            const col = this.sortKey;
            const v = (ys: string) => displayed.get(col + KEY_SEP + ys);
            const others = yCats.indexOf(OTH) >= 0;
            const rest = yCats.filter(k => k !== OTH);
            rest.sort((p, q) => {
                const a = v(p), b = v(q);
                if (a === undefined && b === undefined) { return 0; }
                if (a === undefined) { return 1; }
                if (b === undefined) { return -1; }
                return this.sortDir === "desc" ? b - a : a - b;
            });
            yCats.length = 0;
            rest.forEach(k => yCats.push(k));
            if (others) { yCats.push(OTH); }
        }
        // Orden por similitud (Pro): filas y columnas con perfiles parecidos quedan juntas.
        const axc = this.formattingSettings.axesCard;
        const similar = this.isProActive();
        if (similar && axc.clusterRows.value && this.sortKey === null) {
            const rest = yCats.filter(k => k !== OTH);
            const ord = this.similarityOrder(rest, ys => xCats.map(xs => displayed.get(xs + KEY_SEP + ys) ?? 0));
            const others = yCats.indexOf(OTH) >= 0;
            yCats.length = 0; ord.forEach(k => yCats.push(k)); if (others) { yCats.push(OTH); }
        }
        if (similar && axc.clusterCols.value) {
            const rest = xCats.filter(k => k !== OTH);
            const ord = this.similarityOrder(rest, xs => yCats.map(ys => displayed.get(xs + KEY_SEP + ys) ?? 0));
            const others = xCats.indexOf(OTH) >= 0;
            xCats.length = 0; ord.forEach(k => xCats.push(k)); if (others) { xCats.push(OTH); }
        }

        // ---- Grupos de filas (Pro) ------------------------------------------------------------------
        // Cada celda de un grupo se calcula con las filas de ESE grupo, no con las de toda la fila:
        // "Bikes" bajo "Norte" no es "Bikes" de todas las regiones.
        const G = gDim ? gDim.column.values : null;
        const gOf = (i: number) => { const v = G[i]; return v === null || v === undefined ? "" : String(v); };
        const gxy: Map<string, number[]> = new Map();
        const gy: Map<string, number[]> = new Map();
        const gx: Map<string, number[]> = new Map();
        const gAll: Map<string, number[]> = new Map();
        const groupOrder: string[] = [];
        const push = (m: Map<string, number[]>, k: string, i: number) => { const a = m.get(k); if (a) { a.push(i); } else { m.set(k, [i]); } };
        if (G) {
            cellRows.forEach((idx, key) => {
                const [xs, ys] = key.split(KEY_SEP);
                for (const i of idx) {
                    const gs = gOf(i);
                    push(gxy, xs + KEY_SEP + ys + KEY_SEP + gs, i);
                    push(gy, ys + KEY_SEP + gs, i);
                    push(gx, xs + KEY_SEP + gs, i);
                    if (!gAll.has(gs)) { groupOrder.push(gs); }
                    push(gAll, gs, i);
                }
            });
            // Orden de los grupos: el de las filas (nombre, total o automático con días y meses).
            const ordered = order(groupOrder, axes.rowsOrder.value.value as string, gAll);
            groupOrder.length = 0; ordered.forEach(g => groupOrder.push(g));
            // La escala de color sale de las celdas que se ven dentro de los grupos.
            displayed.clear(); globalMin = Infinity; globalMax = -Infinity;
            gxy.forEach((idx, key) => {
                const [xs, ys, gs] = key.split(KEY_SEP);
                const raw = evaluate(idx);
                let dv = raw;
                if (raw !== null && displayMode !== "absolute") {
                    const den = displayMode === "pctRow" ? evaluate(gy.get(ys + KEY_SEP + gs) || [])
                        : displayMode === "pctCol" ? evaluate(colBucket.get(xs) || []) : grandTotal;
                    dv = den ? raw / den : null;
                }
                if (dv === null || isNaN(dv)) { return; }
                displayed.set(key, dv);
                if (xs === OTH || ys === OTH) { return; }
                if (dv < globalMin) { globalMin = dv; }
                if (dv > globalMax) { globalMax = dv; }
            });
        }

        if (globalMin === Infinity) { globalMin = 0; globalMax = 0; }
        if (globalMin === globalMax) { globalMax = globalMin + 1; }

        const hasAnyHighlight = highlights !== null && highlights !== undefined;

        const heatmap = this.formattingSettings.heatmapCard;
        const emptyMode = this.formattingSettings.emptyCellsCard.mode.value.value as string;
        const text = this.formattingSettings.textCard;
        const layout = this.formattingSettings.layoutCard;
        // Totals are a Pro feature
        const showTotals = this.isProActive() && this.wantTotals();

        const rowHeight = Math.max(16, layout.rowHeight.value);
        const colWidth = Math.max(40, layout.columnWidth.value);
        const orientation = layout.columnHeaderOrientation.value.value as string;

        clearElement(this.scrollEl);
        const table = document.createElement("table");
        table.className = "dmh-table";
        table.style.setProperty("--dmh-row-height", rowHeight + "px");
        table.style.setProperty("--dmh-col-width", colWidth + "px");
        const gap = Math.max(0, Math.min(20, layout.cellGap.value || 0));
        const radius = Math.max(0, Math.min(20, layout.cellRadius.value || 0));
        if (gap > 0) {
            table.style.borderCollapse = "separate";
            table.style.borderSpacing = gap + "px";
        }
        // Esquema y reglas de color
        const scheme = (heatmap.scheme.value.value as string) || "custom";
        const [cMin, cMid, cMax] = SCHEMES[scheme] || [heatmap.minColor.value.value, heatmap.midColor.value.value, heatmap.maxColor.value.value];
        const rc = this.formattingSettings.rulesCard;
        const rules = [rc.r1, rc.r2, rc.r3].filter(r => r.on.value).map(r => ({
            op: r.op.value.value as string, v: Number(r.value.value), color: r.color.value.value
        }));
        const ruleColor = (v: number): string | null => {
            for (const r of rules) {
                if (r.op === "gte" ? v >= r.v : v <= r.v) { return r.color; }
            }
            return null;
        };
        // Contraste automático del texto: sobre un fondo oscuro, letra blanca (salvo color a mano).
        const autoText = (text.valueColor.value.value || "").toUpperCase() === "#252423";
        const lum = (css: string): number => {
            const m = /rgb\((\d+),(\d+),(\d+)\)/.exec(css) || [];
            const rgb = m.length ? { r: +m[1], g: +m[2], b: +m[3] } : this.hexToRgb(css);
            if (!rgb) { return 1; }
            const f = (c: number) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
            return 0.2126 * f(rgb.r) + 0.7152 * f(rgb.g) + 0.0722 * f(rgb.b);
        };

        // ---- Header -----------------------------------------------------------------------------
        const thead = document.createElement("thead");
        const headRow = document.createElement("tr");
        const corner = document.createElement("th");
        corner.className = "dmh-corner";
        if (gDim) {
            const allClosed = groupOrder.length > 0 && groupOrder.every(g => this.collapsedGroups.has(g));
            const btn = document.createElement("button");
            btn.className = "dmh-group-all";
            btn.textContent = allClosed ? "⊞ " + this.texto("Visual_ExpandAll", "Expand all") : "⊟ " + this.texto("Visual_CollapseAll", "Collapse all");
            // Sigue el formato de las cabeceras: es una de ellas.
            btn.style.cssText = "border:none;background:transparent;cursor:pointer;padding:0;font-weight:600";
            btn.style.fontFamily = text.labelFontFamily.value;
            btn.style.fontSize = text.labelFontSize.value + "px";
            btn.style.color = this.isHighContrast ? this.hcForeground : text.labelColor.value.value;
            btn.setAttribute("aria-label", btn.textContent);
            this.subSelectable(btn, "labels", this.texto("Visual_Sub_Labels", "Axis labels"), powerbi.visuals.SubSelectionStylesType.Text);
            btn.addEventListener("click", () => {
                if (allClosed) { this.collapsedGroups.clear(); } else { groupOrder.forEach(g => this.collapsedGroups.add(g)); }
                this.persistSelection(); this.repaint();
            });
            corner.appendChild(btn);
        }
        headRow.appendChild(corner);
        xCats.forEach(xv => {
            const th = document.createElement("th");
            th.className = "dmh-col-header dmh-orient-" + orientation;
            const xk = String(xv);
            const arrow = this.sortKey === xk ? (this.sortDir === "desc" ? " ▼" : " ▲") : "";
            th.textContent = labelOf(xk, this.othersX.length) + arrow;
            th.setAttribute("aria-sort", this.sortKey === xk ? (this.sortDir === "desc" ? "descending" : "ascending") : "none");
            th.title = this.texto("Visual_SortHint", "Click to sort the rows by this column");
            th.style.cursor = "pointer";
            th.tabIndex = 0;
            const sortHere = () => {
                if (this.formatMode) { return; }
                // Ciclo: de mayor a menor, de menor a mayor, sin orden.
                if (this.sortKey !== xk) { this.sortKey = xk; this.sortDir = "desc"; }
                else if (this.sortDir === "desc") { this.sortDir = "asc"; }
                else { this.sortKey = null; this.sortDir = "desc"; }
                this.persistSelection();
                this.repaint();
            };
            th.addEventListener("click", sortHere);
            th.addEventListener("keydown", (ev: KeyboardEvent) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); sortHere(); } });
            this.subSelectable(th, "labels", this.texto("Visual_Sub_Labels", "Axis labels"), powerbi.visuals.SubSelectionStylesType.Text);
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
            th.textContent = this.texto("Visual_Total", "Total");
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

        const styleHeader = (h: HTMLElement) => {
            this.subSelectable(h, "labels", this.texto("Visual_Sub_Labels", "Axis labels"), powerbi.visuals.SubSelectionStylesType.Text);
            h.style.fontFamily = text.labelFontFamily.value;
            h.style.fontSize = text.labelFontSize.value + "px";
            h.style.color = this.isHighContrast ? this.hcForeground : text.labelColor.value.value;
            if (this.isHighContrast) {
                h.style.backgroundColor = this.hcBackground;
                h.style.borderColor = this.hcForeground;
            }
        };

        /** Una celda de datos: color, reglas, selección, clic, menú, teclado y tooltip. */
        const fillCell = (td: HTMLElement, key: string, xs: string, ys: string, gs: string | null, indices: number[]) => {
            td.className = "dmh-cell";
            td.tabIndex = 0;
            td.setAttribute("data-cell-key", key);
            if (!displayed.has(key)) { this.applyEmptyCellStyle(td, emptyMode); return; }
            const dv = displayed.get(key);
            if (this.isHighContrast) {
                td.style.backgroundColor = this.hcBackground;
                td.style.color = this.hcForeground;
                td.style.borderColor = this.hcForeground;
            } else {
                const normalized = (dv - globalMin) / (globalMax - globalMin);
                const bg = ruleColor(dv) || this.colorForValue(normalized, cMin, cMid, cMax);
                td.style.backgroundColor = bg;
                td.style.color = autoText && lum(bg) < 0.32 ? "#FFFFFF" : text.valueColor.value.value;
            }
            if (radius > 0) { td.style.borderRadius = radius + "px"; }
            if (gap > 0) { td.style.border = "none"; }
            this.subSelectable(td, "cells", this.texto("Visual_Sub_Values", "Cell values"), powerbi.visuals.SubSelectionStylesType.Text);
            td.textContent = fmt.format(dv);
            td.style.fontFamily = text.valueFontFamily.value;
            td.style.fontSize = text.valueFontSize.value + "px";

            if (this.selectedCells.size > 0) {
                const isSelected = this.cellSelected(xs, ys, gs);
                td.style.opacity = isSelected ? "1" : "0.3";
                // Opacity alone is not a reliable cue in high contrast, so selection is
                // also marked with a system-coloured outline.
                if (this.isHighContrast && isSelected) {
                    td.style.outline = "2px solid " + this.hcSelected;
                    td.style.outlineOffset = "-2px";
                }
            } else if (hasAnyHighlight) {
                const hl = indices.some(i => highlights[i] !== null && highlights[i] !== undefined);
                td.style.opacity = hl ? "1" : "0.3";
            }

            td.addEventListener("click", (ev: MouseEvent) => {
                this.onCellClick(key, indices, xDim, yDim, ev.ctrlKey || ev.metaKey, gDim);
            });
            // Native Power BI context menu (Include / Exclude / Drill through / ...)
            td.addEventListener("contextmenu", (ev: MouseEvent) => {
                ev.preventDefault();
                ev.stopPropagation();
                const anchor = indices.length
                    ? this.host.createSelectionIdBuilder()
                        .withCategory(xDim.column, indices[0])
                        .withCategory(yDim.column, indices[0])
                        .createSelectionId()
                    : {};
                this.selectionManager.showContextMenu(anchor, { x: ev.clientX, y: ev.clientY });
            });
            td.addEventListener("keydown", (ev: KeyboardEvent) => {
                if (ev.key === "Enter" || ev.key === " ") {
                    ev.preventDefault();
                    this.onCellClick(key, indices, xDim, yDim, ev.ctrlKey || ev.metaKey, gDim);
                }
            });
            // Tooltip always shows the absolute value alongside the displayed one
            const rawAbs = evaluate(indices);
            this.tooltipServiceWrapper.addTooltip(d3.select(td), () => {
                const items = [
                    { displayName: xDim.name, value: labelOf(xs, this.othersX.length) },
                    { displayName: yDim.name, value: labelOf(ys, this.othersY.length) }
                ];
                if (gDim && gs !== null) { items.push({ displayName: gDim.name, value: gs }); }
                items.push({ displayName: activeValue.label, value: absFmt.format(rawAbs) });
                if (isPct) { items.push({ displayName: this.displayModeLabel(displayMode), value: fmt.format(dv) }); }
                return items;
            });
        };

        const totalCell = (tr: HTMLElement, value: number | null, extraClass = "") => {
            const td = document.createElement("td");
            td.className = "dmh-cell dmh-total-cell" + extraClass;
            td.textContent = value === null ? "" : this.formatTotal(value, grandTotal, displayMode, fmt, absFmt);
            td.style.fontFamily = text.valueFontFamily.value;
            td.style.fontSize = text.valueFontSize.value + "px";
            td.style.color = this.isHighContrast ? this.hcForeground : text.valueColor.value.value;
            tr.appendChild(td);
        };

        if (!gDim) {
            yCats.forEach(yv => {
                const ys = String(yv);
                const tr = document.createElement("tr");
                const rowHeader = document.createElement("th");
                rowHeader.className = "dmh-row-header";
                rowHeader.textContent = labelOf(ys, this.othersY.length);
                styleHeader(rowHeader);
                tr.appendChild(rowHeader);
                xCats.forEach(xv => {
                    const xs = String(xv);
                    const key = xs + KEY_SEP + ys;
                    const td = document.createElement("td");
                    fillCell(td, key, xs, ys, null, cellRows.get(key) || []);
                    tr.appendChild(td);
                });
                if (showTotals) { totalCell(tr, evaluate(rowBucket.get(ys) || [])); }
                tbody.appendChild(tr);
            });
        } else {
            groupOrder.forEach(gs => {
                const closed = this.collapsedGroups.has(gs);
                // Fila del grupo: nombre, abrir/cerrar y subtotales por columna.
                const gtr = document.createElement("tr");
                gtr.className = "dmh-group-row";
                const gth = document.createElement("th");
                gth.className = "dmh-row-header dmh-group-header";
                const nY = yCats.filter(ys => gy.has(ys + KEY_SEP + gs)).length;
                gth.textContent = (closed ? "▸ " : "▾ ") + (gs || this.texto("Visual_Blank", "(Blank)")) + " (" + nY + ")";
                gth.tabIndex = 0;
                gth.setAttribute("role", "button");
                gth.setAttribute("aria-expanded", String(!closed));
                gth.style.cursor = "pointer";
                gth.style.fontWeight = "700";
                styleHeader(gth);
                const toggle = () => {
                    if (this.formatMode) { return; }
                    if (this.collapsedGroups.has(gs)) { this.collapsedGroups.delete(gs); } else { this.collapsedGroups.add(gs); }
                    this.persistSelection(); this.repaint();
                };
                gth.addEventListener("click", toggle);
                gth.addEventListener("keydown", (ev: KeyboardEvent) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); toggle(); } });
                gtr.appendChild(gth);
                xCats.forEach(xv => {
                    const xs = String(xv);
                    const idx = gx.get(xs + KEY_SEP + gs) || [];
                    const raw = idx.length ? evaluate(idx) : null;
                    let v: number | null = raw;
                    if (raw !== null && displayMode !== "absolute") {
                        const den = displayMode === "pctRow" ? evaluate(gAll.get(gs) || [])
                            : displayMode === "pctCol" ? evaluate(colBucket.get(xs) || []) : grandTotal;
                        v = den ? raw / den : null;
                    }
                    const td = document.createElement("td");
                    td.className = "dmh-cell dmh-total-cell dmh-subtotal";
                    td.textContent = v === null ? "" : fmt.format(v);
                    td.style.fontWeight = "600";
                    td.style.fontFamily = text.valueFontFamily.value;
                    td.style.fontSize = text.valueFontSize.value + "px";
                    td.style.color = this.isHighContrast ? this.hcForeground : text.valueColor.value.value;
                    gtr.appendChild(td);
                });
                if (showTotals) { totalCell(gtr, evaluate(gAll.get(gs) || []), " dmh-subtotal"); }
                tbody.appendChild(gtr);
                if (closed) { return; }
                yCats.forEach(yv => {
                    const ys = String(yv);
                    if (!gy.has(ys + KEY_SEP + gs)) { return; }
                    const tr = document.createElement("tr");
                    const rowHeader = document.createElement("th");
                    rowHeader.className = "dmh-row-header dmh-grouped";
                    rowHeader.textContent = labelOf(ys, this.othersY.length);
                    rowHeader.style.paddingLeft = "18px";
                    styleHeader(rowHeader);
                    tr.appendChild(rowHeader);
                    xCats.forEach(xv => {
                        const xs = String(xv);
                        const key = xs + KEY_SEP + ys + KEY_SEP + gs;
                        const td = document.createElement("td");
                        fillCell(td, key, xs, ys, gs, gxy.get(key) || []);
                        tr.appendChild(td);
                    });
                    if (showTotals) { totalCell(tr, evaluate(gy.get(ys + KEY_SEP + gs) || [])); }
                    tbody.appendChild(tr);
                });
            });
        }

        // ---- Totals row ---------------------------------------------------------------------------
        if (showTotals) {
            const tr = document.createElement("tr");
            tr.className = "dmh-total-row";
            const th = document.createElement("th");
            th.className = "dmh-row-header dmh-total-header";
            th.textContent = this.texto("Visual_Total", "Total");
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
        // Fondo de las cabeceras (filas, columnas, grupos, totales y esquina), salvo en alto contraste.
        if (!this.isHighContrast) {
            const fondo = text.labelBackground.value.value || "#FAFAFA";
            table.querySelectorAll<HTMLElement>("th").forEach(th => { th.style.backgroundColor = fondo; });
        }
        this.scrollEl.appendChild(table);
        // El aviso de medida no exacta se calcula aquí, después de pintar la barra de avisos:
        // sin esto salía un dibujo tarde, en la actualización siguiente.
        if (!this.partialShown) {
            const texto = [this.aggWarning, this.lastLimitedText, this.trimNotice].filter(Boolean).join(" ");
            this.noticeEl.textContent = texto;
            this.noticeEl.style.display = texto ? "block" : "none";
        }
    }

    /** ¿Totales? Lo que eligió el lector en el panel o, si no ha tocado nada, el panel de formato. */
    private wantTotals(): boolean {
        return this.totalsOn !== null ? this.totalsOn : !!this.formattingSettings.valuesCard.showTotals.value;
    }

    /** Una celda está seleccionada directamente o, si es de "Otros", por alguno de sus miembros. */
    private cellSelected(xs: string, ys: string, gs: string | null = null): boolean {
        const tail = gs === null ? "" : KEY_SEP + gs;
        if (this.selectedCells.has(xs + KEY_SEP + ys + tail)) { return true; }
        if (xs !== OTH && ys !== OTH) { return false; }
        const xsSet = xs === OTH ? this.othersX : [xs];
        const ysSet = ys === OTH ? this.othersY : [ys];
        for (const a of xsSet) { for (const b of ysSet) { if (this.selectedCells.has(a + KEY_SEP + b + tail)) { return true; } } }
        return false;
    }

    /**
     * Orden por similitud: agrupación jerárquica (enlace medio) sobre los perfiles normalizados,
     * leída en el orden de sus hojas. Filas o columnas con la misma forma quedan juntas.
     */
    private similarityOrder(keys: string[], vec: (k: string) => number[]): string[] {
        const n = keys.length;
        if (n < 3) { return keys.slice(); }
        const v = keys.map(k => {
            const a = vec(k);
            const m = a.reduce((s, x) => s + x, 0) / (a.length || 1);
            const sd = Math.sqrt(a.reduce((s, x) => s + (x - m) * (x - m), 0) / (a.length || 1)) || 1;
            return a.map(x => (x - m) / sd);
        });
        const d = (i: number, j: number) => { let s = 0; for (let k = 0; k < v[i].length; k++) { const q = v[i][k] - v[j][k]; s += q * q; } return Math.sqrt(s); };
        // Grupos: lista de índices; distancias medias entre grupos.
        let clusters: number[][] = keys.map((_, i) => [i]);
        const D: number[][] = keys.map((_, i) => keys.map((__, j) => d(i, j)));
        while (clusters.length > 1) {
            let bi = 0, bj = 1, best = Infinity;
            for (let i = 0; i < clusters.length; i++) {
                for (let j = i + 1; j < clusters.length; j++) {
                    let s = 0;
                    for (const p of clusters[i]) { for (const q of clusters[j]) { s += D[p][q]; } }
                    const avg = s / (clusters[i].length * clusters[j].length);
                    if (avg < best) { best = avg; bi = i; bj = j; }
                }
            }
            // Unir orientando los extremos más cercanos, para que el orden de hojas fluya.
            const A = clusters[bi], B = clusters[bj];
            const opts = [[A, B], [A, B.slice().reverse()], [A.slice().reverse(), B], [A.slice().reverse(), B.slice().reverse()]];
            let merged = opts[0][0].concat(opts[0][1]), mb = Infinity;
            for (const [p, q] of opts) { const c = D[p[p.length - 1]][q[0]]; if (c < mb) { mb = c; merged = p.concat(q); } }
            clusters = clusters.filter((_, i) => i !== bi && i !== bj);
            clusters.push(merged);
        }
        return clusters[0].map(i => keys[i]);
    }

    /** Aplica la plantilla de estilo a lo que el autor no ha tocado. */
    private applyTemplate(objects: powerbi.DataViewObjects | undefined): void {
        const name = (objects?.["style"]?.["template"] as string) || "classic";
        const list = TEMPLATES[name] || [];
        const cards: any[] = (this.formattingSettings as any).cards || [];
        for (const [cardName, prop, val] of list) {
            if (objects?.[cardName]?.[prop] !== undefined) { continue; }
            const card = cards.find(c => c.name === cardName);
            const slice = card?.slices?.find((s: any) => s.name === prop);
            if (!slice) { continue; }
            if (Array.isArray(slice.items)) { slice.value = slice.items.find((it: any) => it.value === val) || slice.value; }
            else if (slice.value && typeof slice.value === "object" && "value" in slice.value) { slice.value = { value: val }; }
            else { slice.value = val; }
        }
    }

    // ── Formato sobre el lienzo ─────────────────────────────────────────────────────────────

    private subSelectable(el: Element, objectName: string, displayName: string, type: powerbi.visuals.SubSelectionStylesType): void {
        if (!this.formatMode) { return; }
        el.classList.add(HtmlSubSelectableClass);
        el.setAttribute(SubSelectableObjectNameAttribute, objectName);
        el.setAttribute(SubSelectableDisplayNameAttribute, displayName);
        el.setAttribute(SubSelectableTypeAttribute, String(type));
    }

    private getSubSelectionStyles(subs: powerbi.visuals.CustomVisualSubSelection[]): powerbi.visuals.SubSelectionStyles | undefined {
        const name = subs[0]?.customVisualObjects[0]?.objectName;
        const ref = (objectName: string, propertyName: string, label: string) => ({ reference: { objectName, propertyName }, label });
        switch (name) {
            case "cells":
                return {
                    type: powerbi.visuals.SubSelectionStylesType.Text,
                    fontFamily: ref("text", "valueFontFamily", this.texto("Visual_ValueFont", "Value font")),
                    fontSize: ref("text", "valueFontSize", this.texto("Visual_ValueSize", "Value size")),
                    fontColor: ref("text", "valueColor", this.texto("Visual_ValueColor", "Value color")),
                } as any;
            case "labels":
                return {
                    type: powerbi.visuals.SubSelectionStylesType.Text,
                    fontFamily: ref("text", "labelFontFamily", this.texto("Visual_AxisFont", "Axis label font")),
                    fontSize: ref("text", "labelFontSize", this.texto("Visual_AxisSize", "Axis label size")),
                    fontColor: ref("text", "labelColor", this.texto("Visual_AxisColor", "Axis label color")),
                    background: ref("text", "labelBackground", this.texto("Visual_AxisBg", "Axis label background")),
                } as any;
            case "controls":
                return {
                    type: powerbi.visuals.SubSelectionStylesType.Text,
                    fontFamily: ref("text", "controlsFontFamily", this.texto("Visual_ControlsFont", "Controls label font")),
                    fontSize: ref("text", "controlsFontSize", this.texto("Visual_ControlsSize", "Controls label size")),
                    fontColor: ref("text", "controlsFontColor", this.texto("Visual_ControlsColor", "Controls label color")),
                    background: ref("text", "controlsBackground", this.texto("Visual_ControlsBg", "Controls bar background")),
                } as any;
        }
        return undefined;
    }

    private getSubSelectionShortcuts(subs: powerbi.visuals.CustomVisualSubSelection[]): powerbi.visuals.VisualSubSelectionShortcuts | undefined {
        const name = subs[0]?.customVisualObjects[0]?.objectName;
        const id = (objectName: string, propertyName: string) => ({ objectName, propertyName });
        const nav = (card: string, label: string) => ({ type: powerbi.visuals.VisualShortcutType.Navigate, destinationInfo: { cardUid: "Visual-" + card + "-card" }, label });
        switch (name) {
            case "cells":
                return [
                    { type: powerbi.visuals.VisualShortcutType.Picker, ...id("heatmap", "scheme"), label: this.texto("Visual_Scheme", "Color scheme") },
                    { type: powerbi.visuals.VisualShortcutType.Picker, ...id("style", "template"), label: this.texto("Visual_Template", "Template") },
                    { type: powerbi.visuals.VisualShortcutType.Divider },
                    { type: powerbi.visuals.VisualShortcutType.Reset, relatedResetFormattingIds: [id("text", "valueFontFamily"), id("text", "valueFontSize"), id("text", "valueColor")] },
                    nav("heatmap", this.texto("Visual_Heatmap", "Heatmap colors")),
                ] as any;
            case "labels":
                return [
                    { type: powerbi.visuals.VisualShortcutType.Picker, ...id("layout", "columnHeaderOrientation"), label: this.texto("Visual_HeaderOrientation", "Column header orientation") },
                    { type: powerbi.visuals.VisualShortcutType.Divider },
                    { type: powerbi.visuals.VisualShortcutType.Reset, relatedResetFormattingIds: [id("text", "labelFontFamily"), id("text", "labelFontSize"), id("text", "labelColor"), id("text", "labelBackground")] },
                    nav("text", this.texto("Visual_Text", "Text")),
                ] as any;
            case "controls":
                return [
                    { type: powerbi.visuals.VisualShortcutType.Reset, relatedResetFormattingIds: [id("text", "controlsFontFamily"), id("text", "controlsFontSize"), id("text", "controlsFontColor"), id("text", "controlsBackground")] },
                    nav("text", this.texto("Visual_Text", "Text")),
                ] as any;
        }
        return undefined;
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
            case "pctRow":   return this.texto("Visual_Item_pctRow", "% of row");
            case "pctCol":   return this.texto("Visual_Item_pctCol", "% of column");
            case "pctTotal": return this.texto("Visual_Item_pctTotal", "% of grand total");
            default:         return this.texto("Visual_Ctl_Value", "Value");
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
    private applyCellFilter(xDim: DimensionInfo, yDim: DimensionInfo, gDim: DimensionInfo | null = null): void {
        const xTarget = this.toFilterTarget(xDim.column);
        const yTarget = this.toFilterTarget(yDim.column);
        const gTarget = gDim ? this.toFilterTarget(gDim.column) : null;

        if (!xTarget || !yTarget || (gDim && !gTarget) || this.selectedCells.size === 0) {
            this.host.applyJsonFilter(null, "general", "filter", powerbi.FilterAction.remove);
            return;
        }

        const values: ITupleElementValue[][] = [];
        this.selectedCells.forEach(cellKey => {
            const parts = cellKey.split(KEY_SEP);
            if (parts.length !== (gTarget ? 3 : 2)) { return; }
            // "Otros" no existe en el modelo: se filtra por cada uno de sus miembros.
            const xs = parts[0] === OTH ? this.othersX : [parts[0]];
            const ys = parts[1] === OTH ? this.othersY : [parts[1]];
            for (const a of xs) {
                for (const b of ys) {
                    values.push(gTarget ? [{ value: a }, { value: b }, { value: parts[2] }] : [{ value: a }, { value: b }]);
                }
            }
        });

        const filter: ITupleFilter = {
            $schema: TUPLE_FILTER_SCHEMA,
            filterType: FILTER_TYPE_TUPLE,
            operator: "In",
            target: gTarget ? [xTarget, yTarget, gTarget] : [xTarget, yTarget],
            values: values
        };

        this.host.applyJsonFilter(
            filter as unknown as powerbi.IFilter,
            "general",
            "filter",
            powerbi.FilterAction.merge
        );
    }

    private onCellClick(cellKey: string, indices: number[], xDim: DimensionInfo, yDim: DimensionInfo, multiSelect: boolean, gDim: DimensionInfo | null = null): void {
        if (!indices.length) { return; }
        // El autor del informe puede apagar las interacciones de este visual desde
        // "Editar interacciones". Ignorarlo filtraba el informe contra su decision.
        if (this.host.hostCapabilities?.allowInteractions === false) { return; }

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

        this.applyCellFilter(xDim, yDim, gDim);
        this.applySelectionDimming();
    }

    /**
     * Rebuilds the selection from the filter Power BI hands back.
     *
     * The selected cells lived only in memory. Power BI persists the filter — a bookmark stores it,
     * and it survives a page change — but it recreates the visual, so `selectedCells` came back
     * empty: the report stayed filtered while the matrix showed nothing selected and every cell at
     * full opacity. Reading `jsonFilters` back makes the two agree again, which is what bookmark
     * support actually means here.
     *
     * Our own filter returns through this same path right after a click, which simply rebuilds the
     * identical set.
     */
    private syncSelectionFromFilters(options: VisualUpdateOptions): void {
        const filtros = options.jsonFilters as unknown as ITupleFilter[];
        // Sin array no hay informacion: dejar la seleccion como esta es mas seguro que borrarla.
        if (!Array.isArray(filtros)) { return; }

        const mio = filtros.find(f =>
            f && f.filterType === FILTER_TYPE_TUPLE &&
            Array.isArray(f.target) && (f.target.length === 2 || f.target.length === 3) &&
            Array.isArray(f.values));

        const restaurada = new Set<string>();
        if (mio) {
            mio.values.forEach(par => {
                if (Array.isArray(par) && (par.length === 2 || par.length === 3)) {
                    restaurada.add(par.map(p => String(p.value)).join(KEY_SEP));
                }
            });
        }
        this.selectedCells = restaurada;
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
                const p = key.split(KEY_SEP);
                el.style.opacity = (p.length >= 2 ? this.cellSelected(p[0], p[1], p.length === 3 ? p[2] : null) : this.selectedCells.has(key)) ? "1" : "0.3";
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
        this.watermarkEl.style.display = "none";
    }

    private renderLandingPage(): void {
        this.clearAll();
        this.showMessage(this.texto("Visual_Landing", "Add Dimensions (at least 2) and a Measure to build the dynamic matrix. Optional: an ID in Detail (rows) makes averages and distinct counts exact. Pro plan on Microsoft AppSource: up to 10 dimensions and 5 measures, distinct counts, percentage values, totals and row groups."));
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

        // Un recuento DISTINTO no se puede colapsar: el mismo cliente aparece en varias
        // combinaciones y sumarlas lo cuenta dos veces. Se detectaba como "count" y se sumaba en
        // silencio. Devolver null lo deja como operacion no legible, que es la verdad: no hay
        // ninguna forma correcta de combinarlo, y salta el aviso de medida no aditiva. Para
        // contar distintos bien esta el pozo "Distinct count of", que cuenta sobre la columna
        // cruda y da el numero exacto para cualquier par X/Y.
        if (DISTINCT_RE.test((src.displayName || "") + " " + (src.queryName || ""))) { return null; }

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
    /**
     * La agregacion la decide el pozo de campos, no el panel.
     *
     * Hasta 1.1.0.0 habia un desplegable que la repetia, y era peor sitio para decidirlo: en el
     * pozo el mismo campo se enlaza dos veces -Suma y Recuento- y las dos salen en la lista de
     * medidas del visual, calculadas por Power BI. Una medida DAX no expone su operacion, y ahi
     * se suman los parciales; cuando eso no vale, el aviso de medida no aditiva lo dice.
     */
    private resolveAggregation(column: DataViewValueColumn): string {
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

    /**
     * Traduce las opciones de los desplegables.
     *
     * El util localiza tarjetas y slices por `displayNameKey`, pero los items de un ItemDropdown
     * son `IEnumMember` y no tienen clave: sin esto el panel quedaba a medias, con los titulos en
     * espanol y las opciones en ingles. La clave se deriva del `value`, que es estable, y si el
     * recurso falta se deja el texto original en vez de escribir la clave en pantalla.
     */
    private localizeDropdownItems(): void {
        const traducir = (clave: string, actual: string): string => {
            const s = this.localization?.getDisplayName(clave);
            return (!s || s === clave) ? actual : s;
        };
        const cards = (this.formattingSettings as any)?.cards || [];
        cards.forEach((card: any) => {
            (card?.slices || []).forEach((slice: any) => {
                if (!Array.isArray(slice.items)) { return; }
                slice.items.forEach((it: any) => {
                    // Clave especifica del desplegable primero: 'auto' significa "detectar" en
                    // Aggregation y "del modelo" en Number format, y comparten value.
                    const propia = "Visual_Item_" + slice.name + "_" + it.value;
                    const generica = "Visual_Item_" + it.value;
                    it.displayName = traducir(propia, traducir(generica, it.displayName));
                });
                if (slice.value && slice.value.value !== undefined) {
                    const elegido = slice.items.find((it: any) => it.value === slice.value.value);
                    if (elegido) { slice.value = elegido; }
                }
            });
        });
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        this.localizeDropdownItems();
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }
}
