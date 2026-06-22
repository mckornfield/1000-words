import { appConfig } from "../../config/appConfig";
import { localAccountRepository } from "../account/repository";

// localStorage key used to persist the active session across page reloads.
// Changing this value will invalidate all existing sessions.
const SESSION_KEY = "words.demo.session";

export interface AuthSession {
  /** The authenticated user's ID, e.g. "Usr-001". Must match an entry in the account data. */
  userId: string;
}

export interface AuthRepository {
  /** Returns the current session from persistent storage, or null if none exists. */
  getSession(): AuthSession | null;
  /**
   * Validates credentials and writes a new session to persistent storage.
   * Throws a descriptive Error if credentials are invalid or demo mode is disabled.
   */
  signIn(email: string, password: string): AuthSession;
  /** Removes the session from persistent storage. */
  signOut(): void;
}

/**
 * Safely reads and validates the persisted session from localStorage.
 * Returns null if the key is absent, the value is not valid JSON, or the
 * parsed object does not contain a non-empty string userId.
 */
function readSession(): AuthSession | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    // Malformed JSON in localStorage — clear it and start fresh.
    console.warn(
      `[AuthRepository] Session key "${SESSION_KEY}" contained invalid JSON and has been cleared.`,
      err,
    );
    localStorage.removeItem(SESSION_KEY);
    return null;
  }

  // Validate that the parsed value has the expected shape before trusting it.
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as Record<string, unknown>).userId !== "string" ||
    !(parsed as Record<string, unknown>).userId
  ) {
    console.warn(
      `[AuthRepository] Session key "${SESSION_KEY}" had an unexpected shape and has been cleared.`,
      parsed,
    );
    localStorage.removeItem(SESSION_KEY);
    return null;
  }

  return { userId: (parsed as Record<string, unknown>).userId as string };
}

/** Serialises and writes a valid session object to localStorage. */
function writeSession(session: AuthSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export const localAuthRepository: AuthRepository = {
  getSession() {
    return readSession();
  },

  signIn(email, password) {
    // Guard: demo credentials are only permitted when explicitly enabled.
    if (!appConfig.demoLoginEnabled && email === "demo" && password === "demo") {
      throw new Error(
        "Demo login is not available in this environment. Please use a registered account.",
      );
    }

    const user = localAccountRepository.findUserByCredentials(email, password);
    if (!user) {
      // Intentionally vague to avoid leaking whether an email address is registered.
      throw new Error("Incorrect email or password. Please try again.");
    }

    const session: AuthSession = { userId: user.userId };
    writeSession(session);
    console.info(`[AuthRepository] Session created for userId=${session.userId}`);
    return session;
  },

  signOut() {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      localStorage.removeItem(SESSION_KEY);
      console.info("[AuthRepository] Session cleared.");
    }
  },
};
