import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { PlayerApp } from "./components/player/PlayerApp";
import { installDevtoolsGuard } from "./lib/disableDevtools";

installDevtoolsGuard();

const isPlayerWindow = new URLSearchParams(window.location.search).has("player");

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>{isPlayerWindow ? <PlayerApp /> : <App />}</React.StrictMode>,
);
