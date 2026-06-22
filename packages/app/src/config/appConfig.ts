/**
 * Runtime configuration resolved from Vite environment variables.
 * Values are read once at module load time and are immutable during the session.
 *
 * Environment variable reference (see packages/app/.env.example):
 *   VITE_DEMO_LOGIN=true   — enables the demo/demo credential and pre-fills the login form.
 */
export interface AppRuntimeConfig {
  /** When true, the demo/demo credential is accepted and pre-filled on the login screen. */
  demoLoginEnabled: boolean;
}

/**
 * Parses a string environment variable as a boolean.
 * Only the string "true" (case-insensitive, trimmed) returns true.
 * Any other value — including "1", "yes", or empty string — returns false.
 * Undefined falls back to the provided default.
 */
function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  return value.trim().toLowerCase() === "true";
}

export const appConfig: AppRuntimeConfig = {
  demoLoginEnabled: parseBoolean(import.meta.env.VITE_DEMO_LOGIN, true),
};
