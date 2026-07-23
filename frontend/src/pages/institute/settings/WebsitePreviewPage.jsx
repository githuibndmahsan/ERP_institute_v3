import { useEffect, useState } from "react";
import {
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Globe2,
  Mail,
  MapPin,
  Phone,
  Trophy,
  Users
} from "lucide-react";
import { websiteStudioApi } from "../../../services/websiteStudio";

const fallback = {
  instituteDisplayName: "Demo International School",
  instituteTagline: "Nurturing Dreams. Building Futures.",
  logoUrl: "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=300&q=80",
  primaryColor: "#0047A1",
  accentColor: "#FF8C00",
  backgroundColor: "#FFFFFF",
  heroEyebrow: "Welcome to Demo International School",
  heroTitle: "Empowering Students to Excel in Every Endeavor",
  heroDescription: "We combine academic excellence with values, creativity and innovation to prepare students for a successful and responsible tomorrow.",
  heroImageUrl: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1600&q=85",
  primaryButtonText: "Admissions Open",
  secondaryButtonText: "Discover More",
  aboutTitle: "About Our School",
  aboutDescription: "At Demo International School, we nurture young minds through a perfect blend of academics, innovation and values.",
  announcementSectionTitle: "Notice Board",
  eventSectionTitle: "Upcoming Events",
  topperSectionTitle: "Class Toppers",
  admissionTitle: "Admissions Open",
  admissionDescription: "Applications are now open for the new academic session.",
  admissionButtonText: "Apply Now",
  contactEmail: "info@demo.edu",
  contactPhone: "+92 300 9623321",
  contactAddress: "Main Boulevard, Lahore"
};

export default function WebsitePreviewPage() {
  const [site, setSite] = useState(fallback);

  useEffect(() => {
    websiteStudioApi
      .get()
      .then((data) => setSite({ ...fallback, ...(data || {}) }))
      .catch(() => setSite(fallback));
  }, []);

  return (
    <div
      className="demo-preview-page"
      style={{
        "--demo-primary": site.primaryColor,
        "--demo-accent": site.accentColor,
        "--demo-bg": site.backgroundColor
      }}
    >
      <header className="demo-preview-header">
        <div className="demo-preview-brand">
          <img src={site.logoUrl} alt="" />
          <div>
            <strong>{site.instituteDisplayName}</strong>
            <small>{site.instituteTagline}</small>
          </div>
        </div>

        <nav>
          <a href="#home">Home</a>
          <a href="#about">About Us</a>
          <a href="#academics">Academics</a>
          <a href="#admissions">Admissions</a>
          <a href="#contact">Contact</a>
          <a className="erp-login" href="/login">ERP Login</a>
        </nav>
      </header>

      <section id="home" className="demo-preview-hero">
        <div>
          <span>{site.heroEyebrow}</span>
          <h1>{site.heroTitle}</h1>
          <p>{site.heroDescription}</p>
          <div className="actions">
            <button type="button">{site.primaryButtonText}</button>
            <button type="button" className="secondary">
              {site.secondaryButtonText}
            </button>
          </div>
        </div>

        <img src={site.heroImageUrl} alt="" />
      </section>

      <section className="demo-preview-features">
        {[
          ["Experienced Faculty", Users],
          ["Smart Classrooms", BookOpen],
          ["Holistic Development", Trophy],
          ["Safe Campus", CheckCircle2],
          ["Global Exposure", Globe2]
        ].map(([label, Icon]) => (
          <article key={label}>
            <span><Icon size={20} /></span>
            <strong>{label}</strong>
            <p>Professional learning environment.</p>
          </article>
        ))}
      </section>

      <section id="about" className="demo-preview-about">
        <div>
          <small>ABOUT OUR SCHOOL</small>
          <h2>{site.aboutTitle}</h2>
          <p>{site.aboutDescription}</p>
        </div>

        <img
          src="https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1000&q=85"
          alt=""
        />

        <div className="demo-preview-notices">
          <h3>{site.announcementSectionTitle}</h3>
          {[
            "Parent-Teacher Meeting",
            "Mid-Term Exams",
            "Science Fair",
            "Summer Camp"
          ].map((item, index) => (
            <div key={item}>
              <span>{21 - index * 2}</span>
              <strong>{item}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="demo-preview-grid">
        <article>
          <h3>{site.eventSectionTitle}</h3>
          {[
            "Annual Sports Day",
            "Education Seminar",
            "Art & Craft Exhibition"
          ].map((event) => (
            <p key={event}>
              <CalendarDays size={15} />
              {event}
            </p>
          ))}
        </article>

        <article>
          <h3>{site.topperSectionTitle}</h3>
          {[
            "1. Ananya Sharma — 98.6%",
            "2. Rohan Verma — 97.8%",
            "3. Meera Nair — 97.2%"
          ].map((topper) => (
            <p key={topper}>
              <Trophy size={15} />
              {topper}
            </p>
          ))}
        </article>

        <article>
          <h3>Results Highlights</h3>
          <div className="demo-preview-results">
            <span>100% Pass</span>
            <span>78% Distinction</span>
            <span>25+ Toppers</span>
            <span>12 School Toppers</span>
          </div>
        </article>
      </section>

      <section id="admissions" className="demo-preview-admission">
        <div>
          <small>ADMISSIONS</small>
          <h2>{site.admissionTitle}</h2>
          <p>{site.admissionDescription}</p>
        </div>
        <button type="button">{site.admissionButtonText}</button>
      </section>

      <footer id="contact" className="demo-preview-footer">
        <div>
          <strong>{site.instituteDisplayName}</strong>
          <small>{site.instituteTagline}</small>
        </div>

        <div>
          <strong>Contact Us</strong>
          <span><MapPin size={14} />{site.contactAddress}</span>
          <span><Phone size={14} />{site.contactPhone}</span>
          <span><Mail size={14} />{site.contactEmail}</span>
        </div>
      </footer>
    </div>
  );
}
