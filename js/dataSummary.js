import { DATA_URL, HIES_URL } from "./config.js";

export function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(",").map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ? values[index].trim() : "";
    });
    return row;
  });
}

function formatNumber(value, digits = 1) {
  return Number(value).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}

function formatRM(value) {
  return `RM ${Math.round(value).toLocaleString("en-US")}`;
}

function formatMonth(value) {
  return new Intl.DateTimeFormat("en", { month: "short", year: "numeric" })
    .format(new Date(value));
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function getOverallCpiRows(cpiRows) {
  return cpiRows
    .filter((row) => row.division === "overall")
    .map((row) => ({
      state: row.state,
      date: normaliseDate(row.date),
      index: Number(row.index)
    }))
    .filter((row) => Number.isFinite(row.index));
}

function normaliseDate(value) {
  return value.replace(/\//g, "-");
}

function getLatestByState(rows) {
  const grouped = new Map();
  rows.forEach((row) => {
    if (!grouped.has(row.state)) grouped.set(row.state, []);
    grouped.get(row.state).push(row);
  });

  const latestRows = [];
  grouped.forEach((stateRows) => {
    stateRows.sort((a, b) => new Date(a.date) - new Date(b.date));
    latestRows.push(stateRows[stateRows.length - 1]);
  });
  return latestRows;
}

function getPost2020Growth(rows) {
  const grouped = new Map();
  rows
    .filter((row) => row.date >= "2020-01-01")
    .forEach((row) => {
      if (!grouped.has(row.state)) grouped.set(row.state, []);
      grouped.get(row.state).push(row);
    });

  const growthRows = [];
  grouped.forEach((stateRows, state) => {
    stateRows.sort((a, b) => new Date(a.date) - new Date(b.date));
    const start = stateRows[0];
    const latest = stateRows[stateRows.length - 1];
    growthRows.push({
      state,
      start_date: start.date,
      latest_date: latest.date,
      start_index: start.index,
      latest_index: latest.index,
      growth_index: latest.index - start.index,
      growth_pct: ((latest.index - start.index) / start.index) * 100
    });
  });
  return growthRows.sort((a, b) => b.growth_index - a.growth_index);
}

function getLatestHiesRows(hiesRows) {
  return getLatestByState(hiesRows.map((row) => ({
    state: row.state,
    date: normaliseDate(row.date),
    income_mean: Number(row.income_mean),
    expenditure_mean: Number(row.expenditure_mean),
    poverty: Number(row.poverty)
  }))).map((row) => ({
    ...row,
    expenditure_share: (row.expenditure_mean / row.income_mean) * 100,
    surplus: row.income_mean - row.expenditure_mean
  }));
}

function getCategorySummary(cpiRows) {
  const wanted = new Map([
    ["1", "Food"],
    ["01", "Food"],
    ["Food and non-alcoholic beverages", "Food"],
    ["4", "Housing"],
    ["04", "Housing"],
    ["Housing, water, electricity, gas and other fuels", "Housing"],
    ["7", "Transport"],
    ["07", "Transport"],
    ["Transport", "Transport"]
  ]);

  const rows = cpiRows
    .map((row) => ({
      state: row.state,
      date: normaliseDate(row.date),
      category: wanted.get(String(row.division)),
      index: Number(row.index)
    }))
    .filter((row) => row.category && Number.isFinite(row.index) && row.date >= "2020-01-01");

  const grouped = new Map();
  rows.forEach((row) => {
    const key = `${row.state}|${row.category}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(row);
  });

  const growthRows = [];
  grouped.forEach((categoryRows) => {
    categoryRows.sort((a, b) => new Date(a.date) - new Date(b.date));
    const start = categoryRows[0];
    const latest = categoryRows[categoryRows.length - 1];
    growthRows.push({
      category: latest.category,
      state: latest.state,
      latest_index: latest.index,
      growth_pct: ((latest.index - start.index) / start.index) * 100,
      growth_index: latest.index - start.index
    });
  });

  const aggregate = {};
  ["Food", "Housing", "Transport"].forEach((category) => {
    const categoryRows = growthRows.filter((row) => row.category === category);
    aggregate[category] = {
      growth_pct: average(categoryRows.map((row) => row.growth_pct)),
      latest_index: average(categoryRows.map((row) => row.latest_index)),
      growth_index: average(categoryRows.map((row) => row.growth_index))
    };
  });

  return aggregate;
}

function average(values) {
  const usable = values.filter((value) => Number.isFinite(value));
  return usable.reduce((sum, value) => sum + value, 0) / usable.length;
}

function minMaxScale(value, min, max) {
  if (max === min) return 0;
  return ((value - min) / (max - min)) * 100;
}

export function buildPressureRows(cpiRows, hiesRows) {
  const growthRows = getPost2020Growth(getOverallCpiRows(cpiRows));
  const hiesRowsLatest = getLatestHiesRows(hiesRows);
  const hiesByState = new Map(hiesRowsLatest.map((row) => [row.state, row]));
  const baseRows = growthRows
    .map((growth) => ({ ...growth, ...hiesByState.get(growth.state) }))
    .filter((row) => Number.isFinite(row.income_mean));

  const cpiValues = baseRows.map((row) => row.growth_index);
  const burdenValues = baseRows.map((row) => row.expenditure_share);
  const povertyValues = baseRows.map((row) => row.poverty);
  const cpiMin = Math.min(...cpiValues);
  const cpiMax = Math.max(...cpiValues);
  const burdenMin = Math.min(...burdenValues);
  const burdenMax = Math.max(...burdenValues);
  const povertyMin = Math.min(...povertyValues);
  const povertyMax = Math.max(...povertyValues);

  return baseRows
    .map((row) => ({
      ...row,
      pressure_index: (
        minMaxScale(row.growth_index, cpiMin, cpiMax) +
        minMaxScale(row.expenditure_share, burdenMin, burdenMax) +
        minMaxScale(row.poverty, povertyMin, povertyMax)
      ) / 3
    }))
    .sort((a, b) => b.pressure_index - a.pressure_index);
}

export async function renderMetricSummary() {
  const [cpiResponse, hiesResponse] = await Promise.all([fetch(DATA_URL), fetch(HIES_URL)]);
  const cpiRows = parseCSV(await cpiResponse.text());
  const hiesRows = parseCSV(await hiesResponse.text());

  const overallRows = getOverallCpiRows(cpiRows);
  const latestCpiRows = getLatestByState(overallRows);
  const growthRows = getPost2020Growth(overallRows);
  const hiesRowsLatest = getLatestHiesRows(hiesRows);
  const categories = getCategorySummary(cpiRows);
  const pressureRows = buildPressureRows(cpiRows, hiesRows);

  const nationalCpi = average(latestCpiRows.map((row) => row.index));
  const latestCpiSorted = [...latestCpiRows].sort((a, b) => b.index - a.index);
  const highestGrowth = growthRows[0];
  const lowestGrowth = growthRows[growthRows.length - 1];
  const highestSurplus = [...hiesRowsLatest].sort((a, b) => b.surplus - a.surplus)[0];
  const meanIncome = average(hiesRowsLatest.map((row) => row.income_mean));
  const topPressure = pressureRows[0];
  const lowestPressure = pressureRows[pressureRows.length - 1];

  const categoryLeader = Object.entries(categories)
    .sort(([, a], [, b]) => b.growth_pct - a.growth_pct)[0];

  setText("metric_national_cpi", formatNumber(nationalCpi, 1));
  setText("metric_national_cpi_trend", `Latest state average, ${formatMonth(latestCpiRows[0].date)}`);
  setText("metric_highest_growth_state", highestGrowth.state.replace("W.P. ", ""));
  setText("metric_highest_growth_value", `+${formatNumber(highestGrowth.growth_index, 1)} CPI points since 2020`);
  setText("metric_stability_state", lowestGrowth.state.replace("W.P. ", ""));
  setText("metric_stability_value", `+${formatNumber(lowestGrowth.growth_index, 1)} CPI points since 2020`);
  setText("metric_core_driver", categoryLeader[0]);
  setText("metric_core_driver_value", `+${formatNumber(categoryLeader[1].growth_pct, 1)}% since 2020`);

  setText("metric_food_growth", `${formatNumber(categories.Food.growth_pct, 1)}%`);
  setText("metric_food_growth_value", "Highest essential category growth");
  setText("metric_housing_growth", `${formatNumber(categories.Housing.growth_pct, 1)}%`);
  setText("metric_housing_growth_value", "Post-2020 category growth");
  setText("metric_transport_index", formatNumber(categories.Transport.latest_index, 1));
  setText("metric_transport_index_value", "Latest national state average");

  setText("metric_income_mean", formatRM(meanIncome));
  setText("metric_income_mean_value", "Latest mean across states");
  setText("metric_highest_surplus", highestSurplus.state.replace("W.P. ", ""));
  setText("metric_highest_surplus_value", `${formatRM(highestSurplus.surplus)} income buffer`);

  setText("metric_max_pressure", formatNumber(topPressure.pressure_index, 1));
  setText("metric_vulnerability_state", topPressure.state.replace("W.P. ", ""));
  setText("metric_vulnerability_value", "Highest composite pressure");
  setText("metric_resilience_score", formatNumber(100 - lowestPressure.pressure_index, 1));
  setText("metric_resilience_value", `${lowestPressure.state.replace("W.P. ", "")} has the lowest pressure`);
}
