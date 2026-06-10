import { useEffect, useMemo, useState } from "react";
import { appConfig } from "./config/appConfig";
import { localAccountRepository } from "./data/account/repository";
import { localAuthRepository, type AuthSession } from "./data/auth/repository";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { LoginPage } from "./features/login/LoginPage";
import { LessonsList } from "./features/lessons/LessonsList";
import { LessonDetail } from "./features/lessons/LessonDetail";
import { StudySession } from "./features/lessons/StudySession";
import { AchievementsGallery } from "./features/achievements/AchievementsGallery";
import { AchievementDetail } from "./features/achievements/AchievementDetail";
import { ShopBrowse } from "./features/shop/ShopBrowse";
import { ItemDetail } from "./features/shop/ItemDetail";
import { ProfileOverview } from "./features/profile/ProfileOverview";
import { StatsPage } from "./features/profile/StatsPage";
import { CustomizationPage } from "./features/profile/CustomizationPage";
import { ObjectivesHub } from "./features/objectives/ObjectivesHub";
import { parseRoute, navigate, requiresAuth, type ParsedRoute } from "./lib/router";

// ─── App shell ────────────────────────────────────────────────────────────────
export function App() {
  // Restore session from localStorage on first render.
  const [session, setSession] = useState<AuthSession | null>(() => localAuthRepository.getSession());
  const [currentRoute, setCurrentRoute] = useState<ParsedRoute>(() => parseRoute());

  // A non-null dataError means the account data failed to load for the active
  // session. We display a recoverable error message rather than a white screen.
  const [dataError, setDataError] = useState<string | null>(null);

  // Sync the route state when the user navigates with browser back/forward.
  useEffect(() => {
    const onPopState = () => setCurrentRoute(parseRoute());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Guard routes: authenticated users must not access /login;
  // unauthenticated users are redirected to /login.
  // If route requires auth but user is not authenticated, redirect to /login.
  useEffect(() => {
    const routeNeedsAuth = requiresAuth(currentRoute.path);
    if (!session && routeNeedsAuth) {
      navigate("/login");
      return;
    }
    if (session && currentRoute.path === "/login") {
      navigate("/dashboard");
      return;
    }
  }, [session, currentRoute]);

  // Load dashboard data for the current session. Wrapped in try/catch so a
  // corrupt fixture or missing userId doesn't crash the entire React tree.
  const dashboardData = useMemo(() => {
    if (!session) return null;
    try {
      return localAccountRepository.getDashboardData(session.userId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error loading account data.";
      console.error(`[App] Failed to load dashboard data for userId=${session.userId}:`, err);
      setDataError(`Unable to load your account data. ${message}`);
      return null;
    }
  }, [session]);

  // Decode the avatar URI from the profile's stored Base64 string.
  const avatarSrc = useMemo(() => {
    if (!dashboardData) return "";
    try {
      return localAccountRepository.decodeProfileAvatar(dashboardData.profile);
    } catch (err) {
      console.error("[App] Failed to decode profile avatar:", err);
      return ""; // Render broken-image placeholder rather than crashing.
    }
  }, [dashboardData]);

  /**
   * Called by LoginPage on form submit. Throws on invalid credentials so the
   * form can display the error message inline.
   */
  async function signIn(email: string, password: string): Promise<void> {
    const nextSession = localAuthRepository.signIn(email, password);
    setDataError(null); // Clear any stale error from a previous session.
    setSession(nextSession);
    navigate("/dashboard");
  }

  function signOut(): void {
    localAuthRepository.signOut();
    setSession(null);
    setDataError(null);
    navigate("/login");
  }

  // Unauthenticated: always show login regardless of attempted route.
  if (!session || currentRoute.path === "/login") {
    return <LoginPage config={appConfig} onSignIn={signIn} />;
  }

  // Session exists but data failed to load — show a recoverable error state.
  if (dataError) {
    return (
      <section style={{ display: "grid", placeItems: "center", minHeight: "100dvh", padding: "2rem", textAlign: "center" }}>
        <div>
          <h2 style={{ marginBottom: "0.5rem" }}>Something went wrong</h2>
          <p style={{ color: "var(--muted)", marginBottom: "1.5rem" }}>{dataError}</p>
          <button onClick={signOut}>Sign out and try again</button>
        </div>
      </section>
    );
  }

  // Session exists but useMemo hasn't resolved yet (shouldn't happen synchronously,
  // but guard defensively).
  if (!dashboardData) {
    return <LoginPage config={appConfig} onSignIn={signIn} />;
  }

  // Route-based rendering
  switch (currentRoute.path) {
    case "/dashboard":
      return <DashboardPage dashboardData={dashboardData} avatarSrc={avatarSrc} onSignOut={signOut} />;

    case "/lessons":
      return <LessonsList dashboardData={dashboardData} onNavigateToLesson={() => {}} />;

    case "/lessons/:lessonId":
      return <LessonDetail dashboardData={dashboardData} lessonId={currentRoute.params.lessonId || ""} />;

    case "/lessons/:lessonId/study":
      return <StudySession dashboardData={dashboardData} lessonId={currentRoute.params.lessonId || ""} />;

    case "/achievements":
      return <AchievementsGallery dashboardData={dashboardData} />;

    case "/achievements/:achievementId":
      return <AchievementDetail dashboardData={dashboardData} achievementId={currentRoute.params.achievementId || ""} />;

    case "/shop":
      return <ShopBrowse dashboardData={dashboardData} />;

    case "/shop/:itemId":
      return <ItemDetail dashboardData={dashboardData} itemId={currentRoute.params.itemId || ""} />;

    case "/profile":
      return <ProfileOverview dashboardData={dashboardData} avatarSrc={avatarSrc} />;

    case "/profile/stats":
      return <StatsPage dashboardData={dashboardData} />;

    case "/profile/customization":
      return <CustomizationPage dashboardData={dashboardData} avatarSrc={avatarSrc} />;

    case "/objectives":
      return <ObjectivesHub dashboardData={dashboardData} />;

    case "/objectives/:objectiveId":
      return <ObjectivesHub dashboardData={dashboardData} />;

    default:
      return <DashboardPage dashboardData={dashboardData} avatarSrc={avatarSrc} onSignOut={signOut} />;
  }
}
