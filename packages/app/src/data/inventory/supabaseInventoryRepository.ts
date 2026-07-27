import { supabase } from "../../lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { EquipSlot, InventoryRepository, UserEquippedRecord, UserInventoryRecord } from "../types";
import { EquipItemResultSchema, PurchaseItemResultSchema } from "../rpcSchemas";

export function createSupabaseInventoryRepository(client: SupabaseClient = supabase): InventoryRepository {
  return {
    async getInventory(userId) {
      const { data, error } = await client.from("user_inventory").select("item_id, purchased_at").eq("user_id", userId);
      if (error) throw error;
      return (data ?? []).map((r) => ({ itemId: r.item_id as string, purchasedAt: r.purchased_at as string })) satisfies UserInventoryRecord[];
    },
    async getEquipped(userId) {
      const { data, error } = await client.from("user_equipped").select("slot, item_id").eq("user_id", userId);
      if (error) throw error;
      return (data ?? []).map((r) => ({ slot: r.slot as EquipSlot, itemId: r.item_id as string })) satisfies UserEquippedRecord[];
    },
    async purchase(command) {
      const { data, error } = await client.rpc("purchase_item", { p_item_id: command.itemId, p_request_id: command.requestId });
      if (error) throw error;
      const result = PurchaseItemResultSchema.parse(data);
      if (result.requestId !== command.requestId || result.itemId !== command.itemId || result.inventoryRecord.itemId !== command.itemId) {
        const cause = new Error(`expected ${command.requestId}/${command.itemId}, received ${result.requestId}/${result.itemId}`);
        throw new Error("purchase_response_identity_mismatch", { cause });
      }
      return result;
    },
    async equip(command) {
      const { data, error } = await client.rpc("equip_item", { p_item_id: command.itemId, p_request_id: command.requestId });
      if (error) throw error;
      const result = EquipItemResultSchema.parse(data);
      if (result.requestId !== command.requestId || result.itemId !== command.itemId || result.equipped.itemId !== command.itemId) {
        throw new Error("equip_response_identity_mismatch");
      }
      return result;
    },
  };
}
