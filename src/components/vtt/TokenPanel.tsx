import { useState } from "react";
import { Search, Upload } from "lucide-react";
import { useVttStore } from "../../store/vttStore";
import { assetFileUrl } from "../../lib/projectIO";
import { importTokenAssets, tokenAssetFileUrl } from "../../lib/vttSessionIO";
import { IconButton } from "../IconButton";
import { useT } from "../../i18n/useT";

type PanelTab = "characters" | "props";

export function TokenPanel() {
  const t = useT();
  const session = useVttStore((s) => s.session);
  const sessionLocation = useVttStore((s) => s.sessionLocation);
  const map = useVttStore((s) => s.map);
  const mapLocation = useVttStore((s) => s.mapLocation);
  const addTokenAssets = useVttStore((s) => s.addTokenAssets);

  const [tab, setTab] = useState<PanelTab>("characters");
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  if (!session || !sessionLocation || !map || !mapLocation) return null;

  const query = search.trim().toLowerCase();
  const tokenAssets = session.tokenAssets.filter((a) => !query || a.name.toLowerCase().includes(query));
  const mapProps = map.assets.filter((a) => a.category === "prop" && (!query || a.fileName.toLowerCase().includes(query)));

  async function handleImportTokens() {
    setError(null);
    try {
      const created = await importTokenAssets(sessionLocation!);
      if (created.length > 0) addTokenAssets(created);
    } catch (err) {
      setError(String(err));
    }
  }

  return (
    <div className="asset-panel vtt-token-panel">
      <div className="asset-tabs">
        <button
          className={tab === "characters" ? "active" : ""}
          onClick={() => {
            setTab("characters");
            setSearch("");
          }}
        >
          {t("vtt.characters")}
        </button>
        <button
          className={tab === "props" ? "active" : ""}
          onClick={() => {
            setTab("props");
            setSearch("");
          }}
        >
          {t("vtt.props")}
        </button>
      </div>

      <div className="asset-search">
        <Search size={14} />
        <input
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          placeholder={t(tab === "characters" ? "vtt.searchCharacters" : "vtt.searchProps")}
        />
      </div>

      {tab === "characters" ? (
        <>
          <div className="import-row">
            <IconButton icon={<Upload size={16} />} label={t("vtt.importTokens")} tooltipSide="bottom" onClick={handleImportTokens} />
          </div>
          {error && <p className="error">{error}</p>}
          <p className="hint">{t("vtt.dragHint")}</p>
          <div className="asset-grid">
            {tokenAssets.map((asset) => (
              <div
                key={asset.id}
                className="asset-thumb"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("application/x-vtt-token-asset-id", asset.id);
                }}
                title={asset.name}
              >
                <div className="asset-thumb-preview">
                  <img src={tokenAssetFileUrl(sessionLocation, asset)} alt={asset.name} loading="lazy" />
                </div>
                <span className="asset-thumb-name">{asset.name}</span>
              </div>
            ))}
            {tokenAssets.length === 0 && (
              <p className="hint">{session.tokenAssets.length === 0 ? t("vtt.noTokens") : t("vtt.noSearchResults")}</p>
            )}
          </div>
        </>
      ) : (
        <>
          <p className="hint">{t("vtt.dragHint")}</p>
          <div className="asset-grid">
            {mapProps.map((asset) => (
              <div
                key={asset.id}
                className="asset-thumb"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("application/x-vtt-prop-asset-id", asset.id);
                }}
                title={asset.fileName}
              >
                <div className="asset-thumb-preview">
                  <img src={assetFileUrl(mapLocation, asset)} alt={asset.fileName} loading="lazy" />
                </div>
                <span className="asset-thumb-name">{asset.fileName}</span>
              </div>
            ))}
            {mapProps.length === 0 && (
              <p className="hint">
                {map.assets.filter((a) => a.category === "prop").length === 0 ? t("vtt.noMapProps") : t("vtt.noSearchResults")}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
