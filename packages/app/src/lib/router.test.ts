import { describe, expect, it, vi } from "vitest";
import {
  buildRoutePath,
  navigate,
  normalizeBasePath,
  parseRoute,
  restoreHostedPath,
  stripBasePath,
  type RoutePath,
} from "./router";

const routes: Array<[RoutePath, Record<string, string>, string]> = [
  ["/login", {}, "/login"],
  ["/dashboard", {}, "/dashboard"],
  ["/study/:langPair", { langPair: "en-es" }, "/study/en-es"],
  ["/lessons", {}, "/lessons"],
  ["/lessons/:lessonId", { lessonId: "lesson-1" }, "/lessons/lesson-1"],
  ["/lessons/:lessonId/study", { lessonId: "lesson-1" }, "/lessons/lesson-1/study"],
  ["/achievements", {}, "/achievements"],
  ["/achievements/:achievementId", { achievementId: "first" }, "/achievements/first"],
  ["/shop", {}, "/shop"],
  ["/shop/:itemId", { itemId: "hat" }, "/shop/hat"],
  ["/profile", {}, "/profile"],
  ["/profile/stats", {}, "/profile/stats"],
  ["/profile/customization", {}, "/profile/customization"],
  ["/profile/settings", {}, "/profile/settings"],
  ["/objectives", {}, "/objectives"],
  ["/objectives/:objectiveId", { objectiveId: "daily" }, "/objectives/daily"],
  ["/leaderboard", {}, "/leaderboard"],
];

describe("custom router", () => {
  it.each(routes)("round-trips %s at root and hosted bases", (route, params, path) => {
    for (const base of ["/", "/1000-words/"]) {
      const built = buildRoutePath(route, params, base);
      expect(built).toBe(`${base === "/" ? "" : "/1000-words"}${path}`);
      expect(parseRoute(built, base)).toMatchObject({ path: route, params });
    }
  });

  it("normalizes and strips only complete base segments", () => {
    expect(normalizeBasePath("1000-words")).toBe("/1000-words");
    expect(normalizeBasePath("/1000-words/")).toBe("/1000-words");
    expect(normalizeBasePath("/")).toBe("");
    expect(stripBasePath("/1000-words/dashboard", "/1000-words/")).toBe("/dashboard");
    expect(stripBasePath("/1000-words-extra/dashboard", "/1000-words/")).toBeNull();
  });

  it("encodes parameters and decodes them exactly once", () => {
    const path = buildRoutePath("/shop/:itemId", { itemId: "hat / 50%" }, "/1000-words/");
    expect(path).toBe("/1000-words/shop/hat%20%2F%2050%25");
    expect(parseRoute(path, "/1000-words/")).toEqual({
      path: "/shop/:itemId",
      params: { itemId: "hat / 50%" },
    });
  });

  it.each([
    "/dashboard/extra",
    "/study/en-es/extra",
    "/leaderboard/extra",
    "/%E0%A4%A",
    "/unknown",
  ])("represents unsupported path %s as not found", (path) => {
    expect(parseRoute(path, "/")).toEqual({ path: "/not-found", params: {} });
  });

  it("does not reinterpret a path outside the hosted base", () => {
    expect(parseRoute("/1000-words-extra/dashboard", "/1000-words/")).toEqual({
      path: "/not-found",
      params: {},
    });
  });

  it("navigates once with encoded params and hosted base", () => {
    history.replaceState({}, "", "/1000-words/dashboard");
    const event = vi.fn();
    window.addEventListener("popstate", event);
    navigate("/shop/:itemId", { itemId: "blue hat" }, "/1000-words/");
    navigate("/shop/:itemId", { itemId: "blue hat" }, "/1000-words/");
    expect(location.pathname).toBe("/1000-words/shop/blue%20hat");
    expect(event).toHaveBeenCalledTimes(1);
    window.removeEventListener("popstate", event);
  });

  it.each(["/dashboard", "/study/en-es", "/profile/settings"])(
    "restores GitHub Pages fallback for %s",
    (path) => {
      const query = `?${path}`;
      expect(restoreHostedPath(query, "/1000-words/")).toBe(`/1000-words${path}`);
    },
  );
});
