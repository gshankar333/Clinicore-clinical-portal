import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AppShell from "./components/AppShell";

import LoginPage from "./pages/LoginPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import AdminDoctorsPage from "./pages/AdminDoctorsPage";
import AdminDoctorProfilePage from "./pages/AdminDoctorProfilePage";
import AdminPatientsPage from "./pages/AdminPatientsPage";
import AdminAuditLogsPage from "./pages/AdminAuditLogsPage";
import AdminImportPage from "./pages/AdminImportPage";
import DoctorPatientsPage from "./pages/DoctorPatientsPage";
import DoctorSearchPage from "./pages/DoctorSearchPage";
import PatientDetailPage from "./pages/PatientDetailPage";


function RoleHome() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "admin") return <Navigate to="/admin" replace />;
  if (user.role === "doctor") return <Navigate to="/doctor" replace />;
  return <Navigate to="/login" replace />;
}

function Shell({ children }) {
  return <AppShell>{children}</AppShell>;
}

export default function App() {
  const { restoreSession } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    restoreSession().finally(() => setReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted">
        Loading…
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      {/* <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} /> */}
      <Route path="/" element={<RoleHome />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute allow={["admin"]}>
            <Shell>
              <AdminUsersPage />
            </Shell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/doctors"
        element={
          <ProtectedRoute allow={["admin"]}>
            <Shell>
              <AdminDoctorsPage />
            </Shell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/patients"
        element={
          <ProtectedRoute allow={["admin"]}>
            <Shell>
              <AdminPatientsPage />
            </Shell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/doctors/:id/patient/:patientId"
        element={
          <ProtectedRoute allow={["admin"]}>
            <Shell>
              <PatientDetailPage mainSegment="admin" />
            </Shell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/patient/:id"
        element={
          <ProtectedRoute allow={["admin"]}>
            <Shell>
              <PatientDetailPage mainSegment="admin" />
            </Shell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/doctors/:id"
        element={
          <ProtectedRoute allow={["admin"]}>
            <Shell>
              <AdminDoctorProfilePage />
            </Shell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/audit-logs"
        element={
          <ProtectedRoute allow={["admin"]}>
            <Shell>
              <AdminAuditLogsPage />
            </Shell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/import"
        element={
          <ProtectedRoute allow={["admin"]}>
            <Shell>
              <AdminImportPage />
            </Shell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/doctor"
        element={
          <ProtectedRoute allow={["doctor"]}>
            <Shell>
              <DoctorPatientsPage />
            </Shell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctor/search"
        element={
          <ProtectedRoute allow={["doctor"]}>
            <Shell>
              <DoctorSearchPage />
            </Shell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctor/patients/:id"
        element={
          <ProtectedRoute allow={["doctor"]}>
            <Shell>
              <PatientDetailPage mainSegment="doctor" />
            </Shell>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
