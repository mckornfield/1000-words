import { describe, expect, it } from "vitest";
import { createMockInventoryRepository } from "./mockInventoryRepository";
import type { StoreItem } from "../account/schema";

const items = [
  { storeItemId: "Accent-001", category: "profile_accent", name: "A", description: "A", priceXp: 0, tokenCost: 25, achievementIdRequired: null, assetRefId: "Asset-Accent-001", emoji: "a", emojiFallback: "a", isOwned: false, isEquipped: false },
  { storeItemId: "Accent-002", category: "profile_accent", name: "B", description: "B", priceXp: 0, tokenCost: 50, achievementIdRequired: null, assetRefId: "Asset-Accent-002", emoji: "b", emojiFallback: "b", isOwned: false, isEquipped: false },
] satisfies StoreItem[];

describe("mock trusted inventory commands", () => {
  it("charges the catalog cost once and replays a stable request", async () => {
    const repo = createMockInventoryRepository(items, () => new Date("2026-07-26T00:00:00Z"), { initialTokens: 25 });
    const command = { itemId: "Accent-001", requestId: "00000000-0000-4000-8000-000000000001" };
    const first = await repo.purchase(command);
    const second = await repo.purchase(command);
    expect(first).toMatchObject({ tokenCost: 25, balance: 0, status: "purchased", replayed: false });
    expect(second).toEqual({ ...first, replayed: true });
  });

  it("rejects a reused request id for another item", async () => {
    const repo = createMockInventoryRepository(items, undefined, { initialTokens: 100 });
    await repo.purchase({ itemId: "Accent-001", requestId: "00000000-0000-4000-8000-000000000001" });
    await expect(repo.purchase({ itemId: "Accent-002", requestId: "00000000-0000-4000-8000-000000000001" })).rejects.toThrow("idempotency_conflict");
  });

  it("equips only owned items and replays the original replacement result", async () => {
    const repo = createMockInventoryRepository(items, undefined, { initialTokens: 100 });
    const requestId = "00000000-0000-4000-8000-000000000010";
    await expect(repo.equip({ itemId: "Accent-001", requestId })).rejects.toThrow("item_not_owned");
    await repo.purchase({ itemId: "Accent-001", requestId: crypto.randomUUID() });
    await repo.purchase({ itemId: "Accent-002", requestId: crypto.randomUUID() });
    const first = await repo.equip({ itemId: "Accent-001", requestId });
    await repo.equip({ itemId: "Accent-002", requestId: crypto.randomUUID() });
    const replay = await repo.equip({ itemId: "Accent-001", requestId });
    expect(first).toMatchObject({ requestId, itemId: "Accent-001", replacedItemId: null, replayed: false });
    expect(replay).toEqual({ ...first, replayed: true });
  });

  it("rejects a reused equip request id for another item", async () => {
    const repo = createMockInventoryRepository(items, undefined, { initialTokens: 100 });
    await repo.purchase({ itemId: "Accent-001", requestId: crypto.randomUUID() });
    await repo.purchase({ itemId: "Accent-002", requestId: crypto.randomUUID() });
    const requestId = "00000000-0000-4000-8000-000000000011";
    await repo.equip({ itemId: "Accent-001", requestId });
    await expect(repo.equip({ itemId: "Accent-002", requestId })).rejects.toThrow("idempotency_conflict");
  });
});
