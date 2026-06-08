import Anthropic from "@anthropic-ai/sdk";
import type { DraftedCard, LangPairConfig } from "./types";

const MODEL = "claude-opus-4-7";

const CARD_JSON_SCHEMA = {
  type: "object",
  properties: {
    cards: {
      type: "array",
      items: {
        type: "object",
        properties: {
          word: { type: "string" },
          translation: { type: "string" },
          partOfSpeech: { type: "string" },
          exampleSentence: { type: "string" },
          exampleTranslation: { type: "string" },
        },
        required: [
          "word",
          "translation",
          "partOfSpeech",
          "exampleSentence",
          "exampleTranslation",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["cards"],
  additionalProperties: false,
} as const;

function buildSystemPrompt(cfg: LangPairConfig): string {
  return `You produce vocabulary cards for a spaced-repetition app teaching ${cfg.sourceName} speakers ${cfg.targetName}.

For each input word in ${cfg.targetName}, return:
- word: the input word, normalized (lowercase unless the word is a proper noun; preserve ${cfg.targetName} diacritics or characters exactly).
- translation: the single most common ${cfg.sourceName} meaning of the word in everyday speech. No alternatives, no parentheses. Lowercase unless it's a proper noun.
- partOfSpeech: one of "noun", "verb", "adjective", "adverb", "pronoun", "preposition", "conjunction", "determiner", "interjection", "particle", "phrase". Lowercase, no punctuation.
- exampleSentence: one short, grammatically simple sentence in ${cfg.targetName} (5 to 12 words) using the word naturally. Match the everyday register a beginner would encounter. End with appropriate sentence-final punctuation.
- exampleTranslation: a faithful ${cfg.sourceName} translation of exampleSentence (not a paraphrase). Sentence-final punctuation only.

Hard rules:
- Return exactly one card per input word, in the same order.
- Each card's "word" field must equal the corresponding input verbatim.
- Never use markdown, never wrap output in code fences, never add commentary.`;
}

function buildUserPrompt(words: string[]): string {
  const numbered = words.map((w, i) => `${i + 1}. ${w}`).join("\n");
  return `Generate cards for these ${words.length} ${words.length === 1 ? "word" : "words"} in order:\n\n${numbered}`;
}

interface DraftBatchResult {
  cards: DraftedCard[];
}

export async function draftBatch(
  client: Anthropic,
  cfg: LangPairConfig,
  words: string[],
): Promise<DraftedCard[]> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema: CARD_JSON_SCHEMA },
    },
    cache_control: { type: "ephemeral" },
    system: buildSystemPrompt(cfg),
    messages: [{ role: "user", content: buildUserPrompt(words) }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error(`no text block in response (stop_reason=${response.stop_reason})`);
  }
  const parsed = JSON.parse(textBlock.text) as DraftBatchResult;

  if (!Array.isArray(parsed.cards) || parsed.cards.length !== words.length) {
    throw new Error(
      `expected ${words.length} cards, got ${parsed.cards?.length ?? "none"}`,
    );
  }
  for (const [i, card] of parsed.cards.entries()) {
    if (card.word !== words[i]) {
      throw new Error(
        `card ${i} word mismatch: expected "${words[i]}", got "${card.word}"`,
      );
    }
  }
  return parsed.cards;
}
