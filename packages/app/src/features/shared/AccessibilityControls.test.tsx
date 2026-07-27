import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { localAccountRepository } from "../../data/account/repository";
import { renderApp } from "../../test/renderApp";
import { DashboardPage } from "../dashboard/DashboardPage";
import { ObjectivesHub } from "../objectives/ObjectivesHub";
import { SettingsPage } from "../profile/SettingsPage";

const dashboardData = localAccountRepository.getDashboardData("Usr-001");

describe("primary control semantics", () => {
  it("exposes the dashboard profile strip as a keyboard-operable button", () => {
    render(
      <DashboardPage
        dashboardData={dashboardData}
        avatarSrc="data:image/svg+xml;base64,PHN2Zy8+"
        onSignOut={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: "Open profile" })).toBeInTheDocument();
  });

  it("exposes settings toggles as named switches with checked state", async () => {
    const user = userEvent.setup();
    renderApp(<SettingsPage dashboardData={dashboardData} />);

    const autoAdvance = screen.getByRole("switch", { name: "Auto-advance cards" });
    expect(autoAdvance).not.toBeChecked();
    await user.click(autoAdvance);
    expect(autoAdvance).toBeChecked();

    expect(screen.getByRole("switch", { name: "Streak reminders" })).toBeChecked();
    expect(screen.getByRole("switch", { name: "Goal completions" })).toBeChecked();
    expect(screen.getByRole("switch", { name: "XP milestones" })).not.toBeChecked();
  });

  it("lets a keyboard user expand a daily goal", async () => {
    const user = userEvent.setup();
    render(<ObjectivesHub dashboardData={dashboardData} />);

    const goal = screen.getAllByRole("button", { name: /of/i })[0]!;
    expect(goal).toHaveAttribute("aria-expanded", "false");
    goal.focus();
    await user.keyboard("{Enter}");
    expect(goal).toHaveAttribute("aria-expanded", "true");
  });
});
