import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./globals.css";
import "./product.css";
import "./readability.css";
import { App } from "./app";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
