/*
 *  Power BI Visualizations
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved. 
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ""Software""), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *   
 *  The above copyright notice and this permission notice shall be included in 
 *  all copies or substantial portions of the Software.
 *   
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */

/// <reference path="../../../_references.ts"/>

module powerbi.visuals.samples {
    import ClassAndSelector = jsCommon.CssConstants.ClassAndSelector;
    import PixelConverter = jsCommon.PixelConverter;
    import createClassAndSelector = jsCommon.CssConstants.createClassAndSelector;
    import Lazy = jsCommon.Lazy;
    import getCategoryIndexOfRole = powerbi.data.DataRoleHelper.getCategoryIndexOfRole;
    import getMeasureIndexOfRole = powerbi.data.DataRoleHelper.getMeasureIndexOfRole;

    export interface ElementProperty {
        [propertyName: string]: any;
    }

    export interface ElementProperties {
        name: string;
        selector: string;
        className?: string;
        data?: any;
        styles?: ElementProperty;
        attributes?: ElementProperty;
    }

    interface ScatterChartMeasureMetadata {
        idx: {
            category?: number;
            x?: number;
            y?: number;
            size?: number;
            colorFill?: number;
            shape?: number;
            image?: number;
            rotation?: number;
            backdrop?: number;
            xStart?: number;
            xEnd?: number;
            yStart?: number;
            yEnd?: number;
        };
        cols: {
            x?: DataViewMetadataColumn;
            y?: DataViewMetadataColumn;
            size?: DataViewMetadataColumn;
        };
        axesLabels: ChartAxesLabels;
    }

    export interface EnhancedScatterChartDataPoint extends SelectableDataPoint, TooltipEnabledDataPoint {
        x: any;
        y: any;
        size: any;
        radius: RadiusData;
        fill: string;
        labelFill?: string;
        labelFontSize: any;
        contentPosition: ContentPositions;
        formattedCategory: Lazy<string>;
        colorFill?: string;
        svgurl?: string;
        shapeSymbolType?: (number) => string;
        rotation: number;
        backdrop?: string;
        xStart?: number;
        xEnd?: number;
        yStart?: number;
        yEnd?: number;
    }

    export interface EnhancedScatterChartData extends ScatterBehaviorChartData {
        useShape: boolean;
        useCustomColor: boolean;
        backdrop?: {
            show: boolean;
            url: string;
        };
        outline?: boolean;
        crosshair?: boolean;
        xCol: DataViewMetadataColumn;
        yCol: DataViewMetadataColumn;
        dataPoints: EnhancedScatterChartDataPoint[];
        legendData: LegendData;
        axesLabels: ChartAxesLabels;
        size?: DataViewMetadataColumn;
        sizeRange: NumberRange;
        dataLabelsSettings: PointDataLabelsSettings;
        defaultDataPointColor?: string;
        showAllDataPoints?: boolean;
        hasDynamicSeries?: boolean;
        fillPoint?: boolean;
        colorBorder?: boolean;
        colorByCategory?: boolean;
        selectedIds: SelectionId[];
    }

    export class EnhancedScatterChart implements IVisual {
        private AxisGraphicsContextClassName = "axisGraphicsContext";
        public static DefaultBubbleOpacity = 0.85;
        public static DimmedBubbleOpacity = 0.4;
        private static ClassName = "enhancedScatterChart";
        private static MainGraphicsContextClassName = "mainGraphicsContext";
        private static LegendLabelFontSizeDefault: number = 9;
        private static LabelDisplayUnitsDefault: number = 0;
        private static AxisFontSize = 11;

        private static DotClasses: ClassAndSelector = createClassAndSelector("dot");
        private static ImageClasses: ClassAndSelector = createClassAndSelector("img");
        public static CrosshairCanvasSelector: ClassAndSelector = createClassAndSelector("crosshairCanvas");
        public static CrosshairLineSelector: ClassAndSelector = createClassAndSelector("crosshairLine");
        public static CrosshairVerticalLineSelector: ClassAndSelector = createClassAndSelector("crosshairVerticalLine");
        public static CrosshairHorizontalLineSelector: ClassAndSelector = createClassAndSelector("crosshairHorizontalLine");
        public static CrosshairTextSelector: ClassAndSelector = createClassAndSelector("crosshairText");

        private static CrosshairTextMargin: number = 5;

        private legend: ILegend;
        private svgScrollable: D3.Selection;
        private axisGraphicsContext: D3.Selection;
        private axisGraphicsContextScrollable: D3.Selection;
        private xAxisGraphicsContext: D3.Selection;
        private backgroundGraphicsContext: D3.Selection;
        private y1AxisGraphicsContext: D3.Selection;
        private svg: D3.Selection;
        private element: JQuery;
        private mainGraphicsSVGSelection: D3.Selection;
        private mainGraphicsContext: D3.Selection;
        private clearCatcher: D3.Selection;
        private mainGraphicsG: D3.Selection;

        private crosshairCanvasSelection: D3.Selection;
        private crosshairVerticalLineSelection: D3.Selection;
        private crosshairHorizontalLineSelection: D3.Selection;
        private crosshairTextSelection: D3.Selection;

        private style: IVisualStyle;
        private data: EnhancedScatterChartData;
        private dataView: DataView;

        private xAxisProperties: IAxisProperties;
        private yAxisProperties: IAxisProperties;
        private colors: IDataColorPalette;
        private options: VisualInitOptions;
        private interactivity: InteractivityOptions;
        private interactivityService: IInteractivityService;
        private categoryAxisProperties: DataViewObject;
        private valueAxisProperties: DataViewObject;
        private yAxisOrientation: string;
        private scrollY: boolean;
        private scrollX: boolean;

        private dataViews: DataView[];
        private legendObjectProperties: DataViewObject;
        private hostServices: IVisualHostServices;
        private layerLegendData: LegendData;
        private legendLabelFontSize: number;
        private cartesianSmallViewPortProperties: CartesianSmallViewPortProperties;
        private hasCategoryAxis: boolean;
        private yAxisIsCategorical: boolean;
        private bottomMarginLimit: number;
        private leftRightMarginLimit: number;
        private isXScrollBarVisible: boolean;
        private isYScrollBarVisible: boolean;
        private ScrollBarWidth = 10;
        private categoryAxisHasUnitType: boolean;
        private valueAxisHasUnitType: boolean;
        private svgDefaultImage: string;
        private oldBackdrop: string;
        private textProperties: TextProperties = {
            fontFamily: "wf_segoe-ui_normal",
            fontSize: PixelConverter.toString(EnhancedScatterChart.AxisFontSize),
        };
        private behavior: IInteractiveBehavior;
        private animator: IGenericAnimator;
        private keyArray: string[];

        private _margin: IMargin;
        private get margin(): IMargin {
            return this._margin || { left: 0, right: 0, top: 0, bottom: 0 };
        }

        private set margin(value: IMargin) {
            this._margin = $.extend({}, value);
            this._viewportIn = EnhancedScatterChart.substractMargin(this.viewport, this.margin);
        }

        private _viewport: IViewport;
        private get viewport(): IViewport {
            return this._viewport || { width: 0, height: 0 };
        }

        private set viewport(value: IViewport) {
            this._viewport = $.extend({}, value);
            this._viewportIn = EnhancedScatterChart.substractMargin(this.viewport, this.margin);
        }

        private _viewportIn: IViewport;
        private get viewportIn(): IViewport {
            return this._viewportIn || this.viewport;
        }

        private get legendViewport(): IViewport {
            return this.legend.getMargins();
        }

        public static ColumnCategory: string = "Category";
        public static ColumnSeries: string = "Series";
        public static ColumnX: string = "X";
        public static ColumnY: string = "Y";
        public static ColumnSize: string = "Size";
        public static ColumnGradient: string = "Gradient";
        public static ColumnColorFill: string = "ColorFill";
        public static ColumnShape: string = "Shape";
        public static ColumnImage: string = "Image";
        public static ColumnRotation: string = "Rotation";
        public static ColumnBackdrop: string = "Backdrop";
        public static ColumnXStart: string = "X Start";
        public static ColumnXEnd: string = "X End";
        public static ColumnYStart: string = "Y Start";
        public static ColumnYEnd: string = "Y End";

