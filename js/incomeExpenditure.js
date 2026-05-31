import {
  HIES_URL,
  COLORS,
  COMMON_AXIS_CONFIG,
  COMMON_VIEW_CONFIG,
  CHART_THEME,
  chartTitle,
  getBaseConfig
} from "./config.js";

export function renderIncomeExpenditureChart() {
  const incomeExpenditureSpec = {
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
      { calculate: "datum.expenditure_mean_num / datum.income_mean_num * 100", as: "expenditure_share" }
    ],
    layer: [
      {
        transform: [{
          regression: "expenditure_mean_num",
          on: "income_mean_num"
        }],
        mark: { type: "line", strokeDash: [4, 4], strokeWidth: 1, color: COLORS.inactive },
        encoding: {
          x: { field: "income_mean_num", type: "quantitative" },
          y: { field: "expenditure_mean_num", type: "quantitative" }
        }
      },
      {
        mark: { type: "circle", size: 120, opacity: 0.85, stroke: "#fff", strokeWidth: 1.5 },
        encoding: {
          x: {
            field: "income_mean_num", type: "quantitative",
            title: "Mean monthly household income (RM)",
            scale: { zero: false },
            axis: { grid: true, tickSize: 0, labelPadding: 6, format: ",.0f" }
          },
          y: {
            field: "expenditure_mean_num", type: "quantitative",
            title: "Mean monthly household expenditure (RM)",
            scale: { zero: false },
            axis: { grid: true, tickSize: 0, labelPadding: 6, format: ",.0f" }
          },
          color: {
            field: "expenditure_share", type: "quantitative",
            title: "Burden",
            scale: { range: COLORS.pressureRange },
            legend: { title: "Expenditure\nas % of income", orient: "bottom", direction: "horizontal" }
          },
          tooltip: [
            { field: "state", type: "nominal", title: "State" },
            { field: "income_mean_num", type: "quantitative", title: "Mean income (RM)", format: ",.0f" },
            { field: "expenditure_mean_num", type: "quantitative", title: "Mean expenditure (RM)", format: ",.0f" },
            { field: "expenditure_share", type: "quantitative", title: "Expenditure / income (%)", format: ".1f" }
          ]
        }
      }
    ],
    title: chartTitle(
      "Income vs spending",
      "Latest state means."
    ),
    config: getBaseConfig()
  };

  window.vegaEmbed("#income_expenditure", incomeExpenditureSpec, { actions: false, renderer: "svg" })
    .catch(function (error) {
      console.error("Income vs expenditure chart failed to load:", error);
      document.getElementById("income_expenditure").innerHTML =
        "<p style='color:#ff3b30; font-size:13px;'>Chart failed to load. Check console.</p>";
    });
}
