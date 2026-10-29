
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
import "./styles/tokens.css";

const THEME_KEY = "trueq-theme";

function initializeTheme() {
  try {
    const savedTheme = localStorage.getItem(THEME_KEY);
    const theme = savedTheme === "dark" ? "dark" : "light";

    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch {
    document.documentElement.dataset.theme = "light";
    document.documentElement.style.colorScheme = "light";
  }
}

initializeTheme();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