        public static capabilities: VisualCapabilities = {
            dataRoles: [
                {
                    name: EnhancedScatterChart.ColumnCategory,
                    kind: VisualDataRoleKind.Grouping,
                    displayName: data.createDisplayNameGetter("Role_DisplayName_Details"),
                }, {
                    name: EnhancedScatterChart.ColumnSeries,
                    kind: VisualDataRoleKind.Grouping,
                    displayName: data.createDisplayNameGetter("Role_DisplayName_Legend"),
                }, {
                    name: EnhancedScatterChart.ColumnX,
                    kind: VisualDataRoleKind.Measure,
                    displayName: data.createDisplayNameGetter("Role_DisplayName_X"),
                }, {
                    name: EnhancedScatterChart.ColumnY,
                    kind: VisualDataRoleKind.Measure,
                    displayName: data.createDisplayNameGetter("Role_DisplayName_Y"),
                }, {
                    name: EnhancedScatterChart.ColumnSize,
                    kind: VisualDataRoleKind.Measure,
                    displayName: data.createDisplayNameGetter("Role_DisplayName_Size"),
                }, {
                    name: EnhancedScatterChart.ColumnGradient,
                    kind: VisualDataRoleKind.Measure,
                    displayName: data.createDisplayNameGetter("Role_DisplayName_Gradient"),
                }, {
                    name: EnhancedScatterChart.ColumnColorFill,
                    kind: VisualDataRoleKind.Grouping,
                    displayName: "Customized Color",
                }, {
                    name: EnhancedScatterChart.ColumnShape,
                    kind: VisualDataRoleKind.Measure,
                    displayName: "Shape",
                }, {
                    name: EnhancedScatterChart.ColumnImage,
                    kind: VisualDataRoleKind.Grouping,
                    displayName: "Image",
                }, {
                    name: EnhancedScatterChart.ColumnRotation,
                    kind: VisualDataRoleKind.Measure,
                    displayName: "Rotation",
                }, {
                    name: EnhancedScatterChart.ColumnBackdrop,
                    kind: VisualDataRoleKind.Grouping,
                    displayName: "Backdrop",
                }, {
                    name: EnhancedScatterChart.ColumnXStart,
                    kind: VisualDataRoleKind.Measure,
                    displayName: "X Start",
                }, {
                    name: EnhancedScatterChart.ColumnXEnd,
                    kind: VisualDataRoleKind.Measure,
                    displayName: "X End",
                }, {
                    name: EnhancedScatterChart.ColumnYStart,
                    kind: VisualDataRoleKind.Measure,
                    displayName: "Y Start",
                }, {
                    name: EnhancedScatterChart.ColumnYEnd,
                    kind: VisualDataRoleKind.Measure,
                    displayName: "Y End",
                }
            ],
            dataViewMappings: [{
                conditions: [{
                    [EnhancedScatterChart.ColumnCategory]: { max: 1 },
                    [EnhancedScatterChart.ColumnSeries]: { max: 1 },
                    [EnhancedScatterChart.ColumnX]: { max: 1 },
                    [EnhancedScatterChart.ColumnY]: { max: 1 },
                    [EnhancedScatterChart.ColumnSize]: { max: 1 },
                    [EnhancedScatterChart.ColumnGradient]: { max: 0 },
                    [EnhancedScatterChart.ColumnColorFill]: { max: 1 },
                    [EnhancedScatterChart.ColumnShape]: { max: 1 },
                    [EnhancedScatterChart.ColumnImage]: { max: 0 },
                    [EnhancedScatterChart.ColumnRotation]: { max: 1 },
                    [EnhancedScatterChart.ColumnBackdrop]: { max: 1 },
                    [EnhancedScatterChart.ColumnXStart]: { max: 1 },
                    [EnhancedScatterChart.ColumnXEnd]: { max: 1 },
                    [EnhancedScatterChart.ColumnYStart]: { max: 1 },
                    [EnhancedScatterChart.ColumnYEnd]: { max: 1 }
                }, {
                    [EnhancedScatterChart.ColumnCategory]: { max: 1 },
                    [EnhancedScatterChart.ColumnSeries]: { max: 0 },
                    [EnhancedScatterChart.ColumnX]: { max: 1 },
                    [EnhancedScatterChart.ColumnY]: { max: 1 },
                    [EnhancedScatterChart.ColumnSize]: { max: 1 },
                    [EnhancedScatterChart.ColumnGradient]: { max: 1 },
                    [EnhancedScatterChart.ColumnColorFill]: { max: 1 },
                    [EnhancedScatterChart.ColumnShape]: { max: 1 },
                    [EnhancedScatterChart.ColumnImage]: { max: 0 },
                    [EnhancedScatterChart.ColumnRotation]: { max: 1 },
                    [EnhancedScatterChart.ColumnBackdrop]: { max: 1 },
                    [EnhancedScatterChart.ColumnXStart]: { max: 1 },
                    [EnhancedScatterChart.ColumnXEnd]: { max: 1 },
                    [EnhancedScatterChart.ColumnYStart]: { max: 1 },
                    [EnhancedScatterChart.ColumnYEnd]: { max: 1 }
                }, {
                    [EnhancedScatterChart.ColumnCategory]: { max: 1 },
                    [EnhancedScatterChart.ColumnSeries]: { max: 1 },
                    [EnhancedScatterChart.ColumnX]: { max: 1 },
                    [EnhancedScatterChart.ColumnY]: { max: 1 },
                    [EnhancedScatterChart.ColumnSize]: { max: 1 },
                    [EnhancedScatterChart.ColumnGradient]: { max: 0 },
                    [EnhancedScatterChart.ColumnColorFill]: { max: 0 },
                    [EnhancedScatterChart.ColumnShape]: { max: 0 },
                    [EnhancedScatterChart.ColumnImage]: { max: 1 },
                    [EnhancedScatterChart.ColumnRotation]: { max: 1 },
                    [EnhancedScatterChart.ColumnBackdrop]: { max: 1 },
                    [EnhancedScatterChart.ColumnXStart]: { max: 1 },
                    [EnhancedScatterChart.ColumnXEnd]: { max: 1 },
                    [EnhancedScatterChart.ColumnYStart]: { max: 1 },
                    [EnhancedScatterChart.ColumnYEnd]: { max: 1 }
                }, {
                    [EnhancedScatterChart.ColumnCategory]: { max: 1 },
                    [EnhancedScatterChart.ColumnSeries]: { max: 0 },
                    [EnhancedScatterChart.ColumnX]: { max: 1 },
                    [EnhancedScatterChart.ColumnY]: { max: 1 },
                    [EnhancedScatterChart.ColumnSize]: { max: 1 },
                    [EnhancedScatterChart.ColumnGradient]: { max: 1 },
                    [EnhancedScatterChart.ColumnColorFill]: { max: 0 },
                    [EnhancedScatterChart.ColumnShape]: { max: 0 },
                    [EnhancedScatterChart.ColumnImage]: { max: 1 },
                    [EnhancedScatterChart.ColumnRotation]: { max: 1 },
                    [EnhancedScatterChart.ColumnBackdrop]: { max: 1 },
                    [EnhancedScatterChart.ColumnXStart]: { max: 1 },
                    [EnhancedScatterChart.ColumnXEnd]: { max: 1 },
                    [EnhancedScatterChart.ColumnYStart]: { max: 1 },
                    [EnhancedScatterChart.ColumnYEnd]: { max: 1 }
                }],
                categorical: {
                    categories: {
                        for: { in: EnhancedScatterChart.ColumnCategory },
                        dataReductionAlgorithm: { sample: {} }
                    },
                    values: {
                        group: {
                            by: EnhancedScatterChart.ColumnSeries,
                            select: [
                                { bind: { to: EnhancedScatterChart.ColumnX } },
                                { bind: { to: EnhancedScatterChart.ColumnY } },
                                { bind: { to: EnhancedScatterChart.ColumnSize } },
                                { bind: { to: EnhancedScatterChart.ColumnGradient } },
                                { bind: { to: EnhancedScatterChart.ColumnColorFill } },
                                { bind: { to: EnhancedScatterChart.ColumnShape } },
                                { bind: { to: EnhancedScatterChart.ColumnImage } },
                                { bind: { to: EnhancedScatterChart.ColumnRotation } },
                                { bind: { to: EnhancedScatterChart.ColumnBackdrop } },
                                { bind: { to: EnhancedScatterChart.ColumnXStart } },
                                { bind: { to: EnhancedScatterChart.ColumnXEnd } },
                                { bind: { to: EnhancedScatterChart.ColumnYStart } },
                                { bind: { to: EnhancedScatterChart.ColumnYEnd } },
                            ],
                            dataReductionAlgorithm: { top: {} }
                        }
                    },
                    rowCount: { preferred: { min: 2 } }
                },
            }],

            objects: {
                dataPoint: {
                    displayName: data.createDisplayNameGetter("Visual_DataPoint"),
                    properties: {
                        defaultColor: {
                            displayName: data.createDisplayNameGetter("Visual_DefaultColor"),
                            type: { fill: { solid: { color: true } } }
                        },
                        showAllDataPoints: {
                            displayName: data.createDisplayNameGetter("Visual_DataPoint_Show_All"),
                            type: { bool: true }
                        },
                        useShape: {
                            displayName: data.createDisplayNameGetter("Visual_UseImage"),
                            type: { bool: true }
                        },
                        fill: {
                            displayName: data.createDisplayNameGetter("Visual_Fill"),
                            type: { fill: { solid: { color: true } } }
                        },
                        fillRule: {
                            displayName: data.createDisplayNameGetter("Visual_Gradient"),
                            type: { fillRule: {} },
                            rule: {
                                inputRole: EnhancedScatterChart.ColumnGradient,
                                output: {
                                    property: "fill",
                                    selector: [EnhancedScatterChart.ColumnCategory],
                                },
                            }
                        }
                    }
                },
                general: {
                    displayName: data.createDisplayNameGetter("Visual_General"),
                    properties: {
                        formatString: {
                            type: { formatting: { formatString: true } },
                        },
                    },
                },
                categoryAxis: {
                    displayName: data.createDisplayNameGetter("Visual_XAxis"),
                    properties: {
                        show: {
                            displayName: data.createDisplayNameGetter("Visual_Show"),
                            type: { bool: true }
                        },
                        axisScale: {
                            displayName: data.createDisplayNameGetter("Visual_Axis_Scale"),
                            type: { formatting: { axisScale: true } }
                        },
                        start: {
                            displayName: data.createDisplayNameGetter("Visual_Axis_Start"),
                            type: { numeric: true }
                        },
                        end: {
                            displayName: data.createDisplayNameGetter("Visual_Axis_End"),
                            type: { numeric: true }
                        },
                        showAxisTitle: {
                            displayName: data.createDisplayNameGetter("Visual_Axis_Title"),
                            type: { bool: true }
                        },
                        axisStyle: {
                            displayName: data.createDisplayNameGetter("Visual_Axis_Style"),
                            type: { formatting: { axisStyle: true } }
                        },
                        axisColor: {
                            displayName: "Color",
                            type: { fill: { solid: { color: true } } }
                        },
                        labelDisplayUnits: {
                            displayName: "Display Units",
                            type: { formatting: { labelDisplayUnits: true } },
                        },
                    }
                },
                valueAxis: {
                    displayName: data.createDisplayNameGetter("Visual_YAxis"),
                    properties: {
                        show: {
                            displayName: data.createDisplayNameGetter("Visual_Show"),
                            type: { bool: true }
                        },
                        position: {
                            displayName: data.createDisplayNameGetter("Visual_YAxis_Position"),
                            type: { formatting: { yAxisPosition: true } }
                        },
                        axisScale: {
                            displayName: data.createDisplayNameGetter("Visual_Axis_Scale"),
                            type: { formatting: { axisScale: true } }
                        },
                        start: {
                            displayName: data.createDisplayNameGetter("Visual_Axis_Start"),
                            type: { numeric: true }
                        },
                        end: {
                            displayName: data.createDisplayNameGetter("Visual_Axis_End"),
                            type: { numeric: true }
                        },
                        showAxisTitle: {
                            displayName: data.createDisplayNameGetter("Visual_Axis_Title"),
                            type: { bool: true }
                        },
                        axisStyle: {
                            displayName: data.createDisplayNameGetter("Visual_Axis_Style"),
                            type: { formatting: { axisStyle: true } }
                        },
                        axisColor: {
                            displayName: "Color",
                            type: { fill: { solid: { color: true } } }
                        },
                        labelDisplayUnits: {
                            displayName: "Display Units",
                            type: { formatting: { labelDisplayUnits: true } },
                        }
                    }
                },
                legend: {
                    displayName: data.createDisplayNameGetter("Visual_Legend"),
                    properties: {
                        show: {
                            displayName: data.createDisplayNameGetter("Visual_Show"),
                            type: { bool: true }
                        },
                        position: {
                            displayName: data.createDisplayNameGetter("Visual_LegendPosition"),
                            description: data.createDisplayNameGetter("Visual_LegendPositionDescription"),
                            type: { enumeration: legendPosition.type },
                        },
                        showTitle: {
                            displayName: data.createDisplayNameGetter("Visual_LegendShowTitle"),
                            description: data.createDisplayNameGetter("Visual_LegendShowTitleDescription"),
                            type: { bool: true }
                        },
                        titleText: {
                            displayName: "Legend Name",
                            description: data.createDisplayNameGetter("Visual_LegendNameDescription"),
                            type: { text: true }
                        },
                        labelColor: {
                            displayName: "Color",
                            type: { fill: { solid: { color: true } } }
                        },
                        fontSize: {
                            displayName: "Text Size",
                            type: { formatting: { fontSize: true } }
                        }
                    }
                },
                categoryLabels: {
                    displayName: data.createDisplayNameGetter("Visual_CategoryLabels"),
                    properties: {
                        show: {
                            displayName: data.createDisplayNameGetter("Visual_Show"),
                            type: { bool: true }
                        },
                        color: {
                            displayName: data.createDisplayNameGetter("Visual_LabelsFill"),
                            type: { fill: { solid: { color: true } } }
                        },
                        fontSize: {
                            displayName: "Text Size",
                            type: { formatting: { fontSize: true } }
                        },
                    },
                },
                fillPoint: {
                    displayName: data.createDisplayNameGetter("Visual_FillPoint"),
                    properties: {
                        show: {
                            displayName: data.createDisplayNameGetter("Visual_Fill"),
                            type: { bool: true }
                        },
                    },
                },
                backdrop: {
                    displayName: "Backdrop",
                    properties: {
                        show: {
                            displayName: data.createDisplayNameGetter("Visual_Show"),
                            type: { bool: true }
                        },
                        url: {
                            displayName: "Image URL",
                            type: { text: true }
                        },
                    },
                },
                crosshair: {
                    displayName: "Crosshair",
                    properties: {
                        show: {
                            displayName: "Crosshair",
                            type: { bool: true }
                        },
                    },
                },
                outline: {
                    displayName: "Outline",
                    properties: {
                        show: {
                            displayName: data.createDisplayNameGetter("Visual_Outline"),
                            type: { bool: true }
                        }
                    }
                }
            }
        };

        private static substractMargin(viewport: IViewport, margin: IMargin): IViewport {
            return {
                width: Math.max(viewport.width - (margin.left + margin.right), 0),
                height: Math.max(viewport.height - (margin.top + margin.bottom), 0)
            };
        }

        private static getCustomSymbolType(shape: any): (number) => string {
            let customSymbolTypes = d3.map({
                "circle": (size) => {
                    let r = Math.sqrt(size / Math.PI);
                    return "M0," + r + "A" + r + "," + r + " 0 1,1 0," + (-r) + "A" + r + "," + r + " 0 1,1 0," + r + "Z";
                },

                "cross": function (size) {
                    let r = Math.sqrt(size / 5) / 2;
                    return "M" + -3 * r + "," + -r
                        + "H" + -r + "V" + -3 * r + "H" + r + "V" + -r + "H" + 3 * r + "V" + r + "H" + r + "V" + 3 * r + "H" + -r + "V" + r + "H" + -3 * r + "Z";
                },

                "diamond": (size) => {
                    let ry = Math.sqrt(size / (2 * Math.tan(Math.PI / 6))),
                        rx = ry * Math.tan(Math.PI / 6);
                    return "M0," + -ry
                        + "L" + rx + ",0"
                        + " 0," + ry
                        + " " + -rx + ",0"
                        + "Z";
                },

                "square": (size) => {
                    let r = Math.sqrt(size) / 2;
                    return "M" + -r + "," + -r
                        + "L" + r + "," + -r
                        + " " + r + "," + r
                        + " " + -r + "," + r
                        + "Z";
                },

                "triangle-up": (size) => {
                    let rx = Math.sqrt(size / Math.sqrt(3)),
                        ry = rx * Math.sqrt(3) / 2;
                    return "M0," + -ry
                        + "L" + rx + "," + ry
                        + " " + -rx + "," + ry
                        + "Z";
                },

                "triangle-down": (size) => {
                    let rx = Math.sqrt(size / Math.sqrt(3)),
                        ry = rx * Math.sqrt(3) / 2;
                    return "M0," + ry
                        + "L" + rx + "," + -ry
                        + " " + -rx + "," + -ry
                        + "Z";
                },

                "star": (size) => {
                    let outerRadius = Math.sqrt(size / 2);
                    let innerRadius = Math.sqrt(size / 10);
                    let results = "";
                    let angle = Math.PI / 5;
                    for (let i = 0; i < 10; i++) {
                        // Use outer or inner radius depending on what iteration we are in.
                        let r = (i & 1) === 0 ? outerRadius : innerRadius;
                        let currX = Math.cos(i * angle) * r;
                        let currY = Math.sin(i * angle) * r;
                        // Our first time we simply append the coordinates, subsequet times
                        // we append a ", " to distinguish each coordinate pair.
                        if (i === 0) {
                            results = "M" + currX + "," + currY + "L";
                        } else {
                            results += " " + currX + "," + currY;
                        }
                    }
                    return results + "Z";
                },

                "hexagon": (size) => {
                    let r = Math.sqrt(size / (6 * Math.sqrt(3)));
                    let r2 = Math.sqrt(size / (2 * Math.sqrt(3)));

                    return "M0," + (2 * r) + "L" + (-r2) + "," + r + " " + (-r2) + "," + (-r) + " 0," + (-2 * r) + " " + r2 + "," + (-r) + " " + r2 + "," + r + "Z";
                },

                "x": (size) => {
                    let r = Math.sqrt(size / 10);
                    return "M0," + r + "L" + (-r) + "," + 2 * r + " " + (-2 * r) + "," + r + " " + (-r) + ",0 " + (-2 * r) + "," + (-r) + " " + (-r) + "," + (-2 * r) + " 0," + (-r) + " " + r + "," + (-2 * r) + " " + (2 * r) + "," + (-r) + " " + r + ",0 " + (2 * r) + "," + r + " " + r + "," + (2 * r) + "Z";
                },

                "uparrow": (size) => {
                    let r = Math.sqrt(size / 12);
                    return "M" + r + "," + (3 * r) + "L" + (-r) + "," + (3 * r) + " " + (-r) + "," + (-r) + " " + (-2 * r) + "," + (-r) + " 0," + (-3 * r) + " " + (2 * r) + "," + (-r) + " " + r + "," + (-r) + "Z";
                },

                "downarrow": (size) => {
                    let r = Math.sqrt(size / 12);
                    return "M0," + (3 * r) + "L" + (-2 * r) + "," + r + " " + (-r) + "," + r + " " + (-r) + "," + (-3 * r) + " " + r + "," + (-3 * r) + " " + r + "," + r + " " + (2 * r) + "," + r + "Z";
                }
            });

            let defaultValue = customSymbolTypes.entries()[0].value;
            if (!shape) {
                return defaultValue;
            } else if (isNaN(shape)) {
                return customSymbolTypes[shape && shape.toString().toLowerCase()] || defaultValue;
            } else {
                let result = customSymbolTypes.entries()[Math.floor(shape)];
                return result ? result.value : defaultValue;
            }
        }

