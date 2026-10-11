"use strict";

import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsSlice = formattingSettings.Slice;
import FormattingSettingsModel = formattingSettings.Model;

/**
 * How cell values are computed and displayed
 */
class ValuesCardSettings extends FormattingSettingsCard {
    displayMode = new formattingSettings.ItemDropdown({
        name: "displayMode",
        displayName: "Show value as (Pro)",
        displayNameKey: "Visual_ShowValueAs",
        items: [
            { value: "absolute", displayName: "Absolute" },
            { value: "pctRow", displayName: "% of row" },
            { value: "pctCol", displayName: "% of column" },
            { value: "pctTotal", displayName: "% of grand total" }
        ],
        value: { value: "absolute", displayName: "Absolute" }
    });

    showTotals = new formattingSettings.ToggleSwitch({
        name: "showTotals",
        displayName: "Show totals (Pro)",
        displayNameKey: "Visual_ShowTotals",
        value: false
    });

    name: string = "values";
    displayName: string = "Values";
    displayNameKey: string = "Visual_Values";
    // Sin esto el usuario sigue leyendo la tarjeta como global, que es justo el malentendido
    // que el reparto por medida viene a quitar.
    description: string = "Show value as belongs to the measure selected in the visual, not to the whole visual. Switch measure and it shows that measure's own setting. Aggregation comes from the field well, number format from the model.";
    descriptionKey: string = "Visual_Values_Desc";
    slices: Array<FormattingSettingsSlice> = [
        this.displayMode, this.showTotals
    ];
}

/**
 * Heatmap color scale (global min / mid / max)
 */
class HeatmapCardSettings extends FormattingSettingsCard {
    scheme = new formattingSettings.ItemDropdown({
        name: "scheme",
        displayName: "Color scheme",
        displayNameKey: "Visual_Scheme",
        items: [
            { value: "custom", displayName: "Custom (colors below)" },
            { value: "orange", displayName: "Orange" },
            { value: "blues", displayName: "Blues" },
            { value: "greens", displayName: "Greens" },
            { value: "purples", displayName: "Purples" },
            { value: "greys", displayName: "Greys" },
            { value: "trafficUp", displayName: "Red - yellow - green" },
            { value: "trafficDown", displayName: "Green - yellow - red" },
            { value: "diverging", displayName: "Blue - white - red" },
            { value: "viridis", displayName: "Viridis (cb)" },
            { value: "cividis", displayName: "Cividis (cb)" },
            { value: "github", displayName: "Activity (GitHub style)" }
        ],
        value: { value: "custom", displayName: "Custom (colors below)" }
    });

    minColor = new formattingSettings.ColorPicker({
        name: "minColor",
        displayName: "Minimum value color",
        displayNameKey: "Visual_MinColor",
        value: { value: "#FFFFFF" }
    });

    midColor = new formattingSettings.ColorPicker({
        name: "midColor",
        displayName: "Middle value color",
        displayNameKey: "Visual_MidColor",
        value: { value: "#FDBE85" }
    });

    maxColor = new formattingSettings.ColorPicker({
        name: "maxColor",
        displayName: "Maximum value color",
        displayNameKey: "Visual_MaxColor",
        value: { value: "#D94701" }
    });

    name: string = "heatmap";
    displayName: string = "Heatmap colors";
    displayNameKey: string = "Visual_Heatmap";
    slices: Array<FormattingSettingsSlice> = [this.scheme, this.minColor, this.midColor, this.maxColor];
}

/**
 * Reglas de color: un umbral pinta la celda de un color fijo, por encima del degradado.
 * Se evalúan sobre el valor tal como se muestra (un porcentaje se escribe como 0,25).
 */
function ruleSlices(n: number) {
    return {
        on: new formattingSettings.ToggleSwitch({ name: `rule${n}On`, displayName: `Rule ${n}`, displayNameKey: `Visual_Rule${n}`, value: false }),
        op: new formattingSettings.ItemDropdown({
            name: `rule${n}Op`, displayName: "Condition", displayNameKey: "Visual_RuleOp",
            items: [{ value: "gte", displayName: "Greater than or equal to" }, { value: "lte", displayName: "Less than or equal to" }],
            value: { value: n === 1 ? "gte" : "lte", displayName: n === 1 ? "Greater than or equal to" : "Less than or equal to" }
        }),
        value: new formattingSettings.NumUpDown({ name: `rule${n}Value`, displayName: "Value", displayNameKey: "Visual_RuleValue", value: 0 }),
        color: new formattingSettings.ColorPicker({ name: `rule${n}Color`, displayName: "Color", displayNameKey: "Visual_RuleColor",
            value: { value: n === 1 ? "#1A9850" : n === 2 ? "#D73027" : "#FEE08B" } })
    };
}

