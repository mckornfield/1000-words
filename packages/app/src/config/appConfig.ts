export interface AppRuntimeConfig {
  demoLoginEnabled: boolean;
}

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  return value.trim().toLowerCase() === "true";
}

export const appConfig: AppRuntimeConfig = {
  demoLoginEnabled: parseBoolean(import.meta.env.VITE_DEMO_LOGIN, true),
};
