import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Load the repo-root `.env` into process.env so tests (RLS integration,
 * future Supabase-touching tests) read the same values the Vite app does.
 * Uses Node 22's built-in env-file loader — no dotenv dependency.
 */
const rootEnv = fileURLToPath(new URL("../../.env", import.meta.url));
if (existsSync(rootEnv)) {
  process.loadEnvFile(rootEnv);
}
