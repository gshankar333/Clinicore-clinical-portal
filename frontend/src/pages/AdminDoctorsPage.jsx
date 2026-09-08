import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

const SPECIALIZATIONS = [
  "Internal Medicine",
  "Pediatrics",
  "Cardiology",
  "Dermatology",
  "Neurology",
  "Psychiatry",
];
const GENDERS = ["Male", "Female", "Other"];
export default function AdminDoctorsPage() {
  const [doctors, setDoctors] = useState(null);
  const [error, setError] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    specialization: SPECIALIZATIONS[0],
    license_number: "",
    gender: GENDERS[0],
    phone: "",
  });
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const data = await api.listDoctors();
      setDoctors(data.doctors);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function resetForm() {
    setForm({
      email: "",
      password: "",
      full_name: "",
      specialization: SPECIALIZATIONS[0],
      license_number: "",
      gender: GENDERS[0],
      phone: "",
    });
    setShowAdd(false);
    setEditingId(null);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      await api.createDoctor(form);
      resetForm();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function startEdit(doc) {
    setEditingId(doc.id);
    setForm({
      ...form,
      full_name: doc.full_name,
      specialization: doc.specialization || SPECIALIZATIONS[0],
      license_number: doc.license_number || "",
      gender: doc.gender || GENDERS[0],
      phone: doc.phone || "",
    });
    setShowAdd(false);
  }

  async function handleUpdate(e, id) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.updateDoctor(id, {
        full_name: form.full_name,
        specialization: form.specialization,
        license_number: form.license_number,
        gender: form.gender,
        phone: form.phone,
      });
      resetForm();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id) {
    if (
      !window.confirm(
        "Delete this doctor? This is blocked if they still have patients assigned.",
      )
    )
      return;
    try {
      await api.deleteDoctor(id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-1 font-serif text-2xl font-semibold text-ink">
            Doctors
          </h1>
          <p className="text-sm text-muted">
            Manage doctor accounts and specializations.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowAdd(true);
          }}
          className="rounded-md bg-clinical-500 px-4 py-2 text-sm font-medium text-white hover:bg-clinical-600"
        >
          Add doctor
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-alert/30 bg-alert/5 px-3 py-2 text-sm text-alert">
          {error}
        </div>
      )}

      {showAdd && (
        <form
          onSubmit={handleCreate}
          className="mb-6 rounded-lg border border-line bg-surface p-5"
        >
          <h2 className="mb-3 text-sm font-semibold text-ink">New doctor</h2>
          <div className="mb-3 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">
                Email
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-clinical-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">
                Password
              </label>
              <input
                type="text"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-clinical-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">
                Full name
              </label>
              <input
                type="text"
                required
                value={form.full_name}
                onChange={(e) =>
                  setForm({ ...form, full_name: e.target.value })
                }
                className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-clinical-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">
                Specialization
              </label>
              <select
                value={form.specialization}
                onChange={(e) =>
                  setForm({ ...form, specialization: e.target.value })
                }
                className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-clinical-500 focus:outline-none"
              >
                {SPECIALIZATIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">
                Gender
              </label>
              <select
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-clinical-500 focus:outline-none"
              >
                {GENDERS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">
                Phone Number
              </label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-clinical-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">
                License number
              </label>
              <input
                type="text"
                value={form.license_number}
                onChange={(e) =>
                  setForm({ ...form, license_number: e.target.value })
                }
                className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-clinical-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-clinical-500 px-4 py-2 text-sm font-medium text-white hover:bg-clinical-600 disabled:opacity-60"
            >
              {busy ? "Adding…" : "Add doctor"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-md border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-canvas"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {doctors === null && <p className="text-sm text-muted">Loading…</p>}
        {doctors?.map((doc) =>
          editingId === doc.id ? (
            <form
              key={doc.id}
              onSubmit={(e) => handleUpdate(e, doc.id)}
              className="rounded-lg border border-line bg-surface p-5"
            >
              <div className="mb-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted">
                    Full name
                  </label>
                  <input
                    type="text"
                    value={form.full_name}
                    onChange={(e) =>
                      setForm({ ...form, full_name: e.target.value })
                    }
                    className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-clinical-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted">
                    Specialization
                  </label>
                  <select
                    value={form.specialization}
                    onChange={(e) =>
                      setForm({ ...form, specialization: e.target.value })
                    }
                    className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-clinical-500 focus:outline-none"
                  >
                    {SPECIALIZATIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted">
                    Gender
                  </label>
                  <select
                    value={form.gender}
                    onChange={(e) =>
                      setForm({ ...form, gender: e.target.value })
                    }
                    className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-clinical-500 focus:outline-none"
                  >
                    {GENDERS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                    className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-clinical-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted">
                    License number
                  </label>
                  <input
                    type="text"
                    value={form.license_number}
                    onChange={(e) =>
                      setForm({ ...form, license_number: e.target.value })
                    }
                    className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-clinical-500 focus:outline-none"
                  />
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
                  onClick={resetForm}
                  className="rounded-md border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-canvas"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div
              key={doc.id}
              className="flex items-center justify-between rounded-lg border border-line bg-surface px-4 py-3 text-sm"
            >
              <Link
                to={`/admin/doctors/${doc.id}`}
                className="flex flex-1 items-center gap-4 hover:text-clinical-600"
              >
                <span className="font-medium text-ink">{doc.full_name}</span>
                <span className="text-muted">{doc.specialization}</span>
                <span className="text-xs text-muted">{doc.email}</span>
                <span className="text-xs text-muted tabular">
                  {doc.patient_count} patient(s)
                </span>
              </Link>
              <div className="flex gap-3">
                <button
                  onClick={() => startEdit(doc)}
                  className="text-xs font-medium text-clinical-600 hover:underline"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="text-xs font-medium text-alert hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
