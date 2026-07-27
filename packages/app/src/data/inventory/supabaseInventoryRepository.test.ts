import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseInventoryRepository } from "./supabaseInventoryRepository";

describe("Supabase trusted inventory commands", () => {
  it("purchase sends only item and stable request id and parses trusted price", async () => {
    const requestId = crypto.randomUUID();
    const data = { requestId, itemId: "Accent-001", tokenCost: 25, balance: 75, inventoryRecord: { itemId: "Accent-001", purchasedAt: "2026-07-26T00:00:00Z" }, status: "purchased", replayed: false };
    const rpc = vi.fn().mockResolvedValue({ data, error: null });
    const result = await createSupabaseInventoryRepository({ rpc } as unknown as SupabaseClient).purchase({ itemId: "Accent-001", requestId });
    expect(rpc).toHaveBeenCalledWith("purchase_item", { p_item_id: "Accent-001", p_request_id: requestId });
    expect(result).toEqual(data);
  });

  it("equip sends item and stable request id without a caller-selected slot", async () => {
    const requestId = crypto.randomUUID();
    const data = { requestId, itemId: "Accent-001", equipped: { slot: "profile_accent", itemId: "Accent-001" }, replacedItemId: null, replayed: false };
    const rpc = vi.fn().mockResolvedValue({ data, error: null });
    await expect(createSupabaseInventoryRepository({ rpc } as unknown as SupabaseClient).equip({ itemId: "Accent-001", requestId })).resolves.toEqual(data);
    expect(rpc).toHaveBeenCalledWith("equip_item", { p_item_id: "Accent-001", p_request_id: requestId });
  });

  it("rejects an equip response for another request or item", async () => {
    const requestId = crypto.randomUUID();
    const rpc = vi.fn().mockResolvedValue({ data: {
      requestId: crypto.randomUUID(), itemId: "Accent-002",
      equipped: { slot: "profile_accent", itemId: "Accent-002" }, replacedItemId: null, replayed: false,
    }, error: null });
    await expect(createSupabaseInventoryRepository({ rpc } as unknown as SupabaseClient).equip({ itemId: "Accent-001", requestId })).rejects.toThrow("equip_response_identity_mismatch");
  });

  it("rejects a purchase response for another request or item", async () => {
    const requestId = crypto.randomUUID();
    const rpc = vi.fn().mockResolvedValue({ data: {
      requestId: crypto.randomUUID(), itemId: "Accent-002", tokenCost: 25, balance: 75,
      inventoryRecord: { itemId: "Accent-002", purchasedAt: "2026-07-26T00:00:00Z" },
      status: "purchased", replayed: false,
    }, error: null });
    await expect(createSupabaseInventoryRepository({ rpc } as unknown as SupabaseClient).purchase({ itemId: "Accent-001", requestId })).rejects.toThrow("purchase_response_identity_mismatch");
  });

  it("rejects malformed RPC JSON", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { balance: -1 }, error: null });
    await expect(createSupabaseInventoryRepository({ rpc } as unknown as SupabaseClient).purchase({ itemId: "Accent-001", requestId: crypto.randomUUID() })).rejects.toThrow();
  });
});
