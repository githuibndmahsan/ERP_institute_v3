import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CalendarRange,
  Download,
  Loader2,
  Printer,
  Search
} from "lucide-react";
import { attendanceApi } from "../../../services/attendance";

import { RecordPagination } from "../../../components/common/RecordPagination";
const currentYear = new Date().getFullYear();

const statusMeta = {
  PRESENT: {
    code: "P",
    label: "Present",
    className: "monthly-present"
  },
  ABSENT: {
    code: "A",
    label: "Absent",
    className: "monthly-absent"
  },
  LEAVE: {
    code: "L",
    label: "Leave",
    className: "monthly-leave"
  },
  LATE: {
    code: "LT",
    label: "Late",
    className: "monthly-late"
  },
  UNMARKED: {
    code: "—",
    label: "Not marked",
    className: "monthly-unmarked"
  }
};

function monthDateValues(year, monthIndex) {
  const totalDays = new Date(
    Date.UTC(year, monthIndex + 1, 0)
  ).getUTCDate();

  return Array.from({ length: totalDays }, (_, offset) => {
    const day = offset + 1;

    return {
      day,
      value: `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(
        day
      ).padStart(2, "0")}`,
      weekday: new Date(
        Date.UTC(year, monthIndex, day)
      ).toLocaleDateString("en-US", {
        weekday: "short",
        timeZone: "UTC"
      })
    };
  });
}

function isWeekend(weekday) {
  return weekday === "Sat" || weekday === "Sun";
}