class RulesCardSettings extends FormattingSettingsCard {
    r1 = ruleSlices(1);
    r2 = ruleSlices(2);
    r3 = ruleSlices(3);
    name: string = "rules";
    displayName: string = "Color rules";
    displayNameKey: string = "Visual_Rules";
    description: string = "A rule paints the cells that meet it with its own color, over the gradient. The first rule that matches wins. Percentages are written as fractions: 0.25 for 25%.";
    descriptionKey: string = "Visual_Rules_Desc";
    slices: Array<FormattingSettingsSlice> = [
        this.r1.on, this.r1.op, this.r1.value, this.r1.color,
        this.r2.on, this.r2.op, this.r2.value, this.r2.color,
        this.r3.on, this.r3.op, this.r3.value, this.r3.color
    ];
}

/**
 * Qué filas y columnas se ven y en qué orden
 */
function orderDropdown(name: string, displayName: string, key: string) {
    return new formattingSettings.ItemDropdown({
        name, displayName, displayNameKey: key,
        items: [
            { value: "auto", displayName: "Automatic" },
            { value: "nameAsc", displayName: "Name A to Z" },
            { value: "nameDesc", displayName: "Name Z to A" },
            { value: "valueDesc", displayName: "Total, highest first" },
            { value: "valueAsc", displayName: "Total, lowest first" }
        ],
        value: { value: "auto", displayName: "Automatic" }
    });
}

class AxesCardSettings extends FormattingSettingsCard {
    rowsOrder = orderDropdown("rowsOrder", "Row order", "Visual_RowsOrder");
    colsOrder = orderDropdown("colsOrder", "Column order", "Visual_ColsOrder");
    maxRows = new formattingSettings.NumUpDown({ name: "maxRows", displayName: "Maximum rows", displayNameKey: "Visual_MaxRows", value: 25 });
    maxCols = new formattingSettings.NumUpDown({ name: "maxCols", displayName: "Maximum columns", displayNameKey: "Visual_MaxCols", value: 25 });
    others = new formattingSettings.ToggleSwitch({ name: "others", displayName: "Group the rest as Others", displayNameKey: "Visual_Others", value: true });
    name: string = "axes";
    displayName: string = "Rows and columns";
    displayNameKey: string = "Visual_Axes";
    description: string = "Automatic keeps the data order, and puts days of the week and months in calendar order. Beyond the maximum, the categories with the smallest totals are grouped as Others so the totals still add up.";
    descriptionKey: string = "Visual_Axes_Desc";
    slices: Array<FormattingSettingsSlice> = [this.rowsOrder, this.colsOrder, this.maxRows, this.maxCols, this.others];
}

/**
 * Plantilla de estilo: un punto de partida que solo rellena lo que el autor no ha tocado
 */
class StyleCardSettings extends FormattingSettingsCard {
    template = new formattingSettings.ItemDropdown({
        name: "template", displayName: "Template", displayNameKey: "Visual_Template",
        items: [
            { value: "classic", displayName: "Classic" },
            { value: "clean", displayName: "Clean" },
            { value: "tiles", displayName: "Tiles" },
            { value: "contrast", displayName: "Contrast" },
            { value: "compact", displayName: "Compact" }
        ],
        value: { value: "classic", displayName: "Classic" }
    });
    name: string = "style";
    displayName: string = "Style template";
    displayNameKey: string = "Visual_Style";
    slices: Array<FormattingSettingsSlice> = [this.template];
}

/**
 * How to display cells with no data
 */
class EmptyCellsCardSettings extends FormattingSettingsCard {
    mode = new formattingSettings.ItemDropdown({
        name: "mode",
        displayName: "Display as",
        displayNameKey: "Visual_DisplayAs",
        items: [
            { value: "blank", displayName: "Blank" },
            { value: "dash", displayName: "Dash (-)" },
            { value: "zero", displayName: "Zero (0)" },
            { value: "gray", displayName: "Gray fill" }
        ],
        value: { value: "dash", displayName: "Dash (-)" }
    });

    name: string = "emptyCells";
    displayName: string = "Empty cells";
    displayNameKey: string = "Visual_EmptyCells";
    slices: Array<FormattingSettingsSlice> = [this.mode];
}

/**
 * Fonts and colors for axis labels, cell values and the controls bar
 */
class TextCardSettings extends FormattingSettingsCard {
    labelFontFamily = new formattingSettings.FontPicker({
        name: "labelFontFamily",
        displayName: "Axis label font",
        displayNameKey: "Visual_AxisFont",
        value: "Segoe UI"
    });

