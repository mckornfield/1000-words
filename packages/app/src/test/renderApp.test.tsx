import { useAppContext } from "../data/AppContext";
import { useToast } from "../features/shared/Toast";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderApp } from "./renderApp";

function HarnessProbe() {
  const { userId } = useAppContext();
  const { showSuccess } = useToast();
  return <button onClick={() => showSuccess("Ready")}>{userId}</button>;
}

describe("renderApp", () => {
  it("provides deterministic services, user-event, toast, and cleanup", async () => {
    const user = userEvent.setup();
    renderApp(<HarnessProbe />);

    await user.click(screen.getByRole("button", { name: "test-user" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Ready");
  });
});
