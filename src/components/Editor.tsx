import { useEffect } from "react";
import { Settings } from "lucide-react";
import { Toolbar } from "./Toolbar";
import { ToolRail } from "./ToolRail";
import { AssetPanel } from "./AssetPanel";
import { MapCanvas } from "./MapCanvas";
import { PropInspector } from "./PropInspector";
import { LightInspector } from "./LightInspector";
import { IconButton } from "./IconButton";
import { useEditorStore } from "../store/editorStore";
import { useSettingsStore } from "../store/settingsStore";
import { saveProjectWithMetadata } from "../lib/saveFlow";
import { startAutosave } from "../lib/autosave";
import { useT } from "../i18n/useT";
import { translate } from "../i18n/translations";

const NUDGE_STEP = 4;
const NUDGE_STEP_FAST = 32;

export function Editor({ onOpenSettings }: { onOpenSettings: () => void }) {
  const t = useT();

  useEffect(() => startAutosave(), []);

  // Centralized keyboard shortcuts. Reads/writes go through getState() so this effect
  // never needs to re-subscribe when project/tool/selection change.
  useEffect(() => {
    async function saveCurrentProject() {
      const { project, location, setStatusMessage } = useEditorStore.getState();
      if (!project || !location) return;
      const language = useSettingsStore.getState().language;
      setStatusMessage(null);
      try {
        await saveProjectWithMetadata(project, location);
        setStatusMessage(translate(language, "status.projectSaved"));
      } catch (err) {
        setStatusMessage(translate(language, "status.saveError", { error: String(err) }));
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;

      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      const state = useEditorStore.getState();

      if (mod && key === "z") {
        e.preventDefault();
        state.undo();
        return;
      }
      if (mod && (key === "y" || (key === "z" && e.shiftKey))) {
        e.preventDefault();
        state.redo();
        return;
      }
      if (mod && key === "s") {
        e.preventDefault();
        void saveCurrentProject();
        return;
      }
      if (mod && key === "d") {
        e.preventDefault();
        if (state.selectedPropId) {
          const prop = state.project?.props.find((p) => p.id === state.selectedPropId);
          if (prop) {
            state.addProp({
              assetId: prop.assetId,
              x: prop.x + 16,
              y: prop.y + 16,
              rotation: prop.rotation,
              scaleX: prop.scaleX,
              scaleY: prop.scaleY,
            });
          }
        } else if (state.selectedLightId) {
          const light = state.project?.lights.find((l) => l.id === state.selectedLightId);
          if (light) {
            state.addLight({
              kind: light.kind,
              x: light.x + 16,
              y: light.y + 16,
              color: light.color,
              radius: light.radius,
              intensity: light.intensity,
              rotation: light.rotation,
              coneAngle: light.coneAngle,
            });
          }
        }
        return;
      }
      if (mod) return; // don't intercept other browser/OS shortcuts

      if (key === "delete" || key === "backspace") {
        if (state.selectedPropId) {
          e.preventDefault();
          state.removeProp(state.selectedPropId);
        } else if (state.selectedLightId) {
          e.preventDefault();
          state.removeLight(state.selectedLightId);
        }
        return;
      }

      if (key === "escape") {
        state.setSelectedPropId(null);
        state.setSelectedLightId(null);
        return;
      }

      if (key === "arrowup" || key === "arrowdown" || key === "arrowleft" || key === "arrowright") {
        if (state.selectedPropId) {
          const prop = state.project?.props.find((p) => p.id === state.selectedPropId);
          if (!prop) return;
          e.preventDefault();
          const step = e.shiftKey ? NUDGE_STEP_FAST : NUDGE_STEP;
          const dx = key === "arrowleft" ? -step : key === "arrowright" ? step : 0;
          const dy = key === "arrowup" ? -step : key === "arrowdown" ? step : 0;
          state.updateProp(prop.id, { x: prop.x + dx, y: prop.y + dy });
          return;
        }
        if (state.selectedLightId) {
          const light = state.project?.lights.find((l) => l.id === state.selectedLightId);
          if (!light) return;
          e.preventDefault();
          const step = e.shiftKey ? NUDGE_STEP_FAST : NUDGE_STEP;
          const dx = key === "arrowleft" ? -step : key === "arrowright" ? step : 0;
          const dy = key === "arrowup" ? -step : key === "arrowdown" ? step : 0;
          state.updateLight(light.id, { x: light.x + dx, y: light.y + dy });
        }
        return;
      }

      switch (key) {
        case "f":
          state.setTool("paintFloor");
          return;
        case "w":
          state.setTool("paintWall");
          return;
        case "b":
          state.setTool("floorRect");
          return;
        case "l":
          state.setTool("floorLine");
          return;
        case "j":
          state.setTool("wallLine");
          return;
        case "u":
          state.setTool("floorBucket");
          return;
        case "x":
          state.setTool("erase");
          return;
        case "p":
          state.setTool("props");
          return;
        case "k":
          state.setTool("light");
          return;
        case "h":
          state.setTool("pan");
          return;
        case "g":
          state.toggleGrid();
          return;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const projectName = useEditorStore((s) => s.project?.name);

  return (
    <div className="editor">
      <div className="app-header">
        <img src="/jaguar-icon.svg" alt="Jaguar" className="app-header-mark" />
        <span className="app-header-title">Jaguar</span>
        {projectName && <span className="app-header-project">{projectName}</span>}
        <div className="app-header-spacer" />
        <IconButton icon={<Settings size={16} />} label={t("toolbar.settings")} tooltipSide="bottom" onClick={onOpenSettings} />
      </div>
      <div className="editor-main">
        <ToolRail />
        <div className="editor-content">
          <Toolbar />
          <div className="editor-body">
            <AssetPanel />
            <MapCanvas />
            <PropInspector />
            <LightInspector />
          </div>
        </div>
      </div>
    </div>
  );
}