export function AnnualAttendancePage() {
  const [options, setOptions] = useState({
    classes: [],
    sectionsByClass: {}
  });

  const [filters, setFilters] = useState({
    className: "",
    section: "",
    year: currentYear
  });

  const [data, setData] = useState({
    months: [],
    students: [],
    currentMonthIndex: null
  });

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    attendanceApi.options()
      .then((result) => {
        setOptions(result);

        setFilters((current) => ({
          ...current,
          className:
            current.className ||
            result.classes?.[0] ||
            ""
        }));
      })
      .catch(() => {
        setError("Unable to load classes.");
      });
  }, []);

  useEffect(() => {
    if (!filters.className) return;

    setLoading(true);

    attendanceApi.annual(filters)
      .then((result) => {
        setData(result);
        setError("");
      })
      .catch((requestError) => {
        setError(
          requestError.response?.data?.message ||
            "Unable to load annual attendance."
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [
    filters.className,
    filters.section,
    filters.year
  ]);

  const students = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return data.students || [];
    }

    return (data.students || []).filter((student) =>
      [
        student.studentId,
        student.rollNo,
        student.firstName,
        student.lastName
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLowerCase()
            .includes(term)
        )
    );
  }, [data.students, search]);


  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  const totalPages = Math.max(1, Math.ceil(students.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const paginatedRecords = students.slice(pageStart, pageStart + pageSize);

  const currentMonth =
    data.currentMonthIndex !== null
      ? data.months?.[data.currentMonthIndex]
      : null;

  const calendarDays = useMemo(() => {
    if (
      data.currentMonthIndex === null ||
      data.currentMonthIndex === undefined
    ) {
      return [];
    }

    return monthDateValues(
      filters.year,
      data.currentMonthIndex
    );
  }, [
    filters.year,
    data.currentMonthIndex
  ]);

  const previousMonths = (data.months || []).filter(
    (month) =>
      month.completed &&
      !month.isCurrentMonth &&
      month.workingDays > 0
  );

  const completedDateSet = useMemo(
    () => new Set(currentMonth?.dates || []),
    [currentMonth]
  );

  const sections =
    options.sectionsByClass?.[filters.className] || [];

  function printRegister() {
    document.title =
      `${filters.className}-${filters.section || "All"}-${filters.year}-Attendance`;

    window.print();
  }

  return (
    <div className="annual-attendance-page">
      <div className="annual-attendance-heading">
        <div>
          <span>
            <CalendarRange size={14} />
            ANNUAL ATTENDANCE REGISTER
          </span>

          <h2>Yearly Student Attendance</h2>

          <p>
            Current month displays all 28–31 calendar days.
            Previous months display Present Days / Working Days.
          </p>
        </div>

        <div className="annual-attendance-actions no-print">
          <button
            className="secondary"
            onClick={printRegister}
          >
            <Printer size={16} />
            Print
          </button>

          <button
            className="secondary"
            onClick={printRegister}
          >
            <Download size={16} />
            Save PDF
          </button>
        </div>
      </div>

      {error && (
        <div className="attendance-notice annual-error">
          {error}
        </div>
      )}

      <section className="panel annual-filter-grid no-print">
        <label>
          Class
          <select
            value={filters.className}
            onChange={(event) =>
              setFilters({
                ...filters,
                className: event.target.value,
                section: ""
              })
            }
          >
            {options.classes.map((className) => (
              <option
                key={className}
                value={className}
              >
                {className}
              </option>
            ))}
          </select>
        </label>

        <label>
          Section
          <select
            value={filters.section}
            onChange={(event) =>
              setFilters({
                ...filters,
                section: event.target.value
              })
            }
          >
            <option value="">All Sections</option>

            {sections.map((section) => (
              <option
                key={section}
                value={section}
              >
                {section}
              </option>
            ))}
          </select>
        </label>

        <label>
          Academic Year
          <select
            value={filters.year}
            onChange={(event) =>
              setFilters({
                ...filters,
                year: Number(event.target.value)
              })
            }
          >
            {[
              currentYear - 2,
              currentYear - 1,
              currentYear
            ].map((year) => (
              <option
                key={year}
                value={year}
              >
                {year}
              </option>
            ))}
          </select>
        </label>

        <label className="annual-search">
          Search Student
          <span>
            <Search size={15} />

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Name, ID or roll no."
            />
          </span>
        </label>
      </section>

      {loading ? (
        <div className="panel annual-loading">
          <Loader2 className="spin" />
          Loading annual attendance...
        </div>
      ) : (
        <>
          <section className="panel current-month-register enterprise-monthly-register">
            <div className="annual-section-title">
              <div>
                <span>CURRENT MONTH</span>

                <h3>
                  {currentMonth?.monthName ||
                    "Current Month"}{" "}
                  Complete Attendance Matrix
                </h3>
              </div>

              <div className="monthly-register-summary">
                <span>
                  <CalendarDays size={14} />
                  {calendarDays.length} calendar days
                </span>

                <span>
                  {currentMonth?.workingDays || 0} marked working days
                </span>
              </div>
            </div>

            <div className="monthly-attendance-legend">
              {Object.entries(statusMeta).map(
                ([status, meta]) => (
                  <span key={status}>
                    <i className={meta.className}>
                      {meta.code}
                    </i>
                    {meta.label}
                  </span>
                )
              )}
            </div>

            {calendarDays.length === 0 ? (
              <div className="annual-empty">
                Current month is unavailable for the selected year.
              </div>
            ) : (
              <div className="monthly-matrix-wrap">
                <table className="monthly-matrix-table">
                  <thead>
                    <tr>
                      <th className="monthly-roll-column">
                        Roll
                      </th>

                      <th className="monthly-student-column">
                        Student
                      </th>

                      {calendarDays.map((date) => (
                        <th
                          key={date.value}
                          className={
                            isWeekend(date.weekday)
                              ? "monthly-weekend-column"
                              : ""
                          }
                        >
                          <strong>{date.day}</strong>
                          <small>{date.weekday}</small>
                        </th>
                      ))}

                      <th className="monthly-total-column">
                        P/W
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {paginatedRecords.map((student) => {
                      const month =
                        student.months[
                          currentMonth.monthIndex
                        ];

                      const dayMap = new Map(
                        (month.dailyRecords || []).map(
                          (item) => [
                            item.date,
                            item
                          ]
                        )
                      );

                      return (
                        <tr key={student.id}>
                          <td className="monthly-roll-column">
                            {student.rollNo || "—"}
                          </td>

                          <td className="monthly-student-column">
                            <strong>
                              {student.firstName}{" "}
                              {student.lastName}
                            </strong>

                            <small>
                              {student.studentId}
                            </small>
                          </td>

                          {calendarDays.map((date) => {
                            const record =
                              dayMap.get(date.value);

                            const status =
                              record?.status ||
                              "UNMARKED";

                            const meta =
                              statusMeta[status];

                            const marked =
                              completedDateSet.has(
                                date.value
                              );

                            return (
                              <td
                                key={date.value}
                                className={
                                  isWeekend(date.weekday)
                                    ? "monthly-weekend-column"
                                    : ""
                                }
                              >
                                <label
                                  className={`monthly-checkbox-cell ${meta.className} ${
                                    marked
                                      ? "monthly-marked"
                                      : ""
                                  }`}
                                  title={
                                    record?.remarks ||
                                    `${meta.label} — ${date.value}`
                                  }
                                >
                                  <input
                                    type="checkbox"
                                    checked={
                                      status ===
                                      "PRESENT"
                                    }
                                    readOnly
                                    aria-label={`${student.firstName} ${student.lastName}, ${date.value}, ${meta.label}`}
                                  />

                                  <span>
                                    {meta.code}
                                  </span>
                                </label>
                              </td>
                            );
                          })}

                          <td className="monthly-total-column">
                            <strong>
                              {month.presentDays}/
                              {month.workingDays}
                            </strong>

                            <small>
                              {month.percentage}%
                            </small>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="panel annual-summary-register">
            <div className="annual-section-title">
              <div>
                <span>PREVIOUS MONTHS</span>
                <h3>Monthly Attendance Totals</h3>
              </div>

              <small>
                Present Days / Working Days
              </small>
            </div>

            {previousMonths.length === 0 ? (
              <div className="annual-empty">
                No completed previous-month attendance available.
              </div>
            ) : (
              <div className="annual-table-wrap">
                <table className="annual-summary-table">
                  <thead>
                    <tr>
                      <th>Roll</th>
                      <th>Student</th>

                      {previousMonths.map((month) => (
                        <th key={month.monthIndex}>
                          {month.monthName.slice(
                            0,
                            3
                          )}

                          <small>
                            {month.workingDays} days
                          </small>
                        </th>
                      ))}

                      <th>Total</th>
                    </tr>
                  </thead>

                  <tbody>
                    {students.map((student) => {
                      const totals =
                        previousMonths.reduce(
                          (sum, month) => {
                            const item =
                              student.months[
                                month.monthIndex
                              ];

                            sum.present +=
                              item.presentDays;

                            sum.working +=
                              item.workingDays;

                            return sum;
                          },
                          {
                            present: 0,
                            working: 0
                          }
                        );

                      return (
                        <tr key={student.id}>
                          <td>
                            {student.rollNo || "—"}
                          </td>

                          <td>
                            <strong>
                              {student.firstName}{" "}
                              {student.lastName}
                            </strong>

                            <small>
                              {student.studentId}
                            </small>
                          </td>

                          {previousMonths.map(
                            (month) => {
                              const item =
                                student.months[
                                  month.monthIndex
                                ];

                              return (
                                <td
                                  key={
                                    month.monthIndex
                                  }
                                >
                                  <span className="annual-total-chip">
                                    {
                                      item.presentDays
                                    }
                                    /
                                    {
                                      item.workingDays
                                    }
                                  </span>

                                  <small>
                                    {item.percentage}%
                                  </small>
                                </td>
                              );
                            }
                          )}

                          <td>
                            <strong>
                              {totals.present}/
                              {totals.working}
                            </strong>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
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

export default AnnualAttendancePage;
