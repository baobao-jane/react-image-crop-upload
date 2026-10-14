import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "cropperjs/dist/cropper.css";
import "../src/styles.css";
import "./demo.css";
import { App } from "./app";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
