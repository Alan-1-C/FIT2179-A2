import {
  DATA_URL,
  COLORS,
  chartTitle,
  getBaseConfig
} from "./config.js";

const TOPO_URL = "data/ne_10m_admin_1_states_provinces.json";
const EAST_MALAYSIA_STATES = new Set(["Sabah", "Sarawak", "W.P. Labuan"]);
const EAST_MALAYSIA_LONGITUDE_SHIFT = -2.8;

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

function normaliseStateName(name) {
  const nameMap = {
    "Johor": "Johor", "Kedah": "Kedah", "Kelantan": "Kelantan",
    "Melaka": "Melaka", "Malacca": "Melaka",
    "Negeri Sembilan": "Negeri Sembilan",
    "Pahang": "Pahang", "Perak": "Perak", "Perlis": "Perlis",
    "Pulau Pinang": "Pulau Pinang", "Penang": "Pulau Pinang",
    "Sabah": "Sabah", "Sarawak": "Sarawak", "Selangor": "Selangor",
    "Terengganu": "Terengganu", "Trengganu": "Terengganu",
    "Kuala Lumpur": "W.P. Kuala Lumpur",
    "Labuan": "W.P. Labuan", "Putrajaya": "W.P. Putrajaya"
  };
  return nameMap[name] || name;
}

function buildGrowthByState(cpiRows) {
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
    const growth = latest.index - earliest.index;
    growthByState.set(state, {
      state,
      start_date: earliest.date,
      latest_date: latest.date,
      start_index: earliest.index,
      latest_index: latest.index,
      growth_index: growth,
      growth_pct: (growth / earliest.index) * 100
    });
  });
  return growthByState;
}

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en", { month: "short", year: "numeric" }).format(new Date(value));
}

function buildMapSummary(rows) {
  const ranked = rows
    .filter((row) => Number.isFinite(row.growth_index))
    .sort((a, b) => b.growth_index - a.growth_index);

  const highest = ranked[0];
  const lowest = ranked[ranked.length - 1];
  const spread = highest.growth_index - lowest.growth_index;

  return {
    highest: highest.state_name,
    highestValue: highest.growth_index.toFixed(1),
    lowest: lowest.state_name,
    lowestValue: lowest.growth_index.toFixed(1),
    spread: spread.toFixed(1),
    period: `${formatDate(highest.start_date)} - ${formatDate(highest.latest_date)}`
  };
}