        public init(options: VisualInitOptions): void {
            this.options = options;
            this.animator = new BaseAnimator();
            this.behavior = new CartesianChartBehavior([new ScatterChartWebBehavior()]);
            let element = this.element = options.element;
            this.viewport = _.clone(options.viewport);
            this.style = options.style;
            this.hostServices = options.host;
            this.colors = this.style.colorPalette.dataColors;
            this.interactivity = options.interactivity;
            this.margin = {
                top: 1,
                right: 1,
                bottom: 1,
                left: 1
            };

            this.yAxisOrientation = yAxisPosition.left;
            this.adjustMargins();

            let showLinesOnX = this.scrollY = true;

            let showLinesOnY = this.scrollX = true;

            let svg = this.svg = d3.select(element.get(0))
                .append("svg")
                .style("position", "absolute")
                .classed(EnhancedScatterChart.ClassName, true);

            let axisGraphicsContext = this.axisGraphicsContext = svg.append("g")
                .classed(this.AxisGraphicsContextClassName, true);

            this.svgScrollable = svg.append("svg")
                .classed("svgScrollable", true)
                .style("overflow", "hidden");

            let axisGraphicsContextScrollable = this.axisGraphicsContextScrollable = this.svgScrollable.append("g")
                .classed(this.AxisGraphicsContextClassName, true);

            this.clearCatcher = appendClearCatcher(this.axisGraphicsContextScrollable);
            let axisGroup = showLinesOnX ? axisGraphicsContextScrollable : axisGraphicsContext;

            this.backgroundGraphicsContext = axisGraphicsContext.append("svg:image");
            this.xAxisGraphicsContext = showLinesOnX ? axisGraphicsContext.append("g").attr("class", "x axis") : axisGraphicsContextScrollable.append("g").attr("class", "x axis");
            this.y1AxisGraphicsContext = axisGroup.append("g").attr("class", "y axis");

            this.xAxisGraphicsContext.classed("showLinesOnAxis", showLinesOnX);
            this.y1AxisGraphicsContext.classed("showLinesOnAxis", showLinesOnY);

            this.xAxisGraphicsContext.classed("hideLinesOnAxis", !showLinesOnX);
            this.y1AxisGraphicsContext.classed("hideLinesOnAxis", !showLinesOnY);
            this.interactivityService = createInteractivityService(this.hostServices);

            this.legend = createLegend(element, this.interactivity && this.interactivity.isInteractiveLegend, this.interactivityService, true);

            this.mainGraphicsG = this.axisGraphicsContextScrollable
                .append("g")
                .classed(EnhancedScatterChart.MainGraphicsContextClassName, true);

            this.mainGraphicsSVGSelection = this.mainGraphicsG.append("svg");
            this.mainGraphicsContext = this.mainGraphicsSVGSelection.append("g");

            this.svgDefaultImage = "";
            this.keyArray = [];
        }

        private adjustMargins(): void {
            // Adjust margins if ticks are not going to be shown on either axis
            let xAxis = this.element.find(".x.axis");

            if (AxisHelper.getRecommendedNumberOfTicksForXAxis(this.viewportIn.width) === 0
                && AxisHelper.getRecommendedNumberOfTicksForYAxis(this.viewportIn.height) === 0) {
                this.margin = {
                    top: 0,
                    right: 0,
                    bottom: 0,
                    left: 0
                };
                xAxis.hide();
            } else {
                xAxis.show();
            }
        }

        private getValueAxisProperties(dataViewMetadata: DataViewMetadata, axisTitleOnByDefault?: boolean): DataViewObject {
            let toReturn: DataViewObject = {};
            if (!dataViewMetadata)
                return toReturn;

            let objects = dataViewMetadata.objects;

            if (objects) {
                let valueAxisObject = objects["valueAxis"];
                if (valueAxisObject) {
                    toReturn = {
                        show: valueAxisObject["show"],
                        position: valueAxisObject["position"],
                        axisScale: valueAxisObject["axisScale"],
                        start: valueAxisObject["start"],
                        end: valueAxisObject["end"],
                        showAxisTitle: valueAxisObject["showAxisTitle"] == null ? axisTitleOnByDefault : valueAxisObject["showAxisTitle"],
                        axisStyle: valueAxisObject["axisStyle"],
                        axisColor: valueAxisObject["axisColor"],
                        secShow: valueAxisObject["secShow"],
                        secPosition: valueAxisObject["secPosition"],
                        secAxisScale: valueAxisObject["secAxisScale"],
                        secStart: valueAxisObject["secStart"],
                        secEnd: valueAxisObject["secEnd"],
                        secShowAxisTitle: valueAxisObject["secShowAxisTitle"],
                        secAxisStyle: valueAxisObject["secAxisStyle"],
                        labelDisplayUnits: valueAxisObject["labelDisplayUnits"],
                    };
                }
            }
            return toReturn;
        }

        private getCategoryAxisProperties(dataViewMetadata: DataViewMetadata, axisTitleOnByDefault?: boolean): DataViewObject {
            let toReturn: DataViewObject = {};
            if (!dataViewMetadata)
                return toReturn;

            let objects = dataViewMetadata.objects;

            if (objects) {
                let categoryAxisObject = objects["categoryAxis"];

                if (categoryAxisObject) {
                    toReturn = {
                        show: categoryAxisObject["show"],
                        axisType: categoryAxisObject["axisType"],
                        axisScale: categoryAxisObject["axisScale"],
                        axisColor: categoryAxisObject["axisColor"],
                        start: categoryAxisObject["start"],
                        end: categoryAxisObject["end"],
                        showAxisTitle: categoryAxisObject["showAxisTitle"] == null ? axisTitleOnByDefault : categoryAxisObject["showAxisTitle"],
                        axisStyle: categoryAxisObject["axisStyle"],
                        labelDisplayUnits: categoryAxisObject["labelDisplayUnits"]
                    };
                }
            }

            return toReturn;
        }

        public static converter(
            dataView: DataView,
            colorPalette: IDataColorPalette,
            interactivityService?: IInteractivityService,
            categoryAxisProperties?: DataViewObject,
            valueAxisProperties?: DataViewObject): EnhancedScatterChartData {

            if (!dataView) {
                return EnhancedScatterChart.getDefaultData();
            }

            let categoryValues: any[],
                categoryFormatter: IValueFormatter,
                categoryObjects: DataViewObjects[],
                categoryIdentities: DataViewScopeIdentity[],
                categoryQueryName: string,
                dataViewCategorical: DataViewCategorical = dataView.categorical,
                dataViewMetadata: DataViewMetadata = dataView.metadata,
                categories: DataViewCategoryColumn[] = dataViewCategorical.categories || [],
                dataValues: DataViewValueColumns = dataViewCategorical.values,
                hasDynamicSeries: boolean = !!dataValues.source,
                grouped: DataViewValueColumnGroup[] = dataValues.grouped(),
                dvSource = dataValues.source,
                scatterMetadata = EnhancedScatterChart.getMetadata(categories, grouped, dvSource),
                categoryIndex: number = scatterMetadata.idx.category,
                useShape: boolean = scatterMetadata.idx.image >= 0,
                useCustomColor: boolean = scatterMetadata.idx.colorFill >= 0;

            if (dataViewCategorical.categories &&
                dataViewCategorical.categories.length > 0 &&
                dataViewCategorical.categories[categoryIndex]) {

                let mainCategory: DataViewCategoryColumn = dataViewCategorical.categories[categoryIndex];

                categoryValues = mainCategory.values;

                categoryFormatter = valueFormatter.create({
                    format: valueFormatter.getFormatString(
                        mainCategory.source,
                        scatterChartProps.general.formatString),
                    value: categoryValues[0],
                    value2: categoryValues[categoryValues.length - 1]
                });

                categoryIdentities = mainCategory.identity;
                categoryObjects = mainCategory.objects;
                categoryQueryName = mainCategory.source ? mainCategory.source.queryName : null;
            }
            else {
                categoryValues = [null];
                // creating default formatter for null value (to get the right string of empty value from the locale)
                categoryFormatter = valueFormatter.createDefaultFormatter(null);
            }

            let dataLabelsSettings = dataLabelUtils.getDefaultPointLabelSettings(),
                fillPoint = false,
                backdrop = { show: false, url: "" },
                crosshair = false,
                outline = false,
                defaultDataPointColor = "",
                showAllDataPoints = true;

            if (dataViewMetadata && dataViewMetadata.objects) {
                let objects = dataViewMetadata.objects;

                defaultDataPointColor = DataViewObjects.getFillColor(objects, columnChartProps.dataPoint.defaultColor);
                showAllDataPoints = DataViewObjects.getValue<boolean>(objects, columnChartProps.dataPoint.showAllDataPoints);

                let labelsObj = objects["categoryLabels"];
                if (labelsObj) {
                    dataLabelsSettings.show = (labelsObj["show"] !== undefined)
                        ? <boolean>labelsObj["show"] : dataLabelsSettings.show;

                    dataLabelsSettings.fontSize = (labelsObj["fontSize"] !== undefined)
                        ? <number>labelsObj["fontSize"] : dataLabelsSettings.fontSize;

                    if (labelsObj["color"] !== undefined) {
                        dataLabelsSettings.labelColor = (<Fill>labelsObj["color"]).solid.color;
                    }
                }

                fillPoint = DataViewObjects.getValue<boolean>(objects, scatterChartProps.fillPoint.show, fillPoint);

                let backdropObject = objects["backdrop"];
                if (backdropObject !== undefined) {
                    backdrop.show = <boolean>backdropObject["show"];
                    if (backdrop.show) {
                        backdrop.url = <string>backdropObject["url"];
                    }
                }

                let crosshairObject = objects["crosshair"];
                if (crosshairObject !== undefined) {
                    crosshair = <boolean>crosshairObject["show"];
                }

                let outlineObject = objects["outline"];
                if (outlineObject !== undefined) {
                    outline = <boolean>outlineObject["show"];
                }
            }

            let dataPoints = EnhancedScatterChart.createDataPoints(
                dataValues,
                scatterMetadata,
                categories,
                categoryValues,
                categoryFormatter,
                categoryIdentities,
                categoryObjects,
                colorPalette,
                hasDynamicSeries,
                dataLabelsSettings,
                defaultDataPointColor,
                categoryQueryName);

            if (interactivityService) {
                interactivityService.applySelectionStateToData(dataPoints);
            }

            let legendItems = hasDynamicSeries
                ? EnhancedScatterChart.createSeriesLegend(dataValues, colorPalette, dataValues, valueFormatter.getFormatString(dvSource, scatterChartProps.general.formatString), defaultDataPointColor)
                : [];

            let legendTitle = dataValues && dvSource ? dvSource.displayName : "";
            if (!legendTitle) {
                legendTitle = categories &&
                    categories[categoryIndex] &&
                    categories[categoryIndex].source &&
                    categories[categoryIndex].source.displayName
                    ? categories[categoryIndex].source.displayName : "";
            }

            let legendData = { title: legendTitle, dataPoints: legendItems };

            let sizeRange = EnhancedScatterChart.getSizeRangeForGroups(grouped, scatterMetadata.idx.size);

            if (categoryAxisProperties && categoryAxisProperties["showAxisTitle"] !== null && categoryAxisProperties["showAxisTitle"] === false) {
                scatterMetadata.axesLabels.x = null;
            }
            if (valueAxisProperties && valueAxisProperties["showAxisTitle"] !== null && valueAxisProperties["showAxisTitle"] === false) {
                scatterMetadata.axesLabels.y = null;
            }

            if (dataPoints && dataPoints[0]) {
                let point = dataPoints[0];
                if (point.backdrop != null) {
                    backdrop.show = true;
                    backdrop.url = point.backdrop;
                }
                if (point.xStart != null) {
                    categoryAxisProperties["start"] = point.xStart;
                }
                if (point.xEnd != null) {
                    categoryAxisProperties["end"] = point.xEnd;
                }
                if (point.yStart != null) {
                    valueAxisProperties["start"] = point.yStart;
                }
                if (point.yEnd != null) {
                    valueAxisProperties["end"] = point.yEnd;
                }
            }

            return {
                xCol: scatterMetadata.cols.x,
                yCol: scatterMetadata.cols.y,
                dataPoints: dataPoints,
                legendData: legendData,
                axesLabels: scatterMetadata.axesLabels,
                selectedIds: [],
                size: scatterMetadata.cols.size,
                sizeRange: sizeRange,
                dataLabelsSettings: dataLabelsSettings,
                defaultDataPointColor: defaultDataPointColor,
                hasDynamicSeries: hasDynamicSeries,
                showAllDataPoints: showAllDataPoints,
                fillPoint: fillPoint,
                useShape: useShape,
                useCustomColor: useCustomColor,
                backdrop: backdrop,
                crosshair: crosshair,
                outline: outline
            };
        }

