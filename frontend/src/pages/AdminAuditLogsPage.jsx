import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .getAuditLogs()
      .then((data) => setLogs(data.auditLogs))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div>
      <h1 className="mb-1 font-serif text-2xl font-semibold text-ink">
        Audit logs
      </h1>
      <p className="mb-6 text-sm text-muted">
        Sensitive actions across the system. Note how sparse this is right now
        logins, record views, and imports currently write nothing here. That gap
        gets closed later when the RASP layer is in place.
      </p>

      {error && (
        <div className="mb-4 rounded-md border border-alert/30 bg-alert/5 px-3 py-2 text-sm text-alert">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        {logs.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted">
            No audit log entries yet.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-canvas text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Time</th>
                <th className="px-4 py-2 font-medium">User</th>
                <th className="px-4 py-2 font-medium">Action</th>
                <th className="px-4 py-2 font-medium">Target patient</th>
                <th className="px-4 py-2 font-medium">Success</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-2 text-muted tabular">
                    {new Date(l.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 tabular">{l.user_id}</td>
                  <td className="px-4 py-2">{l.action}</td>
                  <td className="px-4 py-2 tabular">
                    {l.target_patient_id ?? "—"}
                  </td>
                  <td className="px-4 py-2">{l.success ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
