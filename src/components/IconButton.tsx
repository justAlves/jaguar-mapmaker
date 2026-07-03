import type { ReactNode } from "react";

interface IconButtonProps {
  icon: ReactNode;
  label: string;
  shortcut?: string;
  active?: boolean;
  variant?: "default" | "primary" | "danger" | "ghost";
  disabled?: boolean;
  onClick?: () => void;
  tooltipSide?: "right" | "bottom" | "left";
}

export function IconButton({
  icon,
  label,
  shortcut,
  active,
  variant = "default",
  disabled,
  onClick,
  tooltipSide = "bottom",
}: IconButtonProps) {
  return (
    <button
      type="button"
      className={`icon-btn ${active ? "active" : ""} ${variant !== "default" ? variant : ""}`}
      onClick={onClick}
      disabled={disabled}
    >
      {icon}
      <span className={`icon-tooltip tooltip-${tooltipSide}`}>
        {label}
        {shortcut && <kbd>{shortcut}</kbd>}
      </span>
    </button>
  );
}
