import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";

export default function AdminDoctorProfilePage() {
  const { id } = useParams();
  const [doctor, setDoctor] = useState(null);
  const [patients, setPatients] = useState(null);
  const [allPatients, setAllPatients] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [assigning, setAssigning] = useState(false);

  async function loadAll() {
    try {
      const [doctorData, patientsData, allPatientsData] = await Promise.all([
        api.getDoctorProfile(id),
        api.getDoctorPatients(id),
        api.listPatients(),
      ]);
      setDoctor(doctorData.doctor);
      setPatients(patientsData.patients);
      setAllPatients(allPatientsData.patients);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const filtered = patients
    ? patients.filter((p) =>
        p.full_name.toLowerCase().includes(filter.toLowerCase()),
      )
    : [];

  const assignableIds = new Set((patients || []).map((p) => p.id));
  const assignableCandidates = (allPatients || []).filter(
    (p) => !assignableIds.has(p.id),
  );

  async function handleAssign(e) {
    e.preventDefault();
    if (!selectedPatientId) return;
    setAssigning(true);
    setError(null);
    try {
      await api.assignPatientToDoctor(id, selectedPatientId);
      setSelectedPatientId("");
      await loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setAssigning(false);
    }
  }

  if (error && !doctor) {
    return (
      <div className="rounded-md border border-alert/30 bg-alert/5 px-3 py-2 text-sm text-alert">
        {error}
      </div>
    );
  }
  if (!doctor) return <p className="text-sm text-muted">Loading…</p>;

  return (
    <div>
      <Link
        to="/admin/doctors"
        className="mb-4 inline-block text-sm text-muted hover:underline"
      >
        ← All doctors
      </Link>

      <h1 className="mb-1 font-serif text-2xl font-semibold text-ink">
        {doctor.full_name}
      </h1>
      <p className="mb-6 text-sm text-muted">
        {doctor.specialization} · {doctor.email}
        {doctor.license_number ? ` · License ${doctor.license_number}` : ""}
      </p>

      {error && (
        <div className="mb-4 rounded-md border border-alert/30 bg-alert/5 px-3 py-2 text-sm text-alert">
          {error}
        </div>
      )}

      <div className="mb-6 rounded-lg border border-line bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold text-ink">
          Assign an existing patient
        </h2>
        <form
          onSubmit={handleAssign}
          className="flex flex-wrap items-end gap-3"
        >
          <div className="min-w-[16rem]">
            <label className="mb-1 block text-xs font-medium text-muted">
              Patient
            </label>
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-clinical-500 focus:outline-none"
            >
              <option value="">
                {allPatients === null
                  ? "Loading patients…"
                  : "Select a patient…"}
              </option>
              {assignableCandidates.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={!selectedPatientId || assigning}
            className="rounded-md bg-clinical-500 px-4 py-2 text-sm font-medium text-white hover:bg-clinical-600 disabled:opacity-60"
          >
            {assigning ? "Assigning…" : "Assign to this doctor"}
          </button>
        </form>
        {allPatients !== null && assignableCandidates.length === 0 && (
          <p className="mt-3 text-xs text-muted">
            Every patient is already assigned to this doctor.
          </p>
        )}
      </div>

      <h2 className="mb-3 text-sm font-semibold text-ink">
        Patients managed by this doctor
      </h2>

      <input
        type="text"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter by name…"
        className="mb-4 w-full max-w-sm rounded-md border border-line px-3 py-2 text-sm focus:border-clinical-500 focus:outline-none"
      />

      <div className="space-y-2">
        {filtered.length === 0 && (
          <p className="rounded-lg border border-line bg-surface px-4 py-6 text-center text-sm text-muted">
            No patients match.
          </p>
        )}
        {filtered.map((p) => (
          <Link
            key={p.id}
            to={`/admin/doctors/${id}/patient/${p.id}`}
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
    </div>
  );
}
