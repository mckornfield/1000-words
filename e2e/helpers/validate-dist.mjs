/* global process, console */
import { access, readFile, readdir, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

async function exists(path) {
  try { await access(path); return true; } catch { return false; }
}

function registryEntries(source) {
  const entries = [];
  const objectPattern = /\{[\s\S]*?\bid:\s*["']([^"']+)["'][\s\S]*?\bdeckPath:\s*["']([^"']+)["'][\s\S]*?\baudioDirectory:\s*["']([^"']+)["'][\s\S]*?\}/g;
  for (const match of source.matchAll(objectPattern)) {
    entries.push({ id: match[1], deckPath: match[2], audioDirectory: match[3] });
  }
  if (entries.length === 0) throw new Error("Language registry has no artifact declarations");
  return entries;
}

async function requireFile(path, label) {
  if (!await exists(path) || !(await stat(path)).isFile()) throw new Error(`Missing ${label}: ${path}`);
}

function artifactPath(distDir, webPath) {
  return join(distDir, ...webPath.replace(/^\/+/, "").split("/"));
}

export async function validateDist({ distDir, registryFile, basePath = "/1000-words/" }) {
  const dist = resolve(distDir);
  const normalizedBase = `/${basePath.replace(/^\/+|\/+$/g, "")}/`;
  const indexPath = join(dist, "index.html");
  const notFoundPath = join(dist, "404.html");
  const manifestPath = join(dist, "manifest.webmanifest");
  await requireFile(indexPath, "index.html");
  await requireFile(notFoundPath, "404.html");
  await requireFile(manifestPath, "manifest.webmanifest");

  const index = await readFile(indexPath, "utf8");
  if (/\/src\/main\.(?:ts|tsx|js|jsx)/.test(index)) {
    throw new Error("index.html still references a source entrypoint instead of production assets");
  }
  const rootUrls = [...index.matchAll(/(?:src|href)=["'](\/[^"']+)["']/g)].map((match) => match[1]);
  const escaped = rootUrls.filter((url) => !url.startsWith(normalizedBase));
  if (escaped.length > 0) {
    throw new Error(`Entrypoints escape production base path ${normalizedBase}: ${escaped.join(", ")}`);
  }
  for (const url of rootUrls.filter((value) => value.startsWith(normalizedBase))) {
    const relative = url.slice(normalizedBase.length);
    await requireFile(artifactPath(dist, relative), `entrypoint ${url}`);
  }

  let manifest;
  try { manifest = JSON.parse(await readFile(manifestPath, "utf8")); }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid manifest.webmanifest JSON: ${message}`, { cause: error });
  }
  if (!Array.isArray(manifest.icons) || manifest.icons.length === 0) {
    throw new Error("manifest.webmanifest must declare at least one icon");
  }
  for (const icon of manifest.icons) {
    if (!icon?.src || !icon?.sizes || !icon?.type) throw new Error("Manifest icons require src, sizes, and type");
    await requireFile(artifactPath(dist, icon.src), `manifest icon ${icon.src}`);
  }

  const registry = registryEntries(await readFile(registryFile, "utf8"));
  const languages = [];
  for (const language of registry) {
    const deckFile = artifactPath(dist, language.deckPath);
    await requireFile(deckFile, `registry deck ${language.id}`);
    let cards;
    try { cards = JSON.parse(await readFile(deckFile, "utf8")); }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Invalid deck JSON for ${language.id}: ${message}`, { cause: error });
    }
    if (!Array.isArray(cards) || cards.length === 0) throw new Error(`Registry deck ${language.id} is empty`);

    const ids = new Set();
    for (const card of cards) {
      if (!card?.id || card.langPair !== language.id || !card.audio) {
        throw new Error(`Malformed card in registry deck ${language.id}`);
      }
      if (ids.has(card.id)) throw new Error(`Duplicate card id ${card.id} in ${language.id}`);
      ids.add(card.id);
      if (!card.audio.startsWith(`${language.audioDirectory}/`)) {
        throw new Error(`Card ${card.id} audio is outside registry directory ${language.audioDirectory}`);
      }
      if (!await exists(artifactPath(dist, card.audio))) {
        throw new Error(`Missing deck audio for ${card.id}: ${card.audio}`);
      }
    }
    const audioDir = artifactPath(dist, language.audioDirectory);
    const audio = (await readdir(audioDir, { withFileTypes: true })).filter((entry) => entry.isFile()).length;
    languages.push({ id: language.id, cards: cards.length, audio });
  }
  return { basePath: normalizedBase, languages, icons: manifest.icons.length };
}

async function main() {
  const here = dirname(fileURLToPath(import.meta.url));
  const repoRoot = resolve(here, "..", "..");
  const distDir = resolve(process.argv[2] ?? join(repoRoot, "packages", "app", "dist"));
  const registryFile = resolve(process.argv[3] ?? join(repoRoot, "packages", "content", "src", "languages.ts"));
  const result = await validateDist({ distDir, registryFile, basePath: process.env.BASE_URL ?? "/1000-words/" });
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
