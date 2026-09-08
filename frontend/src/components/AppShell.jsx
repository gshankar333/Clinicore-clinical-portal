import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import RoleBadge from './RoleBadge';

const NAV_BY_ROLE = {
  admin: [
    { to: '/admin', label: 'Users' },
    { to: '/admin/doctors', label: 'Doctors' },
    { to: '/admin/patients', label: 'Patients' },
    { to: '/admin/audit-logs', label: 'Audit logs' },
    { to: '/admin/import', label: 'Import records' },
  ],
  doctor: [
    { to: '/doctor', label: 'My patients' },
    // { to: '/doctor/search', label: 'Search all patients' },
  ],
};

function NavItem({ to, label }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
          isActive
            ? 'bg-clinical-50 text-clinical-700'
            : 'text-muted hover:bg-clinical-50/60 hover:text-ink'
        }`
      }
    >
      {label}
    </NavLink>
  );
}

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const nav = NAV_BY_ROLE[user?.role] || [];

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col border-r border-line bg-surface px-4 py-6">
        <div className="mb-8 flex items-center gap-2 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-clinical-500 text-sm font-bold text-white">
            C
          </div>
          <span className="text-base font-semibold tracking-tight">Clinicore</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {nav.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>
        <button
          onClick={handleLogout}
          className="mt-4 rounded-md px-3 py-2 text-left text-sm font-medium text-muted hover:bg-clinical-50/60 hover:text-ink"
        >
          Log out
        </button>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-line bg-surface px-6 py-3">
          <div className="text-sm text-muted">Clinicore Clinical Portal</div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">{user?.email}</span>
            <RoleBadge role={user?.role} />
          </div>
        </header>
        <main className="flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
