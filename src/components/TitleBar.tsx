import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, Copy, X } from "lucide-react";
import { useT } from "../i18n/useT";

const appWindow = getCurrentWindow();

export function TitleBar() {
  const t = useT();
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    let cancelled = false;
    appWindow.isMaximized().then((v) => {
      if (!cancelled) setIsMaximized(v);
    });

    const unlistenPromise = appWindow.onResized(() => {
      appWindow.isMaximized().then((v) => {
        if (!cancelled) setIsMaximized(v);
      });
    });

    return () => {
      cancelled = true;
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  return (
    <div className="titlebar" data-tauri-drag-region>
      <div className="titlebar-brand" data-tauri-drag-region>
        <img src="/jaguar-icon.svg" alt="" className="titlebar-mark" draggable={false} />
        <span className="titlebar-title">Jaguar</span>
      </div>
      <div className="titlebar-controls">
        <button
          type="button"
          className="titlebar-btn"
          aria-label={t("titlebar.minimize")}
          onClick={() => appWindow.minimize()}
        >
          <Minus size={14} />
        </button>
        <button
          type="button"
          className="titlebar-btn"
          aria-label={isMaximized ? t("titlebar.restore") : t("titlebar.maximize")}
          onClick={() => appWindow.toggleMaximize()}
        >
          {isMaximized ? <Copy size={12} /> : <Square size={12} />}
        </button>
        <button
          type="button"
          className="titlebar-btn titlebar-btn-close"
          aria-label={t("titlebar.close")}
          onClick={() => appWindow.close()}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
