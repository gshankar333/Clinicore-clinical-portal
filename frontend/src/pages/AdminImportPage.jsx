import { useState } from "react";
import { api } from "../api/client";

const SAMPLE_PATIENTS = JSON.stringify(
  [{ full_name: "Imported Patient", dob: "1978-02-11", ssn: "000-11-2222" }],
  null,
  2,
);

export default function AdminImportPage() {
  const [patientsJson, setPatientsJson] = useState(SAMPLE_PATIENTS);
  const [transform, setTransform] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleImport(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const patients = JSON.parse(patientsJson);
      const data = await api.importRecords(patients, transform || undefined);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="mb-1 font-serif text-2xl font-semibold text-ink">
        Import patient records
      </h1>
      <p className="mb-6 text-sm text-muted">
        Bulk-import legacy records. Optionally supply a transform to remap field
        names from the source system.
      </p>

      <form
        onSubmit={handleImport}
        className="rounded-lg border border-line bg-surface p-5"
      >
        <label className="mb-1 block text-sm font-medium text-ink">
          Patients (JSON array)
        </label>
        <textarea
          value={patientsJson}
          onChange={(e) => setPatientsJson(e.target.value)}
          rows={6}
          className="mb-4 w-full rounded-md border border-line px-3 py-2 font-mono text-xs focus:border-clinical-500 focus:outline-none"
        />

        <label className="mb-1 block text-sm font-medium text-ink">
          Transform (optional JS — runs server-side per record)
        </label>
        <textarea
          value={transform}
          onChange={(e) => setTransform(e.target.value)}
          rows={3}
          placeholder="return { ...patient, full_name: patient.full_name.toUpperCase() };"
          className="mb-4 w-full rounded-md border border-line px-3 py-2 font-mono text-xs focus:border-clinical-500 focus:outline-none"
        />

        {error && (
          <div className="mb-4 rounded-md border border-alert/30 bg-alert/5 px-3 py-2 text-sm text-alert">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-clinical-500 px-4 py-2 text-sm font-medium text-white hover:bg-clinical-600 disabled:opacity-60"
        >
          {loading ? "Importing…" : "Run import"}
        </button>
      </form>

      {result && (
        <div className="mt-4 rounded-md border border-line bg-surface p-4 text-sm">
          <p className="text-ink">
            Import record #{result.importRecord.id} created —{" "}
            {result.processedCount} row(s) processed.
          </p>
        </div>
      )}
    </div>
  );
}
