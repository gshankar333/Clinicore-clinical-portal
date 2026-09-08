import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";

export default function DoctorSearchPage() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSearch(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await api.searchPatients(q);
      setResults(data.patients);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="mb-1 font-serif text-2xl font-semibold text-ink">
        Search patients
      </h1>
      <p className="mb-6 text-sm text-muted">
        Find a patient by name to view their record.
      </p>

      <form onSubmit={handleSearch} className="mb-6 flex gap-3">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Patient name…"
          className="w-full max-w-sm rounded-md border border-line px-3 py-2 text-sm focus:border-clinical-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-clinical-500 px-4 py-2 text-sm font-medium text-white hover:bg-clinical-600 disabled:opacity-60"
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      {error && (
        <div className="mb-4 rounded-md border border-alert/30 bg-alert/5 px-3 py-2 text-sm text-alert">
          {error}
        </div>
      )}

      {results && (
        <div className="overflow-hidden rounded-lg border border-line bg-surface">
          {results.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted">
              No patients found.
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-canvas text-xs text-muted">
                <tr>
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">DOB</th>
                  <th className="px-4 py-2 font-medium">Phone</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {results.map((p) => (
                  <tr key={p.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-2">{p.full_name}</td>
                    <td className="px-4 py-2 text-muted tabular">
                      {p.dob ? new Date(p.dob).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-2 tabular">{p.phone}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => navigate(`/doctor/patients/${p.id}`)}
                        className="text-xs font-medium text-clinical-600 hover:underline"
                      >
                        View record
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
