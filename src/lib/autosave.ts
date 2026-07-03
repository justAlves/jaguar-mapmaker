import { useEditorStore } from "../store/editorStore";
import { useSettingsStore } from "../store/settingsStore";
import { translate } from "../i18n/translations";
import { saveProject } from "./projectIO";
import type { MapProject } from "../types";

/** Save this long after the last edit, provided nothing else changes in the meantime. */
const DEBOUNCE_MS = 4000;
/** Never go longer than this without saving, even under continuous painting. */
const MAX_WAIT_MS = 20000;

/**
 * Starts a background autosave loop: debounced after edits, with a hard cap so a long
 * uninterrupted painting session still flushes periodically. Uses the store's vanilla
 * subscribe API so it never triggers React re-renders on its own. Respects the user's
 * autosave on/off preference, checked fresh on every scheduling attempt.
 *
 * Returns a cleanup function to stop the loop (e.g. on unmount).
 */
export function startAutosave(): () => void {
  let debounceHandle: ReturnType<typeof setTimeout> | null = null;
  let maxWaitHandle: ReturnType<typeof setTimeout> | null = null;
  let saveInFlight = false;
  let saveAgainAfter = false;
  // The project state we know is already persisted on disk; only diverging from this
  // (by reference, since all edits go through immutable updates) schedules a new save.
  let lastPersistedProject: MapProject | null = useEditorStore.getState().project;

  function clearTimers() {
    if (debounceHandle) clearTimeout(debounceHandle);
    if (maxWaitHandle) clearTimeout(maxWaitHandle);
    debounceHandle = null;
    maxWaitHandle = null;
  }

  async function flush() {
    const { project, location, setStatusMessage } = useEditorStore.getState();
    if (!project || !location) return;
    const language = useSettingsStore.getState().language;
    if (saveInFlight) {
      saveAgainAfter = true;
      return;
    }
    saveInFlight = true;
    try {
      await saveProject(project, location);
      lastPersistedProject = project;
      setStatusMessage(translate(language, "status.autosaved"));
    } catch (err) {
      console.error("Autosave failed:", err);
      setStatusMessage(translate(language, "status.autosaveError", { error: String(err) }));
    } finally {
      saveInFlight = false;
      if (saveAgainAfter) {
        saveAgainAfter = false;
        void flush();
      }
    }
  }

  function scheduleSave() {
    if (debounceHandle) clearTimeout(debounceHandle);
    debounceHandle = setTimeout(() => {
      clearTimers();
      void flush();
    }, DEBOUNCE_MS);

    if (!maxWaitHandle) {
      maxWaitHandle = setTimeout(() => {
        clearTimers();
        void flush();
      }, MAX_WAIT_MS);
    }
  }

  const unsubscribe = useEditorStore.subscribe((state, prevState) => {
    if (state.location !== prevState.location) {
      // a different (or no) project is now active: drop any pending save for the old one
      clearTimers();
      lastPersistedProject = state.project;
      return;
    }
    if (!useSettingsStore.getState().autosaveEnabled) return;
    if (state.project && state.location && state.project !== lastPersistedProject) {
      scheduleSave();
    }
  });

  return () => {
    unsubscribe();
    clearTimers();
  };
}
