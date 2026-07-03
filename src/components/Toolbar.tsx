import { useState } from "react";
import {
  Sparkles,
  ArrowUp,
  ArrowRight,
  ArrowDown,
  ArrowLeft,
  RotateCw,
  Grid3x3,
  Undo2,
  Redo2,
  Save,
  Download,
  FolderX,
} from "lucide-react";
import { useEditorStore } from "../store/editorStore";
import { exportMapAsPng } from "../lib/projectIO";
import { renderProjectToPngBytes } from "../lib/exportPng";
import { saveProjectWithMetadata } from "../lib/saveFlow";
import { IconButton } from "./IconButton";
import { useT } from "../i18n/useT";
import type { TranslationKey } from "../i18n/translations";
import type { WallEdge } from "../types";

const WALL_EDGE_OPTIONS: { mode: "auto" | WallEdge; labelKey: TranslationKey; icon: React.ReactNode }[] = [
  { mode: "auto", labelKey: "toolbar.edgeAuto", icon: <Sparkles size={16} /> },
  { mode: "N", labelKey: "toolbar.edgeUp", icon: <ArrowUp size={16} /> },
  { mode: "E", labelKey: "toolbar.edgeRight", icon: <ArrowRight size={16} /> },
  { mode: "S", labelKey: "toolbar.edgeDown", icon: <ArrowDown size={16} /> },
  { mode: "W", labelKey: "toolbar.edgeLeft", icon: <ArrowLeft size={16} /> },
];

export function Toolbar() {
  const t = useT();
  const project = useEditorStore((s) => s.project);
  const location = useEditorStore((s) => s.location);
  const tool = useEditorStore((s) => s.tool);
  const showGrid = useEditorStore((s) => s.showGrid);
  const toggleGrid = useEditorStore((s) => s.toggleGrid);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const undoCount = useEditorStore((s) => s.undoStack.length);
  const redoCount = useEditorStore((s) => s.redoStack.length);
  const closeProject = useEditorStore((s) => s.closeProject);
  const wallEdgeMode = useEditorStore((s) => s.wallEdgeMode);
  const setWallEdgeMode = useEditorStore((s) => s.setWallEdgeMode);
  const cycleWallEdgeMode = useEditorStore((s) => s.cycleWallEdgeMode);
  const statusMessage = useEditorStore((s) => s.statusMessage);
  const setStatusMessage = useEditorStore((s) => s.setStatusMessage);

  const [busy, setBusy] = useState<"save" | "export" | null>(null);

  if (!project || !location) return null;

  async function handleSave() {
    setBusy("save");
    setStatusMessage(null);
    try {
      await saveProjectWithMetadata(project!, location!);
      setStatusMessage(t("status.projectSaved"));
    } catch (err) {
      setStatusMessage(t("status.saveError", { error: String(err) }));
    } finally {
      setBusy(null);
    }
  }

  async function handleExport() {
    setBusy("export");
    setStatusMessage(null);
    try {
      const bytes = await renderProjectToPngBytes(project!, location!);
      const saved = await exportMapAsPng(project!, bytes);
      setStatusMessage(saved ? t("status.pngExported") : t("status.exportCancelled"));
    } catch (err) {
      setStatusMessage(t("status.exportError", { error: String(err) }));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="toolbar">
      {tool === "paintWall" ? (
        <div className="tool-group">
          {WALL_EDGE_OPTIONS.map((opt) => (
            <IconButton
              key={opt.mode}
              icon={opt.icon}
              label={t("toolbar.edgePrefix", { edge: t(opt.labelKey) })}
              active={wallEdgeMode === opt.mode}
              onClick={() => setWallEdgeMode(opt.mode)}
            />
          ))}
          <div className="divider" />
          <IconButton icon={<RotateCw size={16} />} label={t("toolbar.rotateEdge")} shortcut="R" onClick={cycleWallEdgeMode} />
        </div>
      ) : (
        <span className="hint">{t("toolbar.selectTool")}</span>
      )}

      <div className="toolbar-spacer" />

      <div className="tool-group">
        <IconButton
          icon={<Grid3x3 size={16} />}
          label={showGrid ? t("toolbar.hideGrid") : t("toolbar.showGrid")}
          shortcut="G"
          active={showGrid}
          onClick={toggleGrid}
        />
        <div className="divider" />
        <IconButton icon={<Undo2 size={16} />} label={t("toolbar.undo")} shortcut="Ctrl+Z" disabled={undoCount === 0} onClick={undo} />
        <IconButton icon={<Redo2 size={16} />} label={t("toolbar.redo")} shortcut="Ctrl+Y" disabled={redoCount === 0} onClick={redo} />
      </div>

      <div className="tool-group">
        <IconButton
          icon={<Save size={16} />}
          label={busy === "save" ? t("toolbar.saving") : t("toolbar.save")}
          shortcut="Ctrl+S"
          variant="primary"
          disabled={busy !== null}
          onClick={handleSave}
        />
        <IconButton
          icon={<Download size={16} />}
          label={busy === "export" ? t("toolbar.exporting") : t("toolbar.exportPng")}
          disabled={busy !== null}
          onClick={handleExport}
        />
      </div>

      <IconButton icon={<FolderX size={16} />} label={t("toolbar.closeProject")} variant="ghost" onClick={closeProject} />

      {statusMessage && <span className="toolbar-message">{statusMessage}</span>}
    </div>
  );
}
