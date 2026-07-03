import { useEffect } from "react";
import { Sun, Moon, Monitor, X } from "lucide-react";
import { useSettingsStore, type ThemePreference, type Language } from "../store/settingsStore";
import { useT } from "../i18n/useT";

const THEME_OPTIONS: { value: ThemePreference; icon: React.ReactNode; labelKey: "settings.themeLight" | "settings.themeDark" | "settings.themeSystem" }[] = [
  { value: "light", icon: <Sun size={15} />, labelKey: "settings.themeLight" },
  { value: "dark", icon: <Moon size={15} />, labelKey: "settings.themeDark" },
  { value: "system", icon: <Monitor size={15} />, labelKey: "settings.themeSystem" },
];

const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: "en", label: "English" },
  { value: "pt", label: "Português" },
  { value: "es", label: "Español" },
];

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const t = useT();
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const language = useSettingsStore((s) => s.language);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const autosaveEnabled = useSettingsStore((s) => s.autosaveEnabled);
  const setAutosaveEnabled = useSettingsStore((s) => s.setAutosaveEnabled);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t("settings.title")}</h2>
          <button type="button" className="ghost" onClick={onClose} aria-label={t("settings.close")}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <div className="settings-row">
            <span className="settings-label">{t("settings.theme")}</span>
            <div className="tool-group">
              {THEME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={theme === opt.value ? "active" : ""}
                  onClick={() => setTheme(opt.value)}
                >
                  {opt.icon}
                  {t(opt.labelKey)}
                </button>
              ))}
            </div>
          </div>

          <div className="settings-row">
            <span className="settings-label">{t("settings.language")}</span>
            <div className="tool-group">
              {LANGUAGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={language === opt.value ? "active" : ""}
                  onClick={() => setLanguage(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="settings-row">
            <div>
              <span className="settings-label">{t("settings.autosave")}</span>
              <p className="hint">{t("settings.autosaveHint")}</p>
            </div>
            <button
              type="button"
              className={`switch ${autosaveEnabled ? "on" : ""}`}
              role="switch"
              aria-checked={autosaveEnabled}
              onClick={() => setAutosaveEnabled(!autosaveEnabled)}
            >
              <span className="switch-thumb" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
