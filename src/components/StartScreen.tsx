import { useEffect, useState } from "react";
import { Settings } from "lucide-react";
import { NewProjectForm } from "./NewProjectForm";
import { RecentProjectCard } from "./RecentProjectCard";
import { IconButton } from "./IconButton";
import { useEditorStore } from "../store/editorStore";
import { loadProject, pickProjectFileToOpen } from "../lib/projectIO";
import { getRecentProjects, removeRecentProject } from "../lib/recentProjects";
import type { RecentProjectEntry } from "../lib/recentProjects";
import { useT } from "../i18n/useT";

export function StartScreen({ onOpenSettings }: { onOpenSettings: () => void }) {
  const t = useT();
  const [mode, setMode] = useState<"menu" | "new">("menu");
  const [error, setError] = useState<string | null>(null);
  const [recents, setRecents] = useState<RecentProjectEntry[]>([]);
  const [loadingRecents, setLoadingRecents] = useState(true);
  const setProjectAndLocation = useEditorStore((s) => s.setProjectAndLocation);

  useEffect(() => {
    let cancelled = false;
    getRecentProjects().then((list) => {
      if (cancelled) return;
      setRecents(list);
      setLoadingRecents(false);
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
      </div>
    </div>
  );
}
