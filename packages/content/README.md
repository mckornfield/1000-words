# @1000words/content

Card decks + audio for the 1000-words app. The card schema lives in
`src/schema.ts`; the generation pipeline lives in `scripts/`. Decks and audio
themselves are generated, not committed — see [Generation pipeline](#generation-pipeline).

## Layout

```
packages/content/
├── frequency/        # vendored top-1000 word lists per target language (committed)
├── scripts/
│   ├── generate.ts   # drafts cards via LLM, optionally synthesizes audio
│   ├── sync-to-app.ts# copies data/ + audio/ into packages/app/public/assets/
│   ├── validate.ts   # asserts deck JSON matches CardSchema and audio exists
│   └── lib/          # helpers (frequency, deck I/O, drafting, audio, concurrency)
├── src/
│   ├── schema.ts     # CardSchema, LangPair, LANG_PAIRS
│   └── fixtures/     # tiny hand-written sample deck for UI dev
├── data/             # generated decks <langPair>.json (gitignored)
└── audio/            # generated mp3s <lang>/<id>.mp3 (gitignored)
```

## Setup

Copy `.env.example` to `.env` and fill in the values you need:

```sh
cp packages/content/.env.example packages/content/.env
```

| Variable | Required for | Notes |
|---|---|---|
| `OPENAI_API_KEY` | drafting | Any OpenAI-compatible chat completions key. |
| `OPENAI_BASE_URL` | drafting | Optional. Defaults to `https://api.openai.com/v1`. Set this to use a different OpenAI-compatible endpoint. |
| `LLM_MODEL` | drafting | Optional. Defaults to `gpt-4o-mini`. Use whatever model ID your endpoint serves. |
| `ELEVENLABS_API_KEY` | audio synthesis | Required only when running with `--audio`. |
| `ELEVENLABS_VOICE_ES`, `ELEVENLABS_VOICE_ZH` | audio synthesis | Per-language voice IDs from the ElevenLabs voice library. |

`.env` is gitignored. Never commit secrets.

## Generation pipeline

### 1. Draft cards

```sh
pnpm --filter @1000words/content generate --lang-pair en-es
```

Reads `frequency/es.txt`, sends 25 words per request to the configured LLM,
and writes `data/en-es.json` with cards conforming to `CardSchema`. The deck
is saved after each successful batch.

The script is **resume-aware**: cards already present in `data/en-es.json`
are skipped on re-run. Safe to re-run after API failures or interruptions.

Flags:

| Flag | Default | Purpose |
|---|---|---|
| `--lang-pair` | required | One of the values in `LANG_PAIRS` (`en-es`, `en-zh`). |
| `--limit` | `1000` | Take only the top N words from the frequency list. Useful for smoke tests (`--limit 10`). |
| `--audio` | off | Also synthesize one mp3 per card via ElevenLabs. Requires the EL env vars. |
| `--batch-size` | `25` | Words drafted per LLM request. |
| `--concurrency` | `4` | Parallel LLM requests in flight. Drop this if you hit rate limits. |

**Recommended first run**: smoke-test with `--limit 10` to inspect translation
quality, sentence register, and JSON shape before generating the full deck.

### 2. Generate audio (when ready)

Fill in the ElevenLabs env vars, then re-run with `--audio`:

```sh
pnpm --filter @1000words/content generate --lang-pair en-es --audio
```

Audio files are written to `audio/es/<id>.mp3`. Like drafting, this is
resume-aware: cards whose mp3 is already on disk are skipped.

### 3. Validate

```sh
pnpm --filter @1000words/content validate
```

Checks every deck under `data/` against `CardSchema`, asserts card IDs are
unique within each deck, and verifies the referenced mp3 exists under
`audio/`. Fails on missing audio — expected until you've run with `--audio`.

### 4. Sync into the app

```sh
pnpm --filter @1000words/content sync
```

Copies `data/*.json` → `packages/app/public/assets/data/` and
`audio/<lang>/*` → `packages/app/public/assets/audio/<lang>/`. This step
also runs automatically as the app's `prebuild`, so
`pnpm --filter @1000words/app build` will pick up the latest content.

## Adding a new language

1. Add the pair to `LANG_PAIRS` in `src/schema.ts` (e.g. `"en-fr"`).
2. Add an entry to `LANG_PAIR_CONFIGS` in `scripts/lib/types.ts` with the
   target language name, ISO code, frequency file name, id prefix, and
   ElevenLabs voice env var name.
3. Vendor a top-1000 frequency list at `frequency/<lang>.txt`. See
   `frequency/README.md` for provenance + the filter regex used to slice
   from HermitDave/FrequencyWords.
4. Add the new ElevenLabs voice env var to `.env.example` and `.env`.
5. Run `pnpm generate --lang-pair en-<new>` and validate as above.

## Cost notes

Costs vary by chosen model and endpoint. Rough order of magnitude per 1000
cards at the default `gpt-4o-mini`: a few dollars. Premium models can be
~10× more. ElevenLabs audio synthesis is billed per character; the full
1000-card deck per language runs in the low tens of dollars depending on
plan.

Audio synthesis is a **one-time content cost** — mp3s are bundled in the
app and replayed locally, so there is no runtime audio cost per user.
