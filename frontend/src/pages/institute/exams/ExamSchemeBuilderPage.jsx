import { useEffect, useMemo, useState } from "react";
import { BookOpenCheck, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { examsApi } from "../../../services/exams";

export default function ExamSchemeBuilderPage() {
  const [schemes, setSchemes] = useState([]);
  const [schemeId, setSchemeId] = useState("");
  const [selected, setSelected] = useState({});
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");

  async function load() {
    const data = await examsApi.schemes();
    setSchemes(data || []);
    setSchemeId((current) => current || data?.[0]?.id || "");
  }

  useEffect(() => { load(); }, []);

  const scheme = schemes.find((item) => item.id === schemeId);

  const totals = useMemo(() => {
    if (!scheme) return { subjects: 0, marks: 0 };

    const compulsory = scheme.subjects.filter(
      (item) => item.subjectType === "COMPULSORY"
    );

    const electiveIds = Object.values(selected);
    const electives = scheme.subjects.filter(
      (item) => electiveIds.includes(item.id)
    );

    return {
      subjects: compulsory.length + electives.length,
      marks: [...compulsory, ...electives].reduce(
        (sum, item) => sum + item.totalMarks,
        0
      )
    };
  }, [scheme, selected]);

  async function bootstrap() {
    setLoading(true);
    try {
      const response = await examsApi.bootstrapBiseLahore();
      setNotice(response.message);
      await load();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="exam-scheme-builder-page">
      <div className="attendance-enterprise-heading">
        <div>
          <span><BookOpenCheck size={14} /> EXAMS & RESULTS</span>
          <h2>Board Scheme and Subject Selection</h2>
          <p>Compulsory subjects plus simple Biology-or-Computer selection.</p>
        </div>

        <button className="primary" onClick={bootstrap} disabled={loading}>
          {loading ? <Loader2 className="spin" size={16} /> : <ShieldCheck size={16} />}
          Load BISE Lahore Scheme
        </button>
      </div>

      {notice && <div className="attendance-notice">{notice}</div>}

      {scheme && (
        <>
          <section className="panel exam-scheme-summary">
            <div><small>Board</small><strong>{scheme.boardName}</strong></div>
            <div><small>Version</small><strong>{scheme.version}</strong></div>
            <div><small>Certificate Total</small><strong>{scheme.certificateTotal}</strong></div>
            <div><small>Passing Rule</small><strong>{scheme.passingPercent}%</strong></div>
          </section>

          <section className="panel exam-subject-grid">
            <h3>Compulsory Subjects</h3>
            <div className="exam-subject-cards">
              {scheme.subjects
                .filter((item) => item.subjectType === "COMPULSORY")
                .map((subject) => (
                  <article key={subject.id}>
                    <CheckCircle2 size={17} />
                    <div>
                      <strong>{subject.name}</strong>
                      <span>Total {subject.totalMarks} · Pass {subject.passingMarks}</span>
                    </div>
                  </article>
                ))}
            </div>
          </section>

          {scheme.electiveGroups.map((group) => (
            <section className="panel exam-elective-section" key={group.id}>
              <header>
                <div>
                  <h3>{group.name}</h3>
                  <p>Select exactly one subject.</p>
                </div>
              </header>

              <div className="exam-elective-options">
                {group.options.map((option) => {
                  const subject = option.schemeSubject;
                  const checked = selected[group.id] === subject.id;

                  return (
                    <label key={subject.id} className={checked ? "selected" : ""}>
                      <input
                        type="radio"
                        name={group.id}
                        checked={checked}
                        onChange={() =>
                          setSelected({ ...selected, [group.id]: subject.id })
                        }
                      />
                      <div>
                        <strong>{subject.name}</strong>
                        <span>Total {subject.totalMarks} · Pass {subject.passingMarks}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </section>
          ))}

          <section className="exam-live-total">
            <div><small>Applicable Subjects</small><strong>{totals.subjects}</strong></div>
            <div><small>Applicable Total Marks</small><strong>{totals.marks}</strong></div>
          </section>
        </>
      )}
    </div>
  );
}
