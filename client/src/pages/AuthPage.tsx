import { useState } from "react";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import type { AuthResponse } from "../types";

type AuthMode = "login" | "register";

const defaultRegister = {
  name: "",
  email: "",
  password: "",
  organizationName: "",
  role: "editor"
};

export function AuthPage() {
  const { login } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState(defaultRegister);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await api.post<AuthResponse>(
        mode === "login" ? "/api/auth/login" : "/api/auth/register",
        mode === "login" ? loginForm : registerForm
      );
      login(response.data);
    } catch (submissionError) {
      setError("Unable to authenticate with the provided details.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <section className="hero-panel">
        <div className="eyebrow">Full-stack assignment build</div>
        <h1>Video operations, safety review, and streaming in one control room.</h1>
        <p>
          Multi-tenant video management with real-time processing updates, role-aware access,
          upload workflows, and browser playback.
        </p>
        <div className="feature-strip">
          <span>Real-time updates</span>
          <span>RBAC</span>
          <span>Streaming</span>
          <span>Sensitivity review</span>
        </div>
      </section>

      <section className="auth-card">
        <div className="segmented-control">
          <button
            className={mode === "login" ? "active" : ""}
            type="button"
            onClick={() => setMode("login")}
          >
            Login
          </button>
          <button
            className={mode === "register" ? "active" : ""}
            type="button"
            onClick={() => setMode("register")}
          >
            Register
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === "register" ? (
            <>
              <label>
                Name
                <input
                  value={registerForm.name}
                  onChange={(event) => setRegisterForm((current) => ({ ...current, name: event.target.value }))}
                  required
                />
              </label>
              <label>
                Organization
                <input
                  value={registerForm.organizationName}
                  onChange={(event) =>
                    setRegisterForm((current) => ({ ...current, organizationName: event.target.value }))
                  }
                  required
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={registerForm.email}
                  onChange={(event) => setRegisterForm((current) => ({ ...current, email: event.target.value }))}
                  required
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={registerForm.password}
                  onChange={(event) => setRegisterForm((current) => ({ ...current, password: event.target.value }))}
                  required
                />
              </label>
              <label>
                Preferred role
                <select
                  value={registerForm.role}
                  onChange={(event) => setRegisterForm((current) => ({ ...current, role: event.target.value }))}
                >
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
            </>
          ) : (
            <>
              <label>
                Email
                <input
                  type="email"
                  value={loginForm.email}
                  onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))}
                  required
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                  required
                />
              </label>
            </>
          )}

          {error ? <div className="form-error">{error}</div> : null}

          <button className="primary-button" disabled={loading} type="submit">
            {loading ? "Working..." : mode === "login" ? "Enter workspace" : "Create workspace"}
          </button>
        </form>
      </section>
    </div>
  );
}

