/**
 * Copies generated decks (`data/*.json`) and audio (`audio/<lang>/*`) from this
 * package into `packages/app/public/assets/` so Vite picks them up at build time.
 *
 * Hooked into the app's `prebuild` script — also safe to run by hand.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { AUDIO_DIR, DATA_DIR, PKG_ROOT } from "./lib/paths";

const APP_PUBLIC = join(PKG_ROOT, "..", "app", "public", "assets");
const APP_DATA = join(APP_PUBLIC, "data");
const APP_AUDIO = join(APP_PUBLIC, "audio");

function countFiles(dir: string): number {
  if (!existsSync(dir)) return 0;
  let count = 0;
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) count += countFiles(path);
    else count++;
  }
  return count;
}

mkdirSync(APP_PUBLIC, { recursive: true });

if (existsSync(DATA_DIR)) {
  mkdirSync(APP_DATA, { recursive: true });
  cpSync(DATA_DIR, APP_DATA, { recursive: true });
  console.log(`[sync] data → ${APP_DATA} (${countFiles(APP_DATA)} files)`);
} else {
  console.log("[sync] no data/ directory yet; nothing to copy (run pnpm generate).");
}

if (existsSync(AUDIO_DIR)) {
  mkdirSync(APP_AUDIO, { recursive: true });
  cpSync(AUDIO_DIR, APP_AUDIO, { recursive: true });
  console.log(`[sync] audio → ${APP_AUDIO} (${countFiles(APP_AUDIO)} files)`);
} else {
  console.log("[sync] no audio/ directory yet; skipping audio copy.");
}
