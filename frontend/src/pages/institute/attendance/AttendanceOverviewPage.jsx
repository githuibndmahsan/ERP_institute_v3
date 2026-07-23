import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  Loader2,
  TrendingUp,
  UserMinus,
  Users
} from "lucide-react";
import { attendanceApi } from "../../../services/attendance";

const now = new Date();
const year = now.getFullYear();

export function AttendanceOverviewPage({ onOpenDaily, onOpenMonthly }) {
  const [options, setOptions] = useState({ classes: [], sectionsByClass: {} });
  const [className, setClassName] = useState("");
  const [section, setSection] = useState("");
  const [data, setData] = useState({ months: [], students: [], currentMonthIndex: null });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    attendanceApi.options().then((result) => {
      setOptions(result);
      setClassName(result.classes?.[0] || "");
    });
  }, []);

  useEffect(() => {
    if (!className) return;
    setLoading(true);
    attendanceApi
      .annual({ className, section, year })
      .then(setData)
      .finally(() => setLoading(false));
  }, [className, section]);

  const currentMonth =
    data.currentMonthIndex !== null ? data.months?.[data.currentMonthIndex] : null;

  const metrics = useMemo(() => {
    const result = {
      students: data.students?.length || 0,
      workingDays: currentMonth?.workingDays || 0,
      present: 0,
      absent: 0,
      leave: 0,
      late: 0,
      lowAttendance: 0
    };

    if (!currentMonth) return result;

    for (const student of data.students || []) {
      const month = student.months[currentMonth.monthIndex];
      result.present += month.presentDays;
      result.absent += month.absentDays;
      result.leave += month.leaveDays;
      result.late += month.lateDays;
      if (month.workingDays > 0 && month.percentage < 75) result.lowAttendance += 1;
    }

    return result;
  }, [data, currentMonth]);

  const totalMarks =
    metrics.present + metrics.absent + metrics.leave + metrics.late;

  const attendanceRate = totalMarks
    ? ((metrics.present / totalMarks) * 100).toFixed(1)
    : "0.0";

  const sections = options.sectionsByClass?.[className] || [];

  return (
    <div className="attendance-overview-page">
      <div className="attendance-enterprise-heading">
        <div>
          <span><BarChart3 size={14} /> ATTENDANCE CONTROL CENTER</span>
          <h2>Attendance Overview</h2>
          <p>Monitor completion, attendance rate, exceptions, and low-attendance risks.</p>
        </div>

        <div className="attendance-overview-actions">
          <button className="secondary" onClick={() => onOpenMonthly({ className, section })}>
            <TrendingUp size={16} /> Monthly Register
          </button>
          <button className="primary" onClick={() => onOpenDaily({ className, section })}>
            <CalendarCheck2 size={16} /> Take Attendance
          </button>
        </div>
      </div>

      <section className="panel enterprise-attendance-filters">
        <label>
          Class
          <select
            value={className}
            onChange={(event) => {
              setClassName(event.target.value);
              setSection("");
            }}
          >
            {options.classes.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>

        <label>
          Section
          <select value={section} onChange={(event) => setSection(event.target.value)}>
            <option value="">All Sections</option>
            {sections.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>

        <label>
          Academic Year
          <select value={year} disabled>
            <option>{year}</option>
          </select>
        </label>
      </section>

      {loading ? (
        <div className="panel attendance-enterprise-loading">
          <Loader2 className="spin" /> Loading attendance intelligence...
        </div>
      ) : (
        <>
          <section className="attendance-enterprise-kpis">
            <article>
              <span><Users size={18} /></span>
              <div><small>Students</small><strong>{metrics.students}</strong></div>
            </article>
            <article className="success">
              <span><CheckCircle2 size={18} /></span>
              <div><small>Attendance Rate</small><strong>{attendanceRate}%</strong></div>
            </article>
            <article>
              <span><CalendarCheck2 size={18} /></span>
              <div><small>Working Days</small><strong>{metrics.workingDays}</strong></div>
            </article>
            <article className="danger">
              <span><UserMinus size={18} /></span>
              <div><small>Absences</small><strong>{metrics.absent}</strong></div>
            </article>
            <article className="warning">
              <span><AlertTriangle size={18} /></span>
              <div><small>Below 75%</small><strong>{metrics.lowAttendance}</strong></div>
            </article>
          </section>

          <section className="attendance-overview-grid">
            <article className="panel attendance-status-breakdown">
              <div className="attendance-card-title">
                <div><span>MONTH STATUS</span><h3>{currentMonth?.monthName || "Current Month"}</h3></div>
              </div>

              <div className="attendance-breakdown-list">
                {[
                  ["Present", metrics.present, "present"],
                  ["Absent", metrics.absent, "absent"],
                  ["Leave", metrics.leave, "leave"],
                  ["Late", metrics.late, "late"]
                ].map(([label, value, className]) => (
                  <div key={label}>
                    <span><i className={className} />{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel attendance-control-checklist">
              <div className="attendance-card-title">
                <div><span>CONTROL CHECKS</span><h3>Operational Readiness</h3></div>
              </div>

              <div className="attendance-check-list">
                <p><CheckCircle2 size={15} /> Daily attendance is tenant-isolated.</p>
                <p><CheckCircle2 size={15} /> Completed days feed monthly and annual reports.</p>
                <p><Clock3 size={15} /> Draft days remain editable until completion.</p>
                <p><AlertTriangle size={15} /> Low attendance is flagged below 75%.</p>
              </div>
            </article>
          </section>
        </>
      )}
    </div>
  );
}

export default AttendanceOverviewPage;
