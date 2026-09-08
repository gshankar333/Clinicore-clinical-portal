import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, loading, error } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    const user = await login(email, password).catch(() => null);
    if (!user) return;
    if (user.role === "admin") navigate("/admin");
    else if (user.role === "doctor") navigate("/doctor");
    else navigate("/patient");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-clinical-500 text-base font-bold text-white">
            C
          </div>
          <h1 className="text-lg font-semibold tracking-tight">Clinicore</h1>
          <p className="text-sm text-muted">Clinicore Clinical Portal</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-line bg-surface p-6 shadow-sm"
        >
          <div className="mb-4">
            <label
              className="mb-1 block text-sm font-medium text-ink"
              htmlFor="email"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-clinical-500 focus:outline-none focus:ring-1 focus:ring-clinical-500"
              placeholder="you@clinic.test"
            />
          </div>
          <div className="mb-5">
            <label
              className="mb-1 block text-sm font-medium text-ink"
              htmlFor="password"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-clinical-500 focus:outline-none focus:ring-1 focus:ring-clinical-500"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="mb-4 rounded-md border border-alert/30 bg-alert/5 px-3 py-2 text-sm text-alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-clinical-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-clinical-600 disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        {/* <div className="mt-3 text-center">
          <Link
            to="/forgot-password"
            className="text-sm text-clinical-600 hover:underline"
          >
            Forgot password?
          </Link>
        </div> */}
      </div>
    </div>
  );
}
