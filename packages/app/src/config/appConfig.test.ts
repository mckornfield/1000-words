import { describe, expect, it } from "vitest";
import { createAppConfig } from "./appConfig";

describe("createAppConfig", () => {
  it("defaults demo login on when unset", () => {
    expect(createAppConfig({}).demoLoginEnabled).toBe(true);
    expect(createAppConfig({}).reverseStudyEnabled).toBe(false);
  });

  it.each([
    ["true", true],
    [" TRUE ", true],
    ["false", false],
    ["1", false],
    ["", false],
  ])("parses VITE_DEMO_LOGIN=%j", (value, expected) => {
    expect(createAppConfig({ VITE_DEMO_LOGIN: value }).demoLoginEnabled).toBe(expected);
  });

  it("enables reverse study only through its explicit feature flag", () => {
    expect(createAppConfig({ VITE_FEATURE_REVERSE_STUDY: "true" }).reverseStudyEnabled).toBe(true);
    expect(createAppConfig({ VITE_FEATURE_REVERSE_STUDY: "1" }).reverseStudyEnabled).toBe(false);
  });
});
