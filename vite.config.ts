import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
// Base path differs per host: Firebase Hosting serves at root ("/"), GitHub
// Pages at "/kids-corner/". The Firebase Hosting workflow sets APP_BASE="/".
// Local dev / preview stay at the root.
export default defineConfig(({ mode }) => ({
  base: process.env.APP_BASE ?? (mode === "production" ? "/kids-corner/" : "/"),
  plugins: [react()],
  server: {
    host: true,
    open: false,
    // Honour a PORT assigned by the tooling (falls back to Vite's default 5173
    // for a plain `npm run dev`).
    port: Number(process.env.PORT) || 5173,
  },
}));
