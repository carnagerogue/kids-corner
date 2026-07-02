import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppProvider } from "./store/AppContext";
import { FamilyProvider } from "./store/FamilyContext";
import { App } from "./App";
import { AnimatedBackground } from "./components/AnimatedBackground";
import { FamilySync } from "./components/FamilySync";
import { UpdateWatcher } from "./components/UpdateWatcher";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProvider>
      <FamilyProvider>
        <AnimatedBackground />
        <FamilySync />
        <UpdateWatcher />
        <App />
      </FamilyProvider>
    </AppProvider>
  </StrictMode>,
);
