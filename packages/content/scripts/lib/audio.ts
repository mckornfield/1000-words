import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { AUDIO_DIR } from "./paths";
import type { LangPairConfig } from "./types";

const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1/text-to-speech";
const ELEVENLABS_MODEL = "eleven_multilingual_v2";

export function audioFilePath(cfg: LangPairConfig, id: string): string {
  return join(AUDIO_DIR, cfg.targetCode, `${id}.mp3`);
}

export function hasAudio(cfg: LangPairConfig, id: string): boolean {
  return existsSync(audioFilePath(cfg, id));
}

export async function synthesize(
  cfg: LangPairConfig,
  id: string,
  text: string,
  apiKey: string,
  voiceId: string,
): Promise<void> {
  const response = await fetch(`${ELEVENLABS_BASE}/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: ELEVENLABS_MODEL,
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`ElevenLabs ${response.status} for ${id}: ${body.slice(0, 200)}`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  const path = audioFilePath(cfg, id);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, bytes);
}
