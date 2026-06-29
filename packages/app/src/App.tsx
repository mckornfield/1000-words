import { useEffect, useMemo, useState } from "react";
import { appConfig } from "./config/appConfig";
import { supabase } from "./lib/supabase";
import { localAccountRepository } from "./data/account/repository";
import { localAuthRepository } from "./data/auth/repository";
import { createSupabaseAuthRepository } from "./data/auth/supabaseAuthRepository";
import { createSupabaseProfileRepository } from "./data/profile/supabaseProfileRepository";
import { createMockProfileRepository } from "./data/profile/mockProfileRepository";
import { createSupabaseAchievementRepository } from "./data/achievements/supabaseAchievementRepository";
import { createMockAchievementRepository } from "./data/achievements/mockAchievementRepository";
import { createSupabaseInventoryRepository } from "./data/inventory/supabaseInventoryRepository";
import { createMockInventoryRepository } from "./data/inventory/mockInventoryRepository";
import { createSupabaseDailyGoalRepository } from "./data/goals/supabaseDailyGoalRepository";
import { createMockDailyGoalRepository } from "./data/goals/mockDailyGoalRepository";
import { createSupabaseStatsRepository } from "./data/stats/supabaseStatsRepository";
import { createMockStatsRepository } from "./data/stats/mockStatsRepository";
import { createSupabaseLeaderboardRepository } from "./data/leaderboard/supabaseLeaderboardRepository";
import { createMockLeaderboardRepository } from "./data/leaderboard/mockLeaderboardRepository";
import { createProgressStore } from "./data/progress";
import { createMockProgressStore } from "./data/progressStore.mock";
import { AppContext } from "./data/AppContext";
import type { AppContextValue, AuthSession } from "./data/types";
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
import { SettingsPage } from "./features/profile/SettingsPage";
import { ObjectivesHub } from "./features/objectives/ObjectivesHub";
import { LeaderboardPage } from "./features/leaderboard/LeaderboardPage";
import { NavBar } from "./features/shared/NavBar";
import { ToastProvider } from "./features/shared/Toast";
import { parseRoute, navigate, requiresAuth, type ParsedRoute } from "./lib/router";

// ─── Singleton repos created once outside the component ───────────────────────
const supabaseAuthRepo = createSupabaseAuthRepository();
const supabaseProgressStore = createProgressStore(supabase);

