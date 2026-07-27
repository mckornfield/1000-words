import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseProfileRepository } from "./supabaseProfileRepository";

describe("Supabase profile repository security boundary", () => {
  it("does not expose raw XP, token, or streak mutation commands", () => {
    const repo = createSupabaseProfileRepository({} as SupabaseClient);
    expect(repo).not.toHaveProperty("addXp");
    expect(repo).not.toHaveProperty("addTokens");
    expect(repo).not.toHaveProperty("spendTokens");
    expect(repo).not.toHaveProperty("touchStreak");
  });

  it("selects and maps persisted bio and time zone without fixture loss", async () => {
    const fixture = {
      user_id: "user-1",
      display_name: "Ada",
      bio: "Learning every day",
      time_zone: "Pacific/Auckland",
      settings: null,
      streak_count: 8,
      xp: 400,
      tokens: 25,
      last_active_date: "2026-07-26",
      created_at: "2026-01-01T00:00:00.000Z",
    };
    const single = vi.fn().mockResolvedValue({ data: fixture, error: null });
    const eq = vi.fn().mockReturnValue({ single });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    const repo = createSupabaseProfileRepository({ from } as unknown as SupabaseClient);

    await expect(repo.getProfile("user-1")).resolves.toMatchObject({
      userId: "user-1",
      bio: "Learning every day",
      timeZone: "Pacific/Auckland",
    });
    expect(from).toHaveBeenCalledExactlyOnceWith("profiles");
    expect(select).toHaveBeenCalledExactlyOnceWith(
      "user_id, display_name, bio, time_zone, settings, streak_count, xp, tokens, last_active_date, created_at",
    );
    expect(eq).toHaveBeenCalledExactlyOnceWith("user_id", "user-1");
  });
});