        private static createSeriesLegend(
            dataValues: DataViewValueColumns,
            colorPalette: IDataColorPalette,
            categorical: DataViewValueColumns,
            formatString: string,
            defaultDataPointColor: string): LegendDataPoint[] {

            let grouped = dataValues.grouped();
            let colorHelper = new ColorHelper(colorPalette, scatterChartProps.dataPoint.fill, defaultDataPointColor);

            let legendItems: LegendDataPoint[] = [];
            for (let i = 0, len = grouped.length; i < len; i++) {
                let grouping = grouped[i];
                let color = colorHelper.getColorForSeriesValue(grouping.objects, dataValues.identityFields, grouping.name);

                legendItems.push({
                    color: color,
                    icon: LegendIcon.Circle,
                    label: valueFormatter.format(grouping.name, formatString),
                    identity: grouping.identity ? SelectionId.createWithId(grouping.identity) : SelectionId.createNull(),
                    selected: false,
                });
            }

            return legendItems;
        }

        private static getSizeRangeForGroups(
            dataViewValueGroups: DataViewValueColumnGroup[],
            sizeColumnIndex: number): NumberRange {

            let result: NumberRange = {};
            if (dataViewValueGroups) {
                dataViewValueGroups.forEach((group) => {
                    let sizeColumn = ScatterChart.getMeasureValue(sizeColumnIndex, group.values);
                    let currentRange: NumberRange = AxisHelper.getRangeForColumn(sizeColumn);
                    if (result.min == null || result.min > currentRange.min) {
                        result.min = currentRange.min;
                    }
                    if (result.max == null || result.max < currentRange.max) {
                        result.max = currentRange.max;
                    }
                });
            }

            return result;
        }

        private static getMetadata(
            categories: DataViewCategoryColumn[],
            grouped: DataViewValueColumnGroup[],
            source: DataViewMetadataColumn): ScatterChartMeasureMetadata {

            let categoryIndex: number = getCategoryIndexOfRole(categories, EnhancedScatterChart.ColumnCategory),
                colorFillIndex: number = getCategoryIndexOfRole(categories, EnhancedScatterChart.ColumnColorFill),
                imageIndex: number = getCategoryIndexOfRole(categories, EnhancedScatterChart.ColumnImage),
                backdropIndex: number = getCategoryIndexOfRole(categories, EnhancedScatterChart.ColumnBackdrop),
                xIndex: number = getMeasureIndexOfRole(grouped, EnhancedScatterChart.ColumnX),
                yIndex: number = getMeasureIndexOfRole(grouped, EnhancedScatterChart.ColumnY),
                sizeIndex: number = getMeasureIndexOfRole(grouped, EnhancedScatterChart.ColumnSize),
                shapeIndex: number = getMeasureIndexOfRole(grouped, EnhancedScatterChart.ColumnShape),
                rotationIndex: number = getMeasureIndexOfRole(grouped, EnhancedScatterChart.ColumnRotation),
                xStartIndex: number = getMeasureIndexOfRole(grouped, EnhancedScatterChart.ColumnXStart),
                xEndIndex: number = getMeasureIndexOfRole(grouped, EnhancedScatterChart.ColumnXEnd),
                yStartIndex: number = getMeasureIndexOfRole(grouped, EnhancedScatterChart.ColumnYStart),
                yEndIndex: number = getMeasureIndexOfRole(grouped, EnhancedScatterChart.ColumnYEnd),
                xCol: DataViewMetadataColumn,
                yCol: DataViewMetadataColumn,
                sizeCol: DataViewMetadataColumn,
                xAxisLabel: string = "",
                yAxisLabel: string = "";

            if (grouped && grouped.length) {
                let firstGroup: DataViewValueColumnGroup = grouped[0];

                if (xIndex >= 0) {
                    xCol = firstGroup.values[xIndex].source;
                    xAxisLabel = firstGroup.values[xIndex].source.displayName;
                }

                if (yIndex >= 0) {
                    yCol = firstGroup.values[yIndex].source;
                    yAxisLabel = firstGroup.values[yIndex].source.displayName;
                }

                if (sizeIndex >= 0) {
                    sizeCol = firstGroup.values[sizeIndex].source;
                }
            }

            return {
                idx: {
                    category: categoryIndex,
                    x: xIndex,
                    y: yIndex,
                    size: sizeIndex,
                    colorFill: colorFillIndex,
                    shape: shapeIndex,
                    image: imageIndex,
                    rotation: rotationIndex,
                    backdrop: backdropIndex,
                    xStart: xStartIndex,
                    xEnd: xEndIndex,
                    yStart: yStartIndex,
                    yEnd: yEndIndex
                },
                cols: {
                    x: xCol,
                    y: yCol,
                    size: sizeCol
                },
                axesLabels: {
                    x: xAxisLabel,
                    y: yAxisLabel
                }
            };
        }

        public static createLazyFormattedCategory(formatter: IValueFormatter, value: string): Lazy<string> {
            return new Lazy(() => formatter.format(value));
        }

        private static createDataPoints(
            dataValues: DataViewValueColumns,
            metadata: ScatterChartMeasureMetadata,
            categories: DataViewCategoryColumn[],
            categoryValues: any[],
            categoryFormatter: IValueFormatter,
            categoryIdentities: DataViewScopeIdentity[],
            categoryObjects: DataViewObjects[],
            colorPalette: IDataColorPalette,
            hasDynamicSeries: boolean,
            labelSettings: PointDataLabelsSettings,
            defaultDataPointColor?: string,
            categoryQueryName?: string): EnhancedScatterChartDataPoint[] {

            let dataPoints: EnhancedScatterChartDataPoint[] = [],
                indicies = metadata.idx,
                formatStringProp = scatterChartProps.general.formatString,
                dataValueSource = dataValues.source,
                grouped = dataValues.grouped(),
                fontSizeInPx: string = PixelConverter.fromPoint(labelSettings.fontSize);

            let colorHelper = new ColorHelper(colorPalette, scatterChartProps.dataPoint.fill, defaultDataPointColor);

            for (let categoryIdx = 0, ilen = categoryValues.length; categoryIdx < ilen; categoryIdx++) {
                let categoryValue = categoryValues[categoryIdx];

                for (let seriesIdx = 0, len = grouped.length; seriesIdx < len; seriesIdx++) {
                    let measureColorFill: DataViewCategoricalColumn = categories[indicies.colorFill],
                        measureImage: DataViewCategoricalColumn = categories[indicies.image],
                        measureBackdrop: DataViewCategoricalColumn = categories[indicies.backdrop];

                    let grouping: DataViewValueColumnGroup = grouped[seriesIdx],
                        seriesValues: DataViewValueColumn[] = grouping.values,
                        measureX: DataViewValueColumn = ScatterChart.getMeasureValue(indicies.x, seriesValues),
                        measureY: DataViewValueColumn = ScatterChart.getMeasureValue(indicies.y, seriesValues),
                        measureSize: DataViewValueColumn = ScatterChart.getMeasureValue(indicies.size, seriesValues),
                        measureShape: DataViewValueColumn = ScatterChart.getMeasureValue(indicies.shape, seriesValues),
                        measureRotation: DataViewValueColumn = ScatterChart.getMeasureValue(indicies.rotation, seriesValues),
                        measureXStart: DataViewValueColumn = ScatterChart.getMeasureValue(indicies.xStart, seriesValues),
                        measureXEnd: DataViewValueColumn = ScatterChart.getMeasureValue(indicies.xEnd, seriesValues),
                        measureYStart: DataViewValueColumn = ScatterChart.getMeasureValue(indicies.yStart, seriesValues),
                        measureYEnd: DataViewValueColumn = ScatterChart.getMeasureValue(indicies.yEnd, seriesValues);

                    let xVal = measureX && measureX.values && !isNaN(measureX.values[categoryIdx]) ? measureX.values[categoryIdx] : null,
                        yVal = measureY && measureY.values && !isNaN(measureY.values[categoryIdx]) ? measureY.values[categoryIdx] : 0,
                        size = measureSize && measureSize.values ? measureSize.values[categoryIdx] : null,
                        colorFill: string = EnhancedScatterChart.getValueFromDataViewValueColumnById(measureColorFill, categoryIdx),
                        shapeSymbolType = EnhancedScatterChart.getCustomSymbolType(measureShape && measureShape.values && measureShape.values[categoryIdx]),
                        image = EnhancedScatterChart.getValueFromDataViewValueColumnById(measureImage, categoryIdx),
                        rotation = measureRotation && measureRotation.values ? measureRotation.values[categoryIdx] : 0,
                        backdrop = EnhancedScatterChart.getValueFromDataViewValueColumnById(measureBackdrop, categoryIdx),
                        xStart = measureXStart && measureXStart.values ? measureXStart.values[categoryIdx] : null,
                        xEnd = measureXEnd && measureXEnd.values ? measureXEnd.values[categoryIdx] : null,
                        yStart = measureYStart && measureYStart.values ? measureYStart.values[categoryIdx] : null,
                        yEnd = measureYEnd && measureYEnd.values ? measureYEnd.values[categoryIdx] : null;

                    let hasNullValue = (xVal == null) || (yVal == null);

                    if (hasNullValue)
                        continue;

                    let color: string;
                    if (hasDynamicSeries) {
                        color = colorHelper.getColorForSeriesValue(grouping.objects, dataValues.identityFields, grouping.name);
                    } else {
                        // If we have no Size measure then use a blank query name
                        let measureSource = (measureSize != null)
                            ? measureSize.source.queryName
                            : "";
                        color = colorHelper.getColorForMeasure(categoryObjects && categoryObjects[categoryIdx], measureSource);
                    }

                    let category = categories && categories.length > 0 ? categories[indicies.category] : null;
                    let identity = SelectionIdBuilder.builder()
                        .withCategory(category, categoryIdx)
                        .withSeries(dataValues, grouping)
                        .createSelectionId();

                    let seriesData: TooltipSeriesDataItem[] = [];
                    if (dataValueSource) {
                        // Dynamic series
                        seriesData.push({ value: grouping.name, metadata: { source: dataValueSource, values: [] } });
                    }

                    if (measureX) {
                        seriesData.push({ value: xVal, metadata: measureX });
                    }

                    if (measureY) {
                        seriesData.push({ value: yVal, metadata: measureY });
                    }

                    if (measureSize && measureSize.values && measureSize.values.length > 0) {
                        seriesData.push({ value: measureSize.values[categoryIdx], metadata: measureSize });
                    }

                    if (measureColorFill && measureColorFill.values && measureColorFill.values.length > 0) {
                        seriesData.push({ value: measureColorFill.values[categoryIdx], metadata: measureColorFill });
                    }

                    if (measureShape && measureShape.values && measureShape.values.length > 0) {
                        seriesData.push({ value: measureShape.values[categoryIdx], metadata: measureShape });
                    }

                    if (measureImage && measureImage.values && measureImage.values.length > 0) {
                        seriesData.push({ value: measureImage.values[categoryIdx], metadata: measureImage });
                    }

                    if (measureRotation && measureRotation.values && measureRotation.values.length > 0) {
                        seriesData.push({ value: measureRotation.values[categoryIdx], metadata: measureRotation });
                    }

                    if (measureBackdrop && measureBackdrop.values && measureBackdrop.values.length > 0) {
                        seriesData.push({ value: measureBackdrop.values[categoryIdx], metadata: measureBackdrop });
                    }

                    if (measureXStart && measureXStart.values && measureXStart.values.length > 0) {
                        seriesData.push({ value: measureXStart.values[categoryIdx], metadata: measureXStart });
                    }

                    if (measureXEnd && measureXEnd.values && measureXEnd.values.length > 0) {
                        seriesData.push({ value: measureXEnd.values[categoryIdx], metadata: measureXEnd });
                    }

                    if (measureYStart && measureYStart.values && measureYStart.values.length > 0) {
                        seriesData.push({ value: measureYStart.values[categoryIdx], metadata: measureYStart });
                    }

                    if (measureYEnd && measureYEnd.values && measureYEnd.values.length > 0) {
                        seriesData.push({ value: measureYEnd.values[categoryIdx], metadata: measureYEnd });
                    }

                    let tooltipInfo: TooltipDataItem[] = TooltipBuilder.createTooltipInfo(
                        formatStringProp, /* formatStringProp */
                        undefined, /* dataViewCat */
                        categoryValue, /* categoryValue */
                        null, /* value */
                        category ? [category] : undefined, /* categories */
                        seriesData, /* seriesData */
                        undefined /* seriesIndex */); 

                    let dataPoint: EnhancedScatterChartDataPoint = {
                        x: xVal,
                        y: yVal,
                        size: size,
                        radius: { sizeMeasure: measureSize, index: categoryIdx },
                        fill: color,
                        formattedCategory: this.createLazyFormattedCategory(categoryFormatter, categoryValue),
                        selected: false,
                        identity: identity,
                        tooltipInfo: tooltipInfo,
                        labelFill: labelSettings.labelColor,
                        labelFontSize: fontSizeInPx,
                        contentPosition: ContentPositions.MiddleLeft, // 8
                        colorFill: colorFill,
                        shapeSymbolType: shapeSymbolType,
                        svgurl: image,
                        rotation: rotation,
                        backdrop: backdrop,
                        xStart: xStart,
                        xEnd: xEnd,
                        yStart: yStart,
                        yEnd: yEnd
                    };

                    dataPoints.push(dataPoint);
                }
            }

            return dataPoints;
        }

        private static getValueFromDataViewValueColumnById(dataViewValueColumn: DataViewCategoricalColumn, index: number): any {
            return dataViewValueColumn && dataViewValueColumn.values
                ? dataViewValueColumn.values[index]
                : null;
        }

        private static getDefaultData(): EnhancedScatterChartData {
            return {
                xCol: undefined,
                yCol: undefined,
                dataPoints: [],
                legendData: { dataPoints: [] },
                axesLabels: { x: "", y: "" },
                selectedIds: [],
                sizeRange: [],
                dataLabelsSettings: dataLabelUtils.getDefaultPointLabelSettings(),
                defaultDataPointColor: null,
                hasDynamicSeries: false,
                useShape: false,
                useCustomColor: false,
            };
        }

