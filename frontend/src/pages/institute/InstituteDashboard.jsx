import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Megaphone,
  RefreshCw,
  School,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  WalletCards
} from "lucide-react";
import { api } from "../../services/api";

const fallback = {
  institution: {
    name: "Demo International School",
    code: "DIS",
    status: "ACTIVE",
    city: "Lahore",
    country: "Pakistan"
  },
  students: {
    total: 1248,
    active: 1186,
    pending: 34,
    newThisMonth: 28
  },
  attendance: {
    present: 1129,
    absent: 57,
    leave: 22,
    percentage: 93.4
  },
  fees: {
    collectedToday: 185000,
    collectedMonth: 3285000,
    outstanding: 865000,
    recoveryRate: 79.2
  },
  staff: {
    total: 96,
    present: 89,
    absent: 7
  },
  exams: {
    upcoming: 4,
    nextExam: "Mid Term Examination",
    nextExamDate: "2026-08-03"
  }
};

function money(value) {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function number(value) {
  return new Intl.NumberFormat("en-PK").format(Number(value || 0));
}

function percentage(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function safeDate(value) {
  if (!value) return "Not scheduled";
  return new Date(value).toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function MetricCard({
  label,
  value,
  note,
  icon: Icon,
  trend,
  tone = "blue"
}) {
  return (
    <article className={`smart-metric-card smart-tone-${tone}`}>
      <div className="smart-metric-top">
        <span className="smart-metric-icon">
          <Icon size={21} />
        </span>
        {trend && (
          <span
            className={`smart-trend ${
              trend.startsWith("-") ? "negative" : "positive"
            }`}
          >
            {trend.startsWith("-") ? (
              <TrendingDown size={13} />
            ) : (
              <TrendingUp size={13} />
            )}
            {trend}
          </span>
        )}
      </div>

      <strong>{value}</strong>
      <span>{label}</span>
      <small>{note}</small>
    </article>
  );
}

function ProgressBar({ value, label, detail }) {
  const safeValue = Math.max(0, Math.min(100, Number(value || 0)));

  return (
    <div className="smart-progress-item">
      <div>
        <strong>{label}</strong>
        <span>{detail}</span>
      </div>

      <div className="smart-progress-track">
        <span style={{ width: `${safeValue}%` }} />
      </div>

      <b>{percentage(safeValue)}</b>
    </div>
  );
}

export function InstituteDashboard() {
  const [dashboard, setDashboard] = useState(fallback);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [error, setError] = useState("");

  async function loadDashboard() {
    setLoading(true);

    try {
      const response = await api.get("/institute/dashboard");
      const source = response.data?.data || response.data || {};

      setDashboard({
        institution: {
          ...fallback.institution,
          ...(source.institution || {})
        },
        students: {
          ...fallback.students,
          ...(source.students || {})
        },
        attendance: {
          ...fallback.attendance,
          ...(source.attendance || {})
        },
        fees: {
          ...fallback.fees,
          ...(source.fees || source.finance || {})
        },
        staff: {
          ...fallback.staff,
          ...(source.staff || source.teachers || {})
        },
        exams: {
          ...fallback.exams,
          ...(source.exams || {})
        }
      });

      setError("");
      setLastUpdated(new Date());
    } catch (requestError) {
      setDashboard(fallback);
      setError(
        requestError.response?.data?.message ||
          "Live dashboard data is unavailable. Showing demo metrics."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const absentStudents =
    Number(dashboard.attendance.absent || 0) +
    Number(dashboard.attendance.leave || 0);

  const alerts = useMemo(
    () => [
      {
        type: "warning",
        icon: AlertTriangle,
        title: `${number(dashboard.students.pending)} admissions pending`,
        body: "Review documents and approve pending student applications.",
        link: "/students?status=PENDING"
      },
      {
        type: "danger",
        icon: CircleDollarSign,
        title: `${money(dashboard.fees.outstanding)} outstanding fees`,
        body: "Generate defaulter list and start fee recovery follow-up.",
        link: "/fees"
      },
      {
        type: "warning",
        icon: UserCheck,
        title: `${number(absentStudents)} students not present today`,
        body: "Review absent and leave records before closing attendance.",
        link: "/attendance"
      }
    ],
    [dashboard, absentStudents]
  );

  const tasks = [
    {
      title: "Complete daily attendance",
      module: "Attendance",
      due: "Today",
      status: "In progress",
      link: "/attendance"
    },
    {
      title: "Review pending admissions",
      module: "Students",
      due: "Today",
      status: "Pending",
      link: "/students?status=PENDING"
    },
    {
      title: "Prepare monthly fee report",
      module: "Fees",
      due: "Tomorrow",
      status: "Pending",
      link: "/fees"
    },
    {
      title: "Publish examination schedule",
      module: "Exams",
      due: "This week",
      status: "Draft",
      link: "/exams"
    }
  ];

  const quickActions = [
    {
      label: "Add Student",
      note: "Create new admission",
      icon: UserPlus,
      link: "/students"
    },
    {
      label: "Take Attendance",
      note: "Mark class attendance",
      icon: ClipboardCheck,
      link: "/attendance"
    },
    {
      label: "Collect Fee",
      note: "Receive student payment",
      icon: WalletCards,
      link: "/fees"
    },
    {
      label: "Enter Marks",
      note: "Update examination results",
      icon: BookOpenCheck,
      link: "/exams"
    },
    {
      label: "Create Notice",
      note: "Publish announcement",
      icon: Megaphone,
      link: "/settings/website"
    },
    {
      label: "Open Reports",
      note: "View institute analytics",
      icon: BarChart3,
      link: "/reports"
    }
  ];

  const modules = [
    {
      label: "Students",
      value: number(dashboard.students.total),
      detail: `${number(dashboard.students.active)} active`,
      icon: GraduationCap,
      link: "/students"
    },
    {
      label: "Teachers & Staff",
      value: number(dashboard.staff.total),
      detail: `${number(dashboard.staff.present)} present today`,
      icon: Users,
      link: "/users"
    },
    {
      label: "Attendance",
      value: percentage(dashboard.attendance.percentage),
      detail: "Today's attendance rate",
      icon: UserCheck,
      link: "/attendance"
    },
    {
      label: "Fees",
      value: money(dashboard.fees.collectedMonth),
      detail: "Collected this month",
      icon: CircleDollarSign,
      link: "/fees"
    },
    {
      label: "Exams",
      value: number(dashboard.exams.upcoming),
      detail: "Upcoming examinations",
      icon: FileText,
      link: "/exams"
    },
    {
      label: "Settings",
      value: "Manage",
      detail: "Institute configuration",
      icon: Settings,
      link: "/settings"
    }
  ];

  return (
    <div className="page smart-institute-dashboard">
      <section className="smart-dashboard-hero">
        <div className="smart-dashboard-heading">
          <span className="smart-dashboard-eyebrow">
            <Sparkles size={14} />
            INSTITUTE ADMIN COMMAND CENTER
          </span>

          <h1>
            Welcome back to {dashboard.institution.name}
          </h1>

          <p>
            Monitor daily operations, attendance, fee recovery, pending work
            and academic activity from one smart dashboard.
          </p>

          <div className="smart-institute-meta">
            <span>
              <School size={15} />
              {dashboard.institution.code}
            </span>

            <span>
              <ShieldCheck size={15} />
              {dashboard.institution.status}
            </span>

            <span>
              <Clock3 size={15} />
              Updated {lastUpdated.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit"
              })}
            </span>
          </div>
        </div>

        <div className="smart-dashboard-actions">
          <label className="smart-dashboard-search">
            <Search size={17} />
            <input placeholder="Search students, fees, staff..." />
          </label>

          <button className="smart-icon-button" aria-label="Notifications">
            <Bell size={18} />
            <span>3</span>
          </button>

          <button
            className="smart-refresh-button"
            onClick={loadDashboard}
            disabled={loading}
          >
            <RefreshCw
              size={17}
              className={loading ? "smart-spinning" : ""}
            />
            Refresh
          </button>
        </div>
      </section>

      {error && (
        <div className="smart-dashboard-warning">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      <section className="smart-metric-grid">
        <MetricCard
          label="Total Students"
          value={number(dashboard.students.total)}
          note={`${number(dashboard.students.newThisMonth)} new this month`}
          icon={GraduationCap}
          trend="+4.8%"
          tone="blue"
        />

        <MetricCard
          label="Today's Attendance"
          value={percentage(dashboard.attendance.percentage)}
          note={`${number(dashboard.attendance.present)} present`}
          icon={UserCheck}
          trend="+1.6%"
          tone="green"
        />

        <MetricCard
          label="Collected Today"
          value={money(dashboard.fees.collectedToday)}
          note={`${percentage(dashboard.fees.recoveryRate)} recovery rate`}
          icon={CircleDollarSign}
          trend="+8.2%"
          tone="purple"
        />

        <MetricCard
          label="Staff Present"
          value={`${number(dashboard.staff.present)}/${number(
            dashboard.staff.total
          )}`}
          note={`${number(dashboard.staff.absent)} absent today`}
          icon={Users}
          trend="-1.1%"
          tone="orange"
        />
      </section>

      <section className="smart-dashboard-main-grid">
        <div className="smart-dashboard-primary-column">
          <section className="panel smart-section">
            <div className="smart-section-heading">
              <div>
                <span>DAILY OPERATIONS</span>
                <h2>Today at a glance</h2>
              </div>

              <Link to="/reports">
                View reports
                <ArrowRight size={15} />
              </Link>
            </div>

            <div className="smart-progress-list">
              <ProgressBar
                value={dashboard.attendance.percentage}
                label="Student attendance"
                detail={`${number(dashboard.attendance.present)} present · ${number(
                  dashboard.attendance.absent
                )} absent`}
              />

              <ProgressBar
                value={dashboard.fees.recoveryRate}
                label="Fee recovery"
                detail={`${money(
                  dashboard.fees.collectedMonth
                )} collected this month`}
              />

              <ProgressBar
                value={
                  dashboard.staff.total
                    ? (dashboard.staff.present / dashboard.staff.total) * 100
                    : 0
                }
                label="Staff attendance"
                detail={`${number(dashboard.staff.present)} of ${number(
                  dashboard.staff.total
                )} present`}
              />
            </div>
          </section>

          <section className="panel smart-section">
            <div className="smart-section-heading">
              <div>
                <span>QUICK ACTIONS</span>
                <h2>Common tasks</h2>
              </div>
            </div>

            <div className="smart-quick-action-grid">
              {quickActions.map(({ label, note, icon: Icon, link }) => (
                <Link key={label} to={link} className="smart-quick-action">
                  <span>
                    <Icon size={19} />
                  </span>
                  <div>
                    <strong>{label}</strong>
                    <small>{note}</small>
                  </div>
                  <ArrowRight size={15} />
                </Link>
              ))}
            </div>
          </section>

          <section className="panel smart-section">
            <div className="smart-section-heading">
              <div>
                <span>MODULE STATUS</span>
                <h2>Institute operations</h2>
              </div>
            </div>

            <div className="smart-module-grid">
              {modules.map(({ label, value, detail, icon: Icon, link }) => (
                <Link key={label} to={link} className="smart-module-card">
                  <span className="smart-module-icon">
                    <Icon size={19} />
                  </span>
                  <div>
                    <span>{label}</span>
                    <strong>{value}</strong>
                    <small>{detail}</small>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>

        <aside className="smart-dashboard-side-column">
          <section className="panel smart-section">
            <div className="smart-section-heading">
              <div>
                <span>SMART ALERTS</span>
                <h2>Needs attention</h2>
              </div>

              <span className="smart-alert-count">{alerts.length}</span>
            </div>

            <div className="smart-alert-list">
              {alerts.map(({ type, icon: Icon, title, body, link }) => (
                <Link
                  key={title}
                  to={link}
                  className={`smart-alert-item smart-alert-${type}`}
                >
                  <span>
                    <Icon size={17} />
                  </span>

                  <div>
                    <strong>{title}</strong>
                    <p>{body}</p>
                  </div>

                  <ArrowRight size={15} />
                </Link>
              ))}
            </div>
          </section>

          <section className="panel smart-section">
            <div className="smart-section-heading">
              <div>
                <span>TASK CENTER</span>
                <h2>Pending work</h2>
              </div>
            </div>

            <div className="smart-task-list">
              {tasks.map((task) => (
                <Link key={task.title} to={task.link} className="smart-task-item">
                  <span className="smart-task-check">
                    <CheckCircle2 size={17} />
                  </span>

                  <div>
                    <strong>{task.title}</strong>
                    <small>
                      {task.module} · {task.due}
                    </small>
                  </div>

                  <span className="smart-task-status">{task.status}</span>
                </Link>
              ))}
            </div>
          </section>

          <section className="panel smart-next-exam-card">
            <span className="smart-next-exam-icon">
              <CalendarDays size={22} />
            </span>

            <div>
              <span>NEXT EXAMINATION</span>
              <h3>{dashboard.exams.nextExam}</h3>
              <p>{safeDate(dashboard.exams.nextExamDate)}</p>
              <Link to="/exams">
                Open examinations
                <ArrowRight size={15} />
              </Link>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
