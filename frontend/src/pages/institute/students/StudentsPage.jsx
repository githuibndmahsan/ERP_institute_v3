import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Archive,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Download,
  Edit3,
  Eye,
  GraduationCap,
  MoreHorizontal,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  SlidersHorizontal,
  UserCheck,
  UserRound,
  Users,
  X
} from "lucide-react";
import { studentsApi } from "../../../services/students";

const emptyForm = {
  firstName: "",
  lastName: "",
  gender: "MALE",
  dateOfBirth: "",
  bFormNo: "",
  email: "",
  phone: "",
  className: "",
  section: "",
  rollNo: "",
  guardianName: "",
  guardianPhone: "",
  guardianRelation: "Father",
  address: "",
  status: "ACTIVE",
  admissionDate: new Date().toISOString().slice(0, 10),
  notes: ""
};

const defaultColumns = {
  admission: true,
  class: true,
  guardian: true,
  contact: true,
  gender: false,
  admissionDate: false,
  status: true
};

function StatusBadge({ status }) {
  return (
    <span className={`status status-${String(status).toLowerCase()}`}>
      {status}
    </span>
  );
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : "—";
}

function csvValue(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export function StudentsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState({
    items: [],
    pagination: { page: 1, totalPages: 1, total: 0, limit: 10 },
    filters: { classes: [], sections: [] },
    stats: {}
  });

  const [filters, setFilters] = useState({
    search: "",
    className: "",
    section: "",
    status: "",
    gender: "",
    page: 1,
    limit: 10
  });

  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [columns, setColumns] = useState(defaultColumns);
  const [selected, setSelected] = useState([]);
  const [bulkAction, setBulkAction] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    try {
      const result = await studentsApi.list(filters);
      setData(result);
      setSelected((current) =>
        current.filter((id) =>
          result.items.some((student) => student.id === id)
        )
      );
      setError("");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Unable to load students."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(load, 220);
    return () => window.clearTimeout(timeout);
  }, [
    filters.search,
    filters.className,
    filters.section,
    filters.status,
    filters.gender,
    filters.page,
    filters.limit
  ]);

  const stats = useMemo(
    () => [
      ["Total Students", data.stats.total || 0, Users, "All enrolled records"],
      ["Active Students", data.stats.active || 0, UserCheck, "Currently active"],
      ["Pending", data.stats.pending || 0, UserRound, "Admissions to review"],
      ["Archived", data.stats.archived || 0, Archive, "Archived records"]
    ],
    [data.stats]
  );

  const allVisibleSelected =
    data.items.length > 0 &&
    data.items.every((student) => selected.includes(student.id));

  const activeFilterCount = [
    filters.className,
    filters.section,
    filters.status,
    filters.gender
  ].filter(Boolean).length;

  function setFilter(key, value) {
    setFilters((current) => ({
      ...current,
      [key]: value,
      ...(key !== "page" ? { page: 1 } : {})
    }));
  }

  function clearFilters() {
    setFilters((current) => ({
      ...current,
      search: "",
      className: "",
      section: "",
      status: "",
      gender: "",
      page: 1
    }));
  }

  function toggleAllVisible() {
    if (allVisibleSelected) {
      setSelected((current) =>
        current.filter(
          (id) => !data.items.some((student) => student.id === id)
        )
      );
    } else {
      setSelected((current) => [
        ...new Set([...current, ...data.items.map((student) => student.id)])
      ]);
    }
  }

  function toggleStudent(id) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }

  function addStudent() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
    setError("");
  }

  function editStudent(student) {
    setEditing(student);
    setForm({
      ...emptyForm,
      ...student,
      rollNo: student.rollNo || "",
      dateOfBirth: student.dateOfBirth
        ? String(student.dateOfBirth).slice(0, 10)
        : "",
      admissionDate: student.admissionDate
        ? String(student.admissionDate).slice(0, 10)
        : ""
    });
    setOpen(true);
  }

  async function save(event, addAnother = false) {
    event.preventDefault();

    try {
      const payload = {
        ...form,
        rollNo: form.rollNo ? Number(form.rollNo) : null
      };

      if (editing) {
        await studentsApi.update({ id: editing.id, payload });
        setMessage("Student updated successfully.");
      } else {
        await studentsApi.create(payload);
        setMessage("Student admitted successfully.");
      }

      await load();

      if (addAnother && !editing) {
        setForm({
          ...emptyForm,
          className: form.className,
          section: form.section,
          admissionDate: form.admissionDate
        });
      } else {
        setOpen(false);
      }
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Unable to save student."
      );
    }
  }

  async function archiveStudent(student) {
    if (!window.confirm(`Archive ${student.firstName} ${student.lastName}?`)) {
      return;
    }

    await studentsApi.archive(student.id);
    setMessage("Student archived.");
    await load();
  }

  async function restoreStudent(student) {
    await studentsApi.updateStatus({
      id: student.id,
      status: "ACTIVE"
    });
    setMessage("Student restored.");
    await load();
  }

  async function applyBulkAction() {
    if (!selected.length || !bulkAction) return;

    if (
      !window.confirm(
        `Apply this action to ${selected.length} selected student record(s)?`
      )
    ) {
      return;
    }

    try {
      const response = await studentsApi.bulkAction({
        studentIds: selected,
        action: bulkAction
      });

      setMessage(response.message);
      setSelected([]);
      setBulkAction("");
      await load();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Bulk action failed."
      );
    }
  }

  function exportCsv() {
    const headers = [
      "Student ID",
      "Admission No",
      "Name",
      "Gender",
      "Class",
      "Section",
      "Roll No",
      "Guardian",
      "Guardian Phone",
      "Student Phone",
      "Status",
      "Admission Date"
    ];

    const rows = data.items.map((student) => [
      student.studentId,
      student.admissionNo,
      `${student.firstName} ${student.lastName}`,
      student.gender,
      student.className,
      student.section || "",
      student.rollNo || "",
      student.guardianName,
      student.guardianPhone,
      student.phone || "",
      student.status,
      formatDate(student.admissionDate)
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map(csvValue).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `students-page-${filters.page}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="page students-management-page">
      <div className="page-heading students-page-heading">
        <div>
          <span className="students-eyebrow">STUDENT MANAGEMENT</span>
          <h1>Students</h1>
          <p>
            Admissions, records, class placement, guardians and lifecycle
            management.
          </p>
        </div>

        <div className="students-heading-actions">
          <button className="secondary" onClick={exportCsv}>
            <Download size={17} />
            Export Page
          </button>

          <button className="primary" onClick={addStudent}>
            <Plus size={17} />
            Add Student
          </button>
        </div>
      </div>

      {message && (
        <div className="students-alert students-alert-success">
          <CheckCircle2 size={18} />
          <span>{message}</span>
          <button onClick={() => setMessage("")}>
            <X size={15} />
          </button>
        </div>
      )}

      {error && (
        <div className="students-alert students-alert-error">
          <span>{error}</span>
          <button onClick={() => setError("")}>
            <X size={15} />
          </button>
        </div>
      )}

      <div className="students-stat-grid">
        {stats.map(([label, value, Icon, note]) => (
          <article
            key={label}
            className="students-stat-card"
            data-hover-preview
            data-preview-title={label}
            data-preview-body={`${value} ${label.toLowerCase()} in this institution.`}
          >
            <div>
              <span>{label}</span>
              <strong>{value}</strong>
              <small>{note}</small>
            </div>

            <span className="students-stat-icon">
              <Icon size={21} />
            </span>
          </article>
        ))}
      </div>

      <section className="panel students-command-panel">
        <div className="students-primary-toolbar">
          <label className="students-search-box">
            <Search size={18} />
            <input
              type="search"
              value={filters.search}
              onChange={(event) => setFilter("search", event.target.value)}
              placeholder="Search by student, ID, admission, B-Form or guardian..."
            />
            {filters.search && (
              <button
                type="button"
                onClick={() => setFilter("search", "")}
              >
                <X size={15} />
              </button>
            )}
          </label>

          <button
            className={`students-toolbar-button ${
              advancedOpen || activeFilterCount ? "active" : ""
            }`}
            onClick={() => setAdvancedOpen((current) => !current)}
          >
            <SlidersHorizontal size={17} />
            Filters
            {activeFilterCount > 0 && (
              <span className="students-filter-count">
                {activeFilterCount}
              </span>
            )}
          </button>

          <div className="students-column-menu-wrap">
            <button
              className="students-toolbar-button"
              onClick={() => setColumnsOpen((current) => !current)}
            >
              <Columns3 size={17} />
              Columns
              <ChevronDown size={15} />
            </button>

            {columnsOpen && (
              <div className="students-column-menu">
                {Object.entries({
                  admission: "Admission",
                  class: "Class",
                  guardian: "Guardian",
                  contact: "Contact",
                  gender: "Gender",
                  admissionDate: "Admission Date",
                  status: "Status"
                }).map(([key, label]) => (
                  <label key={key}>
                    <input
                      type="checkbox"
                      checked={columns[key]}
                      onChange={(event) =>
                        setColumns((current) => ({
                          ...current,
                          [key]: event.target.checked
                        }))
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>
            )}
          </div>

          <button
            className="students-toolbar-icon"
            onClick={load}
            aria-label="Refresh students"
          >
            <RefreshCw size={17} className={loading ? "is-spinning" : ""} />
          </button>
        </div>

        {advancedOpen && (
          <div className="students-advanced-filters">
            <label>
              Class / Program
              <select
                value={filters.className}
                onChange={(event) =>
                  setFilter("className", event.target.value)
                }
              >
                <option value="">All Classes</option>
                {data.filters.classes.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>

            <label>
              Section
              <select
                value={filters.section}
                onChange={(event) =>
                  setFilter("section", event.target.value)
                }
              >
                <option value="">All Sections</option>
                {data.filters.sections.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>

            <label>
              Status
              <select
                value={filters.status}
                onChange={(event) =>
                  setFilter("status", event.target.value)
                }
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="PENDING">Pending</option>
                <option value="INACTIVE">Inactive</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </label>

            <label>
              Gender
              <select
                value={filters.gender}
                onChange={(event) =>
                  setFilter("gender", event.target.value)
                }
              >
                <option value="">All Genders</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </label>

            <button className="students-clear-filters" onClick={clearFilters}>
              <X size={15} />
              Clear Filters
            </button>
          </div>
        )}

        {selected.length > 0 && (
          <div className="students-bulk-bar">
            <div>
              <strong>{selected.length}</strong>
              <span>student record(s) selected</span>
            </div>

            <select
              value={bulkAction}
              onChange={(event) => setBulkAction(event.target.value)}
            >
              <option value="">Choose bulk action</option>
              <option value="ACTIVATE">Mark Active</option>
              <option value="INACTIVATE">Mark Inactive</option>
              <option value="PENDING">Mark Pending</option>
              <option value="ARCHIVE">Archive</option>
            </select>

            <button
              className="primary"
              disabled={!bulkAction}
              onClick={applyBulkAction}
            >
              Apply
            </button>

            <button onClick={() => setSelected([])}>
              Clear Selection
            </button>
          </div>
        )}

        <div className="students-table-summary">
          <div>
            <strong>{data.pagination.total}</strong>
            <span>matching student records</span>
          </div>

          <label>
            Rows per page
            <select
              value={filters.limit}
              onChange={(event) =>
                setFilter("limit", Number(event.target.value))
              }
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </label>
        </div>

        <div className="table-wrap students-table-wrap">
          <table className="students-table">
            <thead>
              <tr>
                <th className="students-checkbox-column">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleAllVisible}
                  />
                </th>
                <th>Student</th>
                {columns.admission && <th>Admission</th>}
                {columns.class && <th>Class</th>}
                {columns.guardian && <th>Guardian</th>}
                {columns.contact && <th>Contact</th>}
                {columns.gender && <th>Gender</th>}
                {columns.admissionDate && <th>Admission Date</th>}
                {columns.status && <th>Status</th>}
                <th data-no-hover-preview>Actions</th>
              </tr>
            </thead>

            <tbody>
              {data.items.map((student) => (
                <tr
                  key={student.id}
                  className={
                    selected.includes(student.id)
                      ? "students-row-selected students-clickable-row"
                      : "students-clickable-row"
                  }
                  onClick={(event) => {
                    if (
                      event.target.closest(
                        "button, a, input, select, textarea, [data-no-row-click]"
                      )
                    ) {
                      return;
                    }
                    navigate(`/students/${student.id}`);
                  }}
                >
                  <td
                    className="students-checkbox-column"
                    data-no-hover-preview
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(student.id)}
                      onChange={() => toggleStudent(student.id)}
                    />
                  </td>

                  <td>
                    <div className="student-cell">
                      <span className="student-avatar">
                        {student.photoUrl ? (
                          <img src={student.photoUrl} alt="" />
                        ) : (
                          <>
                            {student.firstName?.[0]}
                            {student.lastName?.[0]}
                          </>
                        )}
                      </span>

                      <div>
                        <Link to={`/students/${student.id}`}>
                          <strong>
                            {student.firstName} {student.lastName}
                          </strong>
                        </Link>
                        <small>{student.studentId}</small>
                      </div>
                    </div>
                  </td>

                  {columns.admission && (
                    <td>
                      <strong>{student.admissionNo}</strong>
                      <small>Roll: {student.rollNo || "—"}</small>
                    </td>
                  )}

                  {columns.class && (
                    <td>
                      <strong>{student.className}</strong>
                      <small>Section {student.section || "—"}</small>
                    </td>
                  )}

                  {columns.guardian && (
                    <td>
                      <strong>{student.guardianName}</strong>
                      <small>
                        {student.guardianRelation || "Guardian"}
                      </small>
                    </td>
                  )}

                  {columns.contact && (
                    <td>
                      <strong>{student.guardianPhone}</strong>
                      <small>{student.phone || "No student phone"}</small>
                    </td>
                  )}

                  {columns.gender && <td>{student.gender}</td>}

                  {columns.admissionDate && (
                    <td>{formatDate(student.admissionDate)}</td>
                  )}

                  {columns.status && (
                    <td>
                      <StatusBadge status={student.status} />
                    </td>
                  )}

                  <td data-no-hover-preview>
                    <div className="student-row-actions">
                      <Link to={`/students/${student.id}`} title="View profile">
                        <Eye size={16} />
                      </Link>

                      <button
                        type="button"
                        onClick={() => editStudent(student)}
                        title="Edit student"
                      >
                        <Edit3 size={16} />
                      </button>

                      {student.status === "ARCHIVED" ? (
                        <button
                          type="button"
                          onClick={() => restoreStudent(student)}
                          title="Restore student"
                        >
                          <RotateCcw size={16} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => archiveStudent(student)}
                          title="Archive student"
                        >
                          <Archive size={16} />
                        </button>
                      )}

                      <button type="button" title="More options">
                        <MoreHorizontal size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!data.items.length && (
                <tr>
                  <td colSpan="12" className="empty-cell students-empty-state">
                    <span className="students-empty-icon">
                      <GraduationCap size={30} />
                    </span>
                    <strong>No students found</strong>
                    <span>
                      Adjust your filters or add a new student record.
                    </span>
                    <button className="primary" onClick={addStudent}>
                      <Plus size={16} />
                      Add Student
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {loading && (
            <div className="students-table-loading">
              <RefreshCw className="is-spinning" size={22} />
              Loading students...
            </div>
          )}
        </div>

        <div className="students-pagination">
          <span>
            Showing{" "}
            {data.pagination.total
              ? (data.pagination.page - 1) * data.pagination.limit + 1
              : 0}
            –{Math.min(
              data.pagination.page * data.pagination.limit,
              data.pagination.total
            )}{" "}
            of {data.pagination.total}
          </span>

          <div className="students-pagination-controls">
            <button
              disabled={data.pagination.page <= 1}
              onClick={() => setFilter("page", 1)}
            >
              First
            </button>

            <button
              disabled={data.pagination.page <= 1}
              onClick={() =>
                setFilter("page", data.pagination.page - 1)
              }
            >
              <ChevronLeft size={16} />
              Previous
            </button>

            <span className="students-page-indicator">
              Page {data.pagination.page} of {data.pagination.totalPages}
            </span>

            <button
              disabled={
                data.pagination.page >= data.pagination.totalPages
              }
              onClick={() =>
                setFilter("page", data.pagination.page + 1)
              }
            >
              Next
              <ChevronRight size={16} />
            </button>

            <button
              disabled={
                data.pagination.page >= data.pagination.totalPages
              }
              onClick={() =>
                setFilter("page", data.pagination.totalPages)
              }
            >
              Last
            </button>
          </div>
        </div>
      </section>

      {open && (
        <div className="modal-backdrop">
          <div className="modal-card students-modal">
            <div className="modal-header">
              <div>
                <span className="students-eyebrow">
                  {editing ? "UPDATE RECORD" : "NEW ADMISSION"}
                </span>
                <h2>{editing ? "Edit Student" : "Add Student"}</h2>
                <p>Student, academic and guardian information.</p>
              </div>
              <button onClick={() => setOpen(false)}>×</button>
            </div>

            <form
              className="student-professional-form"
              onSubmit={(event) => save(event, false)}
            >
              <section>
                <h3>Student Information</h3>
                <div className="student-form-grid">
                  <label>
                    First Name
                    <input
                      required
                      value={form.firstName}
                      onChange={(event) =>
                        setForm({ ...form, firstName: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    Last Name
                    <input
                      required
                      value={form.lastName}
                      onChange={(event) =>
                        setForm({ ...form, lastName: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    Gender
                    <select
                      value={form.gender}
                      onChange={(event) =>
                        setForm({ ...form, gender: event.target.value })
                      }
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </label>
                  <label>
                    Date of Birth
                    <input
                      type="date"
                      value={form.dateOfBirth || ""}
                      onChange={(event) =>
                        setForm({ ...form, dateOfBirth: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    B-Form Number
                    <input
                      value={form.bFormNo || ""}
                      onChange={(event) =>
                        setForm({ ...form, bFormNo: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    Student Phone
                    <input
                      value={form.phone || ""}
                      onChange={(event) =>
                        setForm({ ...form, phone: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    Student Email
                    <input
                      type="email"
                      value={form.email || ""}
                      onChange={(event) =>
                        setForm({ ...form, email: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    Admission Date
                    <input
                      type="date"
                      value={form.admissionDate || ""}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          admissionDate: event.target.value
                        })
                      }
                    />
                  </label>
                </div>
              </section>

              <section>
                <h3>Academic Placement</h3>
                <div className="student-form-grid">
                  <label>
                    Class / Program
                    <input
                      required
                      value={form.className}
                      onChange={(event) =>
                        setForm({ ...form, className: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    Section
                    <input
                      value={form.section || ""}
                      onChange={(event) =>
                        setForm({ ...form, section: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    Roll Number
                    <input
                      type="number"
                      min="1"
                      value={form.rollNo || ""}
                      onChange={(event) =>
                        setForm({ ...form, rollNo: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    Status
                    <select
                      value={form.status}
                      onChange={(event) =>
                        setForm({ ...form, status: event.target.value })
                      }
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="PENDING">Pending</option>
                      <option value="INACTIVE">Inactive</option>
                      <option value="ARCHIVED">Archived</option>
                    </select>
                  </label>
                </div>
              </section>

              <section>
                <h3>Guardian Information</h3>
                <div className="student-form-grid">
                  <label>
                    Guardian Name
                    <input
                      required
                      value={form.guardianName}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          guardianName: event.target.value
                        })
                      }
                    />
                  </label>
                  <label>
                    Relation
                    <input
                      value={form.guardianRelation || ""}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          guardianRelation: event.target.value
                        })
                      }
                    />
                  </label>
                  <label>
                    Guardian Phone
                    <input
                      required
                      value={form.guardianPhone}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          guardianPhone: event.target.value
                        })
                      }
                    />
                  </label>
                  <label className="student-form-full">
                    Address
                    <textarea
                      value={form.address || ""}
                      onChange={(event) =>
                        setForm({ ...form, address: event.target.value })
                      }
                    />
                  </label>
                  <label className="student-form-full">
                    Admission Notes
                    <textarea
                      value={form.notes || ""}
                      onChange={(event) =>
                        setForm({ ...form, notes: event.target.value })
                      }
                    />
                  </label>
                </div>
              </section>

              <div className="modal-actions">
                <button type="button" onClick={() => setOpen(false)}>
                  Cancel
                </button>
                {!editing && (
                  <button
                    type="button"
                    onClick={(event) => save(event, true)}
                  >
                    Save & Add Another
                  </button>
                )}
                <button className="primary">
                  {editing ? "Update Student" : "Admit Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
