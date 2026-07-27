import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { localAccountRepository } from "../../data/account/repository";
import { buildRoutePath, navigate } from "../../lib/router";
import { renderApp } from "../../test/renderApp";
import { ShopBrowse } from "./ShopBrowse";

vi.mock("../../lib/router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/router")>();
  return { ...actual, navigate: vi.fn() };
});

describe("ShopBrowse item accessibility", () => {
  it("exposes each item as a focusable link that activates from the keyboard", async () => {
    const user = userEvent.setup();
    const data = localAccountRepository.getDashboardData("Usr-001");
    const item = [...data.storeItems].sort((a, b) => a.tokenCost - b.tokenCost)[0]!;
    renderApp(<ShopBrowse dashboardData={data} />);

    const link = screen.getByRole("link", { name: new RegExp(item.name, "i") });
    link.focus();
    expect(link).toHaveFocus();
    expect(link).toHaveAttribute("href", buildRoutePath("/shop/:itemId", { itemId: item.storeItemId }));

    await user.keyboard("{Enter}");
    expect(navigate).toHaveBeenCalledWith("/shop/:itemId", { itemId: item.storeItemId });
  });
});