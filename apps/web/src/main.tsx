import * as React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/app";
import "./styles/globals.css";

const el = document.getElementById("root");
if (!el) throw new Error("root element missing");
createRoot(el).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
