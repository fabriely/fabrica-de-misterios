export type Theme = "dark" | "light";

const storageKey = "fabrica-de-misterios-theme";

export function readTheme(): Theme {
  try {
    const saved = window.localStorage.getItem(storageKey);
    if (saved === "dark" || saved === "light") return saved;
  } catch {
    // The theme still works when browser storage is unavailable.
  }

  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function saveTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(storageKey, theme);
  } catch {
    // Keep the selected theme for this page even without storage.
  }
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    "content",
    theme === "light" ? "#f5f1e8" : "#111914",
  );
}
