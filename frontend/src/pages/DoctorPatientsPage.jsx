import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

export default function DoctorPatientsPage() {
  const [patients, setPatients] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    api
      .getMyPatients()
      .then((data) => setPatients(data.patients))
      .catch((err) => setError(err.message));
  }, []);

  const filtered = patients
    ? patients.filter((p) =>
        p.full_name.toLowerCase().includes(filter.toLowerCase()),
      )
    : [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-1 font-serif text-2xl font-semibold text-ink">
            My patients
          </h1>
          <p className="text-sm text-muted">
            Patients currently assigned to you.
          </p>
        </div>
      </div>

      <input
        type="text"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter by name…"
        className="mb-4 w-full max-w-sm rounded-md border border-line px-3 py-2 text-sm focus:border-clinical-500 focus:outline-none"
      />

      {error && (
        <div className="mb-4 rounded-md border border-alert/30 bg-alert/5 px-3 py-2 text-sm text-alert">
          {error}
        </div>
      )}

      {!patients && !error && <p className="text-sm text-muted">Loading…</p>}

      {patients && (
        <div className="space-y-2">
          {filtered.length === 0 && (
            <p className="rounded-lg border border-line bg-surface px-4 py-6 text-center text-sm text-muted">
              No patients match.
            </p>
          )}
          {filtered.map((p) => (
            <Link
              key={p.id}
              to={`/doctor/patients/${p.id}`}
              className="flex items-center justify-between rounded-lg border border-line bg-surface px-4 py-3 text-sm transition-colors hover:border-clinical-300 hover:bg-clinical-50"
            >
              <div className="flex items-center gap-4">
                <span className="font-medium text-ink">{p.full_name}</span>
                <span className="text-muted tabular">Age {p.age ?? "—"}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-muted tabular">
                  Last visit:{" "}
                  {p.last_visit
                    ? new Date(p.last_visit).toLocaleDateString()
                    : "No visits yet"}
                </span>
                <span className="text-clinical-600">→</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
