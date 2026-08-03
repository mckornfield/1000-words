/**
 * Runtime configuration resolved from Vite environment variables.
 * Values are read once at module load time and are immutable during the session.
 *
 * Environment variable reference (see repo-root .env.example):
 *   VITE_DEMO_LOGIN=true              — enables demo credentials and pre-fills login.
 *   VITE_FEATURE_REVERSE_STUDY=false  — exposes the English-to-target study direction.
 */
export interface AppRuntimeConfig {
  /** When true, the demo/demo credential is accepted and pre-filled on the login screen. */
  demoLoginEnabled: boolean;
  /** Enables English-to-target study controls while the mode is still being evaluated. */
  reverseStudyEnabled: boolean;
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

export function createAppConfig(env: {
  VITE_DEMO_LOGIN?: string;
  VITE_FEATURE_REVERSE_STUDY?: string;
}): AppRuntimeConfig {
  return {
    demoLoginEnabled: parseBoolean(env.VITE_DEMO_LOGIN, true),
    reverseStudyEnabled: parseBoolean(env.VITE_FEATURE_REVERSE_STUDY, false),
  };
}

export const appConfig: AppRuntimeConfig = createAppConfig(import.meta.env);
