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
        items: [
            { value: "absolute", displayName: "Absolute" },
            { value: "pctRow", displayName: "% of row" },
            { value: "pctCol", displayName: "% of column" },
            { value: "pctTotal", displayName: "% of grand total" }
        ],
        value: { value: "absolute", displayName: "Absolute" }
    });

    aggregation = new formattingSettings.ItemDropdown({
        name: "aggregation",
        displayName: "Aggregation",
        description: "Auto reads the aggregation Power BI applied to the field. Override it when the field is a DAX measure, where the aggregation is not readable.",
        items: [
            { value: "auto", displayName: "Auto (detect)" },
            { value: "sum", displayName: "Sum" },
            { value: "average", displayName: "Average" },
            { value: "min", displayName: "Minimum" },
            { value: "max", displayName: "Maximum" },
            { value: "count", displayName: "Count of rows" }
        ],
        value: { value: "auto", displayName: "Auto (detect)" }
    });

    numberFormat = new formattingSettings.ItemDropdown({
        name: "numberFormat",
        displayName: "Number format",
        description: "Auto uses the field's format from the model. Override it when the model format is wrong for what the visual shows.",
        items: [
            { value: "auto", displayName: "Auto (from model)" },
            { value: "number", displayName: "Number" },
            { value: "integer", displayName: "Whole number" },
            { value: "percent", displayName: "Percentage" }
        ],
        value: { value: "auto", displayName: "Auto (from model)" }
    });

    showTotals = new formattingSettings.ToggleSwitch({
        name: "showTotals",
        displayName: "Show totals (Pro)",
        value: false
    });

    name: string = "values";
    displayName: string = "Values";
    slices: Array<FormattingSettingsSlice> = [
        this.aggregation, this.displayMode, this.numberFormat, this.showTotals
    ];
}

/**
 * Heatmap color scale (global min / mid / max)
 */
class HeatmapCardSettings extends FormattingSettingsCard {
    minColor = new formattingSettings.ColorPicker({
        name: "minColor",
        displayName: "Minimum value color",
        value: { value: "#FFFFFF" }
    });

    midColor = new formattingSettings.ColorPicker({
        name: "midColor",
        displayName: "Middle value color",
        value: { value: "#FDBE85" }
    });

    maxColor = new formattingSettings.ColorPicker({
        name: "maxColor",
        displayName: "Maximum value color",
        value: { value: "#D94701" }
    });

    name: string = "heatmap";
    displayName: string = "Heatmap colors";
    slices: Array<FormattingSettingsSlice> = [this.minColor, this.midColor, this.maxColor];
}

/**
 * How to display cells with no data
 */
class EmptyCellsCardSettings extends FormattingSettingsCard {
    mode = new formattingSettings.ItemDropdown({
        name: "mode",
        displayName: "Display as",
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
    slices: Array<FormattingSettingsSlice> = [this.mode];
}

/**
 * Fonts and colors for axis labels, cell values and the controls bar
 */
class TextCardSettings extends FormattingSettingsCard {
    labelFontFamily = new formattingSettings.FontPicker({
        name: "labelFontFamily",
        displayName: "Axis label font",
        value: "Segoe UI"
    });

    labelFontSize = new formattingSettings.NumUpDown({
        name: "labelFontSize",
        displayName: "Axis label size",
        value: 11
    });

    labelColor = new formattingSettings.ColorPicker({
        name: "labelColor",
        displayName: "Axis label color",
        value: { value: "#252423" }
    });

    valueFontFamily = new formattingSettings.FontPicker({
        name: "valueFontFamily",
        displayName: "Value font",
        value: "Segoe UI"
    });

    valueFontSize = new formattingSettings.NumUpDown({
        name: "valueFontSize",
        displayName: "Value size",
        value: 12
    });

    valueColor = new formattingSettings.ColorPicker({
        name: "valueColor",
        displayName: "Value color",
        value: { value: "#252423" }
    });

    controlsBackground = new formattingSettings.ColorPicker({
        name: "controlsBackground",
        displayName: "Controls bar background",
        value: { value: "#FFFFFF" }
    });

    controlsFontFamily = new formattingSettings.FontPicker({
        name: "controlsFontFamily",
        displayName: "Controls label font",
        value: "Segoe UI"
    });

    controlsFontSize = new formattingSettings.NumUpDown({
        name: "controlsFontSize",
        displayName: "Controls label size",
        value: 12
    });

    controlsFontColor = new formattingSettings.ColorPicker({
        name: "controlsFontColor",
        displayName: "Controls label color",
        value: { value: "#252423" }
    });

    name: string = "text";
    displayName: string = "Text";
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
        value: 28
    });

    columnWidth = new formattingSettings.NumUpDown({
        name: "columnWidth",
        displayName: "Column width (px)",
        value: 90
    });

    columnHeaderOrientation = new formattingSettings.ItemDropdown({
        name: "columnHeaderOrientation",
        displayName: "Column header orientation",
        items: [
            { value: "horizontal", displayName: "Horizontal" },
            { value: "vertical", displayName: "Vertical (90°)" },
            { value: "diagonal", displayName: "Diagonal (45°)" }
        ],
        value: { value: "horizontal", displayName: "Horizontal" }
    });

    name: string = "layout";
    displayName: string = "Layout";
    slices: Array<FormattingSettingsSlice> = [this.rowHeight, this.columnWidth, this.columnHeaderOrientation];
}

/**
 * Visual settings model
 */
export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    valuesCard = new ValuesCardSettings();
    heatmapCard = new HeatmapCardSettings();
    emptyCellsCard = new EmptyCellsCardSettings();
    textCard = new TextCardSettings();
    layoutCard = new LayoutCardSettings();

    cards = [
        this.valuesCard,
        this.heatmapCard,
        this.emptyCellsCard,
        this.textCard,
        this.layoutCard
    ];
}
