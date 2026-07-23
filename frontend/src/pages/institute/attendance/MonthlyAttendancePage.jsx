import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Loader2, Printer, Search } from "lucide-react";
import { attendanceApi } from "../../../services/attendance";

import { RecordPagination } from "../../../components/common/RecordPagination";
const now = new Date();
const currentYear = now.getFullYear();
const currentMonthIndex = now.getMonth();

const meta = {
  PRESENT: ["P", "monthly-present"],
  ABSENT: ["A", "monthly-absent"],
  LEAVE: ["L", "monthly-leave"],
  LATE: ["LT", "monthly-late"],
  UNMARKED: ["—", "monthly-unmarked"]
};

function calendarDays(year, monthIndex) {
  const total = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  return Array.from({ length: total }, (_, index) => {
    const day = index + 1;
    return {
      day,
      date: `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      weekday: new Date(Date.UTC(year, monthIndex, day)).toLocaleDateString("en-US", {
        weekday: "short",
        timeZone: "UTC"
      })
    };
  });
}

export function MonthlyAttendancePage({ initialSelection = {}, onOpenDaily }) {
  const [options, setOptions] = useState({ classes: [], sectionsByClass: {} });
  const [filters, setFilters] = useState({
    className: initialSelection.className || "",
    section: initialSelection.section || "",
    year: currentYear,
    monthIndex: currentMonthIndex
  });
  const [data, setData] = useState({ months: [], students: [] });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    attendanceApi.options().then((result) => {
      setOptions(result);
      setFilters((current) => ({
        ...current,
        className: current.className || result.classes?.[0] || ""
      }));
    });
  }, []);

  useEffect(() => {
    if (!filters.className) return;
    setLoading(true);
    attendanceApi
      .annual({
        className: filters.className,
        section: filters.section,
        year: filters.year
      })
      .then(setData)
      .finally(() => setLoading(false));
  }, [filters.className, filters.section, filters.year]);

  const days = useMemo(
    () => calendarDays(filters.year, filters.monthIndex),
    [filters.year, filters.monthIndex]
  );

  const month = data.months?.[filters.monthIndex];

  const students = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return data.students || [];
    return (data.students || []).filter((student) =>
      `${student.studentId} ${student.rollNo || ""} ${student.firstName} ${student.lastName}`
        .toLowerCase()
        .includes(term)
    );
  }, [data.students, search]);


  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  const totalPages = Math.max(1, Math.ceil(students.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const paginatedRecords = students.slice(pageStart, pageStart + pageSize);

  const sections = options.sectionsByClass?.[filters.className] || [];

  return (
    <div className="monthly-management-page">
      <div className="attendance-enterprise-heading">
        <div>
          <span><CalendarDays size={14} /> MONTHLY ATTENDANCE MANAGEMENT</span>
          <h2>Monthly Attendance Register</h2>
          <p>Review every calendar day and open any date directly in Daily Attendance for correction.</p>
        </div>
        <button className="secondary" onClick={() => window.print()}>
          <Printer size={16} /> Print Register
        </button>
      </div>

      <section className="panel monthly-management-filters">
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
          Month
          <select
            value={filters.monthIndex}
            onChange={(event) =>
              setFilters({ ...filters, monthIndex: Number(event.target.value) })
            }
          >
            {Array.from({ length: 12 }, (_, index) => (
              <option key={index} value={index}>
                {new Date(Date.UTC(filters.year, index, 1)).toLocaleString("en-US", {
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
            value={filters.year}
            onChange={(event) =>
              setFilters({ ...filters, year: Number(event.target.value) })
            }
          >
            {[currentYear - 2, currentYear - 1, currentYear].map((year) => (
              <option key={year}>{year}</option>
            ))}
          </select>
        </label>

        <label className="monthly-management-search">
          Search
          <span><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} /></span>
        </label>
      </section>

      <div className="monthly-management-legend">
        {Object.entries(meta).map(([status, [code, className]]) => (
          <span key={status}><i className={className}>{code}</i>{status}</span>
        ))}
      </div>

      {loading ? (
        <div className="panel attendance-enterprise-loading"><Loader2 className="spin" />Loading monthly register...</div>
      ) : (
        <section className="panel monthly-management-table-panel">
          <div className="monthly-management-table-wrap">
            <table className="monthly-management-table">
              <thead>
                <tr>
                  <th className="monthly-fixed-roll">Roll</th>
                  <th className="monthly-fixed-student">Student</th>
                  {days.map((day) => (
                    <th
                      key={day.date}
                      className={day.weekday === "Sat" || day.weekday === "Sun" ? "weekend" : ""}
                      onClick={() =>
                        onOpenDaily({
                          className: filters.className,
                          section: filters.section,
                          date: day.date
                        })
                      }
                      title="Open this date in Daily Attendance"
                    >
                      <strong>{day.day}</strong><small>{day.weekday}</small>
                    </th>
                  ))}
                  <th className="monthly-fixed-total">P/W</th>
                </tr>
              </thead>

              <tbody>
                {paginatedRecords.map((student) => {
                  const studentMonth = student.months[filters.monthIndex];
                  const dayMap = new Map(
                    (studentMonth?.dailyRecords || []).map((item) => [item.date, item])
                  );

                  return (
                    <tr key={student.id}>
                      <td className="monthly-fixed-roll">{student.rollNo || "—"}</td>
                      <td className="monthly-fixed-student">
                        <strong>{student.firstName} {student.lastName}</strong>
                        <small>{student.studentId}</small>
                      </td>

                      {days.map((day) => {
                        const status = dayMap.get(day.date)?.status || "UNMARKED";
                        const [code, className] = meta[status];

                        return (
                          <td
                            key={day.date}
                            className={day.weekday === "Sat" || day.weekday === "Sun" ? "weekend" : ""}
                          >
                            <button
                              className={`monthly-management-cell ${className}`}
                              onClick={() =>
                                onOpenDaily({
                                  className: filters.className,
                                  section: filters.section,
                                  date: day.date
                                })
                              }
                              title={`${status} — click to manage ${day.date}`}
                            >
                              {code}
                            </button>
                          </td>
                        );
                      })}

                      <td className="monthly-fixed-total">
                        <strong>{studentMonth?.presentDays || 0}/{studentMonth?.workingDays || 0}</strong>
                        <small>{studentMonth?.percentage || 0}%</small>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <RecordPagination
        totalRecords={students.length}
        page={safePage}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        label="students"
      />

    </div>
  );
}

export default MonthlyAttendancePage;
