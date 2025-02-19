import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import ConnectionManager from "./ConnectionManager";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConnectionManager>
      <App />
    </ConnectionManager>
  </StrictMode>,
);
