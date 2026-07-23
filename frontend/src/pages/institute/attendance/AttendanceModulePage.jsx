import { useState } from "react";
import {
  BarChart3,
  CalendarCheck2,
  CalendarDays,
  CalendarRange,
  FileSpreadsheet,
  UsersRound
} from "lucide-react";

import { AttendanceErrorBoundary } from "./AttendanceErrorBoundary";
import { AttendanceDashboardPage } from "./AttendanceDashboardPage";
import { AttendancePage } from "./AttendancePage";
import { MonthlyAttendancePage } from "./MonthlyAttendancePage";
import { AnnualAttendancePage } from "./AnnualAttendancePage";
import { AttendanceReportsPage } from "./AttendanceReportsPage";
import { StaffAttendancePage } from "./StaffAttendancePage";

const tabs = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: BarChart3
  },
  {
    id: "daily",
    label: "Daily",
    icon: CalendarCheck2
  },
  {
    id: "monthly",
    label: "Monthly",
    icon: CalendarDays
  },
  {
    id: "annual",
    label: "Annual",
    icon: CalendarRange
  },
  {
    id: "reports",
    label: "History & Reports",
    icon: FileSpreadsheet
  }
];

function AttendanceModuleContent() {
  const [activeTab, setActiveTab] =
    useState("dashboard");

  const [selection, setSelection] =
    useState({});

  function openDaily(next = {}) {
    setSelection(next);
    setActiveTab("daily");
  }

  return (
    <div className="page enterprise-attendance-module">
      <div className="enterprise-attendance-tabs no-print">
        {tabs.map((tab) => {
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              className={
                activeTab === tab.id
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveTab(tab.id)
              }
            >
              <Icon size={17} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "dashboard" && (
        <AttendanceDashboardPage
          onOpenDaily={openDaily}
        />
      )}

      {activeTab === "daily" && (
        <AttendancePage
          key={[
            selection.className || "",
            selection.section || "",
            selection.date || ""
          ].join("-")}
          initialSelection={selection}
        />
      )}

      {activeTab === "monthly" && (
        <MonthlyAttendancePage
          initialSelection={selection}
          onOpenDaily={openDaily}
        />
      )}

      {activeTab === "annual" && (
        <AnnualAttendancePage />
      )}

      {activeTab === "reports" && (
        <AttendanceReportsPage />
      )}

      {activeTab === "staff" && (
        <StaffAttendancePage />
      )}
    </div>
  );
}

export function AttendanceModulePage() {
  return (
    <AttendanceErrorBoundary>
      <AttendanceModuleContent />
    </AttendanceErrorBoundary>
  );
}

export default AttendanceModulePage;
