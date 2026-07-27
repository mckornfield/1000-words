import { render, type RenderOptions, type RenderResult } from "@testing-library/react";
import type { ReactElement } from "react";
import { AppContext } from "../data/AppContext";
import type { AppContextValue } from "../data/types";
import { ToastProvider } from "../features/shared/Toast";
import { createTestServices } from "./createTestServices";

interface RenderAppOptions extends Omit<RenderOptions, "wrapper"> {
  services?: Partial<AppContextValue>;
}

type RenderAppResult = RenderResult & { services: AppContextValue };

export function renderApp(
  ui: ReactElement,
  { services, ...options }: RenderAppOptions = {},
): RenderAppResult {
  const value = createTestServices(services);
  return {
    services: value,
    ...render(ui, {
      wrapper: ({ children }) => (
        <AppContext.Provider value={value}>
          <ToastProvider>{children}</ToastProvider>
        </AppContext.Provider>
      ),
      ...options,
    }),
  };
}
