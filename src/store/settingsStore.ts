import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemePreference = "light" | "dark" | "system";
export type Language = "en" | "pt" | "es";

interface SettingsState {
  theme: ThemePreference;
  language: Language;
  autosaveEnabled: boolean;
  setTheme: (theme: ThemePreference) => void;
  setLanguage: (language: Language) => void;
  setAutosaveEnabled: (enabled: boolean) => void;
}

function detectLanguage(): Language {
  if (typeof navigator === "undefined") return "en";
  const lang = navigator.language.toLowerCase();
  if (lang.startsWith("pt")) return "pt";
  if (lang.startsWith("es")) return "es";
  return "en";
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "dark",
      language: detectLanguage(),
      autosaveEnabled: true,
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setAutosaveEnabled: (autosaveEnabled) => set({ autosaveEnabled }),
    }),
    { name: "jaguar-settings" },
  ),
);