function getRankedStates(rows) {
  return rows
    .filter((row) => Number.isFinite(row.growth_index))
    .sort((a, b) => b.growth_index - a.growth_index);
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function updateGeographyMetricCards(rankedRows, summary) {
  const highest = rankedRows[0];
  const lowest = rankedRows[rankedRows.length - 1];
  setText("geo_high_growth_state", highest.state_name);
  setText("geo_high_growth_value", `+${highest.growth_index.toFixed(1)} CPI points`);
  setText("geo_low_growth_state", lowest.state_name);
  setText("geo_low_growth_value", `+${lowest.growth_index.toFixed(1)} CPI points`);
  setText("geo_growth_spread", summary.spread);
  setText("geo_growth_period", `${summary.period} gap`);
}

function renderTopGrowthList(target, rankedRows) {
  if (!target) return;
  target.innerHTML = rankedRows.slice(0, 3).map((row, index) => `
    <li>
      <strong>${index + 1}. ${row.state_name}</strong>
      <span>+${row.growth_index.toFixed(1)}</span>
    </li>
  `).join("");
}

function renderSelectedState(target, state) {
  if (!target || !state) return;
  target.innerHTML = `
    <span class="map-selected-title">Hovered State</span>
    <strong>${state.state_name}</strong>
    <div class="map-selected-grid">
      <div><span>CPI Increase</span><b>+${state.growth_index.toFixed(1)}</b></div>
      <div><span>Growth</span><b>${state.growth_pct.toFixed(1)}%</b></div>
      <div><span>2020 CPI</span><b>${state.start_index.toFixed(1)}</b></div>
      <div><span>Latest CPI</span><b>${state.latest_index.toFixed(1)}</b></div>
    </div>
  `;
}

function topojsonToGeojson(topojsonData) {
  const t = window.topojson || topojson;
  return t.feature(
    topojsonData,
    topojsonData.objects.ne_10m_admin_1_states_provinces
  );
}

function shiftCoordinates(coordinates, longitudeShift) {
  if (typeof coordinates[0] === "number") {
    return [coordinates[0] + longitudeShift, coordinates[1]];
  }
  return coordinates.map((item) => shiftCoordinates(item, longitudeShift));
}

function shiftFeatureLongitude(feature, longitudeShift) {
  return {
    ...feature,
    geometry: {
      ...feature.geometry,
      coordinates: shiftCoordinates(feature.geometry.coordinates, longitudeShift)
    }
  };
}

export async function renderCpiGrowthMap() {
  try {
    const [cpiResponse, topoResponse] = await Promise.all([fetch(DATA_URL), fetch(TOPO_URL)]);
    const cpiRows = parseCSV(await cpiResponse.text());
    const topojsonData = await topoResponse.json();
    const growthByState = buildGrowthByState(cpiRows);
    const geojson = topojsonToGeojson(topojsonData);

    const malaysiaFeatures = geojson.features.filter((feature) =>
      feature.properties.admin === "Malaysia" || feature.properties.iso_a2 === "MY"
    );

    const mergedFeatures = malaysiaFeatures.map((feature) => {
      const stateName = normaliseStateName(feature.properties.name);
      const stats = growthByState.get(stateName);
      const longitudeShift = EAST_MALAYSIA_STATES.has(stateName) ? EAST_MALAYSIA_LONGITUDE_SHIFT : 0;
      const shiftedFeature = longitudeShift ? shiftFeatureLongitude(feature, longitudeShift) : feature;
      return {
        ...shiftedFeature,
        state_name: stateName,
        start_date: stats ? stats.start_date : null,
        latest_date: stats ? stats.latest_date : null,
        start_index: stats ? stats.start_index : null,
        latest_index: stats ? stats.latest_index : null,
        growth_index: stats ? stats.growth_index : null,
        growth_pct: stats ? stats.growth_pct : null,
        properties: {
          ...shiftedFeature.properties,
          state_name: stateName,
          start_date: stats ? stats.start_date : null,
          latest_date: stats ? stats.latest_date : null,
          start_index: stats ? stats.start_index : null,
          latest_index: stats ? stats.latest_index : null,
          growth_index: stats ? stats.growth_index : null,
          growth_pct: stats ? stats.growth_pct : null,
          longitude: feature.properties.longitude + longitudeShift
        }
      };
    });

    const rankedStates = getRankedStates(mergedFeatures);
    const summary = buildMapSummary(mergedFeatures);
    const labelledStates = new Set(["Selangor", "Pahang"]);
    const labelFeatures = mergedFeatures
      .filter((feature) => labelledStates.has(feature.state_name))
      .map((feature) => ({
        state_name: feature.state_name,
        growth_index: feature.growth_index,
        longitude: feature.properties.longitude,
        latitude: feature.properties.latitude
      }));

    const summaryElement = document.getElementById("cpi_growth_map_summary");
    if (summaryElement) {
      summaryElement.innerHTML = `
        <div class="map-stat">
          <span class="map-stat-label">Highest Growth</span>
          <strong>${summary.highest}</strong>
          <span>+${summary.highestValue} CPI points</span>
        </div>
        <div class="map-stat">
          <span class="map-stat-label">Lowest Growth</span>
          <strong>${summary.lowest}</strong>
          <span>+${summary.lowestValue} CPI points</span>
        </div>
        <div class="map-stat">
          <span class="map-stat-label">Growth Spread</span>
          <strong>${summary.spread}</strong>
          <span>CPI point gap, ${summary.period}</span>
        </div>
      `;
    }

    const selectedElement = document.getElementById("cpi_growth_map_selected");
    const topListElement = document.getElementById("cpi_growth_map_top3");
    updateGeographyMetricCards(rankedStates, summary);
    renderTopGrowthList(topListElement, rankedStates);
    renderSelectedState(selectedElement, rankedStates[0]);

    const cpiGrowthMapSpec = {
      "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
      width: "container",
      height: 300,
      projection: {
        type: "mercator",
        center: [107.6, 4.1],
        scale: 1850
      },
      layer: [
        {
          data: { values: mergedFeatures },
          params: [
            {
              name: "hoveredState",
              select: {
                type: "point",
                fields: ["state_name"],
                on: "mouseover",
                clear: "mouseout",
                empty: false
              }
            }
          ],
          mark: {
            type: "geoshape",
            cursor: "default",
            invalid: null
          },
          encoding: {
            color: {
              field: "growth_index",
              type: "quantitative",
              scale: { range: ["#ececef", "#77797f", "#1d1d1f"] },
              legend: {
                title: "CPI increase since 2020",
                orient: "bottom",
                direction: "horizontal",
                gradientLength: 260,
                gradientThickness: 10,
                titleFontSize: 10,
                labelFontSize: 9,
                titlePadding: 8
              }
            },
            stroke: {
              condition: { param: "hoveredState", empty: false, value: COLORS.riskDark },
              value: "rgba(255,255,255,0.55)"
            },
            strokeWidth: {
              condition: { param: "hoveredState", empty: false, value: 1.8 },
              value: 0.45
            },
            opacity: {
              condition: { param: "hoveredState", empty: false, value: 1 },
              value: 0.96
            },
            tooltip: [
              { field: "state_name", type: "nominal", title: "State" },
              { field: "growth_index", type: "quantitative", title: "CPI Increase", format: ".1f" },
              { field: "growth_pct", type: "quantitative", title: "Growth %", format: ".1f" },
              { field: "start_index", type: "quantitative", title: "2020 CPI", format: ".1f" },
              { field: "latest_index", type: "quantitative", title: "Latest CPI", format: ".1f" }
            ]
          }
        },
        {
          data: { values: labelFeatures },
          mark: {
            type: "text",
            fontSize: 9,
            fontWeight: 800,
            fill: COLORS.primary,
            dy: -3
          },
          encoding: {
            longitude: { field: "longitude", type: "quantitative" },
            latitude: { field: "latitude", type: "quantitative" },
            text: { field: "state_name", type: "nominal" }
          }
        },
        {
          data: { values: labelFeatures },
          mark: {
            type: "circle",
            size: 28,
            fill: COLORS.risk,
            stroke: "#ffffff",
            strokeWidth: 1,
            opacity: 0.7
          },
          encoding: {
            longitude: { field: "longitude", type: "quantitative" },
            latitude: { field: "latitude", type: "quantitative" }
          }
        }
      ],
      title: chartTitle(
        "CPI growth map",
        "Darker tones show larger increases. East Malaysia shifted west for compact display."
      ),
      config: getBaseConfig()
    };

    window.vegaEmbed("#cpi_growth_map", cpiGrowthMapSpec, { actions: false, renderer: "svg" })
      .then((result) => {
        result.view.addEventListener("mouseover", (_event, item) => {
          const datum = item && item.datum;
          if (datum && datum.state_name && Number.isFinite(datum.growth_index)) {
            renderSelectedState(selectedElement, datum);
          }
        });
      })
      .catch(function (error) {
        console.error("CPI growth map failed to load:", error);
        document.getElementById("cpi_growth_map").innerHTML =
          "<p style='color:#ff3b30; font-size:13px;'>Chart failed to load. Check console.</p>";
      });
  } catch (error) {
    console.error("CPI growth map failed to load:", error);
    document.getElementById("cpi_growth_map").innerHTML =
      "<p style='color:#ff3b30; font-size:13px;'>Map failed to load. Check TopoJSON path or console.</p>";
  }
}
