import type { ReactElement } from "react";

type IconName = "art" | "wall" | "token" | "file" | "flame" | "layers" | "turn" | "ruler" | "monitor" | "link" | "unlock";

const PATHS: Record<IconName, ReactElement> = {
  art: (
    <>
      <path d="M4 20 L13.5 10.5" />
      <path d="M12.5 9.5 L16.5 5.5a2.1 2.1 0 0 1 3 3L15.5 12.5Z" />
    </>
  ),
  wall: (
    <>
      <rect x="3" y="9.5" width="18" height="4" rx="0.5" />
      <line x1="7" y1="9.5" x2="7" y2="13.5" />
      <line x1="12" y1="9.5" x2="12" y2="13.5" />
      <line x1="17" y1="9.5" x2="17" y2="13.5" />
    </>
  ),
  token: (
    <>
      <circle cx="12" cy="8" r="3.1" />
      <path d="M7 20c0-3.5 2.4-6.2 5-6.2s5 2.7 5 6.2" />
    </>
  ),
  file: (
    <>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4" />
    </>
  ),
  flame: <path d="M12 21a5 5 0 0 1-5-5c0-3 2-6 3-9 .5 2 1 3 2 3s1.4-1 1-3c2 2 4 6 4 9a5 5 0 0 1-5 5z" />,
  layers: (
    <>
      <rect x="4" y="4" width="12" height="12" rx="1" />
      <rect x="8" y="8" width="12" height="12" rx="1" />
    </>
  ),
  turn: (
    <>
      <path d="M6 5l6 7-6 7" />
      <path d="M13 5l6 7-6 7" />
    </>
  ),
  ruler: (
    <>
      <rect x="3" y="9" width="18" height="6" rx="1" />
      <line x1="7" y1="9" x2="7" y2="12" />
      <line x1="11" y1="9" x2="11" y2="12" />
      <line x1="15" y1="9" x2="15" y2="12" />
      <line x1="19" y1="9" x2="19" y2="12" />
    </>
  ),
  monitor: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="1" />
      <line x1="9" y1="20" x2="15" y2="20" />
      <line x1="12" y1="16" x2="12" y2="20" />
    </>
  ),
  link: (
    <>
      <path d="M9 15l6-6" />
      <path d="M8.5 11.8l-1.8 1.8a3 3 0 0 0 4.2 4.2l1.8-1.8" />
      <path d="M15.5 12.2l1.8-1.8a3 3 0 0 0-4.2-4.2l-1.8 1.8" />
    </>
  ),
  unlock: (
    <>
      <path d="M7.5 11V8a4.5 4.5 0 0 1 8-2.8" />
      <rect x="5" y="11" width="14" height="9" rx="1.5" />
    </>
  ),
};

export function LegendIcon({ name }: { name: IconName }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}
