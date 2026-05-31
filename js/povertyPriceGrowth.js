import {
  DATA_URL,
  HIES_URL,
  COLORS,
  COMMON_AXIS_CONFIG,
  COMMON_VIEW_CONFIG,
  CHART_THEME,
  chartTitle,
  getBaseConfig
} from "./config.js";

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    const row = {};
    headers.forEach((header, index) => {
      row[header.trim()] = values[index] ? values[index].trim() : "";
    });
    return row;
  });
}

function buildCpiGrowthByState(cpiRows) {
  const rows = cpiRows
    .filter((d) => d.division === "overall")
    .filter((d) => d.date >= "2020-01-01")
    .map((d) => ({ state: d.state, date: d.date, index: Number(d.index) }))
    .filter((d) => !Number.isNaN(d.index));

  const grouped = new Map();
  rows.forEach((row) => {
    if (!grouped.has(row.state)) grouped.set(row.state, []);
    grouped.get(row.state).push(row);
  });

  const growthByState = new Map();
  grouped.forEach((stateRows, state) => {
    stateRows.sort((a, b) => new Date(a.date) - new Date(b.date));
    const earliest = stateRows[0];
    const latest = stateRows[stateRows.length - 1];
    const growthIndex = latest.index - earliest.index;
    const growthPct = (growthIndex / earliest.index) * 100;
    growthByState.set(state, {
      state, start_date: earliest.date, latest_date: latest.date,
      start_index: earliest.index, latest_index: latest.index,
      cpi_growth_index: growthIndex, cpi_growth_pct: growthPct
    });
  });
  return growthByState;
}

function getLatestHiesByState(hiesRows) {
  const grouped = new Map();
  hiesRows.forEach((row) => {
    if (!grouped.has(row.state)) grouped.set(row.state, []);
    grouped.get(row.state).push(row);
  });

  const latestByState = new Map();
  grouped.forEach((stateRows, state) => {
    stateRows.sort((a, b) => new Date(a.date) - new Date(b.date));
    const latest = stateRows[stateRows.length - 1];
    const incomeMean = Number(latest.income_mean);
    const expenditureMean = Number(latest.expenditure_mean);
    latestByState.set(state, {
      state, hies_date: latest.date,
      income_mean: incomeMean, expenditure_mean: expenditureMean,
      poverty: Number(latest.poverty),
      expenditure_share: (expenditureMean / incomeMean) * 100
    });
  });
  return latestByState;
}

export async function renderPovertyPriceGrowthChart() {
  try {
    const [cpiResponse, hiesResponse] = await Promise.all([fetch(DATA_URL), fetch(HIES_URL)]);
    const cpiRows = parseCSV(await cpiResponse.text());
    const hiesRows = parseCSV(await hiesResponse.text());

    const growthByState = buildCpiGrowthByState(cpiRows);
    const hiesByState = getLatestHiesByState(hiesRows);

    const mergedData = [];
    growthByState.forEach((growth, state) => {
      const hies = hiesByState.get(state);
      if (hies) mergedData.push({ state, ...growth, ...hies });
    });

    const povertyPriceGrowthSpec = {
      "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
      width: "container",
      height: 380,
      data: { values: mergedData },
      layer: [
        {
          mark: { type: "rule", strokeDash: [4, 4], strokeWidth: 1, color: COLORS.inactive },
          encoding: {
            x: { aggregate: "mean", field: "cpi_growth_index", type: "quantitative" }
          }
        },
        {
          mark: { type: "rule", strokeDash: [4, 4], strokeWidth: 1, color: COLORS.inactive },
          encoding: {
            y: { aggregate: "mean", field: "poverty", type: "quantitative" }
          }
        },
        {
          mark: { type: "circle", opacity: 0.85, stroke: "#fff", strokeWidth: 1.5 },
          encoding: {
            x: {
              field: "cpi_growth_index", type: "quantitative",
              title: "CPI increase since 2020 (index points)",
              scale: { zero: false },
              axis: { grid: true, tickSize: 0, labelPadding: 6 }
            },
            y: {
              field: "poverty", type: "quantitative",
              title: "Poverty rate (%)",
              scale: { zero: false },
              axis: { grid: true, tickSize: 0, labelPadding: 6 }
            },
            size: {
              field: "expenditure_share", type: "quantitative",
              scale: { range: [80, 600] },
              legend: { title: "Spending burden\nas % of income" }
            },
            color: {
              field: "expenditure_share", type: "quantitative",
              scale: { range: COLORS.pressureRange },
              legend: null
            },
            tooltip: [
              { field: "state", type: "nominal", title: "State" },
              { field: "cpi_growth_index", type: "quantitative", title: "CPI increase", format: ".1f" },
              { field: "poverty", type: "quantitative", title: "Poverty rate (%)", format: ".1f" },
              { field: "expenditure_share", type: "quantitative", title: "Expenditure / income (%)", format: ".1f" }
            ]
          }
        },
        {
          transform: [{ filter: "datum.poverty >= 8 || datum.cpi_growth_index >= 28 || datum.expenditure_share >= 68" }],
          mark: { type: "text", align: "left", baseline: "middle", dx: 8, fontSize: 10, fontWeight: 600, color: COLORS.riskDark },
          encoding: {
            x: { field: "cpi_growth_index", type: "quantitative" },
            y: { field: "poverty", type: "quantitative" },
            text: { field: "state", type: "nominal" }
          }
        }
      ],
    title: chartTitle(
        "Poverty overlap",
        "Poverty, price growth, and burden."
      ),
      config: getBaseConfig()
    };

    window.vegaEmbed("#poverty_price_growth", povertyPriceGrowthSpec, { actions: false, renderer: "svg" })
      .catch(function (error) {
        console.error("Poverty vs price growth chart failed to load:", error);
        document.getElementById("poverty_price_growth").innerHTML =
          "<p style='color:#ff3b30; font-size:13px;'>Chart failed to load. Check console.</p>";
      });
  } catch (error) {
    console.error("Failed to load data:", error);
  }
}
