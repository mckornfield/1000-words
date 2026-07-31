import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { localAccountRepository } from "../../data/account/repository";
import { createTestServices } from "../../test/createTestServices";
import { renderApp } from "../../test/renderApp";
import { ItemDetail } from "./ItemDetail";

vi.mock("../../lib/router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/router")>();
  return { ...actual, navigate: vi.fn() };
});

const data = localAccountRepository.getDashboardData("Usr-001");
const itemId = "StoreAvatar-002";

function coordinatorWith(inventory: { itemId: string; purchasedAt: string }[] = []) {
  const base = createTestServices();
  base.patchSnapshot({
    profile: {
      userId: "test-user",
      displayName: "Test Learner",
      bio: "",
      xp: 0,
      tokens: 500,
      streakCount: 0,
      lastActiveDate: null,
      createdAt: null,
      settings: {
        themePreference: "system" as const,
        dailyGoalMinutes: 15,
        autoAdvance: false,
        notifications: { streak: true, goalComplete: true, xpMilestone: false },
      },
    },
    achievements: [{ achievementId: "Ach-002", earnedAt: "2026-01-01T00:00:00Z" }],
    inventory,
  });
  return base.coordinator;
}

describe("ItemDetail trusted commands", () => {
  it("purchases through one idempotent catalog command without a direct token write", async () => {
    const user = userEvent.setup();
    const purchase = vi.fn(async (command: { itemId: string; requestId: string }) => ({
      requestId: command.requestId,
      itemId: command.itemId,
      tokenCost: 160,
      balance: 340,
      inventoryRecord: { itemId: command.itemId, purchasedAt: "2026-01-01T00:00:00Z" },
      status: "purchased" as const,
      replayed: false,
    }));

    const refresh = vi.fn(async () => {});
    const base = createTestServices();
    renderApp(<ItemDetail dashboardData={data} itemId={itemId} />, {
      services: {
        coordinator: coordinatorWith(),
        inventoryRepo: { ...base.inventoryRepo, purchase },

        refresh,
      },
    });

    await user.click(screen.getByRole("button", { name: /Purchase for 160/i }));

    await waitFor(() => expect(purchase).toHaveBeenCalledTimes(1));
    expect(purchase.mock.calls[0]![0]).toMatchObject({ itemId });
    expect(purchase.mock.calls[0]![0].requestId).toMatch(/[0-9a-f-]{36}/i);

    expect(refresh).toHaveBeenCalledWith(["profile", "inventory"]);
  });

  it("equips with a stable retry request id without accepting a caller-selected user or slot", async () => {
    const user = userEvent.setup();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const equip = vi.fn<(command: { itemId: string; requestId: string }) => Promise<{
      requestId: string; itemId: string; equipped: { itemId: string; slot: "profile_picture" };
      replacedItemId: null; replayed: boolean;
    }>>()
      .mockRejectedValueOnce(new Error("response_lost"))
      .mockImplementation(async (command) => ({
        requestId: command.requestId, itemId: command.itemId,
        equipped: { itemId: command.itemId, slot: "profile_picture" as const },
        replacedItemId: null, replayed: true,
      }));
    const base = createTestServices();
    renderApp(<ItemDetail dashboardData={data} itemId={itemId} />, {
      services: {
        coordinator: coordinatorWith([{ itemId, purchasedAt: "2026-01-01T00:00:00Z" }]),
        inventoryRepo: { ...base.inventoryRepo, equip },
      },
    });

    await user.click(screen.getByRole("button", { name: "Equip Now" }));
    await waitFor(() => expect(equip).toHaveBeenCalledTimes(1));
    await user.click(screen.getByRole("button", { name: "Equip Now" }));
    await waitFor(() => expect(equip).toHaveBeenCalledTimes(2));
    expect(equip.mock.calls[0]![0]).toMatchObject({ itemId });
    expect(equip.mock.calls[0]![0].requestId).toMatch(/[0-9a-f-]{36}/i);
    expect(equip.mock.calls[1]![0].requestId).toBe(equip.mock.calls[0]![0].requestId);
    expect(consoleError).toHaveBeenCalledWith("[ItemDetail] Equip failed:", expect.any(Error));
    consoleError.mockRestore();
  });

  it("uses a fresh purchase request id when the routed item changes", async () => {
    const user = userEvent.setup();
    const secondItem = data.storeItems.find((candidate) => candidate.storeItemId !== itemId && !candidate.achievementIdRequired)!;
    const purchase = vi.fn(async (command: { itemId: string; requestId: string }) => ({
      requestId: command.requestId, itemId: command.itemId, tokenCost: 1, balance: 499,
      inventoryRecord: { itemId: command.itemId, purchasedAt: "2026-01-01T00:00:00Z" },
      status: "purchased" as const, replayed: false,
    }));
    const base = createTestServices();
    const view = renderApp(<ItemDetail dashboardData={data} itemId={itemId} />, {
      services: { coordinator: coordinatorWith(), inventoryRepo: { ...base.inventoryRepo, purchase } },
    });
    await user.click(screen.getByRole("button", { name: /Purchase for/i }));
    await waitFor(() => expect(purchase).toHaveBeenCalledTimes(1));
    view.rerender(<ItemDetail dashboardData={data} itemId={secondItem.storeItemId} />);
    await user.click(screen.getByRole("button", { name: /Purchase for/i }));
    await waitFor(() => expect(purchase).toHaveBeenCalledTimes(2));
    expect(purchase.mock.calls[1]![0].requestId).not.toBe(purchase.mock.calls[0]![0].requestId);
  });
});
