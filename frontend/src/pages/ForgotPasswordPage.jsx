import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await api.forgotPassword(email);
      setResult(data);
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
          Reset your password
        </h1>
        <p className="mb-6 text-sm text-muted">
          Enter your account email and we'll generate a reset token.
        </p>

        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-line bg-surface p-6 shadow-sm"
        >
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
            className="mb-4 w-full rounded-md border border-line px-3 py-2 text-sm focus:border-clinical-500 focus:outline-none focus:ring-1 focus:ring-clinical-500"
            placeholder="you@clinic.test"
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
            {loading ? "Generating…" : "Send reset token"}
          </button>
        </form>

        {result && (
          <div className="mt-4 rounded-md border border-line bg-surface p-4 text-sm">
            <p className="mb-2 text-muted">{result.message}</p>
            {result.token && (
              <>
                <p className="mb-1 font-medium text-ink">
                  Reset token (dev only):
                </p>
                <p className="break-all rounded bg-canvas px-2 py-1 font-mono text-xs tabular">
                  {result.token}
                </p>
                <Link
                  to="/reset-password"
                  className="mt-3 inline-block text-sm text-clinical-600 hover:underline"
                >
                  Continue to reset password →
                </Link>
              </>
            )}
          </div>
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
