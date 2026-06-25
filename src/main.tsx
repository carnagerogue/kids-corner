import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppProvider } from "./store/AppContext";
import { App } from "./App";
import { AnimatedBackground } from "./components/AnimatedBackground";
import { FunCursor } from "./components/FunCursor";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProvider>
      <AnimatedBackground />
      <FunCursor />
      <App />
    </AppProvider>
  </StrictMode>,
);
