import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

/**
 * Email/password auth helpers over the shared Supabase browser client. The
 * client persists the session in localStorage by default, so `getSession`
 * reflects the user across page reloads.
 */

export async function signUp(email: string, password: string): Promise<User> {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  if (!data.user) throw new Error("signUp returned no user");
  return data.user;
}

export async function signIn(email: string, password: string): Promise<Session> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data.session) throw new Error("signIn returned no session");
  return data.session;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

/** Subscribe to auth state changes. Returns an unsubscribe function. */
export function onAuthChange(cb: (session: Session | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session));
  return () => data.subscription.unsubscribe();
}
