import { useEffect, useState } from "react";
import { Settings } from "lucide-react";
import { NewProjectForm } from "./NewProjectForm";
import { NewSessionForm } from "./NewSessionForm";
import { RecentProjectCard } from "./RecentProjectCard";
import { RecentSessionCard } from "./RecentSessionCard";
import { IconButton } from "./IconButton";
import { useEditorStore } from "../store/editorStore";
import { activeMapSlot, useVttStore } from "../store/vttStore";
import { loadProject, pickProjectFileToOpen } from "../lib/projectIO";
import { getRecentProjects, removeRecentProject } from "../lib/recentProjects";
import type { RecentProjectEntry } from "../lib/recentProjects";
import { getRecentSessions, removeRecentSession } from "../lib/recentSessions";
import type { RecentSessionEntry } from "../lib/recentSessions";
import { loadSession, pickSessionFileToOpen } from "../lib/vttSessionIO";
import { useT } from "../i18n/useT";

export function StartScreen({ onOpenSettings }: { onOpenSettings: () => void }) {
  const t = useT();
  const [mode, setMode] = useState<"menu" | "new" | "new-session">("menu");
  const [error, setError] = useState<string | null>(null);
  const [recents, setRecents] = useState<RecentProjectEntry[]>([]);
  const [loadingRecents, setLoadingRecents] = useState(true);
  const [sessionRecents, setSessionRecents] = useState<RecentSessionEntry[]>([]);
  const [loadingSessionRecents, setLoadingSessionRecents] = useState(true);
  const setProjectAndLocation = useEditorStore((s) => s.setProjectAndLocation);
  const setSessionAndMap = useVttStore((s) => s.setSessionAndMap);

  useEffect(() => {
    let cancelled = false;
    getRecentProjects().then((list) => {
      if (cancelled) return;
      setRecents(list);
      setLoadingRecents(false);
    });
    getRecentSessions().then((list) => {
      if (cancelled) return;
      setSessionRecents(list);
      setLoadingSessionRecents(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function openProjectFile(filePath: string) {
    setError(null);
    try {
      const { project, location } = await loadProject(filePath);
      setProjectAndLocation(project, location);
    } catch (err) {
      setError(t("start.openError", { error: String(err) }));
      setRecents((prev) => prev.filter((e) => e.filePath !== filePath));
      void removeRecentProject(filePath);
    }
  }

  async function handleBrowseOpen() {
    const filePath = await pickProjectFileToOpen();
    if (!filePath) return;
    await openProjectFile(filePath);
  }

  async function handleRemoveRecent(filePath: string) {
    setRecents((prev) => prev.filter((e) => e.filePath !== filePath));
    await removeRecentProject(filePath);
  }

  async function openSessionFile(filePath: string) {
    setError(null);
    try {
      const { session, location } = await loadSession(filePath);
      const mapFilePath = activeMapSlot(session)?.mapFilePath;
      if (!mapFilePath) throw new Error("Session has no active map");
      const { project: map, location: mapLocation } = await loadProject(mapFilePath);
      setSessionAndMap(session, location, map, mapLocation);
    } catch (err) {
      setError(t("start.openError", { error: String(err) }));
      setSessionRecents((prev) => prev.filter((e) => e.filePath !== filePath));
      void removeRecentSession(filePath);
    }
  }

  async function handleBrowseOpenSession() {
    const filePath = await pickSessionFileToOpen();
    if (!filePath) return;
    await openSessionFile(filePath);
  }

  async function handleRemoveSessionRecent(filePath: string) {
    setSessionRecents((prev) => prev.filter((e) => e.filePath !== filePath));
    await removeRecentSession(filePath);
  }

  const settingsButton = (
    <div className="start-settings-trigger">
      <IconButton icon={<Settings size={16} />} label={t("toolbar.settings")} tooltipSide="left" onClick={onOpenSettings} />
    </div>
  );

  if (mode === "new") {
    return (
      <div className="start-screen">
        {settingsButton}
        <NewProjectForm onCancel={() => setMode("menu")} />
      </div>
    );
  }

  if (mode === "new-session") {
    return (
      <div className="start-screen">
        {settingsButton}
        <NewSessionForm onCancel={() => setMode("menu")} />
      </div>
    );
  }

  return (
    <div className="start-screen">
      {settingsButton}
      <div className="start-content">
        <div className="start-brand">
          <img src="/jaguar-icon.svg" alt="Jaguar" className="start-brand-mark" />
          <h1>Jaguar</h1>
          <p>{t("start.tagline")}</p>
        </div>

        <div className="start-actions">
          <button className="primary" onClick={() => setMode("new")}>
            {t("start.newProject")}
          </button>
          <button onClick={handleBrowseOpen}>{t("start.openProject")}</button>
        </div>

        <div className="start-actions">
          <button className="primary" onClick={() => setMode("new-session")}>
            {t("vtt.newSession")}
          </button>
          <button onClick={handleBrowseOpenSession}>{t("vtt.openSession")}</button>
        </div>

        {error && <p className="error">{error}</p>}

        <div className="start-recents">
          <div className="section-label">{t("start.recentProjects")}</div>
          {loadingRecents ? (
            <p className="hint">{t("start.loading")}</p>
          ) : recents.length === 0 ? (
            <p className="hint">{t("start.noRecents")}</p>
          ) : (
            <div className="recent-grid">
              {recents.map((entry) => (
                <RecentProjectCard
                  key={entry.filePath}
                  entry={entry}
                  onOpen={() => openProjectFile(entry.filePath)}
                  onRemove={() => handleRemoveRecent(entry.filePath)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="start-recents">
          <div className="section-label">{t("vtt.recentSessions")}</div>
          {loadingSessionRecents ? (
            <p className="hint">{t("start.loading")}</p>
          ) : sessionRecents.length === 0 ? (
            <p className="hint">{t("vtt.noRecentSessions")}</p>
          ) : (
            <div className="recent-grid">
              {sessionRecents.map((entry) => (
                <RecentSessionCard
                  key={entry.filePath}
                  entry={entry}
                  onOpen={() => openSessionFile(entry.filePath)}
                  onRemove={() => handleRemoveSessionRecent(entry.filePath)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
