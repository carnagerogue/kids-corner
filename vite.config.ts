import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
// On GitHub Pages the app is served from /kids-corner/, so the production build
// needs that base path. Local dev / preview stay at the root.
export default defineConfig(({ mode }) => ({
  base: mode === "production" ? "/kids-corner/" : "/",
  plugins: [react()],
  server: {
    host: true,
    open: false,
    // Honour a PORT assigned by the tooling (falls back to Vite's default 5173
    // for a plain `npm run dev`).
    port: Number(process.env.PORT) || 5173,
  },
}));
