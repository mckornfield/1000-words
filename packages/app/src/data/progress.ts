import { supabase } from "../lib/supabase";
import { createProgressStore } from "./progressStore";

export type { ProgressStore } from "./progressStore";
export { createProgressStore } from "./progressStore";

/** App-bound singleton; the test suite constructs its own per-user instances. */
export const progressStore = createProgressStore(supabase);
