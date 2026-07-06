import { useEditorStore } from "../store/editorStore";
import { useT } from "../i18n/useT";
import type { LightKind } from "../types";

export function LightInspector() {
  const t = useT();
  const project = useEditorStore((s) => s.project);
  const selectedLightId = useEditorStore((s) => s.selectedLightId);
  const updateLight = useEditorStore((s) => s.updateLight);
  const removeLight = useEditorStore((s) => s.removeLight);
  const setSelectedLightId = useEditorStore((s) => s.setSelectedLightId);

  if (!project || !selectedLightId) return null;
  const light = project.lights.find((l) => l.id === selectedLightId);
  if (!light) return null;

  return (
    <div className="prop-inspector">
      <div>
        <div className="section-label">{t("lightInspector.selected")}</div>
        <h3>{t("lightInspector.settings")}</h3>
      </div>

      <div className="prop-inspector-fields">
        <label>
          {t("lightInspector.kind")}
          <select
            value={light.kind}
            onChange={(e) => updateLight(light.id, { kind: e.currentTarget.value as LightKind })}
          >
            <option value="radial">{t("lightInspector.kindRadial")}</option>
            <option value="cone">{t("lightInspector.kindCone")}</option>
          </select>
        </label>
        <label>
          {t("lightInspector.color")}
          <input
            type="color"
            value={light.color}
            onChange={(e) => updateLight(light.id, { color: e.currentTarget.value })}
          />
        </label>
        <label>
          {t("lightInspector.radius")}
          <input
            type="number"
            min={1}
            value={light.radius}
            onChange={(e) => updateLight(light.id, { radius: Number(e.currentTarget.value) })}
          />
        </label>
        <label>
          {t("lightInspector.intensity")}
          <input
            type="number"
            min={0}
            max={1}
            step={0.05}
            value={light.intensity}
            onChange={(e) => updateLight(light.id, { intensity: Number(e.currentTarget.value) })}
          />
        </label>
        {light.kind === "cone" && (
          <>
            <label>
              {t("lightInspector.direction")}
              <input
                type="number"
                value={light.rotation}
                onChange={(e) => updateLight(light.id, { rotation: Number(e.currentTarget.value) })}
              />
            </label>
            <label>
              {t("lightInspector.coneAngle")}
              <input
                type="number"
                min={1}
                max={360}
                value={light.coneAngle}
                onChange={(e) => updateLight(light.id, { coneAngle: Number(e.currentTarget.value) })}
              />
            </label>
          </>
        )}
      </div>

      <button
        className="danger"
        onClick={() => {
          removeLight(light.id);
          setSelectedLightId(null);
        }}
      >
        {t("lightInspector.delete")}
      </button>
    </div>
  );
}
