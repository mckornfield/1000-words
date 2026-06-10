/**
 * Routing utilities for client-side navigation with support for parameterized routes.
 *
 * Supported route patterns:
 * - /login
 * - /dashboard
 * - /lessons (list)
 * - /lessons/:lessonId (detail)
 * - /lessons/:lessonId/study (study/review session)
 * - /achievements (gallery)
 * - /achievements/:achievementId (detail)
 * - /shop (browse)
 * - /shop/:itemId (item detail)
 * - /profile (overview)
 * - /profile/stats (stats & history)
 * - /profile/customization (cosmetics)
 * - /objectives (daily goals & milestones hub)
 * - /objectives/:objectiveId (detail)
 */

// ─── Route Types ──────────────────────────────────────────────────────────

export type RoutePath =
  | "/login"
  | "/dashboard"
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
  | "/objectives"
  | "/objectives/:objectiveId";

export interface RouteParams {
  lessonId?: string;
  achievementId?: string;
  itemId?: string;
  objectiveId?: string;
}

export interface ParsedRoute {
  path: RoutePath;
  params: RouteParams;
}

// ─── Route Parsing ────────────────────────────────────────────────────────

/**
 * Parse the current URL pathname into a structured route object.
 * If the path doesn't match any known route, returns "/login".
 */
export function parseRoute(): ParsedRoute {
  const pathname = window.location.pathname.toLowerCase();
  const segments = pathname.split("/").filter(Boolean);

  // Match against known route patterns
  if (segments.length === 0 || segments[0] === "login") {
    return { path: "/login", params: {} };
  }

  if (segments[0] === "dashboard") {
    return { path: "/dashboard", params: {} };
  }

  if (segments[0] === "lessons") {
    if (segments.length === 1) {
      return { path: "/lessons", params: {} };
    }
    if (segments.length === 2) {
      return { path: "/lessons/:lessonId", params: { lessonId: segments[1] } };
    }
    if (segments.length === 3 && segments[2] === "study") {
      return { path: "/lessons/:lessonId/study", params: { lessonId: segments[1] } };
    }
  }

  if (segments[0] === "achievements") {
    if (segments.length === 1) {
      return { path: "/achievements", params: {} };
    }
    if (segments.length === 2) {
      return { path: "/achievements/:achievementId", params: { achievementId: segments[1] } };
    }
  }

  if (segments[0] === "shop") {
    if (segments.length === 1) {
      return { path: "/shop", params: {} };
    }
    if (segments.length === 2) {
      return { path: "/shop/:itemId", params: { itemId: segments[1] } };
    }
  }

  if (segments[0] === "profile") {
    if (segments.length === 1) {
      return { path: "/profile", params: {} };
    }
    if (segments.length === 2 && segments[1] === "stats") {
      return { path: "/profile/stats", params: {} };
    }
    if (segments.length === 2 && segments[1] === "customization") {
      return { path: "/profile/customization", params: {} };
    }
  }

  if (segments[0] === "objectives") {
    if (segments.length === 1) {
      return { path: "/objectives", params: {} };
    }
    if (segments.length === 2) {
      return { path: "/objectives/:objectiveId", params: { objectiveId: segments[1] } };
    }
  }

  // Unrecognized path — redirect to login
  return { path: "/login", params: {} };
}

// ─── Navigation ───────────────────────────────────────────────────────────

/**
 * Navigate to a route, updating browser history and firing a synthetic popstate.
 * Checks if already on the route to avoid unnecessary updates.
 */
export function navigate(route: RoutePath, params: RouteParams = {}): void {
  let pathname: string = route;

  // Replace route parameters with actual values
  if (route.includes(":lessonId") && params.lessonId) {
    pathname = pathname.replace(":lessonId", params.lessonId);
  }
  if (route.includes(":achievementId") && params.achievementId) {
    pathname = pathname.replace(":achievementId", params.achievementId);
  }
  if (route.includes(":itemId") && params.itemId) {
    pathname = pathname.replace(":itemId", params.itemId);
  }
  if (route.includes(":objectiveId") && params.objectiveId) {
    pathname = pathname.replace(":objectiveId", params.objectiveId);
  }

  if (window.location.pathname === pathname) return;

  window.history.pushState({}, "", pathname);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

/**
 * Navigate back to the previous page using browser history.
 */
export function navigateBack(): void {
  window.history.back();
}

// ─── Route Guards ────────────────────────────────────────────────────────

/**
 * Determine if a route requires authentication.
 * All routes except /login require a valid session.
 */
export function requiresAuth(route: RoutePath): boolean {
  return route !== "/login";
}

/**
 * Determine the "parent" route for breadcrumb navigation.
 */
export function getParentRoute(currentRoute: RoutePath): RoutePath | null {
  if (currentRoute.startsWith("/lessons")) {
    if (currentRoute === "/lessons/:lessonId/study") return "/lessons/:lessonId" as RoutePath;
    if (currentRoute === "/lessons/:lessonId") return "/lessons" as RoutePath;
    return "/dashboard" as RoutePath;
  }
  if (currentRoute.startsWith("/achievements")) {
    if (currentRoute === "/achievements/:achievementId") return "/achievements" as RoutePath;
    return "/dashboard" as RoutePath;
  }
  if (currentRoute.startsWith("/shop")) {
    if (currentRoute === "/shop/:itemId") return "/shop" as RoutePath;
    return "/dashboard" as RoutePath;
  }
  if (currentRoute.startsWith("/profile")) {
    if (currentRoute === "/profile/stats" || currentRoute === "/profile/customization") return "/profile" as RoutePath;
    return "/dashboard" as RoutePath;
  }
  if (currentRoute.startsWith("/objectives")) {
    if (currentRoute === "/objectives/:objectiveId") return "/objectives" as RoutePath;
    return "/dashboard" as RoutePath;
  }
  if (currentRoute === "/dashboard") return null;
  return "/dashboard" as RoutePath;
}

/**
 * Get human-readable breadcrumb labels for each route.
 */
export function getRouteBreadcrumbLabel(
  route: RoutePath,
  params: RouteParams = {},
  _extraContext?: { lessonTitle?: string; achievementTitle?: string; itemName?: string }
): string {
  switch (route) {
    case "/login":
      return "Sign In";
    case "/dashboard":
      return "Dashboard";
    case "/lessons":
      return "Lessons";
    case "/lessons/:lessonId":
      return _extraContext?.lessonTitle || "Lesson Details";
    case "/lessons/:lessonId/study":
      return "Study";
    case "/achievements":
      return "Achievements";
    case "/achievements/:achievementId":
      return _extraContext?.achievementTitle || "Achievement";
    case "/shop":
      return "Shop";
    case "/shop/:itemId":
      return _extraContext?.itemName || "Item";
    case "/profile":
      return "Profile";
    case "/profile/stats":
      return "Stats & History";
    case "/profile/customization":
      return "Customization";
    case "/objectives":
      return "Daily Goals";
    case "/objectives/:objectiveId":
      return "Objective Details";
    default:
      return "Home";
  }
}
