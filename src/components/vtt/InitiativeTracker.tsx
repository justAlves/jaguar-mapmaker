import { useState } from "react";
import { Play, Square, ChevronRight, Plus, X } from "lucide-react";
import { activeMapSlot, useVttStore } from "../../store/vttStore";
import { useT } from "../../i18n/useT";

export function InitiativeTracker() {
  const t = useT();
  const session = useVttStore((s) => s.session);
  const setSelectedCharacterId = useVttStore((s) => s.setSelectedCharacterId);
  const addInitiativeEntry = useVttStore((s) => s.addInitiativeEntry);
  const updateInitiativeEntry = useVttStore((s) => s.updateInitiativeEntry);
  const removeInitiativeEntry = useVttStore((s) => s.removeInitiativeEntry);
  const startCombat = useVttStore((s) => s.startCombat);
  const endCombat = useVttStore((s) => s.endCombat);
  const nextTurn = useVttStore((s) => s.nextTurn);

  const [name, setName] = useState("");
  const [roll, setRoll] = useState(10);
  const [characterId, setCharacterId] = useState("");

  const slot = activeMapSlot(session);
  if (!slot) return null;

  const ordered = [...slot.initiative].sort((a, b) => b.initiative - a.initiative);
  const inCombat = slot.activeTurnId !== null;

  function handlePickCharacter(id: string) {
    setCharacterId(id);
    const character = slot!.characters.find((c) => c.id === id);
    if (character && !name.trim()) setName(character.name);
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    addInitiativeEntry(trimmed, roll, characterId || null);
    setName("");
    setCharacterId("");
  }

  return (
    <div className="prop-inspector initiative-tracker">
      <div>
        <div className="section-label">{t("initiative.title")}</div>
        <h3>{inCombat ? t("initiative.round", { n: slot.round }) : t("initiative.notStarted")}</h3>
      </div>

      <ul className="initiative-list">
        {ordered.map((entry) => (
          <li key={entry.id} className={entry.id === slot.activeTurnId ? "active" : ""}>
            <button
              className="initiative-entry-name"
              onClick={() => entry.characterId && setSelectedCharacterId(entry.characterId)}
              disabled={!entry.characterId}
            >
              {entry.name}
            </button>
            <input
              type="number"
              value={entry.initiative}
              onChange={(e) => updateInitiativeEntry(entry.id, { initiative: Number(e.currentTarget.value) })}
            />
            <button className="initiative-entry-remove" onClick={() => removeInitiativeEntry(entry.id)} title={t("initiative.remove")}>
              <X size={12} />
            </button>
          </li>
        ))}
        {ordered.length === 0 && <p className="hint">{t("initiative.empty")}</p>}
      </ul>

      <form className="initiative-add-form" onSubmit={handleAdd}>
        <select value={characterId} onChange={(e) => handlePickCharacter(e.currentTarget.value)}>
          <option value="">{t("initiative.customEntry")}</option>
          {slot.characters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input placeholder={t("initiative.namePlaceholder")} value={name} onChange={(e) => setName(e.currentTarget.value)} />
        <input type="number" value={roll} onChange={(e) => setRoll(Number(e.currentTarget.value))} />
        <button type="submit" title={t("initiative.add")}>
          <Plus size={14} />
        </button>
      </form>

      <div className="prop-actions">
        {!inCombat ? (
          <button onClick={startCombat} disabled={slot.initiative.length === 0}>
            <Play size={14} /> {t("initiative.start")}
          </button>
        ) : (
          <>
            <button onClick={nextTurn}>
              <ChevronRight size={14} /> {t("initiative.next")}
            </button>
            <button className="danger" onClick={endCombat}>
              <Square size={14} /> {t("initiative.end")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
