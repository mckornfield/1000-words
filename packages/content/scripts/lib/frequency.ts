import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FREQUENCY_DIR } from "./paths";
import type { LangPairConfig } from "./types";

export function loadFrequencyList(cfg: LangPairConfig, limit: number): string[] {
  const path = join(FREQUENCY_DIR, cfg.frequencyFile);
  const words = readFileSync(path, "utf8")
    .split("\n")
    .map((w) => w.trim())
    .filter((w) => w.length > 0);
  return words.slice(0, limit);
}
