import { PlayerCanvas } from "./PlayerCanvas";
import "../../App.css";

/** Root of the second (player-facing) window: just the read-only map view, no editor chrome at all. */
export function PlayerApp() {
  return (
    <div className="player-app-shell">
      <PlayerCanvas />
    </div>
  );
}