        public setData(dataViews: DataView[]) {
            this.data = EnhancedScatterChart.getDefaultData();

            if (dataViews && dataViews.length > 0) {
                let dataView: DataView = dataViews[0];

                if (dataView) {
                    this.categoryAxisProperties = this.getCategoryAxisProperties(dataView.metadata, true);
                    this.valueAxisProperties = this.getValueAxisProperties(dataView.metadata, true);

                    this.dataView = dataView;

                    if (dataView.categorical && dataView.categorical.values) {
                        this.data = EnhancedScatterChart.converter(
                            dataView,
                            this.colors,
                            this.interactivityService,
                            this.categoryAxisProperties,
                            this.valueAxisProperties);
                    }
                }
            }
        }

        public update(options: VisualUpdateOptions) {

            debug.assertValue(options, "options");

            let dataViews = this.dataViews = options.dataViews;
            this.viewport = _.clone(options.viewport);

            if (!dataViews) return;

            if (dataViews && dataViews.length > 0) {
                let warnings = getInvalidValueWarnings(
                    dataViews,
                    false /*supportsNaN*/,
                    false /*supportsNegativeInfinity*/,
                    false /*supportsPositiveInfinity*/);

                if (warnings && warnings.length > 0)
                    this.hostServices.setWarnings(warnings);

                this.populateObjectProperties(dataViews);
            }

            this.setData(dataViews);

            // Note: interactive legend shouldn"t be rendered explicitly here
            // The interactive legend is being rendered in the render method of ICartesianVisual
            if (!(this.options.interactivity && this.options.interactivity.isInteractiveLegend)) {
                this.renderLegend();
            }

            this.render(options.suppressAnimations);

        }

        private populateObjectProperties(dataViews: DataView[]) {
            if (dataViews && dataViews.length > 0) {
                let dataViewMetadata = dataViews[0].metadata;

                if (dataViewMetadata) {
                    this.legendObjectProperties = DataViewObjects.getObject(dataViewMetadata.objects, "legend", {});
                }
                else {
                    this.legendObjectProperties = {};
                }
                this.categoryAxisProperties = this.getCategoryAxisProperties(dataViewMetadata);
                this.valueAxisProperties = this.getValueAxisProperties(dataViewMetadata);
                let axisPosition = this.valueAxisProperties["position"];
                this.yAxisOrientation = axisPosition ? axisPosition.toString() : yAxisPosition.left;
            }
        }

        private renderLegend(): void {
            let legendData: LegendData = { title: "", dataPoints: [] };
            let legend: ILegend = this.legend;

            this.layerLegendData = this.data.legendData;
            if (this.layerLegendData) {
                legendData.title = this.layerLegendData.title || "";
                legendData.dataPoints = legendData.dataPoints.concat(this.layerLegendData.dataPoints || []);
                legendData.fontSize = this.legendLabelFontSize ? this.legendLabelFontSize : EnhancedScatterChart.LegendLabelFontSizeDefault;
                if (this.layerLegendData.grouped) {
                    legendData.grouped = true;
                }
            }

            let legendProperties = this.legendObjectProperties;

            if (legendProperties) {
                LegendData.update(legendData, legendProperties);
                let position = <string>legendProperties[legendProps.position];

                if (position)
                    legend.changeOrientation(LegendPosition[position]);
            }
            else {
                legend.changeOrientation(LegendPosition.Top);
            }

            if ((legendData.dataPoints.length === 1 && !legendData.grouped) || this.hideLegends()) {
                legendData.dataPoints = [];
            }

            let viewport = this.viewport;
            legend.drawLegend(legendData, { height: viewport.height, width: viewport.width });
            Legend.positionChartArea(this.svg, legend);
        }
        private hideLegends(): boolean {
            if (this.cartesianSmallViewPortProperties) {
                if (this.cartesianSmallViewPortProperties.hideLegendOnSmallViewPort && (this.viewport.height < this.cartesianSmallViewPortProperties.MinHeightLegendVisible)) {
                    return true;
                }
            }
            return false;
        }

        private shouldRenderAxis(axisProperties: IAxisProperties, propertyName: string = "show"): boolean {
            if (!axisProperties) {
                return false;
            }
            else if (axisProperties.isCategoryAxis && (!this.categoryAxisProperties || this.categoryAxisProperties[propertyName] == null || this.categoryAxisProperties[propertyName])) {
                return axisProperties.values && axisProperties.values.length > 0;
            }
            else if (!axisProperties.isCategoryAxis && (!this.valueAxisProperties || this.valueAxisProperties[propertyName] == null || this.valueAxisProperties[propertyName])) {
                return axisProperties.values && axisProperties.values.length > 0;
            }

            return false;
        }

        private getMaxMarginFactor(): number {
            return this.options.style.maxMarginFactor || 0.25;
        }

        private adjustViewportbyBackdrop(): void {
            let img = new Image();
            let that = this;
            img.src = this.data.backdrop.url;
            img.onload = function () {
                if (that.oldBackdrop !== this.src) {
                    that.render(true);
                    that.oldBackdrop = this.src;
                }
            };

            if (img.width > 0 && img.height > 0) {
                if (img.width * this.viewportIn.height < this.viewportIn.width * img.height) {
                    let deltaWidth = this.viewportIn.width - this.viewportIn.height * img.width / img.height;
                    this.viewport = { width: this.viewport.width - deltaWidth, height: this.viewport.height };
                } else {
                    let deltaHeight = this.viewportIn.height - this.viewportIn.width * img.height / img.width;
                    this.viewport = { width: this.viewport.width, height: this.viewport.height - deltaHeight };
                }
            }
        }

        public render(suppressAnimations: boolean): void {
            this.viewport.height -= this.legendViewport.height;
            this.viewport.width -= this.legendViewport.width;

            if (this.viewportIn.width === 0 || this.viewportIn.height === 0) {
                return;
            }

            let maxMarginFactor = this.getMaxMarginFactor();
            this.leftRightMarginLimit = this.viewport.width * maxMarginFactor;
            let bottomMarginLimit = this.bottomMarginLimit = Math.max(25, Math.ceil(this.viewport.height * maxMarginFactor));

            // reset defaults
            this.margin.top = 8;
            this.margin.bottom = bottomMarginLimit;
            this.margin.right = 0;

            this.calculateAxes(this.categoryAxisProperties, this.valueAxisProperties, this.textProperties, true);

            this.yAxisIsCategorical = this.yAxisProperties.isCategoryAxis;
            this.hasCategoryAxis = this.yAxisIsCategorical ? this.yAxisProperties && this.yAxisProperties.values.length > 0 : this.xAxisProperties && this.xAxisProperties.values.length > 0;

            let renderXAxis = this.shouldRenderAxis(this.xAxisProperties);
            let renderY1Axis = this.shouldRenderAxis(this.yAxisProperties);

            let mainAxisScale;
            this.isXScrollBarVisible = false;
            this.isYScrollBarVisible = false;
            let tickLabelMargins;
            let axisLabels: ChartAxesLabels;
            let chartHasAxisLabels: boolean;

            let yAxisOrientation = this.yAxisOrientation;
            let showY1OnRight = yAxisOrientation === yAxisPosition.right;

            this.calculateAxes(this.categoryAxisProperties, this.valueAxisProperties, this.textProperties, true);

            let doneWithMargins = false,
                maxIterations = 2,
                numIterations = 0;

            while (!doneWithMargins && numIterations < maxIterations) {
                numIterations++;
                tickLabelMargins = AxisHelper.getTickLabelMargins(
                    { width: this.viewportIn.width, height: this.viewport.height }, this.leftRightMarginLimit,
                    TextMeasurementService.measureSvgTextWidth, TextMeasurementService.measureSvgTextHeight, { x: this.xAxisProperties, y1: this.yAxisProperties },
                    this.bottomMarginLimit, this.textProperties,
                    this.isXScrollBarVisible || this.isYScrollBarVisible, showY1OnRight,
                    renderXAxis, renderY1Axis, false);

                // We look at the y axes as main and second sides, if the y axis orientation is right so the main side represents the right side
                let maxMainYaxisSide = showY1OnRight ? tickLabelMargins.yRight : tickLabelMargins.yLeft,
                    maxSecondYaxisSide = showY1OnRight ? tickLabelMargins.yLeft : tickLabelMargins.yRight,
                    xMax = tickLabelMargins.xMax;

                maxMainYaxisSide += 10;
                maxSecondYaxisSide += 10;
                xMax += 12;
                if (showY1OnRight && renderY1Axis) {
                    maxSecondYaxisSide += 20;
                }

                if (!showY1OnRight && renderY1Axis) {
                    maxMainYaxisSide += 20;
                }

                if (this.hideAxisLabels()) {
                    this.xAxisProperties.axisLabel = null;
                    this.yAxisProperties.axisLabel = null;
                }

                this.addUnitTypeToAxisLabel(this.xAxisProperties, this.yAxisProperties);

                axisLabels = { x: this.xAxisProperties.axisLabel, y: this.yAxisProperties.axisLabel, y2: null };
                chartHasAxisLabels = (axisLabels.x != null) || (axisLabels.y != null || axisLabels.y2 != null);

                if (axisLabels.x != null)
                    xMax += 18;

                if (axisLabels.y != null)
                    maxMainYaxisSide += 20;

                if (axisLabels.y2 != null)
                    maxSecondYaxisSide += 20;

                this.margin.left = showY1OnRight ? maxSecondYaxisSide : maxMainYaxisSide;
                this.margin.right = showY1OnRight ? maxMainYaxisSide : maxSecondYaxisSide;
                this.margin.bottom = xMax;

                // re-calculate the axes with the new margins
                let previousTickCountY1 = this.yAxisProperties.values.length;

                this.calculateAxes(this.categoryAxisProperties, this.valueAxisProperties, this.textProperties, true);

                // the minor padding adjustments could have affected the chosen tick values, which would then need to calculate margins again
                // e.g. [0,2,4,6,8] vs. [0,5,10] the 10 is wider and needs more margin.
                if (this.yAxisProperties.values.length === previousTickCountY1)
                    doneWithMargins = true;
            }
            // we have to do the above process again since changes are made to viewport.

            if (this.data.backdrop && this.data.backdrop.show && (this.data.backdrop.url !== undefined)) {
                this.adjustViewportbyBackdrop();

                doneWithMargins = false;
                maxIterations = 2;
                numIterations = 0;

                while (!doneWithMargins && numIterations < maxIterations) {
                    numIterations++;
                    tickLabelMargins = AxisHelper.getTickLabelMargins(
                        { width: this.viewportIn.width, height: this.viewport.height }, this.leftRightMarginLimit,
                        TextMeasurementService.measureSvgTextWidth, TextMeasurementService.measureSvgTextHeight, { x: this.xAxisProperties, y1: this.yAxisProperties },
                        this.bottomMarginLimit, this.textProperties,
                        this.isXScrollBarVisible || this.isYScrollBarVisible, showY1OnRight,
                        renderXAxis, renderY1Axis, false);

                    // We look at the y axes as main and second sides, if the y axis orientation is right so the main side represents the right side
                    let maxMainYaxisSide = showY1OnRight ? tickLabelMargins.yRight : tickLabelMargins.yLeft,
                        maxSecondYaxisSide = showY1OnRight ? tickLabelMargins.yLeft : tickLabelMargins.yRight,
                        xMax = tickLabelMargins.xMax;

                    maxMainYaxisSide += 10;
                    if (showY1OnRight && renderY1Axis)
                        maxSecondYaxisSide += 15;
                    xMax += 12;

                    if (this.hideAxisLabels()) {
                        this.xAxisProperties.axisLabel = null;
                        this.yAxisProperties.axisLabel = null;
                    }

                    this.addUnitTypeToAxisLabel(this.xAxisProperties, this.yAxisProperties);

                    axisLabels = { x: this.xAxisProperties.axisLabel, y: this.yAxisProperties.axisLabel, y2: null };
                    chartHasAxisLabels = (axisLabels.x != null) || (axisLabels.y != null || axisLabels.y2 != null);

                    if (axisLabels.x != null)
                        xMax += 18;

                    if (axisLabels.y != null)
                        maxMainYaxisSide += 20;

                    if (axisLabels.y2 != null)
                        maxSecondYaxisSide += 20;

                    this.margin.left = showY1OnRight ? maxSecondYaxisSide : maxMainYaxisSide;
                    this.margin.right = showY1OnRight ? maxMainYaxisSide : maxSecondYaxisSide;
                    this.margin.bottom = xMax;

                    // re-calculate the axes with the new margins
                    let previousTickCountY1 = this.yAxisProperties.values.length;

                    this.calculateAxes(this.categoryAxisProperties, this.valueAxisProperties, this.textProperties, true);

                    // the minor padding adjustments could have affected the chosen tick values, which would then need to calculate margins again
                    // e.g. [0,2,4,6,8] vs. [0,5,10] the 10 is wider and needs more margin.
                    if (this.yAxisProperties.values.length === previousTickCountY1)
                        doneWithMargins = true;
                }
            }

            this.renderChart(mainAxisScale, this.xAxisProperties, this.yAxisProperties, tickLabelMargins, chartHasAxisLabels, axisLabels, suppressAnimations);

            this.updateAxis();

            if (!this.data)
                return;

            let data = this.data;
            let dataPoints = this.data.dataPoints;

            let hasSelection = this.interactivityService && this.interactivityService.hasSelection();

            this.mainGraphicsSVGSelection
                .attr("width", this.viewportIn.width)
                .attr("height", this.viewportIn.height);

            let sortedData = dataPoints.sort(function (a, b) {
                return b.radius.sizeMeasure ? (b.radius.sizeMeasure.values[b.radius.index] - a.radius.sizeMeasure.values[a.radius.index]) : 0;
            });

            let duration = AnimatorCommon.GetAnimationDuration(this.animator, suppressAnimations);
            let scatterMarkers = this.drawScatterMarkers(sortedData, hasSelection, data.sizeRange, duration);

            let dataLabelsSettings = this.data.dataLabelsSettings;
            if (dataLabelsSettings.show) {
                let layout = this.getEnhanchedScatterChartLabelLayout(dataLabelsSettings, this.viewportIn, data.sizeRange);
                let clonedDataPoints: Array<EnhancedScatterChartDataPoint> = this.cloneDataPoints(dataPoints);
                //fix bug 3863: drawDefaultLabelsForDataPointChart add to datapoints[xxx].size = object , which causes when
                //category labels is on and Fill Points option off to fill the points when mouse click occures because of default size
                //is set to datapoints.
                let labels: D3.UpdateSelection = dataLabelUtils.drawDefaultLabelsForDataPointChart(clonedDataPoints, this.mainGraphicsG, layout, this.viewportIn);
                if (labels)
                    labels.attr("transform", (d) => SVGUtil.translate(d.size.width / 2, 0));
            }
            else {
                dataLabelUtils.cleanDataLabels(this.mainGraphicsG);
            }

            this.renderCrosshair();

            let behaviorOptions: ScatterBehaviorOptions;

            if (this.interactivityService) {
                behaviorOptions = {
                    dataPointsSelection: scatterMarkers,
                    data: this.data,
                    plotContext: this.mainGraphicsSVGSelection,
                };
            }

            TooltipManager.addTooltip(scatterMarkers, (tooltipEvent: TooltipEvent) => tooltipEvent.data.tooltipInfo);

            SVGUtil.flushAllD3TransitionsIfNeeded(this.options);

            if (this.behavior) {
                let layerBehaviorOptions: any[] = [];
                layerBehaviorOptions.push(behaviorOptions);

                if (this.interactivityService) {
                    let cbehaviorOptions: CartesianBehaviorOptions = {
                        layerOptions: layerBehaviorOptions,
                        clearCatcher: this.clearCatcher,
                    };
                    this.interactivityService.bind(dataPoints, this.behavior, cbehaviorOptions);
                }
            }
        }

