import { useState } from "react";
import { useEditorStore, createNewProjectState } from "../store/editorStore";
import { createProjectOnDisk, pickFolderForNewProject } from "../lib/projectIO";
import { saveProjectThumbnail } from "../lib/exportPng";
import { useT } from "../i18n/useT";

export function NewProjectForm({ onCancel }: { onCancel: () => void }) {
  const t = useT();
  const [name, setName] = useState("My Map");
  const [gridWidth, setGridWidth] = useState(20);
  const [gridHeight, setGridHeight] = useState(15);
  const [tileSize, setTileSize] = useState(64);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setProjectAndLocation = useEditorStore((s) => s.setProjectAndLocation);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(t("newProject.errorName"));
      return;
    }
    if (gridWidth < 1 || gridHeight < 1 || tileSize < 1) {
      setError(t("newProject.errorDimensions"));
      return;
    }
    setBusy(true);
    try {
      const parentFolder = await pickFolderForNewProject();
      if (!parentFolder) {
        setBusy(false);
        return;
      }
      const project = createNewProjectState(trimmedName, gridWidth, gridHeight, tileSize);
      const location = await createProjectOnDisk(project, parentFolder);
      setProjectAndLocation(project, location);
      // best-effort: a blank thumbnail now, refreshed on every future save
      saveProjectThumbnail(project, location).catch((err) => console.error("Failed to save thumbnail:", err));
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="new-project-form" onSubmit={handleSubmit}>
      <h2>{t("newProject.title")}</h2>

      <label>
        {t("newProject.nameLabel")}
        <input value={name} onChange={(e) => setName(e.currentTarget.value)} />
      </label>

      <div className="form-row">
        <label>
          {t("newProject.widthLabel")}
          <input
            type="number"
            min={1}
            value={gridWidth}
            onChange={(e) => setGridWidth(Number(e.currentTarget.value))}
          />
        </label>
        <label>
          {t("newProject.heightLabel")}
          <input
            type="number"
            min={1}
            value={gridHeight}
            onChange={(e) => setGridHeight(Number(e.currentTarget.value))}
          />
        </label>
        <label>
          {t("newProject.tileSizeLabel")}
          <input
            type="number"
            min={1}
            value={tileSize}
            onChange={(e) => setTileSize(Number(e.currentTarget.value))}
          />
        </label>
      </div>

      <p className="hint">{t("newProject.finalSize", { width: gridWidth * tileSize, height: gridHeight * tileSize })}</p>

      {error && <p className="error">{error}</p>}

      <div className="form-actions">
        <button type="button" onClick={onCancel} disabled={busy}>
          {t("newProject.cancel")}
        </button>
        <button type="submit" disabled={busy}>
          {busy ? t("newProject.creating") : t("newProject.create")}
        </button>
      </div>
    </form>
  );
}
