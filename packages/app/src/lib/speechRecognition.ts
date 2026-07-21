/**
 * Speech-to-text abstraction for the speaking-practice feature.
 *
 * Two backends, chosen at runtime:
 *  - Web: browser `SpeechRecognition` (Chrome/Android WebView only —
 *    Safari/WKWebView expose the constructor but it silently fails there,
 *    a known WebKit bug: https://bugs.webkit.org/show_bug.cgi?id=239816).
 *  - Native (Capacitor iOS/Android build): `@capacitor-community/speech-recognition`,
 *    which wraps SFSpeechRecognizer / Android SpeechRecognizer and works
 *    reliably inside the packaged WKWebView shell.
 *
 * Both return a plain transcript string — no phoneme-level detail. See
 * pronunciationScore.ts for how that transcript gets turned into a
 * match/no-match result.
 */
import { Capacitor } from "@capacitor/core";

// Web Speech API isn't in TypeScript's built-in DOM lib.
interface WebSpeechRecognitionResult {
  0: { transcript: string };
}
interface WebSpeechRecognitionEvent {
  results: ArrayLike<WebSpeechRecognitionResult>;
}
interface WebSpeechRecognition {
  lang: string;
  maxAlternatives: number;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: WebSpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onnomatch: (() => void) | null;
  onend: (() => void) | null;
}
type WebSpeechRecognitionCtor = new () => WebSpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition?: WebSpeechRecognitionCtor;
    webkitSpeechRecognition?: WebSpeechRecognitionCtor;
  }
}

const BCP47_BY_LANG_PAIR: Record<string, string> = {
  "en-es": "es-ES",
  "en-zh": "zh-CN",
  "en-ko": "ko-KR",
  "en-ja": "ja-JP",
};

export function bcp47ForLangPair(langPair: string): string {
  return BCP47_BY_LANG_PAIR[langPair] ?? "en-US";
}

function getWebSpeechRecognitionCtor(): WebSpeechRecognitionCtor | undefined {
  if (typeof window === "undefined") return undefined;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition;
}

/** Cheap, synchronous check for whether to show the mic control at all. */
export function isSpeechRecognitionSupported(): boolean {
  if (Capacitor.isNativePlatform()) return true;
  return !!getWebSpeechRecognitionCtor();
}

async function recognizeNative(lang: string): Promise<string> {
  const { SpeechRecognition } = await import("@capacitor-community/speech-recognition");

  const { available } = await SpeechRecognition.available();
  if (!available) throw new Error("Speech recognition is not available on this device");

  const { speechRecognition: permission } = await SpeechRecognition.checkPermissions();
  if (permission !== "granted") {
    const { speechRecognition: requested } = await SpeechRecognition.requestPermissions();
    if (requested !== "granted") throw new Error("Microphone/speech permission denied");
  }

  const { matches } = await SpeechRecognition.start({
    language: lang,
    maxResults: 1,
    partialResults: false,
    popup: false,
  });
  return matches?.[0] ?? "";
}

function recognizeWeb(lang: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const Ctor = getWebSpeechRecognitionCtor();
    if (!Ctor) {
      reject(new Error("Speech recognition is not supported in this browser"));
      return;
    }
    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.maxAlternatives = 1;
    recognition.interimResults = false;

    let settled = false;
    recognition.onresult = (event) => {
      settled = true;
      resolve(event.results[0]?.[0]?.transcript ?? "");
    };
    recognition.onnomatch = () => {
      settled = true;
      resolve("");
    };
    recognition.onerror = (event) => {
      settled = true;
      reject(new Error(event.error ?? "Speech recognition error"));
    };
    recognition.onend = () => {
      if (!settled) resolve("");
    };
    recognition.start();
  });
}

/** Listens once and resolves with the transcript (empty string if nothing recognized). */
export function recognizeSpeech(langPair: string): Promise<string> {
  const lang = bcp47ForLangPair(langPair);
  return Capacitor.isNativePlatform() ? recognizeNative(lang) : recognizeWeb(lang);
}