        private cloneDataPoints(dataPoints: Array<EnhancedScatterChartDataPoint>): Array<EnhancedScatterChartDataPoint> {
            let clonedDataPoints: Array<EnhancedScatterChartDataPoint> = new Array<EnhancedScatterChartDataPoint>();

            for (let dataPoint of dataPoints) {
                let clonedDataPoint: EnhancedScatterChartDataPoint = _.clone(dataPoint);
                clonedDataPoints.push(clonedDataPoint);
            }

            return clonedDataPoints;
        }

        private darkenZeroLine(g: D3.Selection): void {
            let zeroTick = g.selectAll("g.tick").filter((data) => data === 0).node();
            if (zeroTick) {
                d3.select(zeroTick).select("line").classed("zero-line", true);
            }
        }

        private getCategoryAxisFill(): Fill {
            if (this.dataView && this.dataView.metadata.objects) {
                let label = this.dataView.metadata.objects["categoryAxis"];
                if (label) {
                    return <Fill>label["axisColor"];
                }
            }
            return { solid: { color: "#333" } };
        }

        private getEnhanchedScatterChartLabelLayout(labelSettings: PointDataLabelsSettings,
            viewport: IViewport,
            sizeRange: NumberRange): ILabelLayout {

            let xScale = this.xAxisProperties.scale;
            let yScale = this.yAxisProperties.scale;
            let fontSizeInPx = PixelConverter.fromPoint(labelSettings.fontSize);
            let fontFamily: string = dataLabelUtils.LabelTextProperties.fontFamily;

            return {
                labelText: (d: EnhancedScatterChartDataPoint) => {
                    return dataLabelUtils.getLabelFormattedText({
                        label: d.formattedCategory.getValue(),
                        fontSize: labelSettings.fontSize,
                        maxWidth: viewport.width,
                    });
                },
                labelLayout: {
                    x: (d: EnhancedScatterChartDataPoint) => xScale(d.x),
                    y: (d: EnhancedScatterChartDataPoint) => {
                        let margin = visuals.ScatterChart.getBubbleRadius(d.radius, sizeRange, viewport) + dataLabelUtils.labelMargin;
                        return labelSettings.position === 0 /* Above */ ? yScale(d.y) - margin : yScale(d.y) + margin;
                    },
                },
                filter: (d: EnhancedScatterChartDataPoint) => (d != null && d.formattedCategory.getValue() != null),
                style: {
                    "fill": (d: EnhancedScatterChartDataPoint) => d.labelFill,
                    "font-size": fontSizeInPx,
                    "font-family": fontFamily,
                },
            };
        }

        private getValueAxisFill(): Fill {
            if (this.dataView && this.dataView.metadata.objects) {
                let label = this.dataView.metadata.objects["valueAxis"];
                if (label)
                    return <Fill>label["axisColor"];
            }

            return { solid: { color: "#333" } };
        }

        /**
         * Public for testability.
         */
        public renderCrosshair(): D3.Selection {
            if (!this.mainGraphicsSVGSelection) {
                return;
            }

            this.crosshairCanvasSelection = this.addCrosshairCanvasToDOM(this.mainGraphicsSVGSelection);

            if (this.data && this.data.crosshair) {
                this.crosshairVerticalLineSelection = this.addCrosshairLineToDOM(
                    this.crosshairCanvasSelection, EnhancedScatterChart.CrosshairVerticalLineSelector);

                this.crosshairHorizontalLineSelection = this.addCrosshairLineToDOM(
                    this.crosshairCanvasSelection, EnhancedScatterChart.CrosshairHorizontalLineSelector);

                this.crosshairTextSelection = this.addCrosshairTextToDOM(this.crosshairCanvasSelection);

                this.bindCrosshairEvents();
            }

            return this.crosshairCanvasSelection;
        }

        /**
         * Public for testability.
         */
        public addCrosshairCanvasToDOM(rootElement: D3.Selection): D3.Selection {
            let crosshairCanvasSelector: ClassAndSelector = EnhancedScatterChart.CrosshairCanvasSelector;

            return this.addElementToDOM(rootElement, {
                name: "g",
                selector: crosshairCanvasSelector.selector,
                className: crosshairCanvasSelector.class,
                styles: { display: "none" }
            });
        }

        /**
         * Public for testability.
         */
        public addCrosshairLineToDOM(rootElement: D3.Selection, elementSelector: ClassAndSelector): D3.Selection {
            let crosshairLineSelector: ClassAndSelector = EnhancedScatterChart.CrosshairLineSelector;

            return this.addElementToDOM(rootElement, {
                name: "line",
                selector: elementSelector.selector,
                className: `${crosshairLineSelector.class} ${elementSelector.class}`,
                attributes: { x1: 0, y1: 0, x2: 0, y2: 0 }
            });
        }

        /**
         * Public for testability.
         */
        public addCrosshairTextToDOM(rootElement: D3.Selection): D3.Selection {
            let crosshairTextSelector: ClassAndSelector = EnhancedScatterChart.CrosshairTextSelector;

            return this.addElementToDOM(rootElement, {
                name: "text",
                selector: crosshairTextSelector.selector,
                className: crosshairTextSelector.class
            });
        }

        /**
         * Public for testability.
         */
        public bindCrosshairEvents(): void {
            if (!this.axisGraphicsContextScrollable) {
                return;
            }

            this.axisGraphicsContextScrollable
                .on("mousemove", () => {
                    let currentTarget: SVGElement = <SVGElement>d3.event.currentTarget,
                        coordinates: number[] = d3.mouse(currentTarget),
                        svgNode: SVGElement = currentTarget.viewportElement,
                        scaledRect: ClientRect = svgNode.getBoundingClientRect(),
                        domRect: SVGRect = (<any>svgNode).getBBox(),
                        ratioX: number = scaledRect.width / domRect.width,
                        ratioY: number = scaledRect.height / domRect.height,
                        x: number = coordinates[0],
                        y: number = coordinates[1];

                    if (domRect.width > 0 && !Double.equalWithPrecision(ratioX, 1.0, 0.00001)) {
                        x = x / ratioX;
                    }

                    if (domRect.height > 0 && !Double.equalWithPrecision(ratioY, 1.0, 0.00001)) {
                        y = y / ratioY;
                    }

                    this.updateCrosshair(x, y);
                })
                .on("mouseover", () => {
                    this.crosshairCanvasSelection.style("display", "block");
                })
                .on("mouseout", () => {
                    this.crosshairCanvasSelection.style("display", "none");
                });
        }

        /**
         * Public for testability.
         */
        public updateCrosshair(x: number, y: number): void {
            if (!this.viewportIn ||
                !this.crosshairHorizontalLineSelection ||
                !this.crosshairVerticalLineSelection ||
                !this.crosshairTextSelection ||
                !this.xAxisProperties) {

                return;
            }

            let crosshairTextMargin: number = EnhancedScatterChart.CrosshairTextMargin,
                xScale = <D3.Scale.LinearScale>this.xAxisProperties.scale,
                yScale = <D3.Scale.LinearScale>this.yAxisProperties.scale,
                xFormated: number,
                yFormated: number;

            this.crosshairHorizontalLineSelection
                .attr({ x1: 0, y1: y, x2: this.viewportIn.width, y2: y });

            this.crosshairVerticalLineSelection
                .attr({ x1: x, y1: 0, x2: x, y2: this.viewportIn.height });

            xFormated = Math.round(xScale.invert(x) * 100) / 100;
            yFormated = Math.round(yScale.invert(y) * 100) / 100;

            this.crosshairTextSelection
                .attr({ x: x + crosshairTextMargin, y: y - crosshairTextMargin })
                .text(`(${xFormated}, ${yFormated})`);
        }

        /**
         * Public for testability.
         */
        public addElementToDOM(rootElement: D3.Selection, properties: ElementProperties): D3.Selection {
            if (!rootElement || !properties) {
                return null;
            }

            let elementSelection: D3.Selection,
                elementUpdateSelection: D3.UpdateSelection;

            elementSelection = rootElement
                .selectAll(properties.selector);

            elementUpdateSelection = elementSelection.data(properties.data || [[]]);

            elementUpdateSelection
                .enter()
                .append(properties.name)
                .attr(properties.attributes)
                .style(properties.styles)
                .classed(properties.className, true);

            elementUpdateSelection
                .exit()
                .remove();

            return elementUpdateSelection;
        }

        private renderBackground() {
            if (this.data.backdrop && this.data.backdrop.show && (this.data.backdrop.url !== undefined)) {
                this.backgroundGraphicsContext
                    .attr("xlink:href", this.data.backdrop.url)
                    .attr("x", 0)
                    .attr("y", 0)
                    .attr("width", this.viewportIn.width)
                    .attr("height", this.viewportIn.height);
            } else {
                this.backgroundGraphicsContext
                    .attr("width", 0)
                    .attr("height", 0);
            }
        }

        private renderChart(
            mainAxisScale: any,
            xAxis: IAxisProperties,
            yAxis: IAxisProperties,
            tickLabelMargins: any,
            chartHasAxisLabels: boolean,
            axisLabels: ChartAxesLabels,
            suppressAnimations: boolean,
            scrollScale?: any,
            extent?: number[]) {

            let bottomMarginLimit = this.bottomMarginLimit;
            let leftRightMarginLimit = this.leftRightMarginLimit;
            let duration = AnimatorCommon.GetAnimationDuration(this.animator, suppressAnimations);

            this.renderBackground();

            //hide show x-axis here
            if (this.shouldRenderAxis(xAxis)) {
                xAxis.axis.orient("bottom");
                if (!xAxis.willLabelsFit)
                    xAxis.axis.tickPadding(5);

                let xAxisGraphicsElement = this.xAxisGraphicsContext;
                if (duration) {
                    xAxisGraphicsElement
                        .transition()
                        .duration(duration)
                        .call(xAxis.axis)
                        .call(this.darkenZeroLine);
                }
                else {
                    xAxisGraphicsElement
                        .call(xAxis.axis)
                        .call(this.darkenZeroLine);
                }
                let xZeroTick = xAxisGraphicsElement.selectAll("g.tick").filter((data) => data === 0);
                if (xZeroTick) {
                    let xZeroColor = this.getValueAxisFill();
                    if (xZeroColor)
                        xZeroTick.selectAll("line").style({ "stroke": xZeroColor.solid.color });
                }

                let xAxisTextNodes = xAxisGraphicsElement.selectAll("text");
                if (xAxis.willLabelsWordBreak) {
                    xAxisTextNodes
                        .call(AxisHelper.LabelLayoutStrategy.wordBreak, xAxis, bottomMarginLimit);
                } else {
                    xAxisTextNodes
                        .call(AxisHelper.LabelLayoutStrategy.rotate,
                        bottomMarginLimit,
                        TextMeasurementService.getTailoredTextOrDefault,
                        CartesianChart.AxisTextProperties,
                        !xAxis.willLabelsFit,
                        bottomMarginLimit === tickLabelMargins.xMax,
                        xAxis,
                        this.margin,
                        this.isXScrollBarVisible || this.isYScrollBarVisible);
                }
            }
            else {
                this.xAxisGraphicsContext.selectAll("*").remove();
            }

            if (this.shouldRenderAxis(yAxis)) {
                let yAxisOrientation = this.yAxisOrientation;

                yAxis.axis
                    .tickSize(-this.viewportIn.width)
                    .tickPadding(10)
                    .orient(yAxisOrientation.toLowerCase());

                let y1AxisGraphicsElement = this.y1AxisGraphicsContext;
                if (duration) {
                    y1AxisGraphicsElement
                        .transition()
                        .duration(duration)
                        .call(yAxis.axis)
                        .call(this.darkenZeroLine);
                }
                else {
                    y1AxisGraphicsElement
                        .call(yAxis.axis)
                        .call(this.darkenZeroLine);
                }

                let yZeroTick = y1AxisGraphicsElement.selectAll("g.tick").filter((data) => data === 0);
                if (yZeroTick) {
                    let yZeroColor = this.getCategoryAxisFill();
                    if (yZeroColor) {
                        yZeroTick.selectAll("line").style({ "stroke": yZeroColor.solid.color });
                    }
                }

                if (tickLabelMargins.yLeft >= leftRightMarginLimit) {
                    y1AxisGraphicsElement.selectAll("text")
                        .call(AxisHelper.LabelLayoutStrategy.clip,
                        // Can"t use padding space to render text, so subtract that from available space for ellipses calculations
                        leftRightMarginLimit - 10,
                        TextMeasurementService.svgEllipsis);
                }

                // TODO: clip (svgEllipsis) the Y2 labels
            }
            else {
                this.y1AxisGraphicsContext.selectAll("*").remove();
            }
            // Axis labels
            //TODO: Add label for second Y axis for combo chart
            if (chartHasAxisLabels) {
                let hideXAxisTitle = !this.shouldRenderAxis(xAxis, "showAxisTitle");
                let hideYAxisTitle = !this.shouldRenderAxis(yAxis, "showAxisTitle");
                let hideY2AxisTitle = this.valueAxisProperties && this.valueAxisProperties["secShowAxisTitle"] != null && this.valueAxisProperties["secShowAxisTitle"] === false;

                this.renderAxesLabels(axisLabels, this.legendViewport.height, hideXAxisTitle, hideYAxisTitle, hideY2AxisTitle);
            }
            else {
                this.axisGraphicsContext.selectAll(".xAxisLabel").remove();
                this.axisGraphicsContext.selectAll(".yAxisLabel").remove();
            }
        }

