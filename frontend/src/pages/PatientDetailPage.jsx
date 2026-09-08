import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import VitalsChart from "../components/VitalsChart";

const STATUS_OPTIONS = [
  { value: "new", label: "New case" },
  { value: "in-progress", label: "In progress" },
  { value: "reopened", label: "Case revisited" },
  { value: "closed", label: "Case closed" },
];

export default function PatientDetailPage({ mainSegment }) {
  const { id, patientId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin";
  const isDoctor = user?.role === "doctor";

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("notes");

  const [noteContent, setNoteContent] = useState("");
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingContent, setEditingContent] = useState("");
  const [labUrl, setLabUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [assignedDoctor, setAssignedDoctor] = useState(null);
  const [editingPatient, setEditingPatient] = useState(false);
  const [patientForm, setPatientForm] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [statusSaving, setStatusSaving] = useState(false);

  const backHref = isAdmin
    ? patientId && id
      ? `/admin/doctors/${id}`
      : "/admin/patients"
    : "/doctor";

  async function load() {
    try {
      const result = await api.getPatient(patientId || id);
      setData(result);
      if (isAdmin && result.patient.assigned_doctor_id) {
        const doctorDetails = await api.getDoctorProfile(
          result.patient.assigned_doctor_id,
        );
        setAssignedDoctor(doctorDetails?.doctor?.full_name);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (isAdmin) {
      api
        .listDoctors()
        .then((res) => setDoctors(res.doctors))
        .catch((err) => setError(err.message));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  async function handleAddNote(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.addNote(id, noteContent);
      setNoteContent("");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function startEditNote(note) {
    setEditingNoteId(note.id);
    setEditingContent(note.content);
  }

  async function handleSaveEditedNote(noteId) {
    setBusy(true);
    setError(null);
    try {
      await api.updateNote(id, noteId, editingContent);
      setEditingNoteId(null);
      setEditingContent("");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteNote(noteId) {
    if (!window.confirm("Delete this note? This cannot be undone.")) return;
    setBusy(true);
    setError(null);
    try {
      await api.deleteNote(id, noteId);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleFetchLab(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.fetchLabResult(id, labUrl);
      setLabUrl("");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function startEditPatient() {
    setPatientForm({
      full_name: data.patient.full_name || "",
      dob: data.patient.dob ? data.patient.dob.slice(0, 10) : "",
      aadhar: data.patient.aadhar || "",
      phone: data.patient.phone || "",
      address: data.patient.address || "",
      assigned_doctor_id: data.patient.assigned_doctor_id || null,
    });
    setEditingPatient(true);
  }

  async function handleSavePatient(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.updatePatient(id, patientForm);
      setEditingPatient(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDeletePatient() {
    if (
      !window.confirm(
        `Delete ${data.patient.full_name}'s entire record? This removes all notes and lab results and cannot be undone.`,
      )
    )
      return;
    setBusy(true);
    setError(null);
    try {
      await api.deletePatient(id);
      navigate(-1);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  async function handleStatusChange(newStatus) {
    const previousStatus = data.patient.status;

    // Optimistic update — reflect the change immediately instead of
    // waiting on the round trip.
    setData((prev) => ({
      ...prev,
      patient: { ...prev.patient, status: newStatus },
    }));
    setStatusSaving(true);
    setError(null);

    try {
      const res = await api.updatePatientStatus(id, newStatus);
      // Reconcile with whatever the server actually persisted.
      setData((prev) => ({
        ...prev,
        patient: { ...prev.patient, ...res.patient },
      }));
    } catch (err) {
      setError(err.message);
      setData((prev) => ({
        ...prev,
        patient: { ...prev.patient, status: previousStatus },
      }));
    } finally {
      setStatusSaving(false);
    }
  }

  if (error && !data) {
    return (
      <div className="rounded-md border border-alert/30 bg-alert/5 px-3 py-2 text-sm text-alert">
        {error}
      </div>
    );
  }
  if (!data) return <p className="text-sm text-muted">Loading…</p>;

  const { patient, notes, labResults } = data;

  return (
    <div>
      <Link
        to={backHref}
        className="mb-4 inline-block text-sm text-muted hover:underline"
      >
        ← {patientId && id ? "Back to doctor profile" : "All patients"}
      </Link>
      <div className="mb-1 flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold text-ink">
          {patient.full_name}
        </h1>
        <div className="flex items-center gap-4">
          {(isDoctor || isAdmin) && (
            <select
              value={data?.patient?.patient_status || "new"}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={statusSaving}
              className="rounded-md border border-line px-2 py-1 text-xs font-medium text-ink focus:border-clinical-500 focus:outline-none disabled:opacity-60"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          )}
          {isAdmin && !editingPatient && (
            <div className="flex gap-3">
              <button
                onClick={startEditPatient}
                className="text-sm font-medium text-clinical-600 hover:underline"
              >
                Edit patient
              </button>
              <button
                onClick={handleDeletePatient}
                className="text-sm font-medium text-alert hover:underline"
              >
                Delete patient
              </button>
            </div>
          )}
        </div>
      </div>
      <p className="mb-6 text-sm text-muted">Patient #{patient.id}</p>

      {error && (
        <div className="mb-4 rounded-md border border-alert/30 bg-alert/5 px-3 py-2 text-sm text-alert">
          {error}
        </div>
      )}

      {editingPatient ? (
        <form
          onSubmit={handleSavePatient}
          className="mb-6 rounded-lg border border-line bg-surface p-5 text-sm"
        >
          <div className="mb-3 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">
                Full name
              </label>
              <input
                type="text"
                value={patientForm.full_name}
                onChange={(e) =>
                  setPatientForm({ ...patientForm, full_name: e.target.value })
                }
                className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-clinical-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">
                Date of birth
              </label>
              <input
                type="date"
                value={patientForm.dob}
                onChange={(e) =>
                  setPatientForm({ ...patientForm, dob: e.target.value })
                }
                className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-clinical-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">
                Aadhar Number
              </label>
              <input
                type="text"
                value={patientForm.aadhar}
                onChange={(e) =>
                  setPatientForm({ ...patientForm, aadhar: e.target.value })
                }
                className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-clinical-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">
                Phone
              </label>
              <input
                type="text"
                value={patientForm.phone}
                onChange={(e) =>
                  setPatientForm({ ...patientForm, phone: e.target.value })
                }
                className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-clinical-500 focus:outline-none"
              />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-medium text-muted">
                Address
              </label>
              <input
                type="text"
                value={patientForm.address}
                onChange={(e) =>
                  setPatientForm({ ...patientForm, address: e.target.value })
                }
                className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-clinical-500 focus:outline-none"
              />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-medium text-muted">
                Assigned doctor
              </label>
              <select
                value={patientForm.assigned_doctor_id}
                onChange={(e) =>
                  setPatientForm({
                    ...patientForm,
                    assigned_doctor_id: e.target.value,
                  })
                }
                className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-clinical-500 focus:outline-none"
              >
                <option value="">Unassigned</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.full_name} ({d.specialization})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-clinical-500 px-4 py-2 text-sm font-medium text-white hover:bg-clinical-600 disabled:opacity-60"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditingPatient(false)}
              className="rounded-md border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-canvas"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="mb-6 grid grid-cols-2 gap-4 rounded-lg border border-line bg-surface p-5 text-sm sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted">DOB</p>
            <p className="tabular">
              {patient.dob ? new Date(patient.dob).toLocaleDateString() : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted">Aadhar Number</p>
            <p className="tabular">{patient.aadhar}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Phone</p>
            <p className="tabular">{patient.phone}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Address</p>
            <p>{patient.address}</p>
          </div>
          {isAdmin && (
            <div>
              <p className="text-xs text-muted">Assigned Doctor</p>
              <p>{assignedDoctor || "Not assigned"}</p>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-4 flex gap-1 border-b border-line">
        <button
          onClick={() => setTab("notes")}
          className={`px-4 py-2 text-sm font-medium ${tab === "notes" ? "border-b-2 border-clinical-500 text-clinical-600" : "text-muted hover:text-ink"}`}
        >
          Medical notes
        </button>
        <button
          onClick={() => setTab("labs")}
          className={`px-4 py-2 text-sm font-medium ${tab === "labs" ? "border-b-2 border-clinical-500 text-clinical-600" : "text-muted hover:text-ink"}`}
        >
          Lab results
        </button>
      </div>

      {tab === "notes" && (
        <div className="rounded-lg border border-line bg-surface p-5">
          <div className="mb-4 space-y-3">
            {notes.length === 0 && (
              <p className="text-sm text-muted">No notes yet.</p>
            )}
            {notes.map((n) => (
              <div
                key={n.id}
                className="rounded-md border border-line bg-canvas px-3 py-2 text-sm"
              >
                {editingNoteId === n.id ? (
                  <div>
                    <textarea
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                      rows={3}
                      className="mb-2 w-full rounded-md border border-line px-2 py-1 text-sm focus:border-clinical-500 focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveEditedNote(n.id)}
                        disabled={busy}
                        className="rounded-md bg-clinical-500 px-3 py-1 text-xs font-medium text-white hover:bg-clinical-600 disabled:opacity-60"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingNoteId(null)}
                        className="rounded-md border border-line px-3 py-1 text-xs font-medium text-ink hover:bg-surface"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div dangerouslySetInnerHTML={{ __html: n.content }} />
                    <div className="mt-1 flex items-center justify-between">
                      <p className="text-xs text-muted tabular">
                        {new Date(n.created_at).toLocaleString()}
                      </p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => startEditNote(n)}
                          className="text-xs font-medium text-clinical-600 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteNote(n.id)}
                          className="text-xs font-medium text-alert hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          <form onSubmit={handleAddNote} className="flex gap-2">
            <input
              type="text"
              required
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Add a note…"
              className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-clinical-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={busy}
              className="shrink-0 rounded-md bg-clinical-500 px-4 py-2 text-sm font-medium text-white hover:bg-clinical-600 disabled:opacity-60"
            >
              Save
            </button>
          </form>
        </div>
      )}

      {tab === "labs" && (
        <div className="space-y-6">
          <div className="rounded-lg border border-line bg-surface p-5">
            <h2 className="mb-3 text-sm font-semibold text-ink">
              Vitals trend
            </h2>
            <VitalsChart labResults={labResults} />
          </div>

          <div className="rounded-lg border border-line bg-surface p-5">
            <h2 className="mb-3 text-sm font-semibold text-ink">
              Lab result history
            </h2>
            <div className="mb-4 space-y-2">
              {labResults.length === 0 && (
                <p className="text-sm text-muted">No lab results yet.</p>
              )}
              {[...labResults]
                .sort((a, b) => new Date(b.fetched_at) - new Date(a.fetched_at))
                .map((l) => (
                  <div
                    key={l.id}
                    className="rounded-md border border-line bg-canvas px-3 py-2 text-xs"
                  >
                    <p className="mb-1 tabular">
                      {new Date(l.fetched_at).toLocaleString()}
                    </p>
                    {l.result_data && typeof l.result_data === "object" ? (
                      <p className="text-muted">
                        BP {l.result_data.systolic}/{l.result_data.diastolic} ·
                        HR {l.result_data.heartRate} bpm
                        {l.result_data.glucose
                          ? ` · Glucose ${l.result_data.glucose} mg/dL`
                          : ""}
                      </p>
                    ) : (
                      <p className="break-all text-muted">
                        {l.external_lab_url}
                      </p>
                    )}
                  </div>
                ))}
            </div>

            <form onSubmit={handleFetchLab} className="flex gap-2">
              <input
                type="text"
                required
                value={labUrl}
                onChange={(e) => setLabUrl(e.target.value)}
                placeholder="External lab URL…"
                className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-clinical-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={busy}
                className="shrink-0 rounded-md bg-clinical-500 px-4 py-2 text-sm font-medium text-white hover:bg-clinical-600 disabled:opacity-60"
              >
                Fetch
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
