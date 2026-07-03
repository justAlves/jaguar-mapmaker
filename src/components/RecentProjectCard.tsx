import { useState } from "react";
import { ImageOff, X } from "lucide-react";
import { thumbnailFileUrl } from "../lib/projectIO";
import type { RecentProjectEntry } from "../lib/recentProjects";
import { useT } from "../i18n/useT";
import type { TranslationKey } from "../i18n/translations";

function relativeTimeParts(ts: number): { key: TranslationKey; n?: number } {
  const diffSec = Math.floor((Date.now() - ts) / 1000);
  if (diffSec < 60) return { key: "recent.time.now" };
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return { key: "recent.time.minutes", n: diffMin };
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return { key: "recent.time.hours", n: diffHour };
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay === 1) return { key: "recent.time.yesterday" };
  if (diffDay < 30) return { key: "recent.time.days", n: diffDay };
  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) return { key: diffMonth === 1 ? "recent.time.month" : "recent.time.months", n: diffMonth };
  const diffYear = Math.floor(diffMonth / 12);
  return { key: diffYear === 1 ? "recent.time.year" : "recent.time.years", n: diffYear };
}

export function RecentProjectCard({
  entry,
  onOpen,
  onRemove,
}: {
  entry: RecentProjectEntry;
  onOpen: () => void;
  onRemove: () => void;
}) {
  const t = useT();
  const [thumbBroken, setThumbBroken] = useState(false);
  const { key, n } = relativeTimeParts(entry.lastOpened);

  return (
    <div className="recent-card" onClick={onOpen} title={entry.filePath}>
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

      <div className="recent-card-thumb">
        {thumbBroken ? (
          <ImageOff size={22} />
        ) : (
          <img src={thumbnailFileUrl(entry.folderPath)} alt="" onError={() => setThumbBroken(true)} />
        )}
      </div>

      <div className="recent-card-info">
        <span className="recent-card-name">{entry.name}</span>
        <span className="recent-card-meta">
          {entry.gridWidth}×{entry.gridHeight} · {t(key, n !== undefined ? { n } : undefined)}
        </span>
      </div>
    </div>
  );
}
