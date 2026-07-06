// Blocks the obvious ways to reach the webview devtools/inspector from the UI
// (right-click menu, F12, Ctrl/Cmd+Shift+I/J/C, Ctrl/Cmd+U). Production builds
// already ship without devtools compiled in (no "devtools" Cargo feature), this
// covers dev builds where the webview still exposes them by default.
export function installDevtoolsGuard() {
  window.addEventListener("contextmenu", (e) => e.preventDefault());

  window.addEventListener("keydown", (e) => {
    const mod = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();

    if (key === "f12") {
      e.preventDefault();
      return;
    }
    if (mod && e.shiftKey && (key === "i" || key === "j" || key === "c")) {
      e.preventDefault();
      return;
    }
    if (mod && key === "u") {
      e.preventDefault();
    }
  });
}
