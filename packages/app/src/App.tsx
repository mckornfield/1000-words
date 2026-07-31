import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { appConfig } from "./config/appConfig";
import { supabase } from "./lib/supabase";
import { localAccountRepository, type DashboardData } from "./data/account/repository";

import { localAuthRepository } from "./data/auth/repository";
import { createSupabaseAuthRepository } from "./data/auth/supabaseAuthRepository";
import { AppContext } from "./data/AppContext";
import { createAppServices } from "./data/createAppServices";
import { createRefreshCoordinator } from "./data/refreshCoordinator";
import { createDeferredDisposer } from "./data/deferredDisposer";
import { projectDashboardData } from "./data/projectDashboardData";
import type { AppContextValue, AuthSession, RefreshState } from "./data/types";
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
import { parseRoute, navigate, getParentRoute, requiresAuth, type ParsedRoute } from "./lib/router";

// ─── Stable application roots ─────────────────────────────────────────────────
const supabaseAuthRepo = createSupabaseAuthRepository();
const staticSeed = localAccountRepository.getDashboardData("Usr-001");
const EMPTY_REFRESH_STATE: RefreshState = {
  snapshot: {
    profile: null, goals: [], achievements: [], inventory: [], equipped: [], stats: [],
    leaderboard: { entries: [], currentUser: null },
  },
  pending: new Set(),
  errors: {},
  versions: { profile: 0, goals: 0, achievements: 0, inventory: 0, equipped: 0, stats: 0, leaderboard: 0 },
};
const subscribeNoop = () => () => {};

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

  // Global Esc = go to parent route (study session handles its own Esc).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const parent = getParentRoute(currentRoute.path);
      if (parent) navigate(parent);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentRoute.path]);

  // Route guard.
  useEffect(() => {
    if (!authReady) return;
    const routeNeedsAuth = requiresAuth(currentRoute.path);
    if (!session && routeNeedsAuth) { navigate("/login"); return; }
    if (session && currentRoute.path === "/login") { navigate("/dashboard"); return; }
  }, [session, currentRoute, authReady]);

  // One graph per primitive mode + authenticated identity. Route changes and
  // refreshed snapshots cannot recreate repositories.
  const services = useMemo(() => session ? createAppServices({
    mode: isDemo ? "demo" : "supabase",
    userId: session.userId,
    seedData: staticSeed,
    client: isDemo ? undefined : supabase,
  }) : null, [isDemo, session?.userId]);

  const servicesLifecycle = useMemo(
    () => services ? createDeferredDisposer(() => services.dispose()) : null,
    [services],
  );
  useEffect(() => {
    servicesLifecycle?.retain();
    return () => servicesLifecycle?.release();
  }, [servicesLifecycle]);

  const coordinator = useMemo(
    () => services ? createRefreshCoordinator(services) : null,
    [services],
  );
  const coordinatorLifecycle = useMemo(
    () => coordinator ? createDeferredDisposer(() => coordinator.dispose()) : null,
    [coordinator],
  );
  useEffect(() => {
    coordinatorLifecycle?.retain();
    return () => coordinatorLifecycle?.release();
  }, [coordinatorLifecycle]);
  const refreshState = useSyncExternalStore(
    coordinator?.subscribe ?? subscribeNoop,
    coordinator?.getState ?? (() => EMPTY_REFRESH_STATE),
    coordinator?.getState ?? (() => EMPTY_REFRESH_STATE),
  );

  useEffect(() => {
    if (!coordinator) return;
    void coordinator.refresh(["profile", "goals", "achievements", "inventory", "equipped", "stats", "leaderboard"]);
  }, [coordinator]);

  useEffect(() => {
    if (refreshState.errors.profile) setDataError("Your account data could not be loaded. Please sign out and try again.");
  }, [refreshState.errors.profile]);

  const dashboardData = useMemo((): DashboardData | null => {
    if (!session) return null;
    return projectDashboardData({ session, seed: staticSeed, refreshState });
  }, [session, refreshState]);

  const avatarSrc = useMemo(() => {
    try { return dashboardData ? localAccountRepository.decodeProfileAvatar(dashboardData.profile) : ""; }
    catch { return ""; }
  }, [dashboardData]);

  const appContextValue = useMemo((): AppContextValue | null => {
    if (!services || !coordinator) return null;
    return {
      userId: services.userId,
      services,
      coordinator,
      state: refreshState,
      refresh: coordinator.refresh,
      patchSnapshot: coordinator.patch,
      progressStore: services.progressStore,
      studyRepo: services.studyRepo,
      profileRepo: services.profileRepo,
      achievementRepo: services.achievementRepo,
      inventoryRepo: services.inventoryRepo,
      goalRepo: services.goalRepo,
      statsRepo: services.statsRepo,
      leaderboardRepo: services.leaderboardRepo,
    };
  }, [services, coordinator, refreshState]);

  async function signUp(email: string, password: string): Promise<void> {
    setDataError(null);
    const s = await supabaseAuthRepo.signUp(email, password);
    setSession(s);
    navigate("/dashboard");
  }

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
    return <LoginPage config={appConfig} onSignIn={signIn} onSignUp={isDemo ? undefined : signUp} />;
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
    return <main aria-busy="true" style={{ display: "grid", placeItems: "center", minHeight: "100dvh" }}>Loading your account…</main>;
  }

  const hideNav = currentRoute.path === "/study/:langPair" || currentRoute.path === "/lessons/:lessonId/study";

  function renderPage() {
    const data = dashboardData!;
    const { path, params } = currentRoute;
    const lessonId      = params.lessonId ?? "";
    const achievementId = params.achievementId ?? "";
    const itemId        = params.itemId ?? "";

    const LANG_TITLES: Record<string, string> = {
      "en-es": "Spanish",
      "en-zh": "Mandarin",
      "en-ko": "Korean",
      "en-ja": "Japanese",
    };

    switch (path) {
      case "/dashboard":
        return <DashboardPage dashboardData={data} avatarSrc={avatarSrc} onSignOut={signOut} />;
      case "/study/:langPair": {
        const lp = params.langPair ?? "en-es";
        return <StudySession dashboardData={data} langPair={lp} sessionTitle={LANG_TITLES[lp] ?? lp} />;
      }
      case "/lessons":
        return <LessonsList dashboardData={data} onNavigateToLesson={() => {}} />;
      case "/lessons/:lessonId":
        return <LessonDetail dashboardData={data} lessonId={lessonId} />;
      case "/lessons/:lessonId/study":
        return <StudySession dashboardData={data} langPair="en-es" sessionTitle="Spanish" />;
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
      case "/not-found":
        return (
          <main style={{ display: "grid", placeItems: "center", minHeight: "70dvh", padding: "2rem", textAlign: "center" }}>
            <div>
              <h1>Page not found</h1>
              <p style={{ color: "var(--muted)" }}>This address does not match a page in 1000 Words.</p>
              <button onClick={() => navigate("/dashboard")}>Return to dashboard</button>
            </div>
          </main>
        );
      default:
        return null;
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
