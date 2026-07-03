import { useEffect, useRef, useState } from "react";
import { Check, Folder, FolderPlus } from "lucide-react";
import { useT } from "../i18n/useT";

export function AssetFolderMenu({
  currentFolder,
  folderOptions,
  onAssign,
  onClose,
}: {
  currentFolder: string | undefined;
  folderOptions: string[];
  onAssign: (folder: string | null) => void;
  onClose: () => void;
}) {
  const t = useT();
  const [newFolder, setNewFolder] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [onClose]);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newFolder.trim();
    if (!trimmed) return;
    onAssign(trimmed);
  }

  return (
    <div className="asset-folder-menu" ref={menuRef} onClick={(e) => e.stopPropagation()}>
      <button type="button" className={!currentFolder ? "active" : ""} onClick={() => onAssign(null)}>
        {!currentFolder && <Check size={13} />}
        {t("folderMenu.noFolder")}
      </button>
      {folderOptions.map((folder) => (
        <button key={folder} type="button" className={currentFolder === folder ? "active" : ""} onClick={() => onAssign(folder)}>
          {currentFolder === folder && <Check size={13} />}
          <Folder size={13} />
          {folder}
        </button>
      ))}
      <form className="asset-folder-menu-new" onSubmit={handleCreate}>
        <FolderPlus size={13} />
        <input
          value={newFolder}
          onChange={(e) => setNewFolder(e.currentTarget.value)}
          placeholder={t("folderMenu.newFolderPlaceholder")}
          autoFocus
        />
      </form>
    </div>
  );
}
