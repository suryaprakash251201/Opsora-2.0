/** Theme + accent helpers (kept outside component files for react-refresh). */

export function applyTheme(theme: "dark" | "light", accent: string, density?: "comfortable" | "compact"): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.dataset.accent = accent;
  if (density) document.documentElement.dataset.density = density;
}

/** Current accent as a concrete hex for canvas rendering (ECharts). */
export function accentHex(fallback = "#38bdf8"): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
  return v || fallback;
}
