import {
  DATA_URL,
  COLORS,
  COMMON_AXIS_CONFIG,
  COMMON_VIEW_CONFIG,
  CHART_THEME,
  chartTitle,
  getBaseConfig
} from "./config.js";

export function renderCpiGrowthRankingChart() {
  const cpiGrowthRankingSpec = {
    "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
    width: "container",
    height: 330,
    data: { url: DATA_URL },
    transform: [
      { filter: "datum.division == 'overall'" },
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
        groupby: ["state"]
      },
      {
        window: [{ op: "rank", as: "latest_row" }],
        sort: [{ field: "date", order: "descending" }],
        groupby: ["state"]
      },
      { filter: "datum.latest_row == 1" },
      { calculate: "toNumber(datum.latest_index) - toNumber(datum.start_index)", as: "growth_index" },
      { calculate: "(toNumber(datum.latest_index) - toNumber(datum.start_index)) / toNumber(datum.start_index) * 100", as: "growth_pct" },
      { window: [{ op: "rank", as: "growth_rank" }], sort: [{ field: "growth_index", order: "descending" }] }
    ],
    layer: [
      {
        mark: { type: "bar", cornerRadiusEnd: 2 },
        encoding: {
          y: {
            field: "state", type: "nominal",
            title: null,
            sort: { field: "growth_index", order: "descending" },
            axis: { labelPadding: 8, tickSize: 0 }
          },
          x: {
            field: "growth_index", type: "quantitative",
            title: "CPI increase since 2020, index points",
            scale: { zero: true },
            axis: { grid: true, tickSize: 0, labelPadding: 6 }
          },
          color: {
            condition: { test: "datum.growth_rank <= 5", value: COLORS.risk },
            value: COLORS.inactive
          },
          tooltip: [
            { field: "state", type: "nominal", title: "State" },
            { field: "start_date", type: "nominal", title: "Start date" },
            { field: "latest_date", type: "nominal", title: "Latest date" },
            { field: "start_index", type: "quantitative", title: "Start CPI", format: ".1f" },
            { field: "latest_index", type: "quantitative", title: "Latest CPI", format: ".1f" },
            { field: "growth_index", type: "quantitative", title: "CPI increase", format: ".1f" },
            { field: "growth_pct", type: "quantitative", title: "Growth %", format: ".1f" }
          ]
        }
      },
      {
        mark: { type: "text", align: "left", baseline: "middle", dx: 8, fontSize: 10, fontWeight: 600, color: COLORS.secondary },
        encoding: {
          y: { field: "state", type: "nominal", sort: { field: "growth_index", order: "descending" } },
          x: { field: "growth_index", type: "quantitative" },
          text: { field: "growth_index", type: "quantitative", format: ".1f" }
        }
      }
    ],
    title: chartTitle(
      "Growth ranking",
      "Index-point increase since 2020."
    ),
    config: getBaseConfig()
  };

  window.vegaEmbed("#cpi_growth_ranking", cpiGrowthRankingSpec, { actions: false, renderer: "svg" })
    .catch(function (error) {
      console.error("CPI growth ranking chart failed to load:", error);
      document.getElementById("cpi_growth_ranking").innerHTML =
        "<p style='color:#ff3b30; font-size:13px;'>Chart failed to load. Check console.</p>";
    });
}
