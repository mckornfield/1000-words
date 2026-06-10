import { appConfig } from "../../config/appConfig";
import { localAccountRepository } from "../account/repository";

const SESSION_KEY = "words.demo.session";

export interface AuthSession {
  userId: string;
}

export interface AuthRepository {
  getSession(): AuthSession | null;
  signIn(email: string, password: string): AuthSession;
  signOut(): void;
}

function readSession(): AuthSession | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AuthSession;
    return parsed.userId ? parsed : null;
  } catch {
    return null;
  }
}

function writeSession(session: AuthSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export const localAuthRepository: AuthRepository = {
  getSession() {
    return readSession();
  },
  signIn(email, password) {
    if (!appConfig.demoLoginEnabled && email === "demo" && password === "demo") {
      throw new Error("Demo login is disabled by configuration.");
    }

    const user = localAccountRepository.findUserByCredentials(email, password);
    if (!user) throw new Error("Invalid credentials.");

    const session = { userId: user.userId };
    writeSession(session);
    return session;
  },
  signOut() {
    localStorage.removeItem(SESSION_KEY);
  },
};
