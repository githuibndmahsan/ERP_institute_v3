import { useEffect, useState } from "react";
import {
  BookOpenCheck,
  Calculator,
  CheckCircle2,
  FileText,
  GraduationCap,
  Loader2,
  Plus,
  Save,
  Search
} from "lucide-react";
import { examsApi } from "../../../services/exams";
import { RecordPagination } from "../../../components/common/RecordPagination";
import ResultCardPreview from "./ResultCardPreview";

const initialPagination = {
  page: 1,
  limit: 10,
  totalRecords: 0,
  totalPages: 1
};

export default function ExamsResultsPage() {
  const [tab, setTab] = useState("exams");
  const [options, setOptions] = useState({
    schemes: [],
    classes: [],
    sectionsByClass: {}
  });

  const [examFilters, setExamFilters] = useState({
    search: "",
    className: "",
    academicSession: "",
    page: 1,
    limit: 10
  });

  const [examList, setExamList] = useState({
    records: [],
    pagination: initialPagination
  });

  const [form, setForm] = useState({
    schemeId: "",
    academicSession: "2026-27",
    name: "Midterm Examination",
    term: "Midterm",
    className: "",
    section: "",
    resultDate: "",
    paperMode: "CUSTOM",
    customMaximumMarks: 100
  });

  const [selectedExam, setSelectedExam] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [marksFilters, setMarksFilters] = useState({
    search: "",
    page: 1,
    limit: 10
  });

  const [marksData, setMarksData] = useState({
    exam: null,
    paper: null,
    records: [],
    pagination: initialPagination
  });

  const [resultFilters, setResultFilters] = useState({
    search: "",
    status: "",
    page: 1,
    limit: 10
  });

  const [resultList, setResultList] = useState({
    records: [],
    pagination: initialPagination
  });

  const [comments, setComments] = useState({
    teacherComment: "Keep working consistently.",
    reviewerComment: "Reviewed and verified.",
    recommendation: "",
    principalComment: "Best wishes for future progress."
  });

  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");

  async function loadOptions() {
    const data = await examsApi.options();
    setOptions(data);

    setForm((current) => ({
      ...current,
      schemeId:
        current.schemeId ||
        data.schemes?.[0]?.id ||
        "",
      className:
        current.className ||
        data.classes?.[0] ||
        ""
    }));
  }

  async function loadExams(filters = examFilters) {
    setLoading(true);

    try {
      const data = await examsApi.exams(filters);
      setExamList(data);
    } finally {
      setLoading(false);
    }
  }

  async function openExam(exam) {
    setSelectedExam(exam);
    const data = await examsApi.examSubjects(exam.id);
    setSubjects(data || []);
    setSelectedSubjectId(data?.[0]?.id || "");
    setTab("marks");
  }

  async function loadMarks(
    examId = selectedExam?.id,
    subjectId = selectedSubjectId,
    filters = marksFilters
  ) {
    if (!examId || !subjectId) return;

    setLoading(true);

    try {
      const data = await examsApi.marksSheet(
        examId,
        {
          ...filters,
          subjectId
        }
      );

      setMarksData(data);
    } finally {
      setLoading(false);
    }
  }

  async function loadResults(filters = resultFilters) {
    if (!selectedExam?.id) return;

    setLoading(true);

    try {
      const data = await examsApi.results(
        selectedExam.id,
        filters
      );

      setResultList(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOptions();
  }, []);

  useEffect(() => {
    if (tab === "exams") {
      loadExams(examFilters);
    }
  }, [
    tab,
    examFilters.page,
    examFilters.limit,
    examFilters.className,
    examFilters.academicSession
  ]);

  useEffect(() => {
    if (tab === "marks" && selectedSubjectId) {
      loadMarks(
        selectedExam?.id,
        selectedSubjectId,
        marksFilters
      );
    }
  }, [
    tab,
    selectedSubjectId,
    marksFilters.page,
    marksFilters.limit
  ]);

  useEffect(() => {
    if (tab === "results" && selectedExam) {
      loadResults(resultFilters);
    }
  }, [
    tab,
    resultFilters.page,
    resultFilters.limit,
    resultFilters.status
  ]);

  const sections =
    options.sectionsByClass?.[form.className] || [];

  async function createExam(event) {
    event.preventDefault();
    const response = await examsApi.createExam(form);
    setNotice(response.message);
    setTab("exams");
    loadExams();
  }

  function updateMark(studentId, field, value) {
    setMarksData((current) => ({
      ...current,
      records: current.records.map((student) => {
        if (student.id !== studentId) return student;

        const next = {
          ...student,
          [field]:
            field === "isAbsent"
              ? value
              : Number(value)
        };

        next.totalObtained = next.isAbsent
          ? 0
          : Number(next.theoryObtained || 0) +
            Number(next.practicalObtained || 0) +
            Number(next.internalObtained || 0);

        return next;
      })
    }));
  }

  async function saveMarks() {
    const response = await examsApi.saveMarksSheet(
      selectedExam.id,
      {
        examSubjectId: marksData.paper.id,
        records: marksData.records.map((student) => ({
          studentId: student.id,
          theoryObtained: student.theoryObtained,
          practicalObtained: student.practicalObtained,
          internalObtained: student.internalObtained,
          isAbsent: student.isAbsent,
          remarks: student.remarks || ""
        }))
      }
    );

    setNotice(response.message);
    await loadMarks();
  }

  async function generateResults() {
    const response = await examsApi.generateResults(
      selectedExam.id,
      comments
    );

    setNotice(response.message);
    setTab("results");
    await loadResults();
  }

  async function openResultCard(id) {
    const data = await examsApi.resultCard(id);
    setPreview(data);
  }

  const tabs = [
    ["exams", "Exams", BookOpenCheck],
    ["create", "Create Exam", Plus],
    ["marks", "Marks Entry", Calculator],
    ["results", "Results", GraduationCap]
  ];

  return (
    <div className="complete-exams-page">
      <div className="attendance-enterprise-heading">
        <div>
          <span>
            <GraduationCap size={14} />
            EXAMS & RESULTS
          </span>

          <h2>Complete Exam and Result Management</h2>

          <p>
            Create exams, enter marks, calculate results,
            review performance and generate result cards.
          </p>
        </div>
      </div>

      <div className="exam-main-tabs no-print">
        {tabs.map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id)}
            disabled={
              (id === "marks" || id === "results") &&
              !selectedExam
            }
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {notice && (
        <div className="attendance-notice">
          {notice}
        </div>
      )}

      {preview ? (
        <div>
          <button
            className="secondary no-print"
            onClick={() => setPreview(null)}
          >
            Back to results
          </button>

          <ResultCardPreview result={preview} />
        </div>
      ) : null}

      {!preview && tab === "create" && (
        <form
          className="panel exam-create-form"
          onSubmit={createExam}
        >
          <label>
            Board Scheme
            <select
              value={form.schemeId}
              onChange={(event) =>
                setForm({
                  ...form,
                  schemeId: event.target.value
                })
              }
              required
            >
              <option value="">Select scheme</option>

              {options.schemes.map((scheme) => (
                <option
                  key={scheme.id}
                  value={scheme.id}
                >
                  {scheme.boardName} — {scheme.name}{" "}
                  {scheme.version}
                </option>
              ))}
            </select>
          </label>

          <label>
            Academic Session
            <input
              value={form.academicSession}
              onChange={(event) =>
                setForm({
                  ...form,
                  academicSession: event.target.value
                })
              }
              required
            />
          </label>

          <label>
            Exam Name
            <input
              value={form.name}
              onChange={(event) =>
                setForm({
                  ...form,
                  name: event.target.value
                })
              }
              required
            />
          </label>

          <label>
            Term
            <select
              value={form.term}
              onChange={(event) =>
                setForm({
                  ...form,
                  term: event.target.value
                })
              }
            >
              <option>Monthly Test</option>
              <option>Midterm</option>
              <option>Final</option>
              <option>Annual</option>
            </select>
          </label>

          <label>
            Class
            <select
              value={form.className}
              onChange={(event) =>
                setForm({
                  ...form,
                  className: event.target.value,
                  section: ""
                })
              }
              required
            >
              {options.classes.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>

          <label>
            Section
            <select
              value={form.section}
              onChange={(event) =>
                setForm({
                  ...form,
                  section: event.target.value
                })
              }
            >
              <option value="">All Sections</option>

              {sections.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>

          <label>
            Marks Mode
            <select
              value={form.paperMode}
              onChange={(event) =>
                setForm({
                  ...form,
                  paperMode: event.target.value
                })
              }
            >
              <option value="SCHEME">
                Board Scheme Marks
              </option>
              <option value="CUSTOM">
                Same marks for every subject
              </option>
            </select>
          </label>

          {form.paperMode === "CUSTOM" && (
            <label>
              Maximum Marks Per Subject
              <input
                type="number"
                min="1"
                value={form.customMaximumMarks}
                onChange={(event) =>
                  setForm({
                    ...form,
                    customMaximumMarks:
                      Number(event.target.value)
                  })
                }
              />
            </label>
          )}

          <label>
            Result Date
            <input
              type="date"
              value={form.resultDate}
              onChange={(event) =>
                setForm({
                  ...form,
                  resultDate: event.target.value
                })
              }
            />
          </label>

          <button className="primary" type="submit">
            <Plus size={16} />
            Create Exam
          </button>
        </form>
      )}

      {!preview && tab === "exams" && (
        <section className="panel exam-record-panel">
          <div className="exam-record-filters">
            <label className="exam-search">
              <Search size={15} />

              <input
                placeholder="Search exam"
                value={examFilters.search}
                onChange={(event) =>
                  setExamFilters({
                    ...examFilters,
                    search: event.target.value,
                    page: 1
                  })
                }
              />
            </label>

            <button
              type="button"
              onClick={() => loadExams(examFilters)}
            >
              Search
            </button>
          </div>

          {loading ? (
            <div className="attendance-enterprise-loading">
              <Loader2 className="spin" />
              Loading exams...
            </div>
          ) : (
            <div className="phase2-table-wrap">
              <table className="phase2-table">
                <thead>
                  <tr>
                    <th>Exam</th>
                    <th>Class</th>
                    <th>Session</th>
                    <th>Scheme</th>
                    <th>Subjects</th>
                    <th>Results</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {examList.records.map((exam) => (
                    <tr key={exam.id}>
                      <td>
                        <strong>{exam.name}</strong>
                        <small>{exam.term}</small>
                      </td>

                      <td>
                        {exam.className}{" "}
                        {exam.section || ""}
                      </td>

                      <td>{exam.academicSession}</td>

                      <td>
                        {exam.scheme.boardName}
                        <small>
                          {exam.scheme.name}{" "}
                          {exam.scheme.version}
                        </small>
                      </td>

                      <td>{exam._count.subjects}</td>
                      <td>{exam._count.results}</td>

                      <td>
                        <button
                          type="button"
                          onClick={() => openExam(exam)}
                        >
                          Open Exam
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <RecordPagination
            totalRecords={
              examList.pagination.totalRecords
            }
            page={examList.pagination.page}
            pageSize={examList.pagination.limit}
            onPageChange={(page) =>
              setExamFilters({
                ...examFilters,
                page
              })
            }
            onPageSizeChange={(limit) =>
              setExamFilters({
                ...examFilters,
                limit,
                page: 1
              })
            }
            label="exams"
          />
        </section>
      )}

      {!preview && tab === "marks" && selectedExam && (
        <section className="exam-marks-workspace">
          <div className="panel exam-context-bar">
            <div>
              <small>Selected Exam</small>
              <strong>
                {selectedExam.name} —{" "}
                {selectedExam.className}{" "}
                {selectedExam.section || ""}
              </strong>
            </div>

            <label>
              Subject
              <select
                value={selectedSubjectId}
                onChange={(event) => {
                  setSelectedSubjectId(
                    event.target.value
                  );

                  setMarksFilters({
                    ...marksFilters,
                    page: 1
                  });
                }}
              >
                {subjects.map((paper) => (
                  <option
                    key={paper.id}
                    value={paper.id}
                  >
                    {paper.schemeSubject.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {marksData.paper && (
            <section className="exam-paper-summary">
              <article>
                <small>Total Marks</small>
                <strong>
                  {marksData.paper.totalMarks}
                </strong>
              </article>

              <article>
                <small>Passing Marks</small>
                <strong>
                  {marksData.paper.passingMarks}
                </strong>
              </article>

              <article>
                <small>Theory Max</small>
                <strong>
                  {marksData.paper.theoryMax}
                </strong>
              </article>

              <article>
                <small>Practical Max</small>
                <strong>
                  {marksData.paper.practicalMax}
                </strong>
              </article>
            </section>
          )}

          <section className="panel exam-record-panel">
            {loading ? (
              <div className="attendance-enterprise-loading">
                <Loader2 className="spin" />
                Loading students...
              </div>
            ) : (
              <div className="exam-marks-table-wrap">
                <table className="exam-marks-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Theory</th>
                      <th>Practical</th>
                      <th>Internal</th>
                      <th>Total Obtained</th>
                      <th>Absent</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>

                  <tbody>
                    {marksData.records.map((student) => (
                      <tr key={student.id}>
                        <td>
                          <strong>
                            {student.firstName}{" "}
                            {student.lastName}
                          </strong>

                          <small>
                            {student.studentId} ·{" "}
                            {student.rollNo || "No roll"}
                          </small>
                        </td>

                        <td>
                          <input
                            type="number"
                            min="0"
                            max={
                              marksData.paper?.theoryMax ||
                              0
                            }
                            value={
                              student.theoryObtained
                            }
                            disabled={student.isAbsent}
                            onChange={(event) =>
                              updateMark(
                                student.id,
                                "theoryObtained",
                                event.target.value
                              )
                            }
                          />
                        </td>

                        <td>
                          <input
                            type="number"
                            min="0"
                            max={
                              marksData.paper
                                ?.practicalMax || 0
                            }
                            value={
                              student.practicalObtained
                            }
                            disabled={
                              student.isAbsent ||
                              !marksData.paper
                                ?.practicalMax
                            }
                            onChange={(event) =>
                              updateMark(
                                student.id,
                                "practicalObtained",
                                event.target.value
                              )
                            }
                          />
                        </td>

                        <td>
                          <input
                            type="number"
                            min="0"
                            max={
                              marksData.paper
                                ?.internalMax || 0
                            }
                            value={
                              student.internalObtained
                            }
                            disabled={
                              student.isAbsent ||
                              !marksData.paper?.internalMax
                            }
                            onChange={(event) =>
                              updateMark(
                                student.id,
                                "internalObtained",
                                event.target.value
                              )
                            }
                          />
                        </td>

                        <td>
                          <strong>
                            {student.totalObtained}/
                            {marksData.paper?.totalMarks}
                          </strong>
                        </td>

                        <td>
                          <input
                            type="checkbox"
                            checked={student.isAbsent}
                            onChange={(event) =>
                              updateMark(
                                student.id,
                                "isAbsent",
                                event.target.checked
                              )
                            }
                          />
                        </td>

                        <td>
                          <input
                            value={student.remarks}
                            onChange={(event) =>
                              updateMark(
                                student.id,
                                "remarks",
                                event.target.value
                              )
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <RecordPagination
              totalRecords={
                marksData.pagination.totalRecords
              }
              page={marksData.pagination.page}
              pageSize={marksData.pagination.limit}
              onPageChange={(page) =>
                setMarksFilters({
                  ...marksFilters,
                  page
                })
              }
              onPageSizeChange={(limit) =>
                setMarksFilters({
                  ...marksFilters,
                  limit,
                  page: 1
                })
              }
              label="students"
            />

            <div className="exam-savebar">
              <button
                className="primary"
                type="button"
                onClick={saveMarks}
              >
                <Save size={16} />
                Save Marks
              </button>

              <button
                type="button"
                onClick={() => setTab("results")}
              >
                Continue to Results
              </button>
            </div>
          </section>
        </section>
      )}

      {!preview && tab === "results" && selectedExam && (
        <section className="exam-results-workspace">
          <section className="panel exam-result-comments">
            <label>
              Teacher Comment
              <textarea
                value={comments.teacherComment}
                onChange={(event) =>
                  setComments({
                    ...comments,
                    teacherComment:
                      event.target.value
                  })
                }
              />
            </label>

            <label>
              Reviewer Comment
              <textarea
                value={comments.reviewerComment}
                onChange={(event) =>
                  setComments({
                    ...comments,
                    reviewerComment:
                      event.target.value
                  })
                }
              />
            </label>

            <label>
              Recommendation
              <textarea
                value={comments.recommendation}
                onChange={(event) =>
                  setComments({
                    ...comments,
                    recommendation:
                      event.target.value
                  })
                }
                placeholder="Blank uses automatic recommendation"
              />
            </label>

            <label>
              Principal Comment
              <textarea
                value={comments.principalComment}
                onChange={(event) =>
                  setComments({
                    ...comments,
                    principalComment:
                      event.target.value
                  })
                }
              />
            </label>

            <button
              className="primary"
              type="button"
              onClick={generateResults}
            >
              <CheckCircle2 size={16} />
              Generate All Result Cards
            </button>
          </section>

          <section className="panel exam-record-panel">
            <div className="exam-record-filters">
              <label className="exam-search">
                <Search size={15} />

                <input
                  placeholder="Search student"
                  value={resultFilters.search}
                  onChange={(event) =>
                    setResultFilters({
                      ...resultFilters,
                      search: event.target.value,
                      page: 1
                    })
                  }
                />
              </label>

              <select
                value={resultFilters.status}
                onChange={(event) =>
                  setResultFilters({
                    ...resultFilters,
                    status: event.target.value,
                    page: 1
                  })
                }
              >
                <option value="">All Results</option>
                <option value="PASS">Pass</option>
                <option value="FAIL">Fail</option>
              </select>

              <button
                type="button"
                onClick={() =>
                  loadResults(resultFilters)
                }
              >
                Search
              </button>
            </div>

            <div className="phase2-table-wrap">
              <table className="phase2-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Total</th>
                    <th>Obtained</th>
                    <th>Percentage</th>
                    <th>Grade</th>
                    <th>Result</th>
                    <th>Result Card</th>
                  </tr>
                </thead>

                <tbody>
                  {resultList.records.map((result) => (
                    <tr key={result.id}>
                      <td>
                        <strong>
                          {result.student.firstName}{" "}
                          {result.student.lastName}
                        </strong>

                        <small>
                          {result.student.studentId}
                        </small>
                      </td>

                      <td>{result.totalMarks}</td>
                      <td>{result.obtainedMarks}</td>
                      <td>{result.percentage}%</td>
                      <td>{result.grade}</td>
                      <td>{result.resultStatus}</td>

                      <td>
                        <button
                          type="button"
                          onClick={() =>
                            openResultCard(result.id)
                          }
                        >
                          <FileText size={14} />
                          Open Card
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <RecordPagination
              totalRecords={
                resultList.pagination.totalRecords
              }
              page={resultList.pagination.page}
              pageSize={resultList.pagination.limit}
              onPageChange={(page) =>
                setResultFilters({
                  ...resultFilters,
                  page
                })
              }
              onPageSizeChange={(limit) =>
                setResultFilters({
                  ...resultFilters,
                  limit,
                  page: 1
                })
              }
              label="results"
            />
          </section>
        </section>
      )}
    </div>
  );
}
