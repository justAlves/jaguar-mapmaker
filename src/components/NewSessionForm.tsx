import { useState } from "react";
import { useVttStore } from "../store/vttStore";
import { loadProject } from "../lib/projectIO";
import { createMapSlot, createSessionOnDisk, pickFolderForNewSession, pickMapFileForSession } from "../lib/vttSessionIO";
import type { VttSession } from "../types";
import { useT } from "../i18n/useT";

export function NewSessionForm({ onCancel }: { onCancel: () => void }) {
  const t = useT();
  const [name, setName] = useState("Minha Sessão");
  const [mapFilePath, setMapFilePath] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setSessionAndMap = useVttStore((s) => s.setSessionAndMap);

  async function handlePickMap() {
    const filePath = await pickMapFileForSession();
    if (filePath) setMapFilePath(filePath);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(t("newSession.errorName"));
      return;
    }
    if (!mapFilePath) {
      setError(t("newSession.errorMap"));
      return;
    }
    setBusy(true);
    try {
      const parentFolder = await pickFolderForNewSession();
      if (!parentFolder) {
        setBusy(false);
        return;
      }
      const { project: map, location: mapLocation } = await loadProject(mapFilePath);
      const mapSlot = createMapSlot(mapFilePath, map.name);
      const session: VttSession = {
        name: trimmedName,
        tokenAssets: [],
        maps: [mapSlot],
        activeMapId: mapSlot.id,
      };
      const sessionLocation = await createSessionOnDisk(session, parentFolder);
      setSessionAndMap(session, sessionLocation, map, mapLocation);
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="new-project-form" onSubmit={handleSubmit}>
      <h2>{t("newSession.title")}</h2>

      <label>
        {t("newSession.nameLabel")}
        <input value={name} onChange={(e) => setName(e.currentTarget.value)} />
      </label>

      <div className="form-row">
        <button type="button" onClick={handlePickMap}>
          {mapFilePath ? t("newSession.mapChosen") : t("newSession.pickMap")}
        </button>
      </div>
      {mapFilePath && <p className="hint">{mapFilePath}</p>}

      {error && <p className="error">{error}</p>}

      <div className="form-actions">
        <button type="button" onClick={onCancel} disabled={busy}>
          {t("newProject.cancel")}
        </button>
        <button type="submit" disabled={busy}>
          {busy ? t("newProject.creating") : t("newSession.create")}
        </button>
      </div>
    </form>
  );
}
