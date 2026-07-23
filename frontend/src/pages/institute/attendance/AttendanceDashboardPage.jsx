import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  UserMinus,
  Users
} from "lucide-react";
import { attendanceApi } from "../../../services/attendance";
import { RecordPagination } from "../../../components/common/RecordPagination";

const today = new Date().toISOString().slice(0, 10);

export function AttendanceDashboardPage({ onOpenDaily }) {
  const [date, setDate] = useState(today);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [absentPage, setAbsentPage] = useState(1);
  const [absentLimit, setAbsentLimit] = useState(10);
  const [classSearch, setClassSearch] = useState("");
  const [classPage, setClassPage] = useState(1);
  const [classPageSize, setClassPageSize] = useState(10);
  const [alertPage, setAlertPage] = useState(1);
  const [alertPageSize, setAlertPageSize] = useState(10);
  const [alertThreshold, setAlertThreshold] = useState(75);
  const [error, setError] = useState("");

  async function loadDashboard() {
    setLoading(true);
    try {
      const result = await attendanceApi.dashboard({
        date,
        alertThreshold,
        absentPage,
        absentLimit
      });
      setData(result);
      setError("");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to load attendance dashboard."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, [date, alertThreshold, absentPage, absentLimit]);

  useEffect(() => {
    setAbsentPage(1);
  }, [date, absentLimit]);

  const visibleClasses = useMemo(() => {
    const term = classSearch.trim().toLowerCase();
    if (!term) return data?.classSummary || [];
    return (data?.classSummary || []).filter((item) =>
      `${item.className} ${item.section || ""}`.toLowerCase().includes(term)
    );
  }, [data?.classSummary, classSearch]);

  useEffect(() => {
    setClassPage(1);
  }, [classSearch, classPageSize, date]);

  useEffect(() => {
    setAlertPage(1);
  }, [alertThreshold, alertPageSize, date]);

  const classTotalPages = Math.max(
    1,
    Math.ceil(visibleClasses.length / classPageSize)
  );

  const safeClassPage = Math.min(
    classPage,
    classTotalPages
  );

  const classPageStart =
    (safeClassPage - 1) * classPageSize;

  const paginatedClasses = visibleClasses.slice(
    classPageStart,
    classPageStart + classPageSize
  );

  const lowAttendanceAlerts =
    data?.lowAttendanceAlerts || [];

  const alertTotalPages = Math.max(
    1,
    Math.ceil(
      lowAttendanceAlerts.length /
        alertPageSize
    )
  );

  const safeAlertPage = Math.min(
    alertPage,
    alertTotalPages
  );

  const alertPageStart =
    (safeAlertPage - 1) * alertPageSize;

  const paginatedAlerts =
    lowAttendanceAlerts.slice(
      alertPageStart,
      alertPageStart + alertPageSize
    );

  const totals = data?.totals || {
    totalStudents: 0,
    present: 0,
    absent: 0,
    leave: 0,
    late: 0,
    unmarked: 0,
    attendancePercentage: 0
  };

  const status = data?.sessionStatus || {
    totalClasses: 0,
    completed: 0,
    draft: 0,
    pending: 0
  };

  const absentPagination = data?.absentStudents?.pagination || {
    page: 1,
    limit: absentLimit,
    totalRecords: 0,
    totalPages: 1
  };

  return (
    <div className="phase2-attendance-dashboard">
      <div className="attendance-enterprise-heading">
        <div>
          <span><CalendarCheck2 size={14} /> PHASE 2 — ATTENDANCE DASHBOARD</span>
          <h2>Daily Attendance Dashboard</h2>
          <p>Institution-wide status, class completion, absences and low-attendance alerts.</p>
        </div>

        <div className="attendance-dashboard-controls no-print">
          <label>
            Dashboard Date
            <input
              type="date"
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                setAbsentPage(1);
              }}
            />
          </label>

          <button className="secondary" onClick={loadDashboard}>
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="attendance-notice attendance-error">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {loading && !data ? (
        <div className="panel attendance-enterprise-loading">
          <Loader2 className="spin" /> Loading attendance dashboard...
        </div>
      ) : (
        <>
          <section className="phase2-kpi-grid">
            {[
              ["Total Students", totals.totalStudents, "", Users],
              ["Present", totals.present, "present", CheckCircle2],
              ["Absent", totals.absent, "absent", UserMinus],
              ["Leave", totals.leave, "leave", Clock3],
              ["Late", totals.late, "late", Clock3],
              ["Attendance %", `${totals.attendancePercentage}%`, "rate", CalendarCheck2]
            ].map(([label, value, className, Icon]) => (
              <article key={label} className={className}>
                <span><Icon size={18} /></span>
                <div><small>{label}</small><strong>{value}</strong></div>
              </article>
            ))}
          </section>

          <section className="phase2-status-grid">
            <article className="panel phase2-completion-card">
              <div className="phase2-card-heading">
                <div><span>DAILY STATUS</span><h3>Attendance Completion</h3></div>
              </div>

              <div className="phase2-session-status">
                <div className="completed"><CheckCircle2 size={17} /><span>Completed</span><strong>{status.completed}</strong></div>
                <div className="draft"><Clock3 size={17} /><span>Draft</span><strong>{status.draft}</strong></div>
                <div className="pending"><AlertTriangle size={17} /><span>Pending</span><strong>{status.pending}</strong></div>
              </div>

              <div className="phase2-progress">
                <span style={{ width: `${status.totalClasses ? (status.completed / status.totalClasses) * 100 : 0}%` }} />
                <small>{status.completed} of {status.totalClasses} classes completed</small>
              </div>
            </article>

            <article className="panel phase2-unmarked-card">
              <div className="phase2-card-heading">
                <div><span>UNMARKED</span><h3>Students Awaiting Attendance</h3></div>
              </div>
              <strong>{totals.unmarked}</strong>
              <p>Students belonging to classes whose attendance is not yet completed.</p>
            </article>
          </section>

          <section className="panel phase2-class-summary">
            <div className="phase2-section-toolbar">
              <div><span>CLASS-WISE SUMMARY</span><h3>Attendance by Class and Section</h3></div>
              <label className="phase2-search no-print">
                <Search size={15} />
                <input value={classSearch} onChange={(event) => setClassSearch(event.target.value)} placeholder="Search class..." />
              </label>
            </div>

            <div className="phase2-table-wrap">
              <table className="phase2-table">
                <thead>
                  <tr>
                    <th>Class</th><th>Total</th><th>Present</th><th>Absent</th><th>Leave</th><th>Late</th><th>Attendance</th><th>Status</th><th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedClasses.map((item) => (
                    <tr key={`${item.className}-${item.section}`}>
                      <td><strong>{item.className}</strong><small>{item.section || "All Sections"}</small></td>
                      <td>{item.totalStudents}</td>
                      <td className="phase2-text-present">{item.present}</td>
                      <td className="phase2-text-absent">{item.absent}</td>
                      <td>{item.leave}</td>
                      <td>{item.late}</td>
                      <td><strong>{item.attendancePercentage}%</strong></td>
                      <td><span className={`phase2-status-badge ${item.status.toLowerCase()}`}>{item.status}</span></td>
                      <td>
                        <button
                          className="phase2-manage-button"
                          onClick={() => onOpenDaily({ className: item.className, section: item.section, date })}
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <RecordPagination
              totalRecords={visibleClasses.length}
              page={safeClassPage}
              pageSize={classPageSize}
              onPageChange={setClassPage}
              onPageSizeChange={(size) => {
                setClassPageSize(size);
                setClassPage(1);
              }}
              label="classes"
            />
          </section>

          <section className="phase2-bottom-grid">
            <article className="panel phase2-alerts-card">
              <div className="phase2-section-toolbar">
                <div><span>EARLY WARNING</span><h3>Low Attendance Alerts</h3></div>
                <label className="phase2-threshold no-print">
                  Below
                  <select value={alertThreshold} onChange={(event) => setAlertThreshold(Number(event.target.value))}>
                    {[60, 70, 75, 80, 85].map((value) => <option key={value} value={value}>{value}%</option>)}
                  </select>
                </label>
              </div>

              <div className="phase2-alert-list">
                {(data?.lowAttendanceAlerts || []).length === 0 ? (
                  <div className="phase2-empty">No low-attendance alerts.</div>
                ) : (
                  paginatedAlerts.map((student) => (
                    <div key={student.id}>
                      <span className="phase2-alert-icon"><ShieldAlert size={15} /></span>
                      <div>
                        <strong>{student.firstName} {student.lastName}</strong>
                        <small>{student.className} {student.section || ""} · {student.presentDays}/{student.workingDays} days</small>
                      </div>
                      <b>{student.percentage}%</b>
                    </div>
                  ))
                )}
              </div>

              <RecordPagination
                totalRecords={lowAttendanceAlerts.length}
                page={safeAlertPage}
                pageSize={alertPageSize}
                onPageChange={setAlertPage}
                onPageSizeChange={(size) => {
                  setAlertPageSize(size);
                  setAlertPage(1);
                }}
                label="alerts"
              />
            </article>

            <article className="panel phase2-absent-card">
              <div className="phase2-section-toolbar">
                <div><span>ABSENT STUDENTS</span><h3>Today’s Absence List</h3></div>
              </div>

              <div className="phase2-absent-list">
                {(data?.absentStudents?.records || []).length === 0 ? (
                  <div className="phase2-empty">No absent students for this date.</div>
                ) : (
                  data.absentStudents.records.map((student) => (
                    <div key={student.id}>
                      <span className="phase2-absent-avatar">{student.firstName?.[0]}{student.lastName?.[0]}</span>
                      <div>
                        <strong>{student.firstName} {student.lastName}</strong>
                        <small>{student.className} {student.section || ""} · Roll {student.rollNo || "—"}</small>
                      </div>
                      <span className="phase2-absent-reason">{student.remarks || "No reason"}</span>
                    </div>
                  ))
                )}
              </div>

              <RecordPagination
                totalRecords={absentPagination.totalRecords}
                page={absentPagination.page}
                pageSize={absentPagination.limit}
                onPageChange={setAbsentPage}
                onPageSizeChange={(size) => {
                  setAbsentLimit(size);
                  setAbsentPage(1);
                }}
                label="absent students"
              />
            </article>
          </section>
        </>
      )}
    </div>
  );
}

export default AttendanceDashboardPage;
