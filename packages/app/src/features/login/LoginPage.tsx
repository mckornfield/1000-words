import { type FormEvent, useState } from "react";
import type { AppRuntimeConfig } from "../../config/appConfig";

interface LoginPageProps {
  config: AppRuntimeConfig;
  onSignIn: (email: string, password: string) => Promise<void>;
}

export function LoginPage({ config, onSignIn }: LoginPageProps) {
  const [email, setEmail] = useState("demo");
  const [password, setPassword] = useState("demo");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      await onSignIn(email, password);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Sign in failed.";
      setError(message);
      setPending(false);
      return;
    }

    setPending(false);
  }

  return (
    <section className="screen login-screen swiss">
      <div className="login-card bento-cell">
        <figure className="hero-figure swiss-rule">
          <svg
            className="hero-svg"
            viewBox="0 0 640 260"
            role="img"
            aria-label="Learning dashboard illustration placeholder"
          >
            <rect x="0" y="0" width="640" height="260" rx="12" fill="currentColor" opacity="0.06" />
            <rect x="20" y="24" width="220" height="190" rx="8" fill="currentColor" opacity="0.14" />
            <rect x="260" y="24" width="360" height="56" rx="8" fill="currentColor" opacity="0.2" />
            <rect x="260" y="96" width="170" height="118" rx="8" fill="currentColor" opacity="0.12" />
            <rect x="450" y="96" width="170" height="54" rx="8" fill="currentColor" opacity="0.18" />
            <rect x="450" y="160" width="170" height="54" rx="8" fill="currentColor" opacity="0.08" />
            <text x="38" y="54" fontSize="20" fontFamily="Inter, Helvetica, sans-serif" fill="currentColor">
              UI HERO PLACEHOLDER
            </text>
            <text x="38" y="84" fontSize="14" fontFamily="Inter, Helvetica, sans-serif" fill="currentColor">
              [SVG] [IMG] [BOX]
            </text>
          </svg>
          <figcaption className="hero-fallback">[SVG] [IMG] [BOX?] Visual preview placeholder</figcaption>
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
              required
            />
          </label>

          <button type="submit" disabled={pending}>
            {pending ? "SIGNING IN..." : "SIGN IN"}
          </button>

          <p className="demo-flag">
            Demo Login: <strong>{String(config.demoLoginEnabled)}</strong>
          </p>
          <p className="demo-credentials">Use demo/demo when demo login is enabled.</p>

          {error ? <p className="login-error">{error}</p> : null}
        </form>
      </div>
    </section>
  );
}
