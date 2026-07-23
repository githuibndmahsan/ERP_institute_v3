import { Printer } from "lucide-react";

export default function ResultCardPreview({ result }) {
  if (!result) return null;

  return (
    <section className="result-card-sheet">
      <header className="result-card-header">
        <div className="result-card-logo">ERP</div>
        <div>
          <h1>{result.institutionName || "Institution Name"}</h1>
          <p>{result.exam?.name} — {result.exam?.academicSession}</p>
          <strong>Official Result Card</strong>
        </div>
        <div className="result-card-photo">
          {result.resultCardPhotoUrl || result.student?.photoUrl ? (
            <img src={result.resultCardPhotoUrl || result.student.photoUrl} alt="Student" />
          ) : <span>Photo</span>}
        </div>
      </header>

      <section className="result-card-student">
        <div><small>Student</small><strong>{result.student?.firstName} {result.student?.lastName}</strong></div>
        <div><small>Student ID</small><strong>{result.student?.studentId}</strong></div>
        <div><small>Class</small><strong>{result.exam?.className} {result.exam?.section}</strong></div>
        <div><small>Result</small><strong>{result.resultStatus}</strong></div>
      </section>

      <table className="result-card-table">
        <thead>
          <tr>
            <th>Subject</th><th>Total</th><th>Passing</th><th>Obtained</th>
            <th>%</th><th>Grade</th><th>Status</th>
          </tr>
        </thead>
        <tbody>
          {result.subjects?.map((item) => (
            <tr key={item.id}>
              <td>{item.schemeSubject?.name}</td>
              <td>{item.totalMarks}</td>
              <td>{item.passingMarks}</td>
              <td>{item.obtainedMarks}</td>
              <td>{item.percentage}%</td>
              <td>{item.grade}</td>
              <td>{item.resultStatus}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="result-card-overall">
        <div><small>Total Marks</small><strong>{result.totalMarks}</strong></div>
        <div><small>Obtained</small><strong>{result.obtainedMarks}</strong></div>
        <div><small>Percentage</small><strong>{result.percentage}%</strong></div>
        <div><small>Grade</small><strong>{result.grade}</strong></div>
        <div><small>GPA</small><strong>{result.gpa ?? "—"}</strong></div>
      </section>

      <section className="result-card-comments">
        <article><small>Teacher Comment</small><p>{result.teacherComment || "—"}</p></article>
        <article><small>Reviewer Comment</small><p>{result.reviewerComment || "—"}</p></article>
        <article><small>Recommendation</small><p>{result.recommendation || "—"}</p></article>
        <article><small>Principal Comment</small><p>{result.principalComment || "—"}</p></article>
      </section>

      <footer className="result-card-signatures">
        <div>Class Teacher</div>
        <div>Examination Incharge</div>
        <div>Principal</div>
      </footer>

      <button className="result-card-print no-print" onClick={() => window.print()}>
        <Printer size={16} /> Print / Save PDF
      </button>
    </section>
  );
}
