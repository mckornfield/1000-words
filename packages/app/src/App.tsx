import { SAMPLE_CARDS } from "@1000words/content";
import { initialState } from "@1000words/engine";

/**
 * Phase 0 placeholder screen. It imports from both workspace packages so the
 * monorepo wiring (content + engine) is exercised by `vite build`. The real
 * shell, auth, and review UI are delivered under tasks B1–B4.
 */
export function App() {
  const fresh = initialState();
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center gap-4 bg-slate-50 p-6 text-center">
      <h1 className="text-4xl font-bold text-slate-900">1000 Words</h1>
      <p className="text-slate-600">
        Learn the 1000 most common words with spaced repetition.
      </p>
      <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
        <p>{SAMPLE_CARDS.length} sample cards loaded.</p>
        <p>Engine ready — fresh cards start in FSRS state {fresh.state}.</p>
      </div>
      <p className="text-xs text-slate-400">Phase 0 foundation. UI lands in tasks B1–B4.</p>
    </main>
  );
}
