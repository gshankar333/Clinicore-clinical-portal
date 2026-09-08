import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ email: "", password: "", role: "doctor" });
  const [creating, setCreating] = useState(false);

  async function load() {
    try {
      const data = await api.listUsers();
      setUsers(data.users);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await api.createUser(form.email, form.password, form.role);
      setForm({ email: "", password: "", role: "doctor" });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id) {
    try {
      await api.deleteUser(id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h1 className="mb-1 font-serif text-2xl font-semibold text-ink">Users</h1>
      <p className="mb-6 text-sm text-muted">
        Manage accounts across all roles.
      </p>

      {error && (
        <div className="mb-4 rounded-md border border-alert/30 bg-alert/5 px-3 py-2 text-sm text-alert">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-canvas text-xs text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Role</th>
              <th className="px-4 py-2 font-medium">Created</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-line last:border-0">
                <td className="px-4 py-2">{u.email}</td>
                <td className="px-4 py-2 capitalize">{u.role}</td>
                <td className="px-4 py-2 text-muted tabular">
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={() => handleDelete(u.id)}
                    className="text-xs font-medium text-alert hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