        private renderAxesLabels(axisLabels: ChartAxesLabels, legendMargin: number, hideXAxisTitle: boolean, hideYAxisTitle: boolean, hideY2AxisTitle: boolean): void {
            this.axisGraphicsContext.selectAll(".xAxisLabel").remove();
            this.axisGraphicsContext.selectAll(".yAxisLabel").remove();

            let margin = this.margin;
            let width = this.viewportIn.width;
            let height = this.viewport.height;
            let fontSize = EnhancedScatterChart.AxisFontSize;
            let yAxisOrientation = this.yAxisOrientation;
            let showY1OnRight = yAxisOrientation === yAxisPosition.right;

            if (!hideXAxisTitle) {
                let xAxisLabel = this.axisGraphicsContext.append("text")
                    .style("text-anchor", "middle")
                    .text(axisLabels.x)
                    .call((text: D3.Selection) => {
                        text.each(function () {
                            let text = d3.select(this);
                            text.attr({
                                "class": "xAxisLabel",
                                "transform": SVGUtil.translate(width / 2, height - fontSize - 2)
                            });
                        });
                    });

                xAxisLabel.call(AxisHelper.LabelLayoutStrategy.clip,
                    width,
                    TextMeasurementService.svgEllipsis);
            }

            if (!hideYAxisTitle) {
                let yAxisLabel = this.axisGraphicsContext.append("text")
                    .style("text-anchor", "middle")
                    .text(axisLabels.y)
                    .call((text: D3.Selection) => {
                        text.each(function () {
                            let text = d3.select(this);
                            text.attr({
                                "class": "yAxisLabel",
                                "transform": "rotate(-90)",
                                "y": showY1OnRight ? width + margin.right - fontSize : -margin.left,
                                "x": -((height - margin.top - legendMargin) / 2),
                                "dy": "1em"
                            });
                        });
                    });

                yAxisLabel.call(AxisHelper.LabelLayoutStrategy.clip,
                    height - (margin.bottom + margin.top),
                    TextMeasurementService.svgEllipsis);
            }

            if (!hideY2AxisTitle && axisLabels.y2) {
                let y2AxisLabel = this.axisGraphicsContext.append("text")
                    .style("text-anchor", "middle")
                    .text(axisLabels.y2)
                    .call((text: D3.Selection) => {
                        text.each(function () {
                            let text = d3.select(this);
                            text.attr({
                                "class": "yAxisLabel",
                                "transform": "rotate(-90)",
                                "y": showY1OnRight ? -margin.left : width + margin.right - fontSize,
                                "x": -((height - margin.top - legendMargin) / 2),
                                "dy": "1em"
                            });
                        });
                    });

                y2AxisLabel.call(AxisHelper.LabelLayoutStrategy.clip,
                    height - (margin.bottom + margin.top),
                    TextMeasurementService.svgEllipsis);
            }
        }

        private updateAxis(): void {
            this.adjustMargins();

            let yAxisOrientation = this.yAxisOrientation;
            let showY1OnRight = yAxisOrientation === yAxisPosition.right;

            this.xAxisGraphicsContext
                .attr("transform", SVGUtil.translate(0, this.viewportIn.height));

            this.y1AxisGraphicsContext
                .attr("transform", SVGUtil.translate(showY1OnRight ? this.viewportIn.width : 0, 0));

            this.svg.attr({
                "width": this.viewport.width,
                "height": this.viewport.height
            });

            this.svgScrollable.attr({
                "width": this.viewport.width,
                "height": this.viewport.height
            });

            this.svgScrollable.attr({
                "x": 0
            });

            let left: number = this.margin.left;
            let top: number = this.margin.top;

            this.axisGraphicsContext.attr("transform", SVGUtil.translate(left, top));
            this.axisGraphicsContextScrollable.attr("transform", SVGUtil.translate(left, top));
            this.clearCatcher.attr("transform", SVGUtil.translate(-left, -top));

            if (this.isXScrollBarVisible) {
                this.svgScrollable.attr({
                    "x": left
                });
                this.axisGraphicsContextScrollable.attr("transform", SVGUtil.translate(0, top));
                this.svgScrollable.attr("width", this.viewportIn.width);
                this.svg.attr("width", this.viewport.width)
                    .attr("height", this.viewport.height + this.ScrollBarWidth);
            }
            else if (this.isYScrollBarVisible) {
                this.svgScrollable.attr("height", this.viewportIn.height + top);
                this.svg.attr("width", this.viewport.width + this.ScrollBarWidth)
                    .attr("height", this.viewport.height);
            }
        }

        private getUnitType(xAxis: IAxisProperties) {
            if (xAxis.formatter &&
                xAxis.formatter.displayUnit &&
                xAxis.formatter.displayUnit.value > 1)
                return xAxis.formatter.displayUnit.title;
            return null;
        }

        private addUnitTypeToAxisLabel(xAxis: IAxisProperties, yAxis: IAxisProperties): void {
            let unitType = this.getUnitType(xAxis);
            if (xAxis.isCategoryAxis) {
                this.categoryAxisHasUnitType = unitType !== null;
            }
            else {
                this.valueAxisHasUnitType = unitType !== null;
            }

            if (xAxis.axisLabel && unitType) {
                if (xAxis.isCategoryAxis) {
                    xAxis.axisLabel = AxisHelper.createAxisLabel(this.categoryAxisProperties, xAxis.axisLabel, unitType);
                }
                else {
                    xAxis.axisLabel = AxisHelper.createAxisLabel(this.valueAxisProperties, xAxis.axisLabel, unitType);
                }
            }

            unitType = this.getUnitType(yAxis);

            if (!yAxis.isCategoryAxis) {
                this.valueAxisHasUnitType = unitType !== null;
            }
            else {
                this.categoryAxisHasUnitType = unitType !== null;
            }

            if (yAxis.axisLabel && unitType) {
                if (!yAxis.isCategoryAxis) {
                    yAxis.axisLabel = AxisHelper.createAxisLabel(this.valueAxisProperties, yAxis.axisLabel, unitType);
                }
                else {
                    yAxis.axisLabel = AxisHelper.createAxisLabel(this.categoryAxisProperties, yAxis.axisLabel, unitType);
                }
            }
        }

        private hideAxisLabels(): boolean {
            if (this.cartesianSmallViewPortProperties) {
                if (this.cartesianSmallViewPortProperties.hideAxesOnSmallViewPort
                    && ((this.viewport.height + this.legendViewport.height) < this.cartesianSmallViewPortProperties.MinHeightAxesVisible)
                    && !this.options.interactivity.isInteractiveLegend) {
                    return true;
                }
            }
            return false;
        }

        private drawScatterMarkers(scatterData: EnhancedScatterChartDataPoint[], hasSelection: boolean, sizeRange: NumberRange, duration: number) {
            let xScale = this.xAxisProperties.scale;
            let yScale = this.yAxisProperties.scale;
            let shouldEnableFill = (!sizeRange || !sizeRange.min) && this.data.fillPoint;

            let markers;
            let useCustomColor = this.data.useCustomColor;
            if (!this.data.useShape) {
                this.mainGraphicsContext
                    .selectAll(EnhancedScatterChart.ImageClasses.selector)
                    .remove();

                markers = this.mainGraphicsContext
                    .classed("ScatterMarkers", true)
                    .selectAll(EnhancedScatterChart.DotClasses.selector)
                    .data(scatterData, (d: EnhancedScatterChartDataPoint) => d.identity.getKey());

                markers
                    .enter()
                    .append("path")
                    .classed(EnhancedScatterChart.DotClasses.class, true)
                    .attr("id", "markershape");

                markers
                    .style({
                        "stroke-opacity": (d: EnhancedScatterChartDataPoint) => ScatterChart.getBubbleOpacity(d, hasSelection),
                        "stroke-width": "1px",
                        "stroke": (d: EnhancedScatterChartDataPoint) => {
                            let color = useCustomColor ? d.colorFill : d.fill;
                            if (this.data.outline) {
                                return d3.rgb(color).darker();
                            } else {
                                return d3.rgb(color);
                            }
                        },
                        "fill": (d: EnhancedScatterChartDataPoint) => d3.rgb(useCustomColor ? d.colorFill : d.fill),
                        "fill-opacity": (d: EnhancedScatterChartDataPoint) => (d.size != null || shouldEnableFill) ? ScatterChart.getBubbleOpacity(d, hasSelection) : 0,
                    })
                    .attr("d", (d: EnhancedScatterChartDataPoint) => {
                        let r = ScatterChart.getBubbleRadius(d.radius, sizeRange, this.viewport);
                        let area = 4 * r * r;
                        return d.shapeSymbolType(area);
                    })
                    .transition()
                    .duration((d) => {
                        if (this.keyArray.indexOf(d.identity.getKey()) >= 0) {
                            return duration;
                        } else {
                            return 0;
                        }
                    })
                    .attr("transform", function (d) { return "translate(" + xScale(d.x) + "," + yScale(d.y) + ") rotate(" + d.rotation + ")"; });
            } else {
                this.mainGraphicsContext
                    .selectAll(EnhancedScatterChart.DotClasses.selector)
                    .remove();

                markers = this.mainGraphicsContext
                    .classed("ScatterMarkers", true)
                    .selectAll(EnhancedScatterChart.ImageClasses.selector)
                    .data(scatterData, (d: EnhancedScatterChartDataPoint) => d.identity.getKey());

                markers
                    .enter()
                    .append("svg:image")
                    .classed(EnhancedScatterChart.ImageClasses.class, true).attr("id", "markerimage");

                markers
                    .attr("xlink:href", (d) => {
                        if (d.svgurl !== undefined && d.svgurl != null && d.svgurl !== "") {
                            return d.svgurl;
                        } else {
                            return this.svgDefaultImage;
                        }
                    })
                    .attr("width", (d) => {
                        return ScatterChart.getBubbleRadius(d.radius, sizeRange, this.viewport) * 2;
                    })
                    .attr("height", (d) => {
                        return ScatterChart.getBubbleRadius(d.radius, sizeRange, this.viewport) * 2;
                    })
                    .transition()
                    .duration((d) => {
                        if (this.keyArray.indexOf(d.identity.getKey()) >= 0) {
                            return duration;
                        } else {
                            return 0;
                        }
                    })
                    .attr("transform", (d) => {
                        let radius = ScatterChart.getBubbleRadius(d.radius, sizeRange, this.viewport);
                        return "translate(" + (xScale(d.x) - radius) + "," + (yScale(d.y) - radius) + ") rotate(" + d.rotation + "," + radius + "," + radius + ")";
                    });
            }

            markers.exit().remove();
            this.keyArray = [];
            for (let i = 0; i < scatterData.length; i++) {
                this.keyArray.push(scatterData[i].identity.getKey());
            }

            return markers;
        }

        public calculateAxes(
            categoryAxisProperties: DataViewObject,
            valueAxisProperties: DataViewObject,
            textProperties: TextProperties,
            scrollbarVisible: boolean): IAxisProperties[] {

            let visualOptions: CalculateScaleAndDomainOptions = {
                viewport: this.viewport,
                margin: this.margin,
                forcedXDomain: [categoryAxisProperties ? categoryAxisProperties["start"] : null, categoryAxisProperties ? categoryAxisProperties["end"] : null],
                forceMerge: valueAxisProperties && valueAxisProperties["secShow"] === false,
                showCategoryAxisLabel: false,
                showValueAxisLabel: false,
                categoryAxisScaleType: categoryAxisProperties && categoryAxisProperties["axisScale"] != null ? <string>categoryAxisProperties["axisScale"] : null,
                valueAxisScaleType: valueAxisProperties && valueAxisProperties["axisScale"] != null ? <string>valueAxisProperties["axisScale"] : null,
                valueAxisDisplayUnits: valueAxisProperties && valueAxisProperties["labelDisplayUnits"] != null ? <number>valueAxisProperties["labelDisplayUnits"] : EnhancedScatterChart.LabelDisplayUnitsDefault,
                categoryAxisDisplayUnits: categoryAxisProperties && categoryAxisProperties["labelDisplayUnits"] != null ? <number>categoryAxisProperties["labelDisplayUnits"] : EnhancedScatterChart.LabelDisplayUnitsDefault,
                trimOrdinalDataOnOverflow: false
            };

            if (valueAxisProperties) {
                visualOptions.forcedYDomain = AxisHelper.applyCustomizedDomain([valueAxisProperties["start"], valueAxisProperties["end"]], visualOptions.forcedYDomain);
            }

            visualOptions.showCategoryAxisLabel = (!!categoryAxisProperties && !!categoryAxisProperties["showAxisTitle"]);

            visualOptions.showValueAxisLabel = true;

            let width = this.viewport.width - (this.margin.left + this.margin.right);

            let axes = this.calculateAxesProperties(visualOptions);
            axes[0].willLabelsFit = AxisHelper.LabelLayoutStrategy.willLabelsFit(
                axes[0],
                width,
                TextMeasurementService.measureSvgTextWidth,
                textProperties);

            // If labels do not fit and we are not scrolling, try word breaking
            axes[0].willLabelsWordBreak = (!axes[0].willLabelsFit && !scrollbarVisible) && AxisHelper.LabelLayoutStrategy.willLabelsWordBreak(
                axes[0], this.margin, width, TextMeasurementService.measureSvgTextWidth,
                TextMeasurementService.estimateSvgTextHeight, TextMeasurementService.getTailoredTextOrDefault,
                textProperties);
            return axes;
        }

