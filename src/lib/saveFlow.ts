import type { MapProject, ProjectLocation } from "../types";
import { saveProject } from "./projectIO";
import { saveProjectThumbnail } from "./exportPng";
import { touchRecentProject } from "./recentProjects";

/** Saves the project file and refreshes its thumbnail + recent-projects entry (best-effort, non-blocking). */
export async function saveProjectWithMetadata(project: MapProject, location: ProjectLocation): Promise<void> {
  await saveProject(project, location);
  saveProjectThumbnail(project, location).catch((err) => console.error("Failed to save thumbnail:", err));
  touchRecentProject({
    name: project.name,
    filePath: location.filePath,
    folderPath: location.folderPath,
    gridWidth: project.gridWidth,
    gridHeight: project.gridHeight,
    tileSize: project.tileSize,
  }).catch((err) => console.error("Failed to register recent project:", err));
}