    labelFontSize = new formattingSettings.NumUpDown({
        name: "labelFontSize",
        displayName: "Axis label size",
        displayNameKey: "Visual_AxisSize",
        value: 11
    });

    labelColor = new formattingSettings.ColorPicker({
        name: "labelColor",
        displayName: "Axis label color",
        displayNameKey: "Visual_AxisColor",
        value: { value: "#252423" }
    });

    valueFontFamily = new formattingSettings.FontPicker({
        name: "valueFontFamily",
        displayName: "Value font",
        displayNameKey: "Visual_ValueFont",
        value: "Segoe UI"
    });

    valueFontSize = new formattingSettings.NumUpDown({
        name: "valueFontSize",
        displayName: "Value size",
        displayNameKey: "Visual_ValueSize",
        value: 12
    });

    valueColor = new formattingSettings.ColorPicker({
        name: "valueColor",
        displayName: "Value color",
        displayNameKey: "Visual_ValueColor",
        value: { value: "#252423" }
    });

    controlsBackground = new formattingSettings.ColorPicker({
        name: "controlsBackground",
        displayName: "Controls bar background",
        displayNameKey: "Visual_ControlsBg",
        value: { value: "#FFFFFF" }
    });

    controlsFontFamily = new formattingSettings.FontPicker({
        name: "controlsFontFamily",
        displayName: "Controls label font",
        displayNameKey: "Visual_ControlsFont",
        value: "Segoe UI"
    });

    controlsFontSize = new formattingSettings.NumUpDown({
        name: "controlsFontSize",
        displayName: "Controls label size",
        displayNameKey: "Visual_ControlsSize",
        value: 12
    });

    controlsFontColor = new formattingSettings.ColorPicker({
        name: "controlsFontColor",
        displayName: "Controls label color",
        displayNameKey: "Visual_ControlsColor",
        value: { value: "#252423" }
    });

    name: string = "text";
    displayName: string = "Text";
    displayNameKey: string = "Visual_Text";
    slices: Array<FormattingSettingsSlice> = [
        this.labelFontFamily, this.labelFontSize, this.labelColor,
        this.valueFontFamily, this.valueFontSize, this.valueColor,
        this.controlsBackground, this.controlsFontFamily, this.controlsFontSize, this.controlsFontColor
    ];
}

/**
 * Row/column sizing and header orientation
 */
class LayoutCardSettings extends FormattingSettingsCard {
    rowHeight = new formattingSettings.NumUpDown({
        name: "rowHeight",
        displayName: "Row height (px)",
        displayNameKey: "Visual_RowHeight",
        value: 28
    });

    columnWidth = new formattingSettings.NumUpDown({
        name: "columnWidth",
        displayName: "Column width (px)",
        displayNameKey: "Visual_ColumnWidth",
        value: 90
    });

    columnHeaderOrientation = new formattingSettings.ItemDropdown({
        name: "columnHeaderOrientation",
        displayName: "Column header orientation",
        displayNameKey: "Visual_HeaderOrientation",
        items: [
            { value: "horizontal", displayName: "Horizontal" },
            { value: "vertical", displayName: "Vertical (90°)" },
            { value: "diagonal", displayName: "Diagonal (45°)" }
        ],
        value: { value: "horizontal", displayName: "Horizontal" }
    });

    name: string = "layout";
    displayName: string = "Layout";
    displayNameKey: string = "Visual_Layout";
    cellGap = new formattingSettings.NumUpDown({ name: "cellGap", displayName: "Space between cells (px)", displayNameKey: "Visual_CellGap", value: 0 });
    cellRadius = new formattingSettings.NumUpDown({ name: "cellRadius", displayName: "Cell corner radius (px)", displayNameKey: "Visual_CellRadius", value: 0 });

    slices: Array<FormattingSettingsSlice> = [this.rowHeight, this.columnWidth, this.columnHeaderOrientation, this.cellGap, this.cellRadius];
}

/**
 * Visual settings model
 */
export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    styleCard = new StyleCardSettings();
    valuesCard = new ValuesCardSettings();
    heatmapCard = new HeatmapCardSettings();
    rulesCard = new RulesCardSettings();
    axesCard = new AxesCardSettings();
    emptyCellsCard = new EmptyCellsCardSettings();
    textCard = new TextCardSettings();
    layoutCard = new LayoutCardSettings();

    cards = [
        this.styleCard,
        this.valuesCard,
        this.heatmapCard,
        this.rulesCard,
        this.axesCard,
        this.emptyCellsCard,
        this.textCard,
        this.layoutCard
    ];
}
