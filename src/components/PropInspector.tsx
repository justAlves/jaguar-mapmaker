import { useEditorStore } from "../store/editorStore";
import { useT } from "../i18n/useT";

export function PropInspector() {
  const t = useT();
  const project = useEditorStore((s) => s.project);
  const selectedPropId = useEditorStore((s) => s.selectedPropId);
  const updateProp = useEditorStore((s) => s.updateProp);
  const removeProp = useEditorStore((s) => s.removeProp);
  const setSelectedPropId = useEditorStore((s) => s.setSelectedPropId);

  if (!project || !selectedPropId) return null;
  const prop = project.props.find((p) => p.id === selectedPropId);
  if (!prop) return null;

  const maxZ = project.props.reduce((m, p) => Math.max(m, p.zIndex), 0);

  return (
    <div className="prop-inspector">
      <div>
        <div className="section-label">{t("propInspector.selected")}</div>
        <h3>{t("propInspector.transform")}</h3>
      </div>

      <div className="prop-inspector-fields">
        <label>
          {t("propInspector.rotation")}
          <input
            type="number"
            value={prop.rotation}
            onChange={(e) => updateProp(prop.id, { rotation: Number(e.currentTarget.value) })}
          />
        </label>
        <label>
          {t("propInspector.scaleX")}
          <input
            type="number"
            step={0.1}
            value={prop.scaleX}
            onChange={(e) => updateProp(prop.id, { scaleX: Number(e.currentTarget.value) })}
          />
        </label>
        <label>
          {t("propInspector.scaleY")}
          <input
            type="number"
            step={0.1}
            value={prop.scaleY}
            onChange={(e) => updateProp(prop.id, { scaleY: Number(e.currentTarget.value) })}
          />
        </label>
      </div>

      <div>
        <div className="section-label">{t("propInspector.layer")}</div>
        <div className="prop-actions">
          <button onClick={() => updateProp(prop.id, { zIndex: maxZ + 1 })}>{t("propInspector.bringFront")}</button>
          <button onClick={() => updateProp(prop.id, { zIndex: -1 })}>{t("propInspector.sendBack")}</button>
        </div>
      </div>

      <button
        className="danger"
        onClick={() => {
          removeProp(prop.id);
          setSelectedPropId(null);
        }}
      >
        {t("propInspector.delete")}
      </button>
    </div>
  );
}
