import { supabase } from "../../lib/supabase";
import type {
  EquipSlot,
  InventoryRepository,
  UserEquippedRecord,
  UserInventoryRecord,
} from "../types";

export function createSupabaseInventoryRepository(): InventoryRepository {
  return {
    async getInventory(userId) {
      const { data, error } = await supabase
        .from("user_inventory")
        .select("item_id, purchased_at")
        .eq("user_id", userId);
      if (error) throw error;
      return (data ?? []).map((r) => ({
        itemId: r.item_id as string,
        purchasedAt: r.purchased_at as string,
      })) satisfies UserInventoryRecord[];
    },

    async getEquipped(userId) {
      const { data, error } = await supabase
        .from("user_equipped")
        .select("slot, item_id")
        .eq("user_id", userId);
      if (error) throw error;
      return (data ?? []).map((r) => ({
        slot: r.slot as EquipSlot,
        itemId: r.item_id as string,
      })) satisfies UserEquippedRecord[];
    },

    async purchase(userId, itemId, _xpCost) {
      const { error } = await supabase
        .from("user_inventory")
        .insert({ user_id: userId, item_id: itemId });
      if (error) throw error;
    },

    async equip(userId, slot, itemId) {
      const { error } = await supabase.from("user_equipped").upsert(
        { user_id: userId, slot, item_id: itemId, updated_at: new Date().toISOString() },
        { onConflict: "user_id,slot" },
      );
      if (error) throw error;
    },
  };
}
