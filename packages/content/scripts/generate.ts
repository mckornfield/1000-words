/**
 * Content generation pipeline (task A3).
 *
 * Reads a top-1000 frequency list, drafts translations + example sentences via
 * an OpenAI-compatible chat completions endpoint, and (optionally) synthesizes
 * one ElevenLabs mp3 per card. Writes the deck to `data/<langPair>.json` and
 * audio to `audio/<lang>/<id>.mp3`.
 *
 * Resume-aware: cards already present in the existing deck are skipped, as are
 * mp3s already on disk. Re-run safely after API failures.
 *
 * Usage:
 *   pnpm --filter @1000words/content generate -- --lang-pair en-es [--limit 1000] [--audio] [--batch-size 25] [--concurrency 4]
 *
 * Required env (in packages/content/.env): OPENAI_API_KEY.
 * Optional: OPENAI_BASE_URL (point at any OpenAI-compatible endpoint), LLM_MODEL
 *   (defaults to gpt-4o-mini).
 * Required when --audio is passed: ELEVENLABS_API_KEY + ELEVENLABS_VOICE_<LANG>.
 */
import "dotenv/config";
import OpenAI from "openai";
import { LANG_PAIRS, LangPairSchema, type Card, type LangPair } from "../src/schema";
import { mapConcurrent } from "./lib/concurrency";
import { audioRelPath, cardId, loadDeck, saveDeck } from "./lib/deck";
import { draftBatch } from "./lib/draft";
import { hasAudio, synthesize } from "./lib/audio";
import { loadFrequencyList } from "./lib/frequency";
import { LANG_PAIR_CONFIGS } from "./lib/types";

interface Args {
  langPair: LangPair;
  limit: number;
  audio: boolean;
  batchSize: number;
  concurrency: number;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const get = (flag: string): string | undefined => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const langPairRaw = get("--lang-pair");
  if (!langPairRaw) {
    throw new Error(`--lang-pair is required (one of: ${LANG_PAIRS.join(", ")})`);
  }
  return {
    langPair: LangPairSchema.parse(langPairRaw),
    limit: Number(get("--limit") ?? 1000),
    audio: args.includes("--audio"),
    batchSize: Number(get("--batch-size") ?? 25),
    concurrency: Number(get("--concurrency") ?? 4),
  };
}

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

async function main(): Promise<void> {
  const args = parseArgs();
  const cfg = LANG_PAIR_CONFIGS[args.langPair];

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set (see .env.example)");
  }
  const client = new OpenAI();

  let elevenLabsKey: string | undefined;
  let voiceId: string | undefined;
  if (args.audio) {
    elevenLabsKey = process.env.ELEVENLABS_API_KEY;
    voiceId = process.env[cfg.elevenLabsVoiceEnv];
    if (!elevenLabsKey) throw new Error("--audio requires ELEVENLABS_API_KEY");
    if (!voiceId) throw new Error(`--audio requires ${cfg.elevenLabsVoiceEnv}`);
  }

  const words = loadFrequencyList(cfg, args.limit);
  const existing = loadDeck(args.langPair);
  const existingById = new Map(existing.map((c) => [c.id, c]));

  console.log(
    `[${args.langPair}] ${words.length} target words; ${existing.length} cards already drafted.`,
  );

  const toDraft: { word: string; index: number; id: string }[] = [];
  words.forEach((word, index) => {
    const id = cardId(cfg, index);
    if (!existingById.has(id)) toDraft.push({ word, index, id });
  });

  if (toDraft.length === 0) {
    console.log("[draft] nothing to draft; deck is complete.");
  } else {
    console.log(
      `[draft] drafting ${toDraft.length} cards in ${Math.ceil(toDraft.length / args.batchSize)} batches of ${args.batchSize} (concurrency ${args.concurrency}).`,
    );
    const batches = chunk(toDraft, args.batchSize);
    let drafted = 0;
    await mapConcurrent(batches, args.concurrency, async (batch) => {
      const cards = await draftBatch(client, cfg, batch.map((b) => b.word));
      for (const [i, entry] of batch.entries()) {
        const d = cards[i]!;
        existingById.set(entry.id, {
          id: entry.id,
          langPair: args.langPair,
          word: d.word,
          translation: d.translation,
          partOfSpeech: d.partOfSpeech,
          exampleSentence: d.exampleSentence,
          exampleTranslation: d.exampleTranslation,
          audio: audioRelPath(cfg, entry.id),
        });
      }
      drafted += batch.length;
      const merged = words
        .map((_, i) => existingById.get(cardId(cfg, i)))
        .filter((c): c is Card => c !== undefined);
      saveDeck(args.langPair, merged);
      console.log(`[draft] ${drafted}/${toDraft.length} drafted; deck saved.`);
    });
  }

  if (!args.audio) {
    console.log("[audio] skipped (pass --audio with ElevenLabs env vars to synthesize).");
    return;
  }

  const finalDeck = words
    .map((_, i) => existingById.get(cardId(cfg, i)))
    .filter((c): c is Card => c !== undefined);
  const needAudio = finalDeck.filter((c) => !hasAudio(cfg, c.id));
  console.log(
    `[audio] ${finalDeck.length - needAudio.length}/${finalDeck.length} cards already have audio; synthesizing ${needAudio.length}.`,
  );

  let done = 0;
  await mapConcurrent(needAudio, 3, async (card) => {
    await synthesize(cfg, card.id, card.word, elevenLabsKey!, voiceId!);
    done++;
    if (done % 10 === 0 || done === needAudio.length) {
      console.log(`[audio] ${done}/${needAudio.length} synthesized.`);
    }
  });

  console.log(`\nDone. Deck: data/${args.langPair}.json; audio: audio/${cfg.targetCode}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
