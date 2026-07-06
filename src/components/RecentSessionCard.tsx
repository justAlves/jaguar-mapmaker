import { X } from "lucide-react";
import type { RecentSessionEntry } from "../lib/recentSessions";
import { useT } from "../i18n/useT";

export function RecentSessionCard({
  entry,
  onOpen,
  onRemove,
}: {
  entry: RecentSessionEntry;
  onOpen: () => void;
  onRemove: () => void;
}) {
  const t = useT();

  return (
    <div className="recent-card recent-card-session" onClick={onOpen} title={entry.filePath}>
      <button
        type="button"
        className="recent-card-remove"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        title={t("recent.removeTooltip")}
      >
        <X size={12} />
      </button>

      <div className="recent-card-info">
        <span className="recent-card-name">{entry.name}</span>
        <span className="recent-card-meta">{entry.mapFilePath.split(/[\\/]/).pop()}</span>
      </div>
    </div>
  );
}
