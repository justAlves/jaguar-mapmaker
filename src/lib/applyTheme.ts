import { useEffect, useState } from "react";
import { useSettingsStore } from "../store/settingsStore";

function resolveTheme(theme: "light" | "dark" | "system", mediaMatches: boolean): "light" | "dark" {
  return theme === "system" ? (mediaMatches ? "dark" : "light") : theme;
}

/** Tracks the resolved light/dark theme, following OS changes live when set to "system". */
export function useResolvedTheme(): "light" | "dark" {
  const theme = useSettingsStore((s) => s.theme);
  const [resolved, setResolved] = useState(() =>
    resolveTheme(theme, window.matchMedia("(prefers-color-scheme: dark)").matches),
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => setResolved(resolveTheme(theme, media.matches));

    apply();

    if (theme === "system") {
      media.addEventListener("change", apply);
      return () => media.removeEventListener("change", apply);
    }
  }, [theme]);

  return resolved;
}

/** Applies the resolved light/dark theme to the document root as a data attribute for CSS. */
export function useApplyTheme() {
  const resolved = useResolvedTheme();
  useEffect(() => {
    document.documentElement.dataset.theme = resolved;
  }, [resolved]);
}
