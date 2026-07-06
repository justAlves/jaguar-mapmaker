import { PaintBucket, BrickWall, Square, Slash, Ruler, Droplet, Eraser, Box, Lightbulb, Hand } from "lucide-react";
import { useEditorStore } from "../store/editorStore";
import { IconButton } from "./IconButton";
import { useT } from "../i18n/useT";
import type { TranslationKey } from "../i18n/translations";
import type { ToolMode } from "../types";

const TOOLS: { mode: ToolMode; labelKey: TranslationKey; shortcut: string; icon: React.ReactNode }[] = [
  { mode: "paintFloor", labelKey: "tool.paintFloor", shortcut: "F", icon: <PaintBucket size={18} /> },
  { mode: "paintWall", labelKey: "tool.paintWall", shortcut: "W", icon: <BrickWall size={18} /> },
  { mode: "floorRect", labelKey: "tool.floorRect", shortcut: "B", icon: <Square size={18} /> },
  { mode: "floorLine", labelKey: "tool.floorLine", shortcut: "L", icon: <Slash size={18} /> },
  { mode: "wallLine", labelKey: "tool.wallLine", shortcut: "J", icon: <Ruler size={18} /> },
  { mode: "floorBucket", labelKey: "tool.floorBucket", shortcut: "U", icon: <Droplet size={18} /> },
  { mode: "erase", labelKey: "tool.erase", shortcut: "X", icon: <Eraser size={18} /> },
  { mode: "props", labelKey: "tool.props", shortcut: "P", icon: <Box size={18} /> },
  { mode: "light", labelKey: "tool.light", shortcut: "K", icon: <Lightbulb size={18} /> },
  { mode: "pan", labelKey: "tool.pan", shortcut: "H", icon: <Hand size={18} /> },
];

export function ToolRail() {
  const t = useT();
  const tool = useEditorStore((s) => s.tool);
  const setTool = useEditorStore((s) => s.setTool);

  return (
    <div className="tool-rail">
      {TOOLS.map((tItem) => (
        <IconButton
          key={tItem.mode}
          icon={tItem.icon}
          label={t(tItem.labelKey)}
          shortcut={tItem.shortcut}
          active={tool === tItem.mode}
          onClick={() => setTool(tItem.mode)}
          tooltipSide="right"
        />
      ))}
    </div>
  );
}
