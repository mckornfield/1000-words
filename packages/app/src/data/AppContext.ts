import { createContext, useContext, useSyncExternalStore } from "react";
import type { AppContextValue, RefreshState } from "./types";

export const AppContext = createContext<AppContextValue | null>(null);

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used inside AppContext.Provider");
  return ctx;
}

export function useAppState(): RefreshState {
  const { coordinator } = useAppContext();
  return useSyncExternalStore(
    coordinator.subscribe,
    coordinator.getState,
    coordinator.getState,
  );
}
