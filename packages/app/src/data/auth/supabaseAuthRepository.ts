import * as authLib from "../../lib/auth";
import type { AuthRepository } from "../types";

export function createSupabaseAuthRepository(): AuthRepository {
  return {
    async getSession() {
      const s = await authLib.getSession();
      if (!s) return null;
      return { userId: s.user.id, email: s.user.email! };
    },

    async signIn(email, password) {
      const s = await authLib.signIn(email, password);
      return { userId: s.user.id, email: s.user.email! };
    },

    async signOut() {
      await authLib.signOut();
    },

    onAuthChange(cb) {
      return authLib.onAuthChange((s) =>
        cb(s ? { userId: s.user.id, email: s.user.email! } : null),
      );
    },
  };
}
