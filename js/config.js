export const DATA_URL = "data/cpi_2d_state.csv";
export const HIES_URL = "data/hies_state.csv";

export const FONT =
  "-apple-system, BlinkMacSystemFont, Helvetica Neue, Arial, sans-serif";

export const COLORS = {
  primary: "#1d1d1f",
  secondary: "#6e6e73",
  tertiary: "#a1a1a6",
  inactive: "#e5e5e7",
  grid: "#f2f2f7",
  background: "#fafaf9",
  border: "#d2d2d7",
  risk: "#1d1d1f",
  riskDark: "#1d1d1f",
  riskSoft: "#e5e5e7",
  stable: "#2f6f73",
  stableSoft: "#cfe0df",
  range: ["#f2f2f7", "#1d1d1f"],
  pressureRange: ["#f2f2f7", "#a1a1a6", "#1d1d1f"],
  stabilityRange: ["#edf3f2", "#7aa2a0", "#2f6f73"]
};

export const STATE_OPTIONS = [
  "Johor", "Kedah", "Kelantan", "Melaka", "Negeri Sembilan", "Pahang",
  "Perak", "Perlis", "Pulau Pinang", "Sabah", "Sarawak", "Selangor",
  "Terengganu", "W.P. Kuala Lumpur", "W.P. Labuan", "W.P. Putrajaya"
];

export const COMMON_AXIS_CONFIG = {
  labelFont: FONT,
  titleFont: FONT,
  labelFontSize: 11,
  titleFontSize: 11,
  labelColor: COLORS.secondary,
  titleColor: COLORS.tertiary,
  domainColor: COLORS.inactive,
  tickColor: COLORS.inactive,
  gridColor: COLORS.grid,
  gridOpacity: 1,
  labelLimit: 0
};

export const COMMON_VIEW_CONFIG = {
  stroke: null,
  strokeWidth: 0
};

export const CHART_THEME = {
  background: "transparent",
  padding: 12,
  tooltip: {
    theme: "light",
    fontSize: 12,
    font: FONT,
    padding: 10,
    cornerRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border
  }
};

export function getBaseConfig() {
  return {
    view: COMMON_VIEW_CONFIG,
    axis: COMMON_AXIS_CONFIG,
    background: CHART_THEME.background,
    legend: {
      labelFont: FONT,
      titleFont: FONT,
      labelFontSize: 10,
      titleFontSize: 10,
      labelColor: COLORS.secondary,
      titleColor: COLORS.tertiary,
      orient: "right",
      padding: 10
    },
    ...CHART_THEME
  };
}

export function chartTitle(text, subtitle, fontSize = 18) {
  return {
    text: text,
    subtitle: subtitle,
    anchor: "start",
    font: FONT,
    fontSize: fontSize,
    subtitleFontSize: 11,
    subtitlePadding: 6,
    color: COLORS.primary,
    subtitleColor: COLORS.secondary
  };
}
