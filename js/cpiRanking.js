import {
  DATA_URL,
  COLORS,
  COMMON_AXIS_CONFIG,
  COMMON_VIEW_CONFIG,
  CHART_THEME,
  chartTitle,
  getBaseConfig
} from "./config.js";

export function renderCpiRankingChart() {
  const cpiRankingSpec = {
    "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
    width: "container",
    height: 380,
    data: { url: DATA_URL },
    transform: [
      { filter: "datum.division == 'overall'" },
      {
        window: [{ op: "rank", as: "date_rank" }],
        sort: [{ field: "date", order: "descending" }],
        groupby: ["state"]
      },
      { filter: "datum.date_rank == 1" },
      {
        window: [{ op: "rank", as: "state_rank" }],
        sort: [{ field: "index", order: "descending" }]
      }
    ],
    layer: [
      {
        mark: { type: "bar", cornerRadiusEnd: 2 },
        encoding: {
          x: {
            field: "state", type: "nominal",
            title: null,
            sort: { field: "index", order: "descending" },
            axis: { labelAngle: -30, labelLimit: 100, labelPadding: 6, tickSize: 0 }
          },
          y: {
            field: "index", type: "quantitative",
            title: "Latest overall CPI, 2010 = 100",
            scale: { zero: true },
            axis: { grid: true, tickSize: 0, labelPadding: 6 }
          },
          color: {
            condition: { test: "datum.state_rank <= 3", value: COLORS.risk },
            value: COLORS.inactive
          },
          tooltip: [
            { field: "state", type: "nominal", title: "State" },
            { field: "date", type: "temporal", title: "Latest date", format: "%b %Y" },
            { field: "index", type: "quantitative", title: "CPI", format: ".1f" },
            { field: "state_rank", type: "quantitative", title: "Rank" }
          ]
        }
      },
      {
        mark: { type: "text", dy: -8, fontSize: 10, fontWeight: 600, color: COLORS.secondary },
        encoding: {
          x: { field: "state", type: "nominal", sort: { field: "index", order: "descending" } },
          y: { field: "index", type: "quantitative" },
          text: { field: "index", type: "quantitative", format: ".1f" }
        }
      }
    ],
    title: chartTitle(
      "Latest CPI",
      "State ranking by latest index."
    ),
    config: getBaseConfig()
  };

  window.vegaEmbed("#cpi_ranking", cpiRankingSpec, { actions: false, renderer: "svg" })
    .catch(function (error) {
      console.error("CPI ranking chart failed to load:", error);
      document.getElementById("cpi_ranking").innerHTML =
        "<p style='color:#ff3b30; font-size:13px;'>Chart failed to load. Check console.</p>";
    });
}
