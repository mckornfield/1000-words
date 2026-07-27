export type StudyDirection = "recognition" | "production";
export type LanguageAvailability = "shipped" | "beta" | "planned";
export type LanguageIconKey = "flag-es" | "flag-cn" | "flag-kr" | "flag-jp";

export interface LanguageRegistration {
  readonly id: string;
  readonly source: {
    readonly code: string;
    readonly displayName: string;
    readonly nativeName: string;
  };
  readonly target: {
    readonly code: string;
    readonly displayName: string;
    readonly nativeName: string;
  };
  readonly iconKey: LanguageIconKey;
  readonly speechLocale: string;
  readonly deckPath: string;
  readonly audioDirectory: string;
  readonly frequencyFile: string;
  readonly cardIdPrefix: string;
  readonly elevenLabsVoiceEnv: string;
  readonly availability: LanguageAvailability;
  readonly supportedDirections: readonly StudyDirection[];
}

function defineLanguages<const T extends readonly [LanguageRegistration, ...LanguageRegistration[]]>(
  entries: T,
): T {
  return entries;
}

export const LANGUAGE_REGISTRY = defineLanguages([
  {
    id: "en-es",
    source: { code: "en", displayName: "English", nativeName: "English" },
    target: { code: "es", displayName: "Spanish", nativeName: "Español" },
    iconKey: "flag-es",
    speechLocale: "es-ES",
    deckPath: "assets/data/en-es.json",
    audioDirectory: "assets/audio/es",
    frequencyFile: "es.txt",
    cardIdPrefix: "es",
    elevenLabsVoiceEnv: "ELEVENLABS_VOICE_ES",
    availability: "shipped",
    supportedDirections: ["recognition", "production"],
  },
  {
    id: "en-zh",
    source: { code: "en", displayName: "English", nativeName: "English" },
    target: { code: "zh", displayName: "Mandarin Chinese", nativeName: "中文" },
    iconKey: "flag-cn",
    speechLocale: "zh-CN",
    deckPath: "assets/data/en-zh.json",
    audioDirectory: "assets/audio/zh",
    frequencyFile: "zh.txt",
    cardIdPrefix: "zh",
    elevenLabsVoiceEnv: "ELEVENLABS_VOICE_ZH",
    availability: "shipped",
    supportedDirections: ["recognition", "production"],
  },
  {
    id: "en-ko",
    source: { code: "en", displayName: "English", nativeName: "English" },
    target: { code: "ko", displayName: "Korean", nativeName: "한국어" },
    iconKey: "flag-kr",
    speechLocale: "ko-KR",
    deckPath: "assets/data/en-ko.json",
    audioDirectory: "assets/audio/ko",
    frequencyFile: "ko.txt",
    cardIdPrefix: "ko",
    elevenLabsVoiceEnv: "ELEVENLABS_VOICE_KO",
    availability: "shipped",
    supportedDirections: ["recognition", "production"],
  },
  {
    id: "en-ja",
    source: { code: "en", displayName: "English", nativeName: "English" },
    target: { code: "ja", displayName: "Japanese", nativeName: "日本語" },
    iconKey: "flag-jp",
    speechLocale: "ja-JP",
    deckPath: "assets/data/en-ja.json",
    audioDirectory: "assets/audio/ja",
    frequencyFile: "ja.txt",
    cardIdPrefix: "ja",
    elevenLabsVoiceEnv: "ELEVENLABS_VOICE_JA",
    availability: "shipped",
    supportedDirections: ["recognition", "production"],
  },
] as const);

export type LangPair = (typeof LANGUAGE_REGISTRY)[number]["id"];

type LanguageIds<T extends readonly LanguageRegistration[]> = {
  readonly [K in keyof T]: T[K] extends LanguageRegistration ? T[K]["id"] : never;
};

function languageIds<const T extends readonly LanguageRegistration[]>(entries: T): LanguageIds<T> {
  return entries.map((entry) => entry.id) as unknown as LanguageIds<T>;
}

export const LANG_PAIRS = languageIds(LANGUAGE_REGISTRY);

export function getLanguage(id: string): (typeof LANGUAGE_REGISTRY)[number] | undefined {
  return LANGUAGE_REGISTRY.find((entry) => entry.id === id);
}

export function requireLanguage(id: string): (typeof LANGUAGE_REGISTRY)[number] {
  const entry = getLanguage(id);
  if (!entry) throw new Error(`Unsupported language pair: ${id}`);
  return entry;
}

export function availableLanguages(): readonly (typeof LANGUAGE_REGISTRY)[number][] {
  return LANGUAGE_REGISTRY.filter((entry) => entry.availability === "shipped");
}

export function languageForCardId(
  cardId: string,
): (typeof LANGUAGE_REGISTRY)[number] | undefined {
  return LANGUAGE_REGISTRY.find((entry) => cardId.startsWith(`${entry.cardIdPrefix}-`));
}
