import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseLeaderboardRepository } from "./supabaseLeaderboardRepository";

const row = {
  user_id: "user-1",
  display_name: "Ada",
  xp: 750,
  level: 4,
  achievement_count: 3,
  rank_value: 12,
  rank: 37,
  border_item_id: "border-1",
  badge_item_id: null,
  avatar_item_id: "avatar-1",
};

describe("createSupabaseLeaderboardRepository", () => {
  it("maps the authoritative SQL rank returned for top entries", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [row], error: null });
    const repo = createSupabaseLeaderboardRepository({ rpc } as unknown as SupabaseClient);

    await expect(repo.getTopN(10)).resolves.toMatchObject([{ rank: 37, rankValue: 12 }]);
    expect(rpc).toHaveBeenCalledExactlyOnceWith("get_leaderboard", { n: 10 });
  });

  it("calls the current-user RPC without arguments and maps its authoritative rank", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [row], error: null });
    const repo = createSupabaseLeaderboardRepository({ rpc } as unknown as SupabaseClient);

    await expect(repo.getCurrentUserEntry("ignored-client-user-id")).resolves.toMatchObject({
      userId: "user-1",
      rank: 37,
      rankValue: 12,
    });
    expect(rpc).toHaveBeenCalledExactlyOnceWith("get_current_user_rank");
  });
});
