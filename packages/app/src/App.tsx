import { useEffect, useMemo, useState } from "react";
import { appConfig } from "./config/appConfig";
import { localAccountRepository } from "./data/account/repository";
import { localAuthRepository, type AuthSession } from "./data/auth/repository";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { LoginPage } from "./features/login/LoginPage";

type AppRoute = "/login" | "/dashboard";

function readRoute(): AppRoute {
  const path = window.location.pathname.toLowerCase();
  if (path === "/dashboard") return "/dashboard";
  return "/login";
}

function navigate(route: AppRoute): void {
  if (window.location.pathname === route) return;
  window.history.pushState({}, "", route);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function App() {
  const [session, setSession] = useState<AuthSession | null>(() => localAuthRepository.getSession());
  const [route, setRoute] = useState<AppRoute>(() => readRoute());

  useEffect(() => {
    const onPopState = () => setRoute(readRoute());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (window.location.pathname !== route) {
      navigate(route);
      return;
    }
    if (session && route !== "/dashboard") navigate("/dashboard");
    if (!session && route !== "/login") navigate("/login");
  }, [route, session]);

  const dashboardData = useMemo(() => {
    if (!session) return null;
    return localAccountRepository.getDashboardData(session.userId);
  }, [session]);

  const avatarSrc = useMemo(() => {
    if (!dashboardData) return "";
    return localAccountRepository.decodeProfileAvatar(dashboardData.profile);
  }, [dashboardData]);

  async function signIn(email: string, password: string): Promise<void> {
    const nextSession = localAuthRepository.signIn(email, password);
    setSession(nextSession);
    navigate("/dashboard");
  }

  function signOut(): void {
    localAuthRepository.signOut();
    setSession(null);
    navigate("/login");
  }

  if (!session || route === "/login") {
    return <LoginPage config={appConfig} onSignIn={signIn} />;
  }

  if (!dashboardData) {
    return <LoginPage config={appConfig} onSignIn={signIn} />;
  }

  return <DashboardPage dashboardData={dashboardData} avatarSrc={avatarSrc} onSignOut={signOut} />;
}
