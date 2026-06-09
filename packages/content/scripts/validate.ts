/**
 * Content validator (Phase 0 stub).
 *
 * Validates every generated deck under `data/<langPair>.json` against CardDeckSchema
 * and asserts each card's bundled mp3 exists under `audio/`. The full content
 * pipeline (task A3) produces those decks + mp3s; until then this exits cleanly
 * after validating the in-repo sample fixture.
 *
 * Run: pnpm --filter @1000words/content validate
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { CardDeckSchema } from "../src/schema";
import { SAMPLE_CARDS } from "../src/fixtures/sample-cards";

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = join(pkgRoot, "data");
const audioRoot = join(pkgRoot, "audio");

let errors = 0;

function fail(msg: string): void {
  errors++;
  console.error(`  ✗ ${msg}`);
}

// Always sanity-check the sample fixture so the validator itself is exercised in CI.
const fixture = CardDeckSchema.safeParse(SAMPLE_CARDS);
if (!fixture.success) {
  fail(`sample fixture is invalid: ${fixture.error.message}`);
} else {
  console.log(`✓ sample fixture: ${SAMPLE_CARDS.length} cards valid`);
}

const deckFiles = existsSync(dataDir)
  ? readdirSync(dataDir).filter((f) => f.endsWith(".json"))
  : [];

if (deckFiles.length === 0) {
  console.log("ℹ no generated decks under data/ yet (expected until task A3 runs)");
}

for (const file of deckFiles) {
  const parsed = CardDeckSchema.safeParse(
    JSON.parse(readFileSync(join(dataDir, file), "utf8")),
  );
  if (!parsed.success) {
    fail(`${file}: ${parsed.error.message}`);
    continue;
  }
  const seen = new Set<string>();
  for (const card of parsed.data) {
    if (seen.has(card.id)) fail(`${file}: duplicate card id ${card.id}`);
    seen.add(card.id);
    if (!existsSync(join(audioRoot, card.audio.replace(/^assets\/audio\//, "")))) {
      fail(`${file}: missing audio for ${card.id} (${card.audio})`);
    }
  }
  console.log(`✓ ${file}: ${parsed.data.length} cards valid`);
}

if (errors > 0) {
  console.error(`\n${errors} validation error(s)`);
  process.exit(1);
}
console.log("\nAll content valid.");
