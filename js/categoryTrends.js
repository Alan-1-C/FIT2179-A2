import {
  DATA_URL,
  STATE_OPTIONS,
  COLORS,
  chartTitle,
  FONT,
  getBaseConfig
} from "./config.js";

export function renderCategoryTrendsChart() {
  const categoryTrendsSpec = {
    "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
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
    transform: [
      { calculate: "toString(datum.division)", as: "division_code" },
      {
        calculate:
          "datum.division_code == '01' || datum.division_code == '1' ? 'Food' :" +
          " datum.division_code == '04' || datum.division_code == '4' ? 'Housing' :" +
          " datum.division_code == '07' || datum.division_code == '7' ? 'Transport' :" +
          " datum.division_code == '11' ? 'Restaurants' : 'Other'",
        as: "division_short"
      },
      { filter: "datum.division_short != 'Other'" },
      { filter: "datum.state == selectedState" }
    ],
    facet: {
      field: "division_short",
      type: "nominal",
      title: null,
      sort: ["Food", "Housing", "Transport", "Restaurants"],
      header: {
        labelFont: FONT,
        labelFontSize: 12,
        labelFontWeight: "600",
        labelColor: COLORS.secondary,
        labelPadding: 6
      }
    },
    columns: 2,
    spec: {
      width: 360,
      height: 180,
      layer: [
        {
          mark: { type: "line", strokeWidth: 2, color: COLORS.risk },
          encoding: {
            x: {
              field: "date",
              type: "temporal",
              axis: { format: "%Y", labelAngle: 0, grid: false, tickSize: 0, labelPadding: 4 }
            },
            y: {
              field: "index",
              type: "quantitative",
              scale: { zero: false },
              axis: { grid: true, tickSize: 0, labelPadding: 4 }
            }
          }
        },
        {
          mark: { type: "point", opacity: 0, size: 40 },
          encoding: {
            x: { field: "date", type: "temporal" },
            y: { field: "index", type: "quantitative" },
            tooltip: [
              { field: "state", type: "nominal", title: "State" },
              { field: "division_short", type: "nominal", title: "Category" },
              { field: "date", type: "temporal", title: "Date", format: "%b %Y" },
              { field: "index", type: "quantitative", title: "CPI", format: ".1f" }
            ]
          }
        }
      ]
    },
    resolve: { scale: { y: "independent" } },
    spacing: { column: 40, row: 40 },
    title: chartTitle(
      "Category trends",
      "Selected state, key categories."
    ),
    config: getBaseConfig()
  };

  return window.vegaEmbed("#category_trends", categoryTrendsSpec, { actions: false, renderer: "svg" })
    .then(result => result.view)
    .catch(function (error) {
      console.error("Category trends chart failed to load:", error);
      document.getElementById("category_trends").innerHTML =
        "<p style='color:#ff3b30; font-size:13px;'>Chart failed to load. Check console.</p>";
    });
}
