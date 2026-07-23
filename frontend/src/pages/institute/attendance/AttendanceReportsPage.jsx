import { useEffect, useState } from "react";
import {
  CalendarRange,
  Download,
  FileSpreadsheet,
  Loader2,
  Printer,
  Search,
  UserRoundSearch
} from "lucide-react";
import { attendanceApi } from "../../../services/attendance";
import { RecordPagination } from "../../../components/common/RecordPagination";

const now = new Date();
const today = now.toISOString().slice(0, 10);
const currentYear = now.getFullYear();
const monthStart =
  `${currentYear}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

function csvEscape(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function downloadText(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function exportCsv(filename, headers, rows) {
  const content = [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => row.map(csvEscape).join(","))
  ].join("\n");

  downloadText(filename, content, "text/csv;charset=utf-8");
}

function exportExcel(filename, title, headers, rows) {
  const html = `
    <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <h2>${title}</h2>
        <table border="1">
          <thead>
            <tr>${headers.map((item) => `<th>${item}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (row) =>
                  `<tr>${row
                    .map((item) => `<td>${item ?? ""}</td>`)
                    .join("")}</tr>`
              )
              .join("")}
          </tbody>
        </table>
      </body>
    </html>
  `;

  downloadText(filename, html, "application/vnd.ms-excel");
}

function statusCode(status) {
  return {
    PRESENT: "P",
    ABSENT: "A",
    LEAVE: "L",
    LATE: "LT"
  }[status] || "—";
}

export function AttendanceReportsPage() {
  const [activeReport, setActiveReport] = useState("student");
  const [options, setOptions] = useState({
    classes: [],
    sectionsByClass: {}
  });

  const [studentFilters, setStudentFilters] = useState({
    studentId: "",
    dateFrom: monthStart,
    dateTo: today,
    page: 1,
    limit: 10
  });

  const [classFilters, setClassFilters] = useState({
    className: "",
    section: "",
    year: currentYear,
    month: now.getMonth() + 1,
    page: 1,
    limit: 10
  });

  const [rangeFilters, setRangeFilters] = useState({
    className: "",
    section: "",
    dateFrom: monthStart,
    dateTo: today,
    page: 1,
    limit: 10
  });

  const [studentData, setStudentData] = useState(null);
  const [classData, setClassData] = useState(null);
  const [rangeData, setRangeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    attendanceApi.options()
      .then((result) => {
        const safeResult = result || {
          classes: [],
          sectionsByClass: {}
        };

        setOptions(safeResult);

        const firstClass =
          safeResult.classes?.[0] || "";

        setClassFilters((current) => ({
          ...current,
          className: current.className || firstClass
        }));
      })
      .catch((requestError) => {
        setError(
          requestError.response?.data?.message ||
            "Unable to load attendance options."
        );
      });
  }, []);

  async function loadStudentHistory(filters = studentFilters) {
    if (!filters.studentId.trim()) {
      setError("Enter Student ID or admission number.");
      return;
    }

    setLoading(true);

    try {
      const result =
        await attendanceApi.studentHistory(filters);

      setStudentData({
        student: result?.student || {},
        summary: result?.summary || {
          workingDays: 0,
          present: 0,
          absent: 0,
          leave: 0,
          late: 0,
          percentage: 0
        },
        records: result?.records || [],
        exportRecords:
          result?.exportRecords ||
          result?.records ||
          [],
        pagination: result?.pagination || {
          page: filters.page,
          limit: filters.limit,
          totalRecords: 0,
          totalPages: 1
        }
      });

      setError("");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to load student history."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadClassRegister(filters = classFilters) {
    if (!filters.className) return;

    setLoading(true);

    try {
      const result =
        await attendanceApi.classRegister(filters);

      setClassData({
        ...result,
        days: result?.days || [],
        records: result?.records || [],
        pagination: result?.pagination || {
          page: filters.page,
          limit: filters.limit,
          totalRecords: 0,
          totalPages: 1
        }
      });

      setError("");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to load class register."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadRangeReport(filters = rangeFilters) {
    setLoading(true);

    try {
      const result =
        await attendanceApi.dateRangeReport(filters);

      setRangeData({
        ...result,
        records: result?.records || [],
        pagination: result?.pagination || {
          page: filters.page,
          limit: filters.limit,
          totalRecords: 0,
          totalPages: 1
        }
      });

      setError("");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to load date-range report."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (
      activeReport === "class" &&
      classFilters.className
    ) {
      loadClassRegister(classFilters);
    }
  }, [
    activeReport,
    classFilters.className,
    classFilters.section,
    classFilters.year,
    classFilters.month,
    classFilters.page,
    classFilters.limit
  ]);

  useEffect(() => {
    if (activeReport === "range") {
      loadRangeReport(rangeFilters);
    }
  }, [
    activeReport,
    rangeFilters.className,
    rangeFilters.section,
    rangeFilters.dateFrom,
    rangeFilters.dateTo,
    rangeFilters.page,
    rangeFilters.limit
  ]);

  const classSections =
    options.sectionsByClass?.[
      classFilters.className
    ] || [];

  const rangeSections =
    options.sectionsByClass?.[
      rangeFilters.className
    ] || [];

  const tabs = [
    ["student", "Student History", UserRoundSearch],
    ["class", "Class Monthly Register", FileSpreadsheet],
    ["range", "Date Range Report", CalendarRange]
  ];

  return (
    <div className="attendance-reports-page">
      <div className="attendance-enterprise-heading">
        <div>
          <span>
            <FileSpreadsheet size={14} />
            PHASE 3 — HISTORY & REPORTS
          </span>

          <h2>Attendance History and Reports</h2>

          <p>
            Historical records, monthly registers,
            exports and printable reports.
          </p>
        </div>
      </div>

      <div className="attendance-report-tabs no-print">
        {tabs.map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            className={
              activeReport === id ? "active" : ""
            }
            onClick={() => setActiveReport(id)}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="attendance-notice attendance-error">
          {error}
        </div>
      )}

      {activeReport === "student" && (
        <section className="attendance-report-workspace">
          <div className="panel attendance-report-filters no-print">
            <label>
              Student ID / Admission No.
              <span className="report-search-input">
                <Search size={15} />

                <input
                  value={studentFilters.studentId}
                  onChange={(event) =>
                    setStudentFilters({
                      ...studentFilters,
                      studentId: event.target.value,
                      page: 1
                    })
                  }
                />
              </span>
            </label>

            <label>
              Date From
              <input
                type="date"
                value={studentFilters.dateFrom}
                onChange={(event) =>
                  setStudentFilters({
                    ...studentFilters,
                    dateFrom: event.target.value,
                    page: 1
                  })
                }
              />
            </label>

            <label>
              Date To
              <input
                type="date"
                value={studentFilters.dateTo}
                onChange={(event) =>
                  setStudentFilters({
                    ...studentFilters,
                    dateTo: event.target.value,
                    page: 1
                  })
                }
              />
            </label>

            <button
              className="primary"
              type="button"
              onClick={() =>
                loadStudentHistory(studentFilters)
              }
            >
              Search History
            </button>
          </div>

          {loading ? (
            <div className="panel attendance-enterprise-loading">
              <Loader2 className="spin" />
              Loading report...
            </div>
          ) : studentData ? (
            <>
              <section className="report-student-summary">
                <article>
                  <small>Student</small>
                  <strong>
                    {studentData.student.firstName || "—"}{" "}
                    {studentData.student.lastName || ""}
                  </strong>
                  <span>
                    {studentData.student.studentId || "—"}
                  </span>
                </article>

                <article>
                  <small>Working Days</small>
                  <strong>
                    {studentData.summary.workingDays}
                  </strong>
                </article>

                <article>
                  <small>Present</small>
                  <strong>
                    {studentData.summary.present}
                  </strong>
                </article>

                <article>
                  <small>Absent</small>
                  <strong>
                    {studentData.summary.absent}
                  </strong>
                </article>

                <article>
                  <small>Attendance</small>
                  <strong>
                    {studentData.summary.percentage}%
                  </strong>
                </article>
              </section>

              <section className="panel attendance-report-table-panel">
                <div className="report-action-bar no-print">
                  <div>
                    <button
                      type="button"
                      onClick={() =>
                        exportCsv(
                          `student-attendance-${studentData.student.studentId || "report"}.csv`,
                          [
                            "Date",
                            "Class",
                            "Section",
                            "Status",
                            "Session",
                            "Remarks"
                          ],
                          studentData.exportRecords.map(
                            (item) => [
                              item.date,
                              item.className,
                              item.section,
                              item.status,
                              item.sessionStatus,
                              item.remarks
                            ]
                          )
                        )
                      }
                    >
                      <Download size={15} />
                      CSV
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        exportExcel(
                          `student-attendance-${studentData.student.studentId || "report"}.xls`,
                          "Student Attendance History",
                          [
                            "Date",
                            "Class",
                            "Section",
                            "Status",
                            "Session",
                            "Remarks"
                          ],
                          studentData.exportRecords.map(
                            (item) => [
                              item.date,
                              item.className,
                              item.section,
                              item.status,
                              item.sessionStatus,
                              item.remarks
                            ]
                          )
                        )
                      }
                    >
                      <FileSpreadsheet size={15} />
                      Excel
                    </button>

                    <button
                      type="button"
                      onClick={() => window.print()}
                    >
                      <Printer size={15} />
                      Print / PDF
                    </button>
                  </div>
                </div>

                <div className="phase2-table-wrap">
                  <table className="phase2-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Class</th>
                        <th>Section</th>
                        <th>Status</th>
                        <th>Session</th>
                        <th>Remarks</th>
                      </tr>
                    </thead>

                    <tbody>
                      {studentData.records.map(
                        (item, index) => (
                          <tr
                            key={`${item.date}-${index}`}
                          >
                            <td>{item.date}</td>
                            <td>{item.className}</td>
                            <td>
                              {item.section || "—"}
                            </td>
                            <td>
                              <span
                                className={`report-status ${String(
                                  item.status
                                ).toLowerCase()}`}
                              >
                                {item.status}
                              </span>
                            </td>
                            <td>
                              {item.sessionStatus}
                            </td>
                            <td>
                              {item.remarks || "—"}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>

                <RecordPagination
                  totalRecords={
                    studentData.pagination.totalRecords
                  }
                  page={
                    studentData.pagination.page
                  }
                  pageSize={
                    studentData.pagination.limit
                  }
                  onPageChange={(page) => {
                    const next = {
                      ...studentFilters,
                      page
                    };

                    setStudentFilters(next);
                    loadStudentHistory(next);
                  }}
                  onPageSizeChange={(limit) => {
                    const next = {
                      ...studentFilters,
                      limit,
                      page: 1
                    };

                    setStudentFilters(next);
                    loadStudentHistory(next);
                  }}
                  label="attendance records"
                />
              </section>
            </>
          ) : null}
        </section>
      )}

      {activeReport === "class" && (
        <section className="attendance-report-workspace">
          <div className="panel attendance-report-filters class-register-filters no-print">
            <label>
              Class
              <select
                value={classFilters.className}
                onChange={(event) =>
                  setClassFilters({
                    ...classFilters,
                    className: event.target.value,
                    section: "",
                    page: 1
                  })
                }
              >
                {options.classes.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Section
              <select
                value={classFilters.section}
                onChange={(event) =>
                  setClassFilters({
                    ...classFilters,
                    section: event.target.value,
                    page: 1
                  })
                }
              >
                <option value="">All Sections</option>

                {classSections.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Month
              <select
                value={classFilters.month}
                onChange={(event) =>
                  setClassFilters({
                    ...classFilters,
                    month: Number(event.target.value),
                    page: 1
                  })
                }
              >
                {Array.from(
                  { length: 12 },
                  (_, index) => (
                    <option
                      key={index + 1}
                      value={index + 1}
                    >
                      {new Date(
                        Date.UTC(2026, index, 1)
                      ).toLocaleString("en-US", {
                        month: "long",
                        timeZone: "UTC"
                      })}
                    </option>
                  )
                )}
              </select>
            </label>

            <label>
              Year
              <select
                value={classFilters.year}
                onChange={(event) =>
                  setClassFilters({
                    ...classFilters,
                    year: Number(event.target.value),
                    page: 1
                  })
                }
              >
                {[
                  currentYear - 2,
                  currentYear - 1,
                  currentYear
                ].map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {loading ? (
            <div className="panel attendance-enterprise-loading">
              <Loader2 className="spin" />
              Loading report...
            </div>
          ) : classData ? (
            <section className="panel attendance-report-table-panel printable-monthly-report">
              <div className="print-report-header">
                <h2>
                  {classData.className}{" "}
                  {classData.section || ""}
                </h2>

                <p>
                  {classData.monthName}{" "}
                  {classData.year} Attendance Register
                </p>
              </div>

              <div className="report-action-bar no-print">
                <div>
                  <button
                    type="button"
                    onClick={() =>
                      exportCsv(
                        "class-attendance-register.csv",
                        [
                          "Roll",
                          "Student ID",
                          "Student",
                          ...classData.days,
                          "Present",
                          "Absent",
                          "Leave",
                          "Late",
                          "Working Days",
                          "Percentage"
                        ],
                        classData.records.map(
                          (student) => [
                            student.rollNo,
                            student.studentId,
                            `${student.firstName} ${student.lastName}`,
                            ...classData.days.map(
                              (date) =>
                                student.daily?.find(
                                  (item) =>
                                    item.date === date
                                )?.status ||
                                "UNMARKED"
                            ),
                            student.present,
                            student.absent,
                            student.leave,
                            student.late,
                            student.workingDays,
                            `${student.percentage}%`
                          ]
                        )
                      )
                    }
                  >
                    <Download size={15} />
                    CSV
                  </button>

                  <button
                    type="button"
                    onClick={() => window.print()}
                  >
                    <Printer size={15} />
                    PDF Monthly Report
                  </button>
                </div>
              </div>

              <div className="class-register-table-wrap">
                <table className="class-register-report-table">
                  <thead>
                    <tr>
                      <th>Roll</th>
                      <th>Student</th>

                      {classData.days.map((date) => (
                        <th key={date}>
                          {date.slice(8, 10)}
                        </th>
                      ))}

                      <th>P/W</th>
                      <th>%</th>
                    </tr>
                  </thead>

                  <tbody>
                    {classData.records.map(
                      (student) => (
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

                          {classData.days.map(
                            (date) => {
                              const status =
                                student.daily?.find(
                                  (item) =>
                                    item.date === date
                                )?.status ||
                                "UNMARKED";

                              return (
                                <td key={date}>
                                  <span
                                    className={`report-day-status ${String(
                                      status
                                    ).toLowerCase()}`}
                                  >
                                    {statusCode(status)}
                                  </span>
                                </td>
                              );
                            }
                          )}

                          <td>
                            <strong>
                              {student.present}/
                              {student.workingDays}
                            </strong>
                          </td>

                          <td>
                            {student.percentage}%
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>

              <RecordPagination
                totalRecords={
                  classData.pagination.totalRecords
                }
                page={classData.pagination.page}
                pageSize={classData.pagination.limit}
                onPageChange={(page) =>
                  setClassFilters({
                    ...classFilters,
                    page
                  })
                }
                onPageSizeChange={(limit) =>
                  setClassFilters({
                    ...classFilters,
                    limit,
                    page: 1
                  })
                }
                label="students"
              />
            </section>
          ) : null}
        </section>
      )}

      {activeReport === "range" && (
        <section className="attendance-report-workspace">
          <div className="panel attendance-report-filters range-report-filters no-print">
            <label>
              Class
              <select
                value={rangeFilters.className}
                onChange={(event) =>
                  setRangeFilters({
                    ...rangeFilters,
                    className: event.target.value,
                    section: "",
                    page: 1
                  })
                }
              >
                <option value="">All Classes</option>

                {options.classes.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Section
              <select
                value={rangeFilters.section}
                onChange={(event) =>
                  setRangeFilters({
                    ...rangeFilters,
                    section: event.target.value,
                    page: 1
                  })
                }
              >
                <option value="">All Sections</option>

                {rangeSections.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Date From
              <input
                type="date"
                value={rangeFilters.dateFrom}
                onChange={(event) =>
                  setRangeFilters({
                    ...rangeFilters,
                    dateFrom: event.target.value,
                    page: 1
                  })
                }
              />
            </label>

            <label>
              Date To
              <input
                type="date"
                value={rangeFilters.dateTo}
                onChange={(event) =>
                  setRangeFilters({
                    ...rangeFilters,
                    dateTo: event.target.value,
                    page: 1
                  })
                }
              />
            </label>
          </div>

          {loading ? (
            <div className="panel attendance-enterprise-loading">
              <Loader2 className="spin" />
              Loading report...
            </div>
          ) : rangeData ? (
            <section className="panel attendance-report-table-panel">
              <div className="report-action-bar no-print">
                <div>
                  <button
                    type="button"
                    onClick={() =>
                      exportCsv(
                        "attendance-date-range.csv",
                        [
                          "Roll",
                          "Student ID",
                          "Student",
                          "Class",
                          "Section",
                          "Present",
                          "Absent",
                          "Leave",
                          "Late",
                          "Working Days",
                          "Percentage"
                        ],
                        rangeData.records.map(
                          (student) => [
                            student.rollNo,
                            student.studentId,
                            `${student.firstName} ${student.lastName}`,
                            student.className,
                            student.section,
                            student.present,
                            student.absent,
                            student.leave,
                            student.late,
                            student.workingDays,
                            `${student.percentage}%`
                          ]
                        )
                      )
                    }
                  >
                    <Download size={15} />
                    CSV
                  </button>

                  <button
                    type="button"
                    onClick={() => window.print()}
                  >
                    <Printer size={15} />
                    Print / PDF
                  </button>
                </div>
              </div>

              <div className="phase2-table-wrap">
                <table className="phase2-table">
                  <thead>
                    <tr>
                      <th>Roll</th>
                      <th>Student</th>
                      <th>Class</th>
                      <th>Present</th>
                      <th>Absent</th>
                      <th>Leave</th>
                      <th>Late</th>
                      <th>Working Days</th>
                      <th>Percentage</th>
                    </tr>
                  </thead>

                  <tbody>
                    {rangeData.records.map(
                      (student) => (
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

                          <td>
                            {student.className}{" "}
                            {student.section || ""}
                          </td>

                          <td>{student.present}</td>
                          <td>{student.absent}</td>
                          <td>{student.leave}</td>
                          <td>{student.late}</td>
                          <td>{student.workingDays}</td>
                          <td>
                            <strong>
                              {student.percentage}%
                            </strong>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>

              <RecordPagination
                totalRecords={
                  rangeData.pagination.totalRecords
                }
                page={rangeData.pagination.page}
                pageSize={rangeData.pagination.limit}
                onPageChange={(page) =>
                  setRangeFilters({
                    ...rangeFilters,
                    page
                  })
                }
                onPageSizeChange={(limit) =>
                  setRangeFilters({
                    ...rangeFilters,
                    limit,
                    page: 1
                  })
                }
                label="students"
              />
            </section>
          ) : null}
        </section>
      )}
    </div>
  );
}

export default AttendanceReportsPage;