        public calculateAxesProperties(options: CalculateScaleAndDomainOptions): IAxisProperties[] {
            let data = this.data;
            let dataPoints = data.dataPoints;
            this.margin = options.margin;
            this.viewport = options.viewport;

            let minY = 0,
                maxY = 10,
                minX = 0,
                maxX = 10;
            if (dataPoints.length > 0) {
                minY = d3.min<EnhancedScatterChartDataPoint, number>(dataPoints, d => d.y);
                maxY = d3.max<EnhancedScatterChartDataPoint, number>(dataPoints, d => d.y);
                minX = d3.min<EnhancedScatterChartDataPoint, number>(dataPoints, d => d.x);
                maxX = d3.max<EnhancedScatterChartDataPoint, number>(dataPoints, d => d.x);
            }

            let xDomain = [minX, maxX];
            let combinedXDomain = AxisHelper.combineDomain(options.forcedXDomain, xDomain);

            this.xAxisProperties = AxisHelper.createAxis({
                pixelSpan: this.viewportIn.width,
                dataDomain: combinedXDomain,
                metaDataColumn: data.xCol,
                formatString: valueFormatter.getFormatString(data.xCol, scatterChartProps.general.formatString),
                outerPadding: 0,
                isScalar: true,
                isVertical: false,
                forcedTickCount: options.forcedTickCount,
                useTickIntervalForDisplayUnits: true,
                isCategoryAxis: true, //scatter doesn"t have a categorical axis, but this is needed for the pane to react correctly to the x-axis toggle one/off
                scaleType: options.categoryAxisScaleType,
                axisDisplayUnits: options.categoryAxisDisplayUnits
            });
            this.xAxisProperties.axis.tickSize(-this.viewportIn.height, 0);
            this.xAxisProperties.axisLabel = this.data.axesLabels.x;

            let combinedDomain = AxisHelper.combineDomain(options.forcedYDomain, [minY, maxY]);

            this.yAxisProperties = AxisHelper.createAxis({
                pixelSpan: this.viewportIn.height,
                dataDomain: combinedDomain,
                metaDataColumn: data.yCol,
                formatString: valueFormatter.getFormatString(data.yCol, scatterChartProps.general.formatString),
                outerPadding: 0,
                isScalar: true,
                isVertical: true,
                forcedTickCount: options.forcedTickCount,
                useTickIntervalForDisplayUnits: true,
                isCategoryAxis: false,
                scaleType: options.valueAxisScaleType,
                axisDisplayUnits: options.valueAxisDisplayUnits
            });
            this.yAxisProperties.axisLabel = this.data.axesLabels.y;

            return [this.xAxisProperties, this.yAxisProperties];
        }

        private enumerateDataPoints(enumeration: ObjectEnumerationBuilder): void {
            let data = this.data;
            if (!data)
                return;

            let seriesCount = data.dataPoints.length;

            if (!data.hasDynamicSeries) {
                let showAllDataPoints: boolean = data.showAllDataPoints;

                // Add default color and show all slices
                enumeration.pushInstance({
                    objectName: "dataPoint",
                    selector: null,
                    properties: {
                        defaultColor: {
                            solid: { color: data.defaultDataPointColor || this.colors.getColorByIndex(0).value }
                        }
                    }
                }).pushInstance({
                    objectName: "dataPoint",
                    selector: null,
                    properties: { showAllDataPoints: showAllDataPoints }
                });

                if (showAllDataPoints) {
                    for (let i = 0; i < seriesCount; i++) {
                        let seriesDataPoints = data.dataPoints[i];
                        enumeration.pushInstance({
                            objectName: "dataPoint",
                            displayName: seriesDataPoints.formattedCategory.getValue(),
                            selector: ColorHelper.normalizeSelector(seriesDataPoints.identity.getSelector(), /*isSingleSeries*/ true),
                            properties: {
                                fill: { solid: { color: seriesDataPoints.fill } }
                            },
                        });
                    }
                }
            }
            else {
                let legendDataPointLength = data.legendData.dataPoints.length;
                for (let i = 0; i < legendDataPointLength; i++) {
                    let series = data.legendData.dataPoints[i];
                    enumeration.pushInstance({
                        objectName: "dataPoint",
                        displayName: series.label,
                        selector: ColorHelper.normalizeSelector(series.identity.getSelector()),
                        properties: {
                            fill: { solid: { color: series.color } }
                        },
                    });
                }
            }
        }

        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstanceEnumeration {
            let enumeration = new ObjectEnumerationBuilder();

            switch (options.objectName) {
                case "dataPoint":
                    let categoricalDataView: DataViewCategorical = this.dataView && this.dataView.categorical ? this.dataView.categorical : null;
                    if (!GradientUtils.hasGradientRole(categoricalDataView))
                        this.enumerateDataPoints(enumeration);
                    break;
                case "categoryAxis":
                    this.getCategoryAxisValues(enumeration);
                    break;
                case "valueAxis":
                    this.getValueAxisValues(enumeration);
                    break;
                case "categoryLabels":
                    if (this.data)
                        dataLabelUtils.enumerateCategoryLabels(enumeration, this.data.dataLabelsSettings, true);
                    else
                        dataLabelUtils.enumerateCategoryLabels(enumeration, null, true);
                    break;
                case "fillPoint":
                    let sizeRange = this.data.sizeRange;
                    // Check if the card should be shown or not
                    if (sizeRange && sizeRange.min)
                        break;

                    enumeration.pushInstance({
                        objectName: "fillPoint",
                        selector: null,
                        properties: {
                            show: this.data.fillPoint,
                        },
                    });
                    break;
                case "backdrop":
                    enumeration.pushInstance({
                        objectName: "backdrop",
                        displayName: "Backdrop",
                        selector: null,
                        properties: {
                            show: this.data.backdrop ? this.data.backdrop.show : false,
                            url: this.data.backdrop ? this.data.backdrop.url : null
                        },
                    });
                    break;
                case "crosshair":
                    enumeration.pushInstance({
                        objectName: "crosshair",
                        selector: null,
                        properties: {
                            show: this.data.crosshair
                        },
                    });
                    break;
                case "outline":
                    enumeration.pushInstance({
                        objectName: "outline",
                        selector: null,
                        properties: {
                            show: this.data.outline
                        },
                    });
                    break;
                case "legend":
                    this.getLegendValue(enumeration);
                    break;
            }
            return enumeration.complete();
        }

        public hasLegend(): boolean {
            return this.data && this.data.hasDynamicSeries;
        }

        private getLegendValue(enumeration: ObjectEnumerationBuilder): void {
            if (!this.hasLegend())
                return;
            let show = DataViewObject.getValue<boolean>(this.legendObjectProperties, legendProps.show, this.legend.isVisible());
            let showTitle = DataViewObject.getValue<boolean>(this.legendObjectProperties, legendProps.showTitle, true);
            let titleText = DataViewObject.getValue<string>(this.legendObjectProperties, legendProps.titleText, this.layerLegendData ? this.layerLegendData.title : "");
            let legendLabelColor = DataViewObject.getValue<string>(this.legendObjectProperties, legendProps.labelColor, LegendData.DefaultLegendLabelFillColor);
            this.legendLabelFontSize = DataViewObject.getValue<number>(this.legendObjectProperties, legendProps.fontSize, EnhancedScatterChart.LegendLabelFontSizeDefault);

            enumeration.pushInstance({
                selector: null,
                properties: {
                    show: show,
                    position: LegendPosition[this.legend.getOrientation()],
                    showTitle: showTitle,
                    titleText: titleText,
                    labelColor: legendLabelColor,
                    fontSize: this.legendLabelFontSize,
                },
                objectName: "legend"
            });
        }

        private getCategoryAxisValues(enumeration: ObjectEnumerationBuilder): void {
            let supportedType = axisType.both;
            let isScalar = true;
            let logPossible = false;
            let scaleOptions = [axisScale.log, axisScale.linear];//until options can be update in propPane, show all options

            if (!isScalar) {
                if (this.categoryAxisProperties) {
                    this.categoryAxisProperties["start"] = null;
                    this.categoryAxisProperties["end"] = null;
                }
            }

            let instance: VisualObjectInstance = {
                selector: null,
                properties: {},
                objectName: "categoryAxis",
                validValues: {
                    axisScale: scaleOptions
                }
            };

            instance.properties["show"] = this.categoryAxisProperties && this.categoryAxisProperties["show"] != null ? this.categoryAxisProperties["show"] : true;
            if (this.yAxisIsCategorical)//in case of e.g. barChart
                instance.properties["position"] = this.valueAxisProperties && this.valueAxisProperties["position"] != null ? this.valueAxisProperties["position"] : yAxisPosition.left;
            if (supportedType === axisType.both) {
                instance.properties["axisType"] = isScalar ? axisType.scalar : axisType.categorical;
            }
            if (isScalar) {
                instance.properties["axisScale"] = (this.categoryAxisProperties && this.categoryAxisProperties["axisScale"] != null && logPossible) ? this.categoryAxisProperties["axisScale"] : axisScale.linear;
                instance.properties["start"] = this.categoryAxisProperties ? this.categoryAxisProperties["start"] : null;
                instance.properties["end"] = this.categoryAxisProperties ? this.categoryAxisProperties["end"] : null;
                instance.properties["labelDisplayUnits"] = this.categoryAxisProperties && this.categoryAxisProperties["labelDisplayUnits"] != null ? this.categoryAxisProperties["labelDisplayUnits"] : EnhancedScatterChart.LabelDisplayUnitsDefault;
            }
            instance.properties["showAxisTitle"] = this.categoryAxisProperties && this.categoryAxisProperties["showAxisTitle"] != null ? this.categoryAxisProperties["showAxisTitle"] : true;

            enumeration
                .pushInstance(instance)
                .pushInstance({
                    selector: null,
                    properties: {
                        axisStyle: this.categoryAxisProperties && this.categoryAxisProperties["axisStyle"] ? this.categoryAxisProperties["axisStyle"] : axisStyle.showTitleOnly,
                        labelColor: this.categoryAxisProperties ? this.categoryAxisProperties["labelColor"] : null
                    },
                    objectName: "categoryAxis",
                    validValues: {
                        axisStyle: this.categoryAxisHasUnitType ? [axisStyle.showTitleOnly, axisStyle.showUnitOnly, axisStyle.showBoth] : [axisStyle.showTitleOnly]
                    }
                });
        }

        //todo: wrap all these object getters and other related stuff into an interface
        private getValueAxisValues(enumeration: ObjectEnumerationBuilder): void {
            let scaleOptions = [axisScale.log, axisScale.linear];  //until options can be update in propPane, show all options
            let logPossible = false;

            let instance: VisualObjectInstance = {
                selector: null,
                properties: {},
                objectName: "valueAxis",
                validValues: {
                    axisScale: scaleOptions,
                    secAxisScale: scaleOptions
                }
            };

            instance.properties["show"] = this.valueAxisProperties && this.valueAxisProperties["show"] != null ? this.valueAxisProperties["show"] : true;

            if (!this.yAxisIsCategorical) {
                instance.properties["position"] = this.valueAxisProperties && this.valueAxisProperties["position"] != null ? this.valueAxisProperties["position"] : yAxisPosition.left;
            }
            instance.properties["axisScale"] = (this.valueAxisProperties && this.valueAxisProperties["axisScale"] != null && logPossible) ? this.valueAxisProperties["axisScale"] : axisScale.linear;
            instance.properties["start"] = this.valueAxisProperties ? this.valueAxisProperties["start"] : null;
            instance.properties["end"] = this.valueAxisProperties ? this.valueAxisProperties["end"] : null;
            instance.properties["showAxisTitle"] = this.valueAxisProperties && this.valueAxisProperties["showAxisTitle"] != null ? this.valueAxisProperties["showAxisTitle"] : true;
            instance.properties["labelDisplayUnits"] = this.valueAxisProperties && this.valueAxisProperties["labelDisplayUnits"] != null ? this.valueAxisProperties["labelDisplayUnits"] : EnhancedScatterChart.LabelDisplayUnitsDefault;

            enumeration
                .pushInstance(instance)
                .pushInstance({
                    selector: null,
                    properties: {
                        axisStyle: this.valueAxisProperties && this.valueAxisProperties["axisStyle"] != null ? this.valueAxisProperties["axisStyle"] : axisStyle.showTitleOnly,
                        labelColor: this.valueAxisProperties ? this.valueAxisProperties["labelColor"] : null
                    },
                    objectName: "valueAxis",
                    validValues: {
                        axisStyle: this.valueAxisHasUnitType ? [axisStyle.showTitleOnly, axisStyle.showUnitOnly, axisStyle.showBoth] : [axisStyle.showTitleOnly]
                    },
                });
        }

        public onClearSelection(): void {
            if (this.interactivityService)
                this.interactivityService.clearSelection();
        }
    }
}
