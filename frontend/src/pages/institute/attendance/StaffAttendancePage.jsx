import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Clock3,
  Download,
  FileSpreadsheet,
  Loader2,
  Save,
  Search,
  UsersRound
} from "lucide-react";
import { attendanceApi } from "../../../services/attendance";
import { RecordPagination } from "../../../components/common/RecordPagination";

const now = new Date();
const today = now.toISOString().slice(0, 10);
const statuses = ["PRESENT", "ABSENT", "LEAVE", "LATE", "HALF_DAY"];

function minutesToHours(minutes) {
  return (minutes / 60).toFixed(1);
}

function csvEscape(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function exportCsv(filename, headers, rows) {
  const csv = [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => row.map(csvEscape).join(","))
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function StaffAttendancePage() {
  const [activeView, setActiveView] = useState("daily");
  const [options, setOptions] = useState({ staff: [], roles: [] });

  const [dailyFilters, setDailyFilters] = useState({
    date: today,
    role: "",
    search: "",
    page: 1,
    limit: 10
  });

  const [monthlyFilters, setMonthlyFilters] = useState({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    role: "",
    search: "",
    page: 1,
    limit: 10
  });

  const [dailyData, setDailyData] = useState({
    records: [],
    pagination: { page: 1, limit: 10, totalRecords: 0, totalPages: 1 }
  });

  const [monthlyData, setMonthlyData] = useState({
    records: [],
    pagination: { page: 1, limit: 10, totalRecords: 0, totalPages: 1 }
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    attendanceApi.staffOptions().then(setOptions);
  }, []);

  useEffect(() => {
    if (activeView !== "daily") return;

    setLoading(true);

    attendanceApi.staffDaily(dailyFilters)
      .then(setDailyData)
      .finally(() => setLoading(false));
  }, [activeView, dailyFilters]);

  useEffect(() => {
    if (activeView !== "monthly") return;

    setLoading(true);

    attendanceApi.staffMonthlySummary(monthlyFilters)
      .then(setMonthlyData)
      .finally(() => setLoading(false));
  }, [activeView, monthlyFilters]);

  const dailySummary = useMemo(() => {
    const result = {
      total: dailyData.records.length,
      present: 0,
      absent: 0,
      leave: 0,
      late: 0,
      halfDay: 0
    };

    for (const record of dailyData.records) {
      const key = {
        PRESENT: "present",
        ABSENT: "absent",
        LEAVE: "leave",
        LATE: "late",
        HALF_DAY: "halfDay"
      }[record.attendanceStatus];

      if (key) result[key] += 1;
    }

    return result;
  }, [dailyData.records]);

  function updateDailyRecord(id, patch) {
    setDailyData((current) => ({
      ...current,
      records: current.records.map((record) =>
        record.id === id ? { ...record, ...patch } : record
      )
    }));
  }

  async function saveDaily() {
    setSaving(true);

    try {
      const response = await attendanceApi.saveStaffDaily({
        date: dailyFilters.date,
        records: dailyData.records.map((record) => ({
          staffId: record.id,
          status: record.attendanceStatus,
          checkIn: record.checkIn || null,
          checkOut: record.checkOut || null,
          remarks: record.remarks || null
        }))
      });

      setNotice(response.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="staff-attendance-page">
      <div className="attendance-enterprise-heading">
        <div>
          <span><UsersRound size={14} /> PHASE 4 — STAFF ATTENDANCE</span>
          <h2>Teachers and Staff Attendance</h2>
          <p>Manage check-in, check-out, attendance status, monthly summaries and payroll-ready data.</p>
        </div>
      </div>

      <div className="staff-attendance-tabs no-print">
        <button
          className={activeView === "daily" ? "active" : ""}
          onClick={() => setActiveView("daily")}
        >
          <Clock3 size={16} />
          Daily Attendance
        </button>

        <button
          className={activeView === "monthly" ? "active" : ""}
          onClick={() => setActiveView("monthly")}
        >
          <CalendarDays size={16} />
          Monthly Summary
        </button>
      </div>

      {notice && <div className="attendance-notice">{notice}</div>}

      {activeView === "daily" && (
        <>
          <section className="panel staff-attendance-filters no-print">
            <label>
              Date
              <input
                type="date"
                value={dailyFilters.date}
                onChange={(event) =>
                  setDailyFilters({ ...dailyFilters, date: event.target.value, page: 1 })
                }
              />
            </label>

            <label>
              Role
              <select
                value={dailyFilters.role}
                onChange={(event) =>
                  setDailyFilters({ ...dailyFilters, role: event.target.value, page: 1 })
                }
              >
                <option value="">All Roles</option>
                {options.roles.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </label>

            <label className="staff-search">
              Search
              <span>
                <Search size={15} />
                <input
                  value={dailyFilters.search}
                  onChange={(event) =>
                    setDailyFilters({ ...dailyFilters, search: event.target.value, page: 1 })
                  }
                />
              </span>
            </label>
          </section>

          <section className="staff-daily-kpis">
            {[
              ["Total", dailySummary.total],
              ["Present", dailySummary.present],
              ["Absent", dailySummary.absent],
              ["Leave", dailySummary.leave],
              ["Late", dailySummary.late],
              ["Half Day", dailySummary.halfDay]
            ].map(([label, value]) => (
              <article key={label}>
                <small>{label}</small>
                <strong>{value}</strong>
              </article>
            ))}
          </section>

          <section className="panel staff-attendance-table-panel">
            {loading ? (
              <div className="attendance-enterprise-loading">
                <Loader2 className="spin" />
                Loading staff attendance...
              </div>
            ) : (
              <div className="staff-attendance-table-wrap">
                <table className="staff-attendance-table">
                  <thead>
                    <tr>
                      <th>Staff Member</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Check-in</th>
                      <th>Check-out</th>
                      <th>Worked</th>
                      <th>Late</th>
                      <th>Overtime</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyData.records.map((record) => (
                      <tr key={record.id}>
                        <td>
                          <strong>{record.firstName} {record.lastName}</strong>
                          <small>{record.email}</small>
                        </td>
                        <td>{record.role}</td>
                        <td>
                          <select
                            value={record.attendanceStatus}
                            onChange={(event) =>
                              updateDailyRecord(record.id, {
                                attendanceStatus: event.target.value
                              })
                            }
                          >
                            {statuses.map((status) => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            type="time"
                            value={record.checkIn}
                            onChange={(event) =>
                              updateDailyRecord(record.id, { checkIn: event.target.value })
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="time"
                            value={record.checkOut}
                            onChange={(event) =>
                              updateDailyRecord(record.id, { checkOut: event.target.value })
                            }
                          />
                        </td>
                        <td>{minutesToHours(record.workedMinutes)}h</td>
                        <td>{record.lateMinutes}m</td>
                        <td>{minutesToHours(record.overtimeMinutes)}h</td>
                        <td>
                          <input
                            value={record.remarks}
                            onChange={(event) =>
                              updateDailyRecord(record.id, { remarks: event.target.value })
                            }
                            placeholder="Optional note"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <RecordPagination
              totalRecords={dailyData.pagination.totalRecords}
              page={dailyData.pagination.page}
              pageSize={dailyData.pagination.limit}
              onPageChange={(page) => setDailyFilters({ ...dailyFilters, page })}
              onPageSizeChange={(limit) =>
                setDailyFilters({ ...dailyFilters, limit, page: 1 })
              }
              label="staff records"
            />
          </section>

          <div className="enterprise-attendance-savebar">
            <div>
              <strong>{dailySummary.present} present of {dailySummary.total}</strong>
              <span>Save check-in, check-out and attendance status.</span>
            </div>

            <button
              className="primary"
              disabled={saving || !dailyData.records.length}
              onClick={saveDaily}
            >
              {saving ? <Loader2 className="spin" size={16} /> : <Save size={16} />}
              Save Staff Attendance
            </button>
          </div>
        </>
      )}

      {activeView === "monthly" && (
        <>
          <section className="panel staff-attendance-filters monthly no-print">
            <label>
              Month
              <select
                value={monthlyFilters.month}
                onChange={(event) =>
                  setMonthlyFilters({
                    ...monthlyFilters,
                    month: Number(event.target.value),
                    page: 1
                  })
                }
              >
                {Array.from({ length: 12 }, (_, index) => (
                  <option key={index + 1} value={index + 1}>
                    {new Date(Date.UTC(2026, index, 1)).toLocaleString("en-US", {
                      month: "long",
                      timeZone: "UTC"
                    })}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Year
              <select
                value={monthlyFilters.year}
                onChange={(event) =>
                  setMonthlyFilters({
                    ...monthlyFilters,
                    year: Number(event.target.value),
                    page: 1
                  })
                }
              >
                {[now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear()].map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </label>

            <label>
              Role
              <select
                value={monthlyFilters.role}
                onChange={(event) =>
                  setMonthlyFilters({
                    ...monthlyFilters,
                    role: event.target.value,
                    page: 1
                  })
                }
              >
                <option value="">All Roles</option>
                {options.roles.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </label>

            <label className="staff-search">
              Search
              <span>
                <Search size={15} />
                <input
                  value={monthlyFilters.search}
                  onChange={(event) =>
                    setMonthlyFilters({
                      ...monthlyFilters,
                      search: event.target.value,
                      page: 1
                    })
                  }
                />
              </span>
            </label>
          </section>

          <section className="panel staff-attendance-table-panel">
            <div className="staff-report-actions no-print">
              <button
                onClick={() =>
                  exportCsv(
                    `staff-attendance-${monthlyData.monthName || "month"}-${monthlyData.year || now.getFullYear()}.csv`,
                    [
                      "Staff",
                      "Email",
                      "Role",
                      "Present",
                      "Absent",
                      "Leave",
                      "Late",
                      "Half Day",
                      "Working Days",
                      "Payable Days",
                      "Worked Hours",
                      "Late Minutes",
                      "Overtime Hours",
                      "Attendance Percentage"
                    ],
                    monthlyData.records.map((record) => [
                      `${record.firstName} ${record.lastName}`,
                      record.email,
                      record.role,
                      record.present,
                      record.absent,
                      record.leave,
                      record.late,
                      record.halfDay,
                      record.workingDays,
                      record.payableDays,
                      minutesToHours(record.workedMinutes),
                      record.lateMinutes,
                      minutesToHours(record.overtimeMinutes),
                      `${record.attendancePercentage}%`
                    ])
                  )
                }
              >
                <Download size={15} />
                Export Payroll CSV
              </button>

              <button onClick={() => window.print()}>
                <FileSpreadsheet size={15} />
                Print / PDF
              </button>
            </div>

            {loading ? (
              <div className="attendance-enterprise-loading">
                <Loader2 className="spin" />
                Loading monthly staff summary...
              </div>
            ) : (
              <div className="staff-attendance-table-wrap">
                <table className="staff-attendance-table payroll-ready-table">
                  <thead>
                    <tr>
                      <th>Staff Member</th>
                      <th>Role</th>
                      <th>Present</th>
                      <th>Absent</th>
                      <th>Leave</th>
                      <th>Late</th>
                      <th>Half Day</th>
                      <th>Working Days</th>
                      <th>Payable Days</th>
                      <th>Worked Hours</th>
                      <th>Late Minutes</th>
                      <th>Overtime</th>
                      <th>Attendance %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyData.records.map((record) => (
                      <tr key={record.id}>
                        <td>
                          <strong>{record.firstName} {record.lastName}</strong>
                          <small>{record.email}</small>
                        </td>
                        <td>{record.role}</td>
                        <td>{record.present}</td>
                        <td>{record.absent}</td>
                        <td>{record.leave}</td>
                        <td>{record.late}</td>
                        <td>{record.halfDay}</td>
                        <td>{record.workingDays}</td>
                        <td><strong>{record.payableDays}</strong></td>
                        <td>{minutesToHours(record.workedMinutes)}h</td>
                        <td>{record.lateMinutes}m</td>
                        <td>{minutesToHours(record.overtimeMinutes)}h</td>
                        <td><strong>{record.attendancePercentage}%</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <RecordPagination
              totalRecords={monthlyData.pagination.totalRecords}
              page={monthlyData.pagination.page}
              pageSize={monthlyData.pagination.limit}
              onPageChange={(page) =>
                setMonthlyFilters({ ...monthlyFilters, page })
              }
              onPageSizeChange={(limit) =>
                setMonthlyFilters({ ...monthlyFilters, limit, page: 1 })
              }
              label="staff records"
            />
          </section>
        </>
      )}
    </div>
  );
}

export default StaffAttendancePage;
