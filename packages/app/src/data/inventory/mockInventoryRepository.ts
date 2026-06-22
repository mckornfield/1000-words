import type { StoreItem } from "../account/schema";
import type {
  EquipSlot,
  InventoryRepository,
  UserEquippedRecord,
  UserInventoryRecord,
} from "../types";

export function createMockInventoryRepository(items: StoreItem[]): InventoryRepository {
  const owned = new Set(items.filter((i) => i.isOwned).map((i) => i.storeItemId));
  const equipped = new Map<EquipSlot, string>(
    items
      .filter((i) => i.isEquipped)
      .map((i) => [i.category as EquipSlot, i.storeItemId]),
  );

  return {
    async getInventory(_userId) {
      return Array.from(owned).map((itemId) => ({
        itemId,
        purchasedAt: new Date().toISOString(),
      })) satisfies UserInventoryRecord[];
    },

    async getEquipped(_userId) {
      return Array.from(equipped.entries()).map(([slot, itemId]) => ({
        slot,
        itemId,
      })) satisfies UserEquippedRecord[];
    },

    async purchase(_userId, itemId, _xpCost) {
      owned.add(itemId);
    },

    async equip(_userId, slot, itemId) {
      equipped.set(slot, itemId);
    },
  };
}
