import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Camera,
  Download,
  FileText,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  Printer,
  School,
  Upload,
  UserRound,
  UsersRound
} from "lucide-react";
import { studentsApi } from "../../../services/students";

const fileUrl = (value) => {
  if (!value) return "";
  if (value.startsWith("http")) return value;
  return `http://127.0.0.1:4000${value}`;
};

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-PK", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      })
    : "—";

export function StudentProfilePage() {
  const { id } = useParams();
  const inputRef = useRef(null);
  const [student, setStudent] = useState(null);
  const [history, setHistory] = useState([]);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try {
      const [profile, activity] = await Promise.all([
        studentsApi.get(id),
        studentsApi.history(id)
      ]);
      setStudent(profile);
      setHistory(activity || []);
      setPhotoPreview(fileUrl(profile.photoUrl));
      setError("");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Unable to load student profile."
      );
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  function selectPhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Only JPG, PNG and WEBP images are allowed.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Photo must be smaller than 5 MB.");
      return;
    }

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setError("");
  }

  async function uploadPhoto() {
    if (!photoFile) return;

    try {
      setUploading(true);
      const response = await studentsApi.uploadPhoto({ id, file: photoFile });
      setMessage(response.message || "Photo uploaded.");
      setPhotoFile(null);
      await load();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Unable to upload photo."
      );
    } finally {
      setUploading(false);
    }
  }

  function printProfile() {
    document.title = `${student.studentId}-Student-Profile`;
    window.print();
  }

  if (!student) {
    return <div className="page">{error || "Loading student profile..."}</div>;
  }

  return (
    <div className="page student-cv-page">
      <div className="student-cv-toolbar no-print">
        <Link to="/students" className="back-link">
          <ArrowLeft size={16} />
          Back to Students
        </Link>

        <div>
          <button className="secondary" onClick={() => inputRef.current?.click()}>
            <Camera size={17} />
            Choose Photo
          </button>

          <button
            className="secondary"
            onClick={uploadPhoto}
            disabled={!photoFile || uploading}
          >
            <Upload size={17} />
            {uploading ? "Uploading..." : "Upload Photo"}
          </button>

          <button className="primary" onClick={printProfile}>
            <Printer size={17} />
            Print / Save PDF
          </button>
        </div>

        <input
          ref={inputRef}
          hidden
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={selectPhoto}
        />
      </div>

      {message && <div className="students-alert students-alert-success no-print">{message}</div>}
      {error && <div className="students-alert students-alert-error no-print">{error}</div>}

      <article className="student-cv-sheet">
        <header className="student-cv-header">
          <div className="student-cv-brand">
            <span className="student-cv-brand-icon">
              <School size={25} />
            </span>
            <div>
              <h1>Demo International School</h1>
              <p>Official Student Profile</p>
            </div>
          </div>

          <div className="student-cv-id-box">
            <span>STUDENT ID</span>
            <strong>{student.studentId}</strong>
          </div>
        </header>

        <section className="student-cv-hero">
          <div className="student-cv-photo-wrap">
            {photoPreview ? (
              <img
                className="student-cv-photo"
                src={photoPreview}
                alt={`${student.firstName} ${student.lastName}`}
              />
            ) : (
              <div className="student-cv-photo-placeholder">
                {student.firstName?.[0]}
                {student.lastName?.[0]}
              </div>
            )}

            <span className={`status status-${student.status.toLowerCase()}`}>
              {student.status}
            </span>
          </div>

          <div className="student-cv-main-info">
            <span className="student-cv-label">STUDENT PROFILE</span>
            <h2>{student.firstName} {student.lastName}</h2>
            <p>{student.className}{student.section ? ` · Section ${student.section}` : ""}</p>

            <div className="student-cv-contact-grid">
              <span><Phone size={15} />{student.phone || student.guardianPhone || "—"}</span>
              <span><Mail size={15} />{student.email || "No email"}</span>
              <span><MapPin size={15} />{student.address || "Address not available"}</span>
            </div>
          </div>
        </section>

        <section className="student-cv-section">
          <div className="student-cv-section-title">
            <UserRound size={18} />
            <h3>Personal Information</h3>
          </div>

          <div className="student-cv-info-grid">
            <div><span>Full Name</span><strong>{student.firstName} {student.lastName}</strong></div>
            <div><span>Gender</span><strong>{student.gender}</strong></div>
            <div><span>Date of Birth</span><strong>{formatDate(student.dateOfBirth)}</strong></div>
            <div><span>B-Form Number</span><strong>{student.bFormNo || "—"}</strong></div>
            <div><span>Admission Number</span><strong>{student.admissionNo}</strong></div>
            <div><span>Admission Date</span><strong>{formatDate(student.admissionDate)}</strong></div>
          </div>
        </section>

        <section className="student-cv-section">
          <div className="student-cv-section-title">
            <GraduationCap size={18} />
            <h3>Academic Information</h3>
          </div>

          <div className="student-cv-info-grid">
            <div><span>Class / Program</span><strong>{student.className}</strong></div>
            <div><span>Section</span><strong>{student.section || "—"}</strong></div>
            <div><span>Roll Number</span><strong>{student.rollNo || "—"}</strong></div>
            <div><span>Status</span><strong>{student.status}</strong></div>
          </div>
        </section>

        <section className="student-cv-section">
          <div className="student-cv-section-title">
            <UsersRound size={18} />
            <h3>Guardian Information</h3>
          </div>

          <div className="student-cv-info-grid">
            <div><span>Guardian Name</span><strong>{student.guardianName || "—"}</strong></div>
            <div><span>Relationship</span><strong>{student.guardianRelation || "—"}</strong></div>
            <div><span>Guardian Phone</span><strong>{student.guardianPhone || "—"}</strong></div>
            <div><span>Guardians Recorded</span><strong>{student.guardians?.length || 0}</strong></div>
          </div>
        </section>

        <section className="student-cv-section">
          <div className="student-cv-section-title">
            <FileText size={18} />
            <h3>Records Summary</h3>
          </div>

          <div className="student-cv-summary-grid">
            <div><span>Documents</span><strong>{student.documents?.length || 0}</strong><small>Uploaded documents</small></div>
            <div><span>Notes</span><strong>{student.studentNotes?.length || 0}</strong><small>Internal notes</small></div>
            <div><span>History</span><strong>{history.length}</strong><small>Recorded changes</small></div>
          </div>
        </section>

        <footer className="student-cv-footer">
          <div>
            <span>Generated On</span>
            <strong>{new Date().toLocaleDateString("en-PK")}</strong>
          </div>
          <div className="student-cv-signature">
            <span>Authorized Signature</span>
          </div>
        </footer>
      </article>

      <div className="student-cv-pdf-help no-print">
        <Download size={18} />
        <div>
          <strong>Save as PDF</strong>
          <span>Click Print / Save PDF, then choose Save as PDF.</span>
        </div>
      </div>
    </div>
  );
}
