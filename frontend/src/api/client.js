const TOKEN_KEY = 'clinicore_token';

export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.removeItem(TOKEN_KEY);
}

async function request(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (email, token, newPassword) =>
    request('/auth/reset-password', { method: 'POST', body: { email, token, newPassword } }),
  me: () => request('/me'),
  searchPatients: (q) => request(`/patients/search?q=${encodeURIComponent(q)}`),
  getPatient: (id) => request(`/patients/${id}`),
  getMyRecord: () => request('/patients/me'),
  addNote: (patientId, content) =>
    request(`/patients/${patientId}/notes`, { method: 'POST', body: { content } }),
  updateNote: (patientId, noteId, content) =>
    request(`/patients/${patientId}/notes/${noteId}`, { method: 'PUT', body: { content } }),
  deleteNote: (patientId, noteId) =>
    request(`/patients/${patientId}/notes/${noteId}`, { method: 'DELETE' }),
  fetchLabResult: (patientId, url) =>
    request(`/patients/${patientId}/lab-results/fetch`, { method: 'POST', body: { url } }),

  // Doctor's own patient list
  getMyPatients: () => request('/doctors/me/patients'),

  // Admin: users
  listUsers: () => request('/admin/users'),
  createUser: (email, password, role) =>
    request('/admin/users', { method: 'POST', body: { email, password, role } }),
  deleteUser: (id) => request(`/admin/users/${id}`, { method: 'DELETE' }),
  getAuditLogs: () => request('/admin/audit-logs'),
  importRecords: (patients, transform) =>
    request('/admin/import', { method: 'POST', body: { patients, transform } }),

  // Admin: doctors
  listDoctors: () => request('/admin/doctors'),
  createDoctor: (payload) => request('/admin/doctors', { method: 'POST', body: payload }),
  getDoctorProfile: (id) => request(`/admin/doctors/${id}`),
  updateDoctor: (id, payload) => request(`/admin/doctors/${id}`, { method: 'PUT', body: payload }),
  deleteDoctor: (id) => request(`/admin/doctors/${id}`, { method: 'DELETE' }),
  getDoctorPatients: (id) => request(`/admin/doctors/${id}/patients`),
  assignPatientToDoctor: (doctorId, patientId) => request(`/admin/doctors/${doctorId}/assign-patient`, {
      method: 'POST',
      body: { patientId },
    }),
  
  // Admin: patients (full CRUD, beyond what a doctor can do)
  listPatients: () => request('/admin/patients'),
  createPatient: (payload) => request('/admin/patients', { method: 'POST', body: payload }),
  updatePatient: (id, payload) => request(`/admin/patients/${id}`, { method: 'PUT', body: payload }),
  deletePatient: (id) => request(`/admin/patients/${id}`, { method: 'DELETE' }),
  updatePatientStatus: (id, status) => request(`/patients/${id}/status`, { method: 'PATCH', body: { status } }),
};
