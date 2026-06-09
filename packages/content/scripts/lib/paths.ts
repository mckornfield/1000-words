import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const FREQUENCY_DIR = join(PKG_ROOT, "frequency");
export const DATA_DIR = join(PKG_ROOT, "data");
export const AUDIO_DIR = join(PKG_ROOT, "audio");
