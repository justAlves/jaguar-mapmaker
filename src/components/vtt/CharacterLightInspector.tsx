import { activeMapSlot, useVttStore } from "../../store/vttStore";
import { useT } from "../../i18n/useT";
import type { LightKind } from "../../types";

export function CharacterLightInspector() {
  const t = useT();
  const session = useVttStore((s) => s.session);
  const selectedCharacterId = useVttStore((s) => s.selectedCharacterId);
  const toggleCharacterLight = useVttStore((s) => s.toggleCharacterLight);
  const updateCharacterLight = useVttStore((s) => s.updateCharacterLight);

  const slot = activeMapSlot(session);
  if (!slot || !selectedCharacterId) return null;
  const character = slot.characters.find((c) => c.id === selectedCharacterId);
  if (!character) return null;
  const light = character.light;

  return (
    <div className="prop-inspector">
      <div>
        <div className="section-label">{character.name || t("vtt.characters")}</div>
        <h3>{t("charLight.settings")}</h3>
      </div>

      <label className="char-light-toggle">
        <input type="checkbox" checked={light?.enabled ?? false} onChange={() => toggleCharacterLight(character.id)} />
        {t("charLight.enable")}
      </label>

      {light?.enabled && (
        <div className="prop-inspector-fields">
          <label>
            {t("lightInspector.kind")}
            <select
              value={light.kind}
              onChange={(e) => updateCharacterLight(character.id, { kind: e.currentTarget.value as LightKind })}
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
              onChange={(e) => updateCharacterLight(character.id, { color: e.currentTarget.value })}
            />
          </label>
          <label>
            {t("lightInspector.radius")}
            <input
              type="number"
              min={1}
              value={light.radius}
              onChange={(e) => updateCharacterLight(character.id, { radius: Number(e.currentTarget.value) })}
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
              onChange={(e) => updateCharacterLight(character.id, { intensity: Number(e.currentTarget.value) })}
            />
          </label>
          {light.kind === "cone" && (
            <>
              <label>
                {t("charLight.direction")}
                <input
                  type="number"
                  value={light.rotation}
                  onChange={(e) => updateCharacterLight(character.id, { rotation: Number(e.currentTarget.value) })}
                />
              </label>
              <label>
                {t("lightInspector.coneAngle")}
                <input
                  type="number"
                  min={1}
                  max={360}
                  value={light.coneAngle}
                  onChange={(e) => updateCharacterLight(character.id, { coneAngle: Number(e.currentTarget.value) })}
                />
              </label>
            </>
          )}
        </div>
      )}
    </div>
  );
}
