import {
  HIES_URL,
  COLORS,
  COMMON_AXIS_CONFIG,
  COMMON_VIEW_CONFIG,
  CHART_THEME,
  chartTitle,
  getBaseConfig
} from "./config.js";

export function renderExpenditureBurdenChart() {
  const expenditureBurdenSpec = {
    "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
    width: "container",
    height: 400,
    data: { url: HIES_URL },
    transform: [
      {
        window: [{ op: "rank", as: "latest_row" }],
        sort: [{ field: "date", order: "descending" }],
        groupby: ["state"]
      },
      { filter: "datum.latest_row == 1" },
      { calculate: "toNumber(datum.income_mean)", as: "income_mean_num" },
      { calculate: "toNumber(datum.expenditure_mean)", as: "expenditure_mean_num" },
      { calculate: "datum.expenditure_mean_num / datum.income_mean_num * 100", as: "expenditure_share" },
      {
        window: [{ op: "rank", as: "burden_rank" }],
        sort: [{ field: "expenditure_share", order: "descending" }]
      }
    ],
    layer: [
      {
        mark: { type: "bar", cornerRadiusEnd: 2 },
        encoding: {
          y: {
            field: "state", type: "nominal",
            title: null,
            sort: { field: "expenditure_share", order: "descending" },
            axis: { labelPadding: 8, tickSize: 0 }
          },
          x: {
            field: "expenditure_share", type: "quantitative",
            title: "Expenditure as % of income",
            scale: { zero: true },
            axis: { grid: true, tickSize: 0, labelPadding: 6, format: ".0f" }
          },
          color: {
            condition: { test: "datum.burden_rank <= 5", value: COLORS.risk },
            value: COLORS.inactive
          },
          tooltip: [
            { field: "state", type: "nominal", title: "State" },
            { field: "income_mean_num", type: "quantitative", title: "Mean income (RM)", format: ",.0f" },
            { field: "expenditure_mean_num", type: "quantitative", title: "Mean expenditure (RM)", format: ",.0f" },
            { field: "expenditure_share", type: "quantitative", title: "Expenditure / income (%)", format: ".1f" }
          ]
        }
      },
      {
        mark: { type: "text", align: "left", baseline: "middle", dx: 8, fontSize: 10, fontWeight: 600, color: COLORS.secondary },
        encoding: {
          y: { field: "state", type: "nominal", sort: { field: "expenditure_share", order: "descending" } },
          x: { field: "expenditure_share", type: "quantitative" },
          text: { field: "expenditure_share", type: "quantitative", format: ".1f" }
        }
      }
    ],
    title: chartTitle(
      "Spending burden",
      "Expenditure as share of income."
    ),
    config: getBaseConfig()
  };

  window.vegaEmbed("#expenditure_burden", expenditureBurdenSpec, { actions: false, renderer: "svg" })
    .catch(function (error) {
      console.error("Expenditure burden chart failed to load:", error);
      document.getElementById("expenditure_burden").innerHTML =
        "<p style='color:#ff3b30; font-size:13px;'>Chart failed to load. Check console.</p>";
    });
}
