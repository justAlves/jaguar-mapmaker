import { useState } from "react";
import { useEditorStore } from "./store/editorStore";
import { StartScreen } from "./components/StartScreen";
import { Editor } from "./components/Editor";
import { SettingsModal } from "./components/SettingsModal";
import { useApplyTheme } from "./lib/applyTheme";
import "./App.css";

function App() {
  useApplyTheme();
  const project = useEditorStore((s) => s.project);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      {project ? (
        <Editor onOpenSettings={() => setSettingsOpen(true)} />
      ) : (
        <StartScreen onOpenSettings={() => setSettingsOpen(true)} />
      )}
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </>
  );
}

export default App;
