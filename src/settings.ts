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
    description: string = "Aggregation, Show value as and Number format belong to the measure selected in the visual, not to the whole visual. Switch measure and these three show that measure's own settings.";
    descriptionKey: string = "Visual_Values_Desc";
    slices: Array<FormattingSettingsSlice> = [
        this.displayMode, this.showTotals
    ];
}

/**
 * Heatmap color scale (global min / mid / max)
 */
class HeatmapCardSettings extends FormattingSettingsCard {
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
    slices: Array<FormattingSettingsSlice> = [this.minColor, this.midColor, this.maxColor];
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
