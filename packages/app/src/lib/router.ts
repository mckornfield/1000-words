/** Small dependency-free router used by the web and Capacitor shells. */
export type RoutePath =
  | "/login"
  | "/dashboard"
  | "/study/:langPair"
  | "/lessons"
  | "/lessons/:lessonId"
  | "/lessons/:lessonId/study"
  | "/achievements"
  | "/achievements/:achievementId"
  | "/shop"
  | "/shop/:itemId"
  | "/profile"
  | "/profile/stats"
  | "/profile/customization"
  | "/profile/settings"
  | "/objectives"
  | "/objectives/:objectiveId"
  | "/leaderboard"
  | "/not-found";

export interface RouteParams {
  langPair?: string;
  lessonId?: string;
  achievementId?: string;
  itemId?: string;
  objectiveId?: string;
}
export interface ParsedRoute { path: RoutePath; params: RouteParams }

type ParamName = keyof RouteParams;
type RouteDefinition = { path: Exclude<RoutePath, "/not-found">; segments: Array<string | { param: ParamName }> };

const ROUTES: RouteDefinition[] = [
  { path: "/login", segments: ["login"] },
  { path: "/dashboard", segments: ["dashboard"] },
  { path: "/study/:langPair", segments: ["study", { param: "langPair" }] },
  { path: "/lessons", segments: ["lessons"] },
  { path: "/lessons/:lessonId", segments: ["lessons", { param: "lessonId" }] },
  { path: "/lessons/:lessonId/study", segments: ["lessons", { param: "lessonId" }, "study"] },
  { path: "/achievements", segments: ["achievements"] },
  { path: "/achievements/:achievementId", segments: ["achievements", { param: "achievementId" }] },
  { path: "/shop", segments: ["shop"] },
  { path: "/shop/:itemId", segments: ["shop", { param: "itemId" }] },
  { path: "/profile", segments: ["profile"] },
  { path: "/profile/stats", segments: ["profile", "stats"] },
  { path: "/profile/customization", segments: ["profile", "customization"] },
  { path: "/profile/settings", segments: ["profile", "settings"] },
  { path: "/objectives", segments: ["objectives"] },
  { path: "/objectives/:objectiveId", segments: ["objectives", { param: "objectiveId" }] },
  { path: "/leaderboard", segments: ["leaderboard"] },
];

export function normalizeBasePath(base: string): string {
  const trimmed = base.trim();
  if (!trimmed || trimmed === "/") return "";
  return `/${trimmed.replace(/^\/+|\/+$/g, "")}`;
}

export function stripBasePath(pathname: string, base: string): string | null {
  const normalized = normalizeBasePath(base);
  if (!normalized) return pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (pathname === normalized) return "/";
  if (!pathname.startsWith(`${normalized}/`)) return null;
  return pathname.slice(normalized.length);
}

function decodeSegment(value: string): string | null {
  try { return decodeURIComponent(value); } catch { return null; }
}

export function parseRoute(
  pathname = window.location.pathname,
  base = import.meta.env.BASE_URL,
): ParsedRoute {
  const stripped = stripBasePath(pathname, base);
  if (stripped === null) return { path: "/not-found", params: {} };
  const encodedSegments = stripped.split("/").filter(Boolean);
  if (encodedSegments.length === 0) return { path: "/login", params: {} };
  const decoded = encodedSegments.map(decodeSegment);
  if (decoded.some((segment) => segment === null)) return { path: "/not-found", params: {} };
  const segments = decoded as string[];

  for (const route of ROUTES) {
    if (route.segments.length !== segments.length) continue;
    const params: RouteParams = {};
    const matches = route.segments.every((expected, index) => {
      if (typeof expected === "string") return expected.toLowerCase() === segments[index]!.toLowerCase();
      params[expected.param] = segments[index];
      return true;
    });
    if (matches) return { path: route.path, params };
  }
  return { path: "/not-found", params: {} };
}

export function buildRoutePath(
  route: RoutePath,
  params: RouteParams = {},
  base = import.meta.env.BASE_URL,
): string {
  const definition = ROUTES.find((candidate) => candidate.path === route);
  if (!definition) throw new Error(`Unknown route: ${route}`);
  const pathname = `/${definition.segments.map((segment) => {
    if (typeof segment === "string") return segment;
    const value = params[segment.param];
    if (value === undefined || value === "") throw new Error(`Missing route parameter: ${segment.param}`);
    return encodeURIComponent(value);
  }).join("/")}`;
  return `${normalizeBasePath(base)}${pathname}`;
}

export function navigate(
  route: RoutePath,
  params: RouteParams = {},
  base = import.meta.env.BASE_URL,
): void {
  const pathname = buildRoutePath(route, params, base);
  if (window.location.pathname === pathname) return;
  window.history.pushState({}, "", pathname);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

/** Reconstruct the path encoded by public/404.html without interpreting it as a route. */
export function restoreHostedPath(search: string, base = import.meta.env.BASE_URL): string | null {
  if (!search.startsWith("?/")) return null;
  const [encodedPath] = search.slice(1).split("&");
  return `${normalizeBasePath(base)}${encodedPath!.replace(/~and~/g, "&")}`;
}

export function navigateBack(): void { window.history.back(); }
export function requiresAuth(route: RoutePath): boolean { return route !== "/login"; }

export function getParentRoute(currentRoute: RoutePath): RoutePath | null {
  if (currentRoute.startsWith("/lessons")) {
    if (currentRoute === "/lessons/:lessonId/study") return "/lessons/:lessonId";
    if (currentRoute === "/lessons/:lessonId") return "/lessons";
    return "/dashboard";
  }
  if (currentRoute.startsWith("/achievements")) return currentRoute === "/achievements/:achievementId" ? "/achievements" : "/dashboard";
  if (currentRoute.startsWith("/shop")) return currentRoute === "/shop/:itemId" ? "/shop" : "/dashboard";
  if (currentRoute.startsWith("/profile")) return currentRoute === "/profile" ? "/dashboard" : "/profile";
  if (currentRoute.startsWith("/objectives")) return currentRoute === "/objectives/:objectiveId" ? "/objectives" : "/dashboard";
  if (currentRoute === "/leaderboard" || currentRoute === "/not-found") return "/dashboard";
  if (currentRoute === "/dashboard") return null;
  return "/dashboard";
}

export function getRouteBreadcrumbLabel(
  route: RoutePath,
  _params: RouteParams = {},
  context?: { lessonTitle?: string; achievementTitle?: string; itemName?: string },
): string {
  const labels: Partial<Record<RoutePath, string>> = {
    "/login": "Sign In", "/dashboard": "Dashboard", "/study/:langPair": "Study",
    "/lessons": "Lessons", "/lessons/:lessonId/study": "Study", "/achievements": "Achievements",
    "/shop": "Shop", "/profile": "Profile", "/profile/stats": "Stats & History",
    "/profile/customization": "Customization", "/profile/settings": "Settings",
    "/objectives": "Daily Goals", "/objectives/:objectiveId": "Objective Details",
    "/leaderboard": "Leaderboard", "/not-found": "Not Found",
  };
  if (route === "/lessons/:lessonId") return context?.lessonTitle || "Lesson Details";
  if (route === "/achievements/:achievementId") return context?.achievementTitle || "Achievement";
  if (route === "/shop/:itemId") return context?.itemName || "Item";
  return labels[route] ?? "Home";
}
