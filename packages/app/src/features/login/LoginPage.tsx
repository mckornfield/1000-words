import { type FormEvent, useRef, useState } from "react";
import type { AppRuntimeConfig } from "../../config/appConfig";

interface LoginPageProps {
  /** Runtime config passed from the app shell — controls demo credential visibility. */
  config: AppRuntimeConfig;
  /**
   * Called on form submit with the entered credentials.
   * Should throw a descriptive Error on failure so the form can display it inline.
   */
  onSignIn: (email: string, password: string) => Promise<void>;
}

export function LoginPage({ config, onSignIn }: LoginPageProps) {
  // Pre-fill credentials when demo mode is active so first-time users can
  // sign in immediately without typing.
  const [email, setEmail] = useState(config.demoLoginEnabled ? "demo" : "");
  const [password, setPassword] = useState(config.demoLoginEnabled ? "demo" : "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track whether the component is still mounted. React 18 silently drops state
  // updates on unmounted components, but we guard explicitly for clarity and
  // forward-compatibility with concurrent features.
  const mountedRef = useRef(true);
  // Note: no cleanup needed — this ref is only written, never subscribed to.

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      await onSignIn(email, password);
      // onSignIn navigates away on success. If the component is still mounted
      // (e.g. during a slow transition), clear the pending state.
      if (mountedRef.current) setPending(false);
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : "Sign in failed. Please check your credentials and try again.";
      console.error("[LoginPage] Sign-in error:", caught);
      if (mountedRef.current) {
        setError(message);
        setPending(false);
      }
    }
  }

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
          <h1>Sign In</h1>
          <p>Access your learner profile, XP history, and rewards dashboard.</p>
        </header>

        <form className="login-form" onSubmit={submit}>
          <label>
            Email
            <input
              type="text"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
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
              autoComplete="current-password"
              placeholder="••••••••"
              required
            />
          </label>

          <button type="submit" disabled={pending}>
            {pending ? "Signing in..." : "Sign In"}
          </button>

          {config.demoLoginEnabled && (
            <p className="demo-hint">Demo credentials pre-filled: demo / demo</p>
          )}

          {error ? <p className="login-error">{error}</p> : null}
        </form>
      </div>
    </section>
  );
}
