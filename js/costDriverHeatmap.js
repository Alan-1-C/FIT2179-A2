import {
  DATA_URL,
  COLORS,
  COMMON_AXIS_CONFIG,
  COMMON_VIEW_CONFIG,
  CHART_THEME,
  chartTitle,
  getBaseConfig
} from "./config.js";

export function renderCostDriverHeatmap() {
  const costDriverHeatmapSpec = {
    "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
    width: "container",
    height: 380,
    data: { url: DATA_URL },
    transform: [
      { filter: "datum.division != 'overall'" },
      {
        calculate:
          "datum.division == '1' || datum.division == 'Food and non-alcoholic beverages' ? 'Food' :" +
          " datum.division == '4' || datum.division == 'Housing, water, electricity, gas and other fuels' ? 'Housing' :" +
          " datum.division == '6' || datum.division == 'Health' ? 'Health' :" +
          " datum.division == '7' || datum.division == 'Transport' ? 'Transport' :" +
          " datum.division == '10' || datum.division == 'Education' ? 'Education' :" +
          " datum.division == '11' || datum.division == 'Restaurants and hotels' ? 'Restaurants' : 'Other'",
        as: "division_short"
      },
      { filter: "datum.division_short != 'Other'" },
      { filter: "datum.date >= '2020-01-01'" },
      {
        window: [
          { op: "first_value", field: "index", as: "start_index" },
          { op: "last_value", field: "index", as: "latest_index" },
          { op: "first_value", field: "date", as: "start_date" },
          { op: "last_value", field: "date", as: "latest_date" }
        ],
        frame: [null, null],
        sort: [{ field: "date", order: "ascending" }],
        groupby: ["state", "division_short"]
      },
      { window: [{ op: "rank", as: "latest_row" }], sort: [{ field: "date", order: "descending" }], groupby: ["state", "division_short"] },
      { filter: "datum.latest_row == 1" },
      { calculate: "toNumber(datum.latest_index) - toNumber(datum.start_index)", as: "growth_index" },
      { calculate: "(toNumber(datum.latest_index) - toNumber(datum.start_index)) / toNumber(datum.start_index) * 100", as: "growth_pct" }
    ],
    layer: [
      {
        mark: { type: "rect", cornerRadius: 2 },
        encoding: {
          x: {
            field: "division_short", type: "nominal",
            title: null,
            sort: ["Food", "Housing", "Transport", "Restaurants", "Health", "Education"],
            axis: { labelAngle: 0, labelPadding: 6, tickSize: 0 }
          },
          y: {
            field: "state", type: "nominal",
            title: null,
            axis: { labelPadding: 6, tickSize: 0 }
          },
          color: {
            field: "growth_index", type: "quantitative",
            title: "CPI increase",
            scale: { range: COLORS.pressureRange },
            legend: { title: "CPI increase\n(index pts)" }
          },
          tooltip: [
            { field: "state", type: "nominal", title: "State" },
            { field: "division_short", type: "nominal", title: "Category" },
            { field: "start_index", type: "quantitative", title: "Start CPI", format: ".1f" },
            { field: "latest_index", type: "quantitative", title: "Latest CPI", format: ".1f" },
            { field: "growth_index", type: "quantitative", title: "CPI increase", format: ".1f" },
            { field: "growth_pct", type: "quantitative", title: "Growth %", format: ".1f" }
          ]
        }
      }
    ],
    title: chartTitle(
      "Category pressure",
      "Post-2020 growth by state."
    ),
    config: getBaseConfig()
  };

  window.vegaEmbed("#cost_driver_heatmap", costDriverHeatmapSpec, { actions: false, renderer: "svg" })
    .catch(function (error) {
      console.error("Cost driver heatmap failed to load:", error);
      document.getElementById("cost_driver_heatmap").innerHTML =
        "<p style='color:#ff3b30; font-size:13px;'>Chart failed to load. Check console.</p>";
    });
}
