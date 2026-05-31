import {
  DATA_URL,
  HIES_URL,
  COLORS,
  chartTitle,
  getBaseConfig
} from "./config.js";
import { buildPressureRows, parseCSV } from "./dataSummary.js";

export async function renderFinalPressureIndexChart() {
  try {
    const [cpiResponse, hiesResponse] = await Promise.all([fetch(DATA_URL), fetch(HIES_URL)]);
    const cpiRows = parseCSV(await cpiResponse.text());
    const hiesRows = parseCSV(await hiesResponse.text());
    const pressureRows = buildPressureRows(cpiRows, hiesRows);
    const rankedPressureRows = pressureRows.map((row, index) => ({
      ...row,
      pressure_rank: index + 1
    }));

    const finalPressureSpec = {
      "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
      width: "container",
      height: 440,
      data: { values: rankedPressureRows },
      layer: [
        {
          mark: { type: "bar", cornerRadiusEnd: 2 },
          encoding: {
            y: {
              field: "state",
              type: "nominal",
              title: null,
              sort: { field: "pressure_index", order: "descending" },
              axis: { labelPadding: 8, tickSize: 0 }
            },
            x: {
              field: "pressure_index",
              type: "quantitative",
              title: "Final cost pressure index (0-100)",
              scale: { domain: [0, 100] },
              axis: { grid: true, tickSize: 0, labelPadding: 6 }
            },
            color: {
              condition: { test: "datum.pressure_rank <= 3", value: COLORS.primary },
              value: COLORS.inactive
            },
            tooltip: [
              { field: "state", type: "nominal", title: "State" },
              { field: "growth_index", type: "quantitative", title: "CPI increase", format: ".1f" },
              { field: "expenditure_share", type: "quantitative", title: "Expenditure / income (%)", format: ".1f" },
              { field: "poverty", type: "quantitative", title: "Poverty rate (%)", format: ".1f" },
              { field: "pressure_index", type: "quantitative", title: "Pressure index", format: ".1f" }
            ]
          }
        },
        {
          mark: { type: "text", align: "left", baseline: "middle", dx: 8, fontSize: 10, fontWeight: 700, color: COLORS.riskDark },
          encoding: {
            y: { field: "state", type: "nominal", sort: { field: "pressure_index", order: "descending" } },
            x: { field: "pressure_index", type: "quantitative" },
            text: { field: "pressure_index", type: "quantitative", format: ".0f" }
          }
        }
      ],
      title: chartTitle(
        "Pressure index",
        "Composite state ranking."
      ),
      config: getBaseConfig()
    };

    window.vegaEmbed("#final_pressure_index", finalPressureSpec, { actions: false, renderer: "svg" })
      .catch(function (error) {
        console.error("Final pressure index chart failed to load:", error);
        document.getElementById("final_pressure_index").innerHTML =
          "<p style='color:#ff3b30; font-size:13px;'>Chart failed to load. Check console.</p>";
      });
  } catch (error) {
    console.error("Failed to load data:", error);
  }
}
