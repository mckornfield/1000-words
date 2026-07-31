import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { tmpdir } from "node:os";
import { mkdtemp } from "node:fs/promises";

import { validateDist } from "./helpers/validate-dist.mjs";

const registrySource = `
export const LANGUAGE_REGISTRY = [{
  id: "en-es",
  deckPath: "assets/data/en-es.json",
  audioDirectory: "assets/audio/es",
}] as const;
`;

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "1000-words-dist-"));
  const dist = join(root, "dist");
  await mkdir(join(dist, "assets", "data"), { recursive: true });
  await mkdir(join(dist, "assets", "audio", "es"), { recursive: true });
  await mkdir(join(dist, "assets", "icons"), { recursive: true });
  await writeFile(join(root, "languages.ts"), registrySource);
  await writeFile(join(dist, "index.html"), '<script src="/1000-words/assets/app.js"></script>');
  await writeFile(join(dist, "404.html"), "<!doctype html>");
  await writeFile(join(dist, "assets", "app.js"), "export {};");
  await writeFile(join(dist, "assets", "icons", "icon.webp"), "icon");
  await writeFile(join(dist, "manifest.webmanifest"), JSON.stringify({
    icons: [{ src: "assets/icons/icon.webp", sizes: "48x48", type: "image/webp" }],
  }));
  await writeFile(join(dist, "assets", "data", "en-es.json"), JSON.stringify([
    { id: "es-0001", langPair: "en-es", audio: "assets/audio/es/es-0001.mp3" },
  ]));
  await writeFile(join(dist, "assets", "audio", "es", "es-0001.mp3"), "audio");
  return { root, dist, registry: join(root, "languages.ts") };
}

test("accepts a base-prefixed artifact with all registry decks, audio, and manifest icons", async () => {
  const { dist, registry } = await fixture();
  const result = await validateDist({ distDir: dist, registryFile: registry, basePath: "/1000-words/" });
  assert.deepEqual(result.languages, [{ id: "en-es", cards: 1, audio: 1 }]);
});

test("rejects an artifact when a deck-declared audio file is absent", async () => {
  const { dist, registry } = await fixture();
  await writeFile(join(dist, "assets", "data", "en-es.json"), JSON.stringify([
    { id: "es-0001", langPair: "en-es", audio: "assets/audio/es/missing.mp3" },
  ]));
  await assert.rejects(
    validateDist({ distDir: dist, registryFile: registry, basePath: "/1000-words/" }),
    /missing deck audio/i,
  );
});

test("rejects an artifact whose entrypoint escapes the production base path", async () => {
  const { dist, registry } = await fixture();
  await writeFile(join(dist, "index.html"), '<script src="/assets/app.js"></script>');
  await assert.rejects(
    validateDist({ distDir: dist, registryFile: registry, basePath: "/1000-words/" }),
    /production base path/i,
  );
});
