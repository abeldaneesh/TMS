
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "./contexts/ThemeContext";
import App from "./app/App.tsx";
import "./styles/index.css";

const rootElement = document.getElementById("root")!;
createRoot(rootElement).render(
  <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
    <App />
  </ThemeProvider>
);

// Remove the initial splash screen after React mounts
const loader = document.getElementById('initial-loader');
if (loader) {
  loader.style.opacity = '0';
  loader.style.transition = 'opacity 0.5s ease-out';
  setTimeout(() => loader.remove(), 500);
}
