import { useState } from "react";
import { Plus, X } from "lucide-react";
import { useVttStore } from "../../store/vttStore";
import { loadProject } from "../../lib/projectIO";
import { createMapSlot, pickMapFileForSession } from "../../lib/vttSessionIO";
import { useT } from "../../i18n/useT";

/** Tab bar letting the GM switch between (or add) the maps that belong to this session, without leaving it. */
export function MapTabs() {
  const t = useT();
  const session = useVttStore((s) => s.session);
  const addMapSlot = useVttStore((s) => s.addMapSlot);
  const switchActiveMap = useVttStore((s) => s.switchActiveMap);
  const removeMapSlot = useVttStore((s) => s.removeMapSlot);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!session) return null;

  async function handleAddMap() {
    setError(null);
    const filePath = await pickMapFileForSession();
    if (!filePath) return;
    setBusy(true);
    try {
      const { project, location } = await loadProject(filePath);
      addMapSlot(createMapSlot(filePath, project.name), project, location);
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleSwitch(mapId: string) {
    if (!session || mapId === session.activeMapId || busy) return;
    const slot = session.maps.find((m) => m.id === mapId);
    if (!slot) return;
    setError(null);
    setBusy(true);
    try {
      const { project, location } = await loadProject(slot.mapFilePath);
      switchActiveMap(mapId, project, location);
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="map-tabs">
      {session.maps.map((slot) => (
        <div key={slot.id} className={`map-tab ${slot.id === session.activeMapId ? "active" : ""}`}>
          <button className="map-tab-label" onClick={() => handleSwitch(slot.id)} disabled={busy} title={slot.mapFilePath}>
            {slot.name}
          </button>
          {session.maps.length > 1 && slot.id !== session.activeMapId && (
            <button className="map-tab-remove" onClick={() => removeMapSlot(slot.id)} title={t("vtt.removeMap")} disabled={busy}>
              <X size={12} />
            </button>
          )}
        </div>
      ))}
      <button className="map-tab-add" onClick={handleAddMap} disabled={busy} title={t("vtt.addMap")}>
        <Plus size={14} />
      </button>
      {error && <span className="error map-tabs-error">{error}</span>}
    </div>
  );
}
