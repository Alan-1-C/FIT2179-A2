import {
  DATA_URL,
  STATE_OPTIONS,
  COLORS,
  COMMON_AXIS_CONFIG,
  COMMON_VIEW_CONFIG,
  CHART_THEME,
  chartTitle,
  getBaseConfig
} from "./config.js";

export function renderCpiTrendChart() {
  const cpiTrendSpec = {
    "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
    width: "container",
    height: 320,
    data: { url: DATA_URL },
    params: [{
      name: "selectedState",
      value: "Selangor",
      bind: {
        input: "select",
        name: "Selected State",
        options: STATE_OPTIONS
      }
    }],
    transform: [{ filter: "datum.division == 'overall'" }],
    layer: [
      {
        mark: { type: "line", strokeWidth: 1, opacity: 0.15, color: COLORS.tertiary },
        encoding: {
          x: {
            field: "date", type: "temporal",
            axis: { format: "%Y", labelAngle: 0, grid: false, tickSize: 0, labelPadding: 6 }
          },
          y: {
            field: "index", type: "quantitative",
            scale: { zero: false },
            axis: { grid: true, tickSize: 0, labelPadding: 6 }
          },
          detail: { field: "state", type: "nominal" }
        }
      },
      {
        transform: [{ filter: "datum.state == selectedState" }],
        mark: { type: "line", strokeWidth: 2.5, color: COLORS.risk },
        encoding: {
          x: { field: "date", type: "temporal" },
          y: { field: "index", type: "quantitative" }
        }
      },
      {
        transform: [{ filter: "datum.state == selectedState" }],
        mark: { type: "point", opacity: 0, size: 60 },
        encoding: {
          x: { field: "date", type: "temporal" },
          y: { field: "index", type: "quantitative" },
          tooltip: [
            { field: "state", type: "nominal", title: "State" },
            { field: "date", type: "temporal", title: "Date", format: "%b %Y" },
            { field: "index", type: "quantitative", title: "CPI", format: ".1f" }
          ]
        }
      }
    ],
    title: chartTitle(
      "CPI trend",
      "Selected state against all states."
    ),
    config: getBaseConfig()
  };

  return window.vegaEmbed("#cpi_trend", cpiTrendSpec, { actions: false, renderer: "svg" })
    .then(result => result.view)
    .catch(function (error) {
      console.error("CPI trend chart failed to load:", error);
      document.getElementById("cpi_trend").innerHTML =
        "<p style='color:#ff3b30; font-size:13px;'>Chart failed to load. Check console.</p>";
    });
}
