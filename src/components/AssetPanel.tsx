import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Folder as FolderIcon, Upload, Star, Library, X } from "lucide-react";
import { useEditorStore } from "../store/editorStore";
import { assetFileUrl, importAssets } from "../lib/projectIO";
import { thumbnailUrl } from "../lib/thumbnailCache";
import {
  addLibraryAssetToProject,
  importToLibrary,
  libraryLocation,
  loadLibraryAssets,
  removeLibraryAsset,
  setLibraryAssetFolder,
  toggleLibraryAssetFavorite,
} from "../lib/assetLibrary";
import { AssetFolderMenu } from "./AssetFolderMenu";
import { IconButton } from "./IconButton";
import { useT } from "../i18n/useT";
import type { TranslationKey } from "../i18n/translations";
import type { AssetCategory, AssetRef, ProjectLocation } from "../types";

function AssetThumbImage({ location, asset }: { location: ProjectLocation; asset: AssetRef }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let cancelled = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        observer.disconnect();
        const fullUrl = assetFileUrl(location, asset);
        thumbnailUrl(location, asset, fullUrl)
          .then((url) => {
            if (!cancelled) setSrc(url);
          })
          .catch(() => {
            if (!cancelled) setSrc(fullUrl);
          });
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [location, asset]);

  return (
    <div ref={containerRef} className="asset-thumb-preview">
      {src && <img src={src} alt={asset.fileName} loading="lazy" />}
    </div>
  );
}

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
  const toggleAssetFavorite = useEditorStore((s) => s.toggleAssetFavorite);
  const selectedAssetId = useEditorStore((s) => s.selectedAssetId);
  const setSelectedAssetId = useEditorStore((s) => s.setSelectedAssetId);
  const setTool = useEditorStore((s) => s.setTool);
  const setSelectedPropId = useEditorStore((s) => s.setSelectedPropId);
  const setDraggingAssetId = useEditorStore((s) => s.setDraggingAssetId);

  const [activeCategory, setActiveCategory] = useState<AssetCategory>("floor");
  const [activeFolder, setActiveFolder] = useState<string>(ALL_FOLDERS);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [importFolder, setImportFolder] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [folderMenuFor, setFolderMenuFor] = useState<string | null>(null);

  const [libraryMode, setLibraryMode] = useState(false);
  const [libAssets, setLibAssets] = useState<AssetRef[]>([]);
  const [libLocation, setLibLocation] = useState<ProjectLocation | null>(null);

  useEffect(() => {
    let cancelled = false;
    libraryLocation().then((loc) => {
      if (cancelled) return;
      setLibLocation(loc);
      loadLibraryAssets().then((assets) => {
        if (!cancelled) setLibAssets(assets);
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!project || !location) return null;

  const sourceAssets = libraryMode ? libAssets : project.assets;
  const assetsInCategory = sourceAssets.filter((a) => a.category === activeCategory);
  const projectLibraryIds = useMemo(
    () => new Set(project.assets.map((a) => a.libraryId).filter(Boolean)),
    [project.assets],
  );

  const folderNames = useMemo(() => {
    const set = new Set<string>();
    for (const a of assetsInCategory) if (a.folder) set.add(a.folder);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [assetsInCategory]);

  const visibleAssets = assetsInCategory
    .filter((a) => {
      if (favoritesOnly && !a.favorite) return false;
      if (activeFolder === NO_FOLDER && a.folder) return false;
      if (activeFolder !== ALL_FOLDERS && activeFolder !== NO_FOLDER && a.folder !== activeFolder) return false;
      if (search.trim() && !a.fileName.toLowerCase().includes(search.trim().toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => Number(Boolean(b.favorite)) - Number(Boolean(a.favorite)));

  function handleCategoryChange(cat: AssetCategory) {
    setActiveCategory(cat);
    setActiveFolder(ALL_FOLDERS);
    setFavoritesOnly(false);
    setSearch("");
  }

  function toggleLibraryMode() {
    setLibraryMode((v) => !v);
    setActiveFolder(ALL_FOLDERS);
    setFavoritesOnly(false);
    setSearch("");
    setFolderMenuFor(null);
  }

  async function handleImport() {
    setError(null);
    try {
      if (libraryMode) {
        const next = await importToLibrary(activeCategory, importFolder);
        setLibAssets(next);
      } else {
        const created = await importAssets(activeCategory, location!, importFolder);
        if (created.length > 0) addAssets(created);
      }
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

  async function handleLibraryAssetClick(asset: AssetRef) {
    if (!libLocation || !location) return;
    setError(null);
    const existing = project!.assets.find((a) => a.libraryId === asset.id);
    if (existing) {
      handleSelect(existing.id, existing.category);
      return;
    }
    try {
      const created = await addLibraryAssetToProject(libLocation, location, asset);
      addAssets([created]);
      handleSelect(created.id, created.category);
    } catch (err) {
      setError(String(err));
    }
  }

  async function handleLibraryToggleFavorite(assetId: string) {
    setLibAssets(await toggleLibraryAssetFavorite(assetId));
  }

  async function handleLibrarySetFolder(assetId: string, folder: string | null) {
    setLibAssets(await setLibraryAssetFolder(assetId, folder));
  }

  async function handleLibraryRemove(assetId: string) {
    setLibAssets(await removeLibraryAsset(assetId));
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
        <button
          className={`asset-library-toggle ${libraryMode ? "active" : ""}`}
          title={libraryMode ? t("assets.myAssets") : t("assets.library")}
          onClick={toggleLibraryMode}
        >
          <Library size={14} />
          {t(libraryMode ? "assets.myAssets" : "assets.library")}
        </button>
      </div>

      {libraryMode && <p className="hint asset-library-hint">{t("assets.libraryHint")}</p>}

      <div className="asset-search">
        <Search size={14} />
        <input
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          placeholder={t("assets.searchPlaceholder", { category: t(CATEGORY_LABEL_KEYS[activeCategory]).toLowerCase() })}
        />
      </div>

      {(folderNames.length > 0 || activeFolder !== ALL_FOLDERS || assetsInCategory.some((a) => a.favorite)) && (
        <div className="asset-folder-chips">
          <button className={activeFolder === ALL_FOLDERS ? "active" : ""} onClick={() => setActiveFolder(ALL_FOLDERS)}>
            {t("assets.allFolders")}
          </button>
          <button
            className={favoritesOnly ? "active" : ""}
            onClick={() => setFavoritesOnly((v) => !v)}
          >
            <Star size={12} fill={favoritesOnly ? "currentColor" : "none"} />
            {t("assets.favoritesOnly")}
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
        <IconButton
          icon={<Upload size={16} />}
          label={libraryMode ? t("assets.libraryImport") : t("assets.import")}
          tooltipSide="bottom"
          onClick={handleImport}
        />
        <input
          className="import-folder-input"
          value={importFolder}
          onChange={(e) => setImportFolder(e.currentTarget.value)}
          placeholder={t("assets.importFolderPlaceholder")}
        />
      </div>
      {error && <p className="error">{error}</p>}

      <div className="asset-grid">
        {visibleAssets.map((asset) => {
          const inProject = libraryMode ? projectLibraryIds.has(asset.id) : false;
          return (
            <div
              key={asset.id}
              className={`asset-thumb ${!libraryMode && asset.id === selectedAssetId ? "selected" : ""} ${
                libraryMode && inProject ? "in-project" : ""
              }`}
              draggable={!libraryMode && asset.category === "prop"}
              onDragStart={(e) => {
                if (libraryMode) return;
                e.dataTransfer.setData("application/x-asset-id", asset.id);
                e.dataTransfer.setData("application/x-asset-category", asset.category);
                setDraggingAssetId(asset.id);
              }}
              onDragEnd={() => setDraggingAssetId(null)}
              onClick={() => (libraryMode ? handleLibraryAssetClick(asset) : handleSelect(asset.id, asset.category))}
              title={libraryMode ? (inProject ? t("assets.alreadyInProject") : t("assets.addToProject")) : asset.fileName}
            >
              <AssetThumbImage location={libraryMode ? libLocation! : location} asset={asset} />
              <span className="asset-thumb-name">{asset.fileName}</span>
              <button
                type="button"
                className={`asset-thumb-favorite-btn ${asset.favorite ? "active" : ""}`}
                title={t(asset.favorite ? "assets.removeFavorite" : "assets.addFavorite")}
                onClick={(e) => {
                  e.stopPropagation();
                  if (libraryMode) handleLibraryToggleFavorite(asset.id);
                  else toggleAssetFavorite(asset.id);
                }}
              >
                <Star size={12} fill={asset.favorite ? "currentColor" : "none"} />
              </button>
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
              {libraryMode && (
                <button
                  type="button"
                  className="asset-thumb-remove-btn"
                  title={t("assets.removeFromLibrary")}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLibraryRemove(asset.id);
                  }}
                >
                  <X size={12} />
                </button>
              )}
              {folderMenuFor === asset.id && (
                <AssetFolderMenu
                  currentFolder={asset.folder}
                  folderOptions={folderNames}
                  onAssign={(folder) => {
                    if (libraryMode) handleLibrarySetFolder(asset.id, folder);
                    else setAssetFolder(asset.id, folder);
                    setFolderMenuFor(null);
                  }}
                  onClose={() => setFolderMenuFor(null)}
                />
              )}
            </div>
          );
        })}
        {visibleAssets.length === 0 && (
          <p className="hint">{assetsInCategory.length === 0 ? t("assets.none") : t("assets.noneFound")}</p>
        )}
      </div>
    </div>
  );
}
