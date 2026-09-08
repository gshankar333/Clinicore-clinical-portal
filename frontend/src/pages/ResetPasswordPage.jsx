import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.resetPassword(email, token, newPassword);
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-lg font-semibold tracking-tight">
          Set a new password
        </h1>
        <p className="mb-6 text-sm text-muted">
          Paste the token from the previous step.
        </p>

        {done ? (
          <div className="rounded-lg border border-line bg-surface p-6 text-sm">
            <p className="mb-4 text-ink">
              Password updated. You can sign in now.
            </p>
            <button
              onClick={() => navigate("/login")}
              className="w-full rounded-md bg-clinical-500 px-3 py-2 text-sm font-medium text-white hover:bg-clinical-600"
            >
              Go to sign in
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="rounded-lg border border-line bg-surface p-6 shadow-sm"
          >
            <label className="mb-1 block text-sm font-medium text-ink">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mb-4 w-full rounded-md border border-line px-3 py-2 text-sm focus:border-clinical-500 focus:outline-none focus:ring-1 focus:ring-clinical-500"
            />

            <label className="mb-1 block text-sm font-medium text-ink">
              Reset token
            </label>
            <input
              type="text"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="mb-4 w-full rounded-md border border-line px-3 py-2 font-mono text-sm focus:border-clinical-500 focus:outline-none focus:ring-1 focus:ring-clinical-500"
            />

            <label className="mb-1 block text-sm font-medium text-ink">
              New password
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mb-4 w-full rounded-md border border-line px-3 py-2 text-sm focus:border-clinical-500 focus:outline-none focus:ring-1 focus:ring-clinical-500"
            />

            {error && (
              <div className="mb-4 rounded-md border border-alert/30 bg-alert/5 px-3 py-2 text-sm text-alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-clinical-500 px-3 py-2 text-sm font-medium text-white hover:bg-clinical-600 disabled:opacity-60"
            >
              {loading ? "Updating…" : "Update password"}
            </button>
          </form>
        )}

        <div className="mt-4 text-center">
          <Link to="/login" className="text-sm text-muted hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
