import { useState } from "react";
import { useEditorStore } from "./store/editorStore";
import { useVttStore } from "./store/vttStore";
import { StartScreen } from "./components/StartScreen";
import { Editor } from "./components/Editor";
import { VttSessionScreen } from "./components/vtt/VttSessionScreen";
import { SettingsModal } from "./components/SettingsModal";
import { TitleBar } from "./components/TitleBar";
import { useApplyTheme } from "./lib/applyTheme";
import "./App.css";

function App() {
  useApplyTheme();
  const project = useEditorStore((s) => s.project);
  const session = useVttStore((s) => s.session);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="app-shell">
      <TitleBar />
      <div className="app-shell-content">
        {project ? (
          <Editor onOpenSettings={() => setSettingsOpen(true)} />
        ) : session ? (
          <VttSessionScreen />
        ) : (
          <StartScreen onOpenSettings={() => setSettingsOpen(true)} />
        )}
      </div>
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}

export default App;
