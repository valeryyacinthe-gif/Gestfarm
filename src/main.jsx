import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Enregistre le cache de l'interface. Les données Supabase ne sont pas mises en cache.
if ("serviceWorker" in navigator) {
  const registerGestfarmServiceWorker = () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
      console.warn("GESTFARM : enregistrement du mode hors connexion impossible.", error);
    });
  };

  if (document.readyState === "complete") {
    registerGestfarmServiceWorker();
  } else {
    window.addEventListener("load", registerGestfarmServiceWorker, { once: true });
  }
}