// ─── App shell ────────────────────────────────────────────────────────────────
export function App() {
  const isDemo = appConfig.demoLoginEnabled;

  // Session state. Demo mode restores synchronously from localStorage;
  // Supabase mode initialises asynchronously and listens for changes.
  const [session, setSession] = useState<AuthSession | null>(() => {
    if (!isDemo) return null;
    const local = localAuthRepository.getSession();
    return local ? { userId: local.userId, email: "demo" } : null;
  });
  const [authReady, setAuthReady] = useState(isDemo);
  const [dataError, setDataError] = useState<string | null>(null);
  const [currentRoute, setCurrentRoute] = useState<ParsedRoute>(() => parseRoute());

  // For Supabase mode: async auth init + subscription.
  useEffect(() => {
    if (isDemo) return;
    supabaseAuthRepo.getSession().then((s) => {
      setSession(s);
      setAuthReady(true);
    }).catch(() => setAuthReady(true));
    const unsub = supabaseAuthRepo.onAuthChange((s) => setSession(s));
    return unsub;
  }, [isDemo]);

  // Sync route when user navigates with browser back/forward.
  useEffect(() => {
    const onPopState = () => setCurrentRoute(parseRoute());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Route guard.
  useEffect(() => {
    if (!authReady) return;
    const routeNeedsAuth = requiresAuth(currentRoute.path);
    if (!session && routeNeedsAuth) { navigate("/login"); return; }
    if (session && currentRoute.path === "/login") { navigate("/dashboard"); return; }
  }, [session, currentRoute, authReady]);

  // Static dashboard data (fixture — lessons, achievements catalog, store catalog).
  // For demo mode this is synchronous. For Supabase mode, the fixture still supplies
  // the static content; live user state comes via the repos in AppContext.
  const dashboardData = useMemo(() => {
    if (!session) return null;
    // Demo mode userId is "Usr-001"; Supabase mode uses UUID.
    // Fixture lookup works in demo mode; in Supabase mode we fall back to a
    // hardcoded fixture userId so static content (lesson catalog etc.) still renders.
    const fixtureUserId = isDemo ? session.userId : "Usr-001";
    try {
      return localAccountRepository.getDashboardData(fixtureUserId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error loading account data.";
      console.error(`[App] Failed to load dashboard data:`, err);
      setDataError(`Unable to load your account data. ${message}`);
      return null;
    }
  }, [session, isDemo]);

  // Avatar from fixture profile.
  const avatarSrc = useMemo(() => {
    if (!dashboardData) return "";
    try { return localAccountRepository.decodeProfileAvatar(dashboardData.profile); }
    catch { return ""; }
  }, [dashboardData]);

  // Build the AppContext value once session + dashboardData are available.
  const appContextValue = useMemo((): AppContextValue | null => {
    if (!session || !dashboardData) return null;
    if (isDemo) {
      return {
        userId: session.userId,
        progressStore: createMockProgressStore(),
        profileRepo: createMockProfileRepository(dashboardData.profile),
        achievementRepo: createMockAchievementRepository(dashboardData.achievements),
        inventoryRepo: createMockInventoryRepository(dashboardData.storeItems),
        goalRepo: createMockDailyGoalRepository(dashboardData.dailyGoals),
        statsRepo: createMockStatsRepository(),
        leaderboardRepo: createMockLeaderboardRepository(session.userId),
      };
    }
    return {
      userId: session.userId,
      progressStore: supabaseProgressStore,
      profileRepo: createSupabaseProfileRepository(),
      achievementRepo: createSupabaseAchievementRepository(),
      inventoryRepo: createSupabaseInventoryRepository(),
      goalRepo: createSupabaseDailyGoalRepository(),
      statsRepo: createSupabaseStatsRepository(),
      leaderboardRepo: createSupabaseLeaderboardRepository(),
    };
  }, [session, dashboardData, isDemo]);

  async function signIn(email: string, password: string): Promise<void> {
    setDataError(null);
    if (isDemo) {
      const local = localAuthRepository.signIn(email, password);
      setSession({ userId: local.userId, email });
    } else {
      const s = await supabaseAuthRepo.signIn(email, password);
      setSession(s);
    }
    navigate("/dashboard");
  }

  function signOut(): void {
    if (isDemo) localAuthRepository.signOut();
    else supabaseAuthRepo.signOut();
    setSession(null);
    setDataError(null);
    navigate("/login");
  }

  // Show nothing while Supabase auth initialises (avoids redirect flash).
  if (!authReady) return null;

  if (!session || currentRoute.path === "/login") {
    return <LoginPage config={appConfig} onSignIn={signIn} />;
  }

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

  if (!dashboardData || !appContextValue) {
    return <LoginPage config={appConfig} onSignIn={signIn} />;
  }

  const hideNav = currentRoute.path === "/study" || currentRoute.path === "/lessons/:lessonId/study";

  function renderPage() {
    const data = dashboardData!;
    const { path, params } = currentRoute;
    const lessonId      = params.lessonId ?? "";
    const achievementId = params.achievementId ?? "";
    const itemId        = params.itemId ?? "";

    // Derive language info from lesson track data
    const trackId = data.lessons[0]?.trackId ?? "";
    const langPair = trackId.includes("-ZH") ? "en-zh" : "en-es";
    const sessionTitle = trackId.includes("-ZH") ? "Mandarin" : "Spanish";

    switch (path) {
      case "/dashboard":
        return <DashboardPage dashboardData={data} avatarSrc={avatarSrc} onSignOut={signOut} />;
      case "/study":
        return <StudySession dashboardData={data} langPair={langPair} sessionTitle={sessionTitle} />;
      case "/lessons":
        return <LessonsList dashboardData={data} onNavigateToLesson={() => {}} />;
      case "/lessons/:lessonId":
        return <LessonDetail dashboardData={data} lessonId={lessonId} />;
      case "/lessons/:lessonId/study":
        return <StudySession dashboardData={data} langPair={langPair} sessionTitle={sessionTitle} />;
      case "/achievements":
        return <AchievementsGallery dashboardData={data} />;
      case "/achievements/:achievementId":
        return <AchievementDetail dashboardData={data} achievementId={achievementId} />;
      case "/shop":
        return <ShopBrowse dashboardData={data} />;
      case "/shop/:itemId":
        return <ItemDetail dashboardData={data} itemId={itemId} />;
      case "/profile":
        return <ProfileOverview dashboardData={data} avatarSrc={avatarSrc} />;
      case "/profile/stats":
        return <StatsPage dashboardData={data} />;
      case "/profile/customization":
        return <CustomizationPage dashboardData={data} avatarSrc={avatarSrc} />;
      case "/profile/settings":
        return <SettingsPage dashboardData={data} />;
      case "/objectives":
      case "/objectives/:objectiveId":
        return <ObjectivesHub dashboardData={data} />;
      case "/leaderboard":
        return <LeaderboardPage dashboardData={data} />;
      default:
        return <DashboardPage dashboardData={data} avatarSrc={avatarSrc} onSignOut={signOut} />;
    }
  }

  return (
    <AppContext.Provider value={appContextValue}>
      <ToastProvider>
        <div key={currentRoute.path} className="page-enter">
          {renderPage()}
        </div>
        {!hideNav && <NavBar currentPath={currentRoute.path} />}
      </ToastProvider>
    </AppContext.Provider>
  );
}
