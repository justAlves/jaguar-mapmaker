import { useSettingsStore } from "../store/settingsStore";
import { translate, type TranslationKey } from "./translations";

export function useT() {
  const language = useSettingsStore((s) => s.language);
  return (key: TranslationKey, params?: Record<string, string | number>) => translate(language, key, params);
}
