import type { StoreItem } from "../account/schema";
import type {
  EquipSlot,
  EquipItemResult,
  InventoryRepository,
  PurchaseItemResult,
  UserEquippedRecord,
  UserInventoryRecord,
} from "../types";

interface MockInventoryOptions {
  initialTokens?: number;
  earnedAchievementIds?: Iterable<string>;
  hasAchievement?: (achievementId: string) => boolean;
  getBalance?: () => number;
  setBalance?: (balance: number) => void;
}

export function createMockInventoryRepository(
  items: StoreItem[],
  now: () => Date = () => new Date(),
  options: MockInventoryOptions = {},
): InventoryRepository {
  const catalog = new Map(items.map((item) => [item.storeItemId, item]));
  const owned = new Map(items.filter((item) => item.isOwned).map((item) => [item.storeItemId, now().toISOString()]));
  const equipped = new Map<EquipSlot, string>(
    items.filter((item) => item.isEquipped).map((item) => [item.category as EquipSlot, item.storeItemId]),
  );
  const earned = new Set(options.earnedAchievementIds ?? []);
  const hasAchievement = options.hasAchievement ?? ((achievementId: string) => earned.has(achievementId));
  const purchaseRequests = new Map<string, PurchaseItemResult>();
  const equipRequests = new Map<string, EquipItemResult>();
  let balance = options.initialTokens ?? Number.MAX_SAFE_INTEGER;
  const getBalance = options.getBalance ?? (() => balance);
  const setBalance = options.setBalance ?? ((next) => { balance = next; });

  return {
    async getInventory(_userId) {
      return Array.from(owned).map(([itemId, purchasedAt]) => ({ itemId, purchasedAt })) satisfies UserInventoryRecord[];
    },
    async getEquipped(_userId) {
      return Array.from(equipped.entries()).map(([slot, itemId]) => ({ slot, itemId })) satisfies UserEquippedRecord[];
    },
    async purchase(command) {
      const prior = purchaseRequests.get(command.requestId);
      if (prior) {
        if (prior.itemId !== command.itemId) throw new Error("idempotency_conflict");
        return { ...structuredClone(prior), replayed: true };
      }
      const item = catalog.get(command.itemId);
      if (!item) throw new Error("item_not_found");
      if (item.achievementIdRequired && !hasAchievement(item.achievementIdRequired)) throw new Error("achievement_required");
      const existingPurchasedAt = owned.get(command.itemId);
      const status = existingPurchasedAt ? "already_owned" : "purchased";
      if (!existingPurchasedAt) {
        if (getBalance() < item.tokenCost) throw new Error("insufficient_tokens");
        setBalance(getBalance() - item.tokenCost);
        owned.set(command.itemId, now().toISOString());
      }
      const result: PurchaseItemResult = {
        requestId: command.requestId,
        itemId: command.itemId,
        tokenCost: item.tokenCost,
        balance: getBalance(),
        inventoryRecord: { itemId: command.itemId, purchasedAt: owned.get(command.itemId)! },
        status,
        replayed: false,
      };
      purchaseRequests.set(command.requestId, structuredClone(result));
      return result;
    },
    async equip(command): Promise<EquipItemResult> {
      const prior = equipRequests.get(command.requestId);
      if (prior) {
        if (prior.itemId !== command.itemId) throw new Error("idempotency_conflict");
        return { ...structuredClone(prior), replayed: true };
      }
      const item = catalog.get(command.itemId);
      if (!item) throw new Error("item_not_found");
      if (!owned.has(command.itemId)) throw new Error("item_not_owned");
      const slot = item.category as EquipSlot;
      const replacedItemId = equipped.get(slot) ?? null;
      equipped.set(slot, command.itemId);
      const result: EquipItemResult = {
        requestId: command.requestId,
        itemId: command.itemId,
        equipped: { slot, itemId: command.itemId },
        replacedItemId,
        replayed: false,
      };
      equipRequests.set(command.requestId, structuredClone(result));
      return result;
    },
  };
}
