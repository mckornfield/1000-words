import OpenAI from "openai";
import type { DraftedCard, LangPairConfig } from "./types";

const MODEL = process.env.LLM_MODEL ?? "gpt-4o-mini";

const SCHEMA_DESCRIPTION = `{
  "cards": [
    {
      "word": "<input word, exact characters>",
      "translation": "<single most common translation>",
      "partOfSpeech": "<one of: noun, verb, adjective, adverb, pronoun, preposition, conjunction, determiner, interjection, particle, phrase>",
      "exampleSentence": "<short, beginner-appropriate target-language sentence using the word>",
      "exampleTranslation": "<faithful source-language translation of exampleSentence>"
    }
  ]
}`;

function buildSystemPrompt(cfg: LangPairConfig): string {
  return `You produce vocabulary cards for a spaced-repetition app teaching ${cfg.sourceName} speakers ${cfg.targetName}.

For each input word in ${cfg.targetName}, return a card with these fields:
- word: the input word, verbatim (preserve ${cfg.targetName} diacritics or characters exactly; lowercase unless it's a proper noun).
- translation: the single most common ${cfg.sourceName} meaning in everyday speech. No alternatives, no parentheses. Lowercase unless proper noun.
- partOfSpeech: lowercase, one of: noun, verb, adjective, adverb, pronoun, preposition, conjunction, determiner, interjection, particle, phrase.
- exampleSentence: one short, grammatically simple sentence in ${cfg.targetName} (5 to 12 words) using the word naturally, at a beginner register. End with appropriate sentence-final punctuation.
- exampleTranslation: a faithful ${cfg.sourceName} translation of exampleSentence (not a paraphrase).

Output exactly this JSON shape, with one card per input word, in the same order as the input:
${SCHEMA_DESCRIPTION}

Hard rules:
- Return raw JSON only. No markdown, no code fences, no commentary, no preamble.
- Each card's "word" field must equal the corresponding input verbatim.
- Return exactly the number of cards requested.`;
}

function buildUserPrompt(words: string[]): string {
  const numbered = words.map((w, i) => `${i + 1}. ${w}`).join("\n");
  return `Generate cards for these ${words.length} ${words.length === 1 ? "word" : "words"} in order:\n\n${numbered}`;
}

interface DraftBatchResult {
  cards: DraftedCard[];
}

function extractJson(content: string): string {
  const trimmed = content.trim();
  if (trimmed.startsWith("```")) {
    return trimmed.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }
  return trimmed;
}

export async function draftBatch(
  client: OpenAI,
  cfg: LangPairConfig,
  words: string[],
): Promise<DraftedCard[]> {
  const response = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.3,
    max_tokens: 6000,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: buildSystemPrompt(cfg) },
      { role: "user", content: buildUserPrompt(words) },
    ],
  });

  const content = response.choices[0]?.message.content;
  if (!content) {
    throw new Error(
      `no content in response (finish_reason=${response.choices[0]?.finish_reason})`,
    );
  }
  const parsed = JSON.parse(extractJson(content)) as DraftBatchResult;

  if (!Array.isArray(parsed.cards) || parsed.cards.length !== words.length) {
    throw new Error(
      `expected ${words.length} cards, got ${parsed.cards?.length ?? "none"}`,
    );
  }
  for (const [i, card] of parsed.cards.entries()) {
    if (card.word.toLowerCase() !== words[i]!.toLowerCase()) {
      throw new Error(
        `card ${i} word mismatch: expected "${words[i]}", got "${card.word}"`,
      );
    }
  }
  return parsed.cards;
}
