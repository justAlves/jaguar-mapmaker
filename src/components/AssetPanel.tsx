import { useMemo, useState } from "react";
import { Search, Folder as FolderIcon, Upload } from "lucide-react";
import { useEditorStore } from "../store/editorStore";
import { assetFileUrl, importAssets } from "../lib/projectIO";
import { AssetFolderMenu } from "./AssetFolderMenu";
import { IconButton } from "./IconButton";
import { useT } from "../i18n/useT";
import type { TranslationKey } from "../i18n/translations";
import type { AssetCategory } from "../types";

const CATEGORY_LABEL_KEYS: Record<AssetCategory, TranslationKey> = {
  floor: "category.floor",
  wall: "category.wall",
  prop: "category.prop",
};

const ALL_FOLDERS = "__all__";
const NO_FOLDER = "__none__";

export function AssetPanel() {
  const t = useT();
  const project = useEditorStore((s) => s.project);
  const location = useEditorStore((s) => s.location);
  const addAssets = useEditorStore((s) => s.addAssets);
  const setAssetFolder = useEditorStore((s) => s.setAssetFolder);
  const selectedAssetId = useEditorStore((s) => s.selectedAssetId);
  const setSelectedAssetId = useEditorStore((s) => s.setSelectedAssetId);
  const setTool = useEditorStore((s) => s.setTool);
  const setSelectedPropId = useEditorStore((s) => s.setSelectedPropId);
  const setDraggingAssetId = useEditorStore((s) => s.setDraggingAssetId);

  const [activeCategory, setActiveCategory] = useState<AssetCategory>("floor");
  const [activeFolder, setActiveFolder] = useState<string>(ALL_FOLDERS);
  const [search, setSearch] = useState("");
  const [importFolder, setImportFolder] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [folderMenuFor, setFolderMenuFor] = useState<string | null>(null);

  if (!project || !location) return null;

  const assetsInCategory = project.assets.filter((a) => a.category === activeCategory);

  const folderNames = useMemo(() => {
    const set = new Set<string>();
    for (const a of assetsInCategory) if (a.folder) set.add(a.folder);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [assetsInCategory]);

  const visibleAssets = assetsInCategory.filter((a) => {
    if (activeFolder === NO_FOLDER && a.folder) return false;
    if (activeFolder !== ALL_FOLDERS && activeFolder !== NO_FOLDER && a.folder !== activeFolder) return false;
    if (search.trim() && !a.fileName.toLowerCase().includes(search.trim().toLowerCase())) return false;
    return true;
  });

  function handleCategoryChange(cat: AssetCategory) {
    setActiveCategory(cat);
    setActiveFolder(ALL_FOLDERS);
    setSearch("");
  }

  async function handleImport() {
    setError(null);
    try {
      const created = await importAssets(activeCategory, location!, importFolder);
      if (created.length > 0) addAssets(created);
    } catch (err) {
      setError(String(err));
    }
  }

  function handleSelect(assetId: string, category: AssetCategory) {
    setSelectedAssetId(assetId);
    if (category === "floor") setTool("paintFloor");
    else if (category === "wall") setTool("paintWall");
    else {
      setTool("props");
      setSelectedPropId(null);
    }
  }

  return (
    <div className="asset-panel">
      <div className="asset-tabs">
        {(Object.keys(CATEGORY_LABEL_KEYS) as AssetCategory[]).map((cat) => (
          <button
            key={cat}
            className={cat === activeCategory ? "active" : ""}
            onClick={() => handleCategoryChange(cat)}
          >
            {t(CATEGORY_LABEL_KEYS[cat])}
          </button>
        ))}
      </div>

      <div className="asset-search">
        <Search size={14} />
        <input
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          placeholder={t("assets.searchPlaceholder", { category: t(CATEGORY_LABEL_KEYS[activeCategory]).toLowerCase() })}
        />
      </div>

      {(folderNames.length > 0 || activeFolder !== ALL_FOLDERS) && (
        <div className="asset-folder-chips">
          <button className={activeFolder === ALL_FOLDERS ? "active" : ""} onClick={() => setActiveFolder(ALL_FOLDERS)}>
            {t("assets.allFolders")}
          </button>
          <button className={activeFolder === NO_FOLDER ? "active" : ""} onClick={() => setActiveFolder(NO_FOLDER)}>
            {t("assets.noFolder")}
          </button>
          {folderNames.map((folder) => (
            <button key={folder} className={activeFolder === folder ? "active" : ""} onClick={() => setActiveFolder(folder)}>
              <FolderIcon size={12} />
              {folder}
            </button>
          ))}
        </div>
      )}

      <div className="import-row">
        <IconButton icon={<Upload size={16} />} label={t("assets.import")} tooltipSide="bottom" onClick={handleImport} />
        <input
          className="import-folder-input"
          value={importFolder}
          onChange={(e) => setImportFolder(e.currentTarget.value)}
          placeholder={t("assets.importFolderPlaceholder")}
        />
      </div>
      {error && <p className="error">{error}</p>}

      <div className="asset-grid">
        {visibleAssets.map((asset) => (
          <div
            key={asset.id}
            className={`asset-thumb ${asset.id === selectedAssetId ? "selected" : ""}`}
            draggable={asset.category === "prop"}
            onDragStart={(e) => {
              e.dataTransfer.setData("application/x-asset-id", asset.id);
              e.dataTransfer.setData("application/x-asset-category", asset.category);
              setDraggingAssetId(asset.id);
            }}
            onDragEnd={() => setDraggingAssetId(null)}
            onClick={() => handleSelect(asset.id, asset.category)}
            title={asset.fileName}
          >
            <div className="asset-thumb-preview">
              <img src={assetFileUrl(location, asset)} alt={asset.fileName} />
            </div>
            <span className="asset-thumb-name">{asset.fileName}</span>
            <button
              type="button"
              className="asset-thumb-folder-btn"
              title={t("assets.moveToFolder")}
              onClick={(e) => {
                e.stopPropagation();
                setFolderMenuFor(folderMenuFor === asset.id ? null : asset.id);
              }}
            >
              <FolderIcon size={12} />
            </button>
            {folderMenuFor === asset.id && (
              <AssetFolderMenu
                currentFolder={asset.folder}
                folderOptions={folderNames}
                onAssign={(folder) => {
                  setAssetFolder(asset.id, folder);
                  setFolderMenuFor(null);
                }}
                onClose={() => setFolderMenuFor(null)}
              />
            )}
          </div>
        ))}
        {visibleAssets.length === 0 && (
          <p className="hint">{assetsInCategory.length === 0 ? t("assets.none") : t("assets.noneFound")}</p>
        )}
      </div>
    </div>
  );
}
