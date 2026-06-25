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
  },
}));
