import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";

export default function AdminPatientsPage() {
  const [showAdd, setShowAdd] = useState(false);

  const [form, setForm] = useState({
    email: "",
    full_name: "",
    phone: "",
    address: "",
    dob: "",
    gender: "",
    aadhar: "",
    assigned_doctor_id: "",
    latest_labreport: {
      glucose: 0,
      systolic_bp: 0,
      condition: "",
      diastolic_bp: 0,
      heartRate: 0,
      temperatureF: 0.0,
    },
  });

  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [patients, setPatients] = useState([]);
  const [error, setError] = useState(null);
  const [doctors, setDoctors] = useState([]);

  async function loadPatients() {
    try {
      setError(null);

      const data = await api.listPatients();

      if (Array.isArray(data)) {
        setPatients(data);
      } else if (Array.isArray(data?.patients)) {
        setPatients(data.patients);
      } else {
        setPatients([]);
        setError("Invalid patient data received from server.");
      }
    } catch (err) {
      setError(err.message || "Failed to load patients.");
      setPatients([]);
    }
  }
  async function loadDoctors() {
    try {
      setError(null);

      const data = await api.listDoctors();
      if (Array.isArray(data)) {
        setDoctors(data.doctors);
      } else if (Array.isArray(data?.doctors)) {
        setDoctors(data.doctors);
      } else {
        setDoctors([]);
        setError("Invalid doctor data received from server.");
      }
    } catch (err) {
      setError(err.message || "Failed to load doctors.");
      setDoctors([]);
    }
  }
  useEffect(() => {
    loadPatients();
    loadDoctors();
  }, []);

  function resetForm() {
    setForm({
      email: "",
      full_name: "",
      phone: "",
      address: "",
      dob: "",
      gender: "",
      aadhar: "",
      assigned_doctor_id: "",
      latest_labreport: {
        glucose: 0,
        systolic_bp: 0,
        condition: "",
        diastolic_bp: 0,
        heartRate: 0,
        temperatureF: 0.0,
      },
    });

    setShowAdd(false);
    setEditingId(null);
  }

  async function handleCreate(e) {
    e.preventDefault();

    setBusy(true);
    setError(null);

    try {
      await api.createPatient(form);
      resetForm();
      await loadPatients();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }

    setBusy(false);
  }
  function calculateAge(dob) {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
  }
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-1 font-serif text-2xl font-semibold text-ink">
            Patients
          </h1>

          <p className="text-sm text-muted">
            Manage patient accounts and information.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            resetForm();
            setShowAdd(true);
          }}
          className="rounded-md bg-clinical-500 px-4 py-2 text-sm font-medium text-white hover:bg-clinical-600"
        >
          Add Patient
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-md border border-alert/30 bg-alert/5 px-3 py-2 text-sm text-alert">
          {error}
        </div>
      )}

      {/* Add Patient Form */}
      {showAdd && (
        <form
          onSubmit={handleCreate}
          className="mb-6 rounded-lg border border-line bg-surface p-5"
        >
          <h2 className="mb-4 text-sm font-semibold text-ink">New patient</h2>

          {/* Patient Information */}
          <div className="mb-5 grid grid-cols-2 gap-3">
            {/* Email */}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">
                Email
              </label>

              <input
                type="email"
                required
                value={form.email}
                onChange={(e) =>
                  setForm({
                    ...form,
                    email: e.target.value,
                  })
                }
                className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-clinical-500 focus:outline-none"
              />
            </div>

            {/* Full Name */}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">
                Full Name
              </label>

              <input
                type="text"
                required
                value={form.full_name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    full_name: e.target.value,
                  })
                }
                className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-clinical-500 focus:outline-none"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">
                Phone
              </label>

              <input
                type="text"
                required
                value={form.phone}
                onChange={(e) =>
                  setForm({
                    ...form,
                    phone: e.target.value,
                  })
                }
                className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-clinical-500 focus:outline-none"
              />
            </div>

            {/* Aadhar */}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">
                Aadhar
              </label>

              <input
                type="text"
                required
                value={form.aadhar}
                onChange={(e) =>
                  setForm({
                    ...form,
                    aadhar: e.target.value,
                  })
                }
                className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-clinical-500 focus:outline-none"
              />
            </div>

            {/* Date of Birth */}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">
                Date of Birth
              </label>

              <input
                type="date"
                required
                value={form.dob}
                onChange={(e) =>
                  setForm({
                    ...form,
                    dob: e.target.value,
                  })
                }
                className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-clinical-500 focus:outline-none"
              />
            </div>

            {/* Gender */}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">
                Gender
              </label>

              <select
                required
                value={form.gender}
                onChange={(e) =>
                  setForm({
                    ...form,
                    gender: e.target.value,
                  })
                }
                className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-clinical-500 focus:outline-none"
              >
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Doctor */}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">
                Assign Doctor
              </label>

              <select
                required
                value={form.assigned_doctor_id}
                onChange={(e) =>
                  setForm({
                    ...form,
                    assigned_doctor_id: e.target.value,
                  })
                }
                className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-clinical-500 focus:outline-none"
              >
                <option value="">Select doctor</option>

                {doctors?.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.full_name} ({doctor.specialization})
                  </option>
                ))}
              </select>
            </div>

            {/* Address */}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">
                Address
              </label>

              <input
                type="text"
                value={form.address}
                onChange={(e) =>
                  setForm({
                    ...form,
                    address: e.target.value,
                  })
                }
                className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-clinical-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Latest Lab Report */}
          <div className="mb-5">
            <h3 className="mb-3 text-sm font-semibold text-ink">
              Latest Lab Report
            </h3>

            <div className="grid grid-cols-2 gap-3">
              {/* Glucose */}
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">
                  Glucose
                </label>

                <input
                  type="number"
                  value={form.latest_labreport.glucose}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      latest_labreport: {
                        ...form.latest_labreport,
                        glucose: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-clinical-500 focus:outline-none"
                />
              </div>

              {/* Condition */}
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">
                  Condition
                </label>

                <input
                  type="text"
                  value={form.latest_labreport.condition}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      latest_labreport: {
                        ...form.latest_labreport,
                        condition: e.target.value,
                      },
                    })
                  }
                  className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-clinical-500 focus:outline-none"
                />
              </div>

              {/* Systolic BP */}
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">
                  Systolic BP
                </label>

                <input
                  type="number"
                  value={form.latest_labreport.systolic_bp}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      latest_labreport: {
                        ...form.latest_labreport,
                        systolic_bp: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-clinical-500 focus:outline-none"
                />
              </div>

              {/* Diastolic BP */}
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">
                  Diastolic BP
                </label>

                <input
                  type="number"
                  value={form.latest_labreport.diastolic_bp}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      latest_labreport: {
                        ...form.latest_labreport,
                        diastolic_bp: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-clinical-500 focus:outline-none"
                />
              </div>

              {/* Heart Rate */}
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">
                  Heart Rate
                </label>

                <input
                  type="number"
                  value={form.latest_labreport.heartRate}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      latest_labreport: {
                        ...form.latest_labreport,
                        heartRate: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-clinical-500 focus:outline-none"
                />
              </div>

              {/* Temperature */}
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">
                  Temperature (°F)
                </label>

                <input
                  type="number"
                  step="0.1"
                  value={form.latest_labreport.temperatureF}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      latest_labreport: {
                        ...form.latest_labreport,
                        temperatureF: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-clinical-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Form Buttons */}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-clinical-500 px-4 py-2 text-sm font-medium text-white hover:bg-clinical-600 disabled:opacity-60"
            >
              {busy ? "Adding…" : "Add patient"}
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

      {/* Patient Cards */}
      <div className="space-y-2">
        {patients.length === 0 ? (
          <p className="rounded-lg border border-line bg-surface px-4 py-6 text-center text-sm text-muted">
            No patients found.
          </p>
        ) : (
          patients.map((p) => (
            <Link
              key={p.id}
              to={`/admin/patient/${p.id}`}
              className="flex items-center justify-between rounded-lg border border-line bg-surface px-4 py-3 text-sm transition-colors hover:border-clinical-300 hover:bg-clinical-50"
            >
              <div className="flex items-center gap-4">
                <span className="font-medium text-ink">{p.full_name}</span>
                <span className="text-muted tabular">
                  Age {p.dob ? calculateAge(p.dob) : "—"}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-muted tabular">
                  View Patient Details
                </span>
                <span className="text-clinical-600">→</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
