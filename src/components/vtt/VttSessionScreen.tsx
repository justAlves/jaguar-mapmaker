import { useEffect, useState } from "react";
import { Save, FolderX, MonitorPlay } from "lucide-react";
import { activeMapSlot, useVttStore } from "../../store/vttStore";
import { saveSession } from "../../lib/vttSessionIO";
import { loadProject } from "../../lib/projectIO";
import { openPlayerWindow } from "../../lib/playerWindow";
import { TokenPanel } from "./TokenPanel";
import { VttCanvas } from "./VttCanvas";
import { MapTabs } from "./MapTabs";
import { CharacterLightInspector } from "./CharacterLightInspector";
import { InitiativeTracker } from "./InitiativeTracker";
import { IconButton } from "../IconButton";
import { useT } from "../../i18n/useT";

/**
 * undo/redo only restore `session` (see vttStore.ts) — if the popped snapshot has a different
 * `activeMapId` than before (i.e. the undo/redo step crossed a map switch), the runtime `map`/
 * `mapLocation` fields are now stale and must be reloaded from disk for the now-active map.
 */
async function reloadActiveMapIfChanged(prevActiveMapId: string | null | undefined) {
  const s = useVttStore.getState();
  if (!s.session || s.session.activeMapId === prevActiveMapId) return;
  const slot = s.session.maps.find((m) => m.id === s.session!.activeMapId);
  if (!slot) return;
  try {
    const { project, location } = await loadProject(slot.mapFilePath);
    useVttStore.getState().setLoadedMap(project, location);
  } catch (err) {
    console.error("Failed to reload map after undo/redo:", err);
  }
}

export function VttSessionScreen() {
  const t = useT();
  const session = useVttStore((s) => s.session);
  const sessionLocation = useVttStore((s) => s.sessionLocation);
  const closeSession = useVttStore((s) => s.closeSession);
  const statusMessage = useVttStore((s) => s.statusMessage);
  const setStatusMessage = useVttStore((s) => s.setStatusMessage);
  const setFogAlpha = useVttStore((s) => s.setFogAlpha);
  const setAmbientLight = useVttStore((s) => s.setAmbientLight);
  const [busy, setBusy] = useState(false);
  const activeSlot = activeMapSlot(session);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;

      const state = useVttStore.getState();
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (mod && key === "z") {
        e.preventDefault();
        const prevActiveMapId = state.session?.activeMapId;
        if (e.shiftKey) state.redo();
        else state.undo();
        void reloadActiveMapIfChanged(prevActiveMapId);
        return;
      }
      if (mod && key === "y") {
        e.preventDefault();
        const prevActiveMapId = state.session?.activeMapId;
        state.redo();
        void reloadActiveMapIfChanged(prevActiveMapId);
        return;
      }
      if (mod) return; // don't intercept other browser/OS shortcuts

      if (key === "delete" || key === "backspace") {
        if (state.selectedCharacterId) {
          e.preventDefault();
          state.removeCharacter(state.selectedCharacterId);
        } else if (state.selectedPropId) {
          e.preventDefault();
          state.removeProp(state.selectedPropId);
        }
        return;
      }
      if (key === "escape") {
        state.setSelectedCharacterId(null);
        state.setSelectedPropId(null);
        return;
      }
      if (key === "f") {
        if (state.selectedCharacterId) {
          e.preventDefault();
          state.toggleCharacterLight(state.selectedCharacterId);
        }
        return;
      }
      // Q/E (continuous, smooth rotation while held) are handled by VttCanvas, which has direct
      // access to the live sprites needed for a per-frame rotation loop.
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (!session || !sessionLocation || !activeSlot) return null;

  async function handleSave() {
    setBusy(true);
    setStatusMessage(null);
    try {
      await saveSession(session!, sessionLocation!);
      setStatusMessage(t("status.projectSaved"));
    } catch (err) {
      setStatusMessage(t("status.saveError", { error: String(err) }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="editor">
      <div className="app-header">
        <img src="/jaguar-icon.svg" alt="Jaguar" className="app-header-mark" />
        <span className="app-header-title">Jaguar</span>
        <span className="app-header-project">{session.name}</span>
        <div className="app-header-spacer" />
        <label className="fog-alpha-control">
          {t("toolbar.ambientLight")}
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={activeSlot.ambientLight}
            onChange={(e) => setAmbientLight(Number(e.currentTarget.value))}
          />
        </label>
        <label className="fog-alpha-control">
          {t("toolbar.fogAlpha")}
          <input
            type="range"
            min={0}
            max={0.9}
            step={0.05}
            value={activeSlot.fogAlpha}
            onChange={(e) => setFogAlpha(Number(e.currentTarget.value))}
          />
        </label>
        {statusMessage && <span className="toolbar-message">{statusMessage}</span>}
        <IconButton icon={<MonitorPlay size={16} />} label={t("toolbar.playerView")} onClick={() => void openPlayerWindow()} />
        <IconButton icon={<Save size={16} />} label={busy ? t("toolbar.saving") : t("toolbar.save")} onClick={handleSave} disabled={busy} />
        <IconButton icon={<FolderX size={16} />} label={t("toolbar.closeProject")} onClick={closeSession} />
      </div>
      <MapTabs />
      <div className="editor-main">
        <div className="editor-content">
          <div className="editor-body">
            <TokenPanel />
            <VttCanvas />
            <div className="vtt-right-rail">
              <CharacterLightInspector />
              <InitiativeTracker />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
