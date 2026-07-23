import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCw,
  Save,
  Search,
  ShieldCheck
} from "lucide-react";
import { attendanceApi } from "../../../services/attendance";

import { RecordPagination } from "../../../components/common/RecordPagination";
const statuses = ["PRESENT", "ABSENT", "LEAVE", "LATE"];
const today = new Date().toISOString().slice(0, 10);

export function AttendancePage({ initialSelection = {} }) {
  const [options, setOptions] = useState({ classes: [], sectionsByClass: {} });
  const [filters, setFilters] = useState({
    className: initialSelection.className || "",
    section: initialSelection.section || "",
    date: initialSelection.date || today
  });
  const [records, setRecords] = useState([]);
  const [session, setSession] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [savingMode, setSavingMode] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    attendanceApi.options()
      .then((data) => {
        setOptions(data);
        setFilters((current) => ({
          ...current,
          className: current.className || data.classes?.[0] || ""
        }));
      })
      .catch(() => setError("Unable to load class options."));
  }, []);

  async function loadAttendance() {
    if (!filters.className || !filters.date) return;

    setLoading(true);
    try {
      const data = await attendanceApi.daily(filters);
      setRecords(data.records || []);
      setSession(data.session || null);
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load attendance.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAttendance();
  }, [filters.className, filters.section, filters.date]);

  const summary = useMemo(() => {
    const result = { TOTAL: records.length, PRESENT: 0, ABSENT: 0, LEAVE: 0, LATE: 0 };
    records.forEach((record) => {
      result[record.attendanceStatus] += 1;
    });
    return result;
  }, [records]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return records;
    return records.filter((record) =>
      `${record.studentId} ${record.firstName} ${record.lastName} ${record.rollNo || ""}`
        .toLowerCase()
        .includes(term)
    );
  }, [records, search]);


  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const paginatedRecords = visible.slice(pageStart, pageStart + pageSize);

  const sections = options.sectionsByClass?.[filters.className] || [];

  function changeStatus(id, status) {
    setRecords((current) =>
      current.map((record) =>
        record.id === id ? { ...record, attendanceStatus: status } : record
      )
    );
  }

  function markAll(status) {
    setRecords((current) =>
      current.map((record) => ({ ...record, attendanceStatus: status }))
    );
  }

  async function save(complete) {
    if (!records.length) return;
    setSavingMode(complete ? "complete" : "draft");

    try {
      const response = await attendanceApi.save({
        ...filters,
        complete,
        records: records.map((record) => ({
          studentId: record.id,
          status: record.attendanceStatus,
          remarks: record.remarks || null
        }))
      });

      setNotice(response.message);
      setSession({ status: complete ? "COMPLETED" : "DRAFT" });
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to save attendance.");
    } finally {
      setSavingMode("");
    }
  }

  return (
    <div className="daily-enterprise-attendance">
      <div className="attendance-enterprise-heading">
        <div>
          <span><ShieldCheck size={14} /> DAILY ATTENDANCE WORKSPACE</span>
          <h2>Daily Student Attendance</h2>
          <p>Capture, review, save as draft, and complete a class attendance session.</p>
        </div>

        <b className={`attendance-session-pill ${session?.status === "COMPLETED" ? "complete" : "draft"}`}>
          {session?.status === "COMPLETED" ? <CheckCircle2 size={15} /> : <Clock3 size={15} />}
          {session?.status || "NOT STARTED"}
        </b>
      </div>

      {notice && <div className="attendance-notice">{notice}</div>}
      {error && <div className="attendance-notice attendance-error"><AlertCircle size={16} />{error}</div>}

      <section className="panel enterprise-attendance-filters daily-filter-grid">
        <label>
          Class
          <select
            value={filters.className}
            onChange={(event) =>
              setFilters({ ...filters, className: event.target.value, section: "" })
            }
          >
            {options.classes.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>

        <label>
          Section
          <select
            value={filters.section}
            onChange={(event) => setFilters({ ...filters, section: event.target.value })}
          >
            <option value="">All Sections</option>
            {sections.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>

        <label>
          Attendance Date
          <input
            type="date"
            value={filters.date}
            onChange={(event) => setFilters({ ...filters, date: event.target.value })}
          />
        </label>

        <button className="secondary" onClick={loadAttendance}>
          <RefreshCw size={16} /> Refresh
        </button>
      </section>

      <section className="daily-attendance-kpis">
        {Object.entries(summary).map(([label, value]) => (
          <article key={label} className={label.toLowerCase()}>
            <small>{label}</small>
            <strong>{value}</strong>
          </article>
        ))}
      </section>

      <section className="panel daily-attendance-toolbar">
        <label>
          <Search size={16} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search student..."
          />
        </label>

        <div>
          <button onClick={() => markAll("PRESENT")}>Mark All Present</button>
          <button onClick={() => markAll("ABSENT")}>Mark All Absent</button>
        </div>
      </section>

      <section className="panel daily-enterprise-table-panel">
        {loading ? (
          <div className="attendance-enterprise-loading"><Loader2 className="spin" />Loading roster...</div>
        ) : visible.length === 0 ? (
          <div className="attendance-enterprise-loading">No students found.</div>
        ) : (
          <div className="daily-enterprise-table-wrap">
            <table className="daily-enterprise-table">
              <thead>
                <tr>
                  <th>Roll</th>
                  <th>Student</th>
                  <th>Student ID</th>
                  <th>Attendance Status</th>
                  <th>Remarks / Reason</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRecords.map((record) => (
                  <tr key={record.id}>
                    <td>{record.rollNo || "—"}</td>
                    <td><strong>{record.firstName} {record.lastName}</strong></td>
                    <td>{record.studentId}</td>
                    <td>
                      <div className="enterprise-status-selector">
                        {statuses.map((status) => (
                          <button
                            key={status}
                            className={record.attendanceStatus === status ? `active ${status.toLowerCase()}` : ""}
                            onClick={() => changeStatus(record.id, status)}
                          >
                            {record.attendanceStatus === status && <Check size={12} />}
                            {status}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td>
                      <input
                        value={record.remarks || ""}
                        onChange={(event) =>
                          setRecords((current) =>
                            current.map((item) =>
                              item.id === record.id
                                ? { ...item, remarks: event.target.value }
                                : item
                            )
                          )
                        }
                        placeholder="Optional note or absence reason"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>


      <RecordPagination
        totalRecords={visible.length}
        page={safePage}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        label="students"
      />

      <div className="enterprise-attendance-savebar">
        <div>
          <strong>{summary.PRESENT} present of {summary.TOTAL}</strong>
          <span>Complete only after reviewing all exceptions.</span>
        </div>

        <div>
          <button
            className="secondary"
            disabled={Boolean(savingMode) || !records.length}
            onClick={() => save(false)}
          >
            {savingMode === "draft" ? <Loader2 className="spin" size={16} /> : <Save size={16} />}
            Save Draft
          </button>

          <button
            className="primary"
            disabled={Boolean(savingMode) || !records.length}
            onClick={() => save(true)}
          >
            {savingMode === "complete" ? <Loader2 className="spin" size={16} /> : <CheckCircle2 size={16} />}
            Complete Attendance
          </button>
        </div>
      </div>
    </div>
  );
}

export default AttendancePage;
