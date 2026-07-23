import { Navigate, Route, Routes } from "react-router-dom";
import { ReportsPage } from "./pages/admin/ReportsPage";
import { UsersPermissionsPage } from "./pages/admin/UsersPermissionsPage";
import { LoginPage } from "./pages/LoginPage";
import { AppLayout } from "./components/AppLayout";
import { RoleRoute } from "./components/RoleRoute";
import { SuperAdminDashboard } from "./pages/admin/SuperAdminDashboard";
import { InstitutionsPage } from "./pages/admin/InstitutionsPage";
import { InstitutionProfilePage } from "./pages/admin/InstitutionProfilePage";
import { PlaceholderAdmin } from "./pages/admin/PlaceholderAdmin";
import { ClientCRMPage } from "./pages/admin/ClientCRMPage";
import { BillingPage } from "./pages/admin/BillingPage";
import { InstituteDashboard } from "./pages/institute/InstituteDashboard";
import { ModulePlaceholder } from "./pages/institute/ModulePlaceholder";
import { PlatformSettingsPage } from "./pages/super-admin/settings/PlatformSettingsPage";
import { StudentsPage } from "./pages/institute/students/StudentsPage";
import { StudentProfilePage } from "./pages/institute/students/StudentProfilePage";
import { AttendanceModulePage } from "./pages/institute/attendance/AttendanceModulePage";
import ExamSchemeBuilderPage from "./pages/institute/exams/ExamSchemeBuilderPage";
import ExamsResultsPage from "./pages/institute/exams/ExamsResultsPage";
import WebsiteStudioPage from "./pages/institute/settings/WebsiteStudioPage";
import InstitutionLandingPage from "./pages/public-site/InstitutionLandingPage";
import { useAuth } from "./context/AuthContext";

const instituteRoles = [
  "INSTITUTE_ADMIN",
  "TEACHER",
  "ACCOUNTANT",
  "STAFF"
];

export default function App() {
  const { user } = useAuth();

  const homePath = user
    ? user.role === "SUPER_ADMIN"
      ? "/super-admin"
      : "/dashboard"
    : "/login";

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/site/:institutionCode"
        element={<InstitutionLandingPage />}
      />

      <Route
        element={
          <RoleRoute roles={["SUPER_ADMIN"]}>
            <AppLayout />
          </RoleRoute>
        }
      >
        <Route path="/super-admin" element={<SuperAdminDashboard />} />
        <Route
          path="/super-admin/institutions"
          element={<InstitutionsPage />}
        />
        <Route
          path="/super-admin/institutions/:id"
          element={<InstitutionProfilePage />}
        />
        <Route path="/super-admin/billing" element={<BillingPage />} />
        <Route path="/super-admin/crm" element={<ClientCRMPage />} />
        <Route
          path="/super-admin/users"
          element={<UsersPermissionsPage />}
        />
        <Route path="/super-admin/reports" element={<ReportsPage />} />
        <Route
          path="/super-admin/settings"
          element={<PlatformSettingsPage />}
        />
      </Route>

      <Route
        element={
          <RoleRoute roles={instituteRoles}>
            <AppLayout />
          </RoleRoute>
        }
      >
        <Route path="/dashboard" element={<InstituteDashboard />} />
        <Route path="/students" element={<StudentsPage />} />
        <Route path="/students/:id" element={<StudentProfilePage />} />
        <Route path="/attendance" element={<AttendanceModulePage />} />
        <Route
          path="/fees"
          element={<ModulePlaceholder title="Fees" />}
        />
        <Route path="/exams" element={<ExamsResultsPage />} />
        <Route
          path="/exams/schemes"
          element={<ExamSchemeBuilderPage />}
        />
        <Route
          path="/result-cards"
          element={<ModulePlaceholder title="Result Cards" />}
        />
        <Route
          path="/ptm"
          element={<ModulePlaceholder title="PTM Schedules" />}
        />
        <Route
          path="/settings/website"
          element={<WebsiteStudioPage />}
        />
        <Route
          path="/website"
          element={<Navigate to="/settings/website" replace />}
        />
        <Route
          path="/website-studio"
          element={<Navigate to="/settings/website" replace />}
        />
        <Route
          path="/users"
          element={<ModulePlaceholder title="Users & Permissions" />}
        />
        <Route
          path="/settings"
          element={<ModulePlaceholder title="Settings" />}
        />
      </Route>

      <Route path="/" element={<Navigate to={homePath} replace />} />
      <Route path="*" element={<Navigate to={homePath} replace />} />
    </Routes>
  );
}
