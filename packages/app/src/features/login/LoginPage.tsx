import { type FormEvent, useRef, useState } from "react";
import type { AppRuntimeConfig } from "../../config/appConfig";

interface LoginPageProps {
  config: AppRuntimeConfig;
  onSignIn: (email: string, password: string) => Promise<void>;
  /** When provided, a "Create account" toggle is shown. Absent in demo mode. */
  onSignUp?: (email: string, password: string) => Promise<void>;
}

export function LoginPage({ config, onSignIn, onSignUp }: LoginPageProps) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState(config.demoLoginEnabled ? "demo" : "");
  const [password, setPassword] = useState(config.demoLoginEnabled ? "demo" : "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  function switchMode(next: "signin" | "signup") {
    setMode(next);
    setError(null);
    setEmail("");
    setPassword("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      if (mode === "signup" && onSignUp) {
        await onSignUp(email, password);
      } else {
        await onSignIn(email, password);
      }
      if (mountedRef.current) setPending(false);
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : mode === "signup"
            ? "Sign up failed. Please try again."
            : "Sign in failed. Please check your credentials and try again.";
      console.error("[LoginPage] Auth error:", caught);
      if (mountedRef.current) {
        setError(message);
        setPending(false);
      }
    }
  }

  const isSignUp = mode === "signup";

  return (
    <section className="screen login-screen swiss">
      <div className="login-card bento-cell">
        <figure className="hero-figure">
          <img
            src="/assets/images/placeholder.svg"
            className="hero-svg"
            alt="Dashboard preview"
            width={640}
            height={260}
          />
        </figure>

        <header className="login-header">
          <h1>{isSignUp ? "Create Account" : "Sign In"}</h1>
          <p>
            {isSignUp
              ? "Start learning and track your progress."
              : "Access your learner profile, XP history, and rewards dashboard."}
          </p>
        </header>

        <form className="login-form" onSubmit={submit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete={isSignUp ? "email" : "username"}
              placeholder="you@example.com"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={isSignUp ? "new-password" : "current-password"}
              placeholder="••••••••"
              minLength={isSignUp ? 8 : undefined}
              required
            />
          </label>

          <button type="submit" disabled={pending}>
            {pending
              ? isSignUp ? "Creating account..." : "Signing in..."
              : isSignUp ? "Create Account" : "Sign In"}
          </button>

          {config.demoLoginEnabled && (
            <p className="demo-hint">Demo credentials pre-filled: demo / demo</p>
          )}

          {onSignUp && (
            <p className="demo-hint">
              {isSignUp ? (
                <>Already have an account?{" "}
                  <button type="button" className="link-button" onClick={() => switchMode("signin")}>
                    Sign in
                  </button>
                </>
              ) : (
                <>New here?{" "}
                  <button type="button" className="link-button" onClick={() => switchMode("signup")}>
                    Create an account
                  </button>
                </>
              )}
            </p>
          )}

          {error ? <p className="login-error">{error}</p> : null}
        </form>
      </div>
    </section>
  );
}
