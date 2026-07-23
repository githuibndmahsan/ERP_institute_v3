import {
  ArrowRight,
  Award,
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  School,
  ShieldCheck,
  Trophy,
  Users
} from "lucide-react";
import "../../assets/css/website-studio-v2.css";

function Media({ src, alt, className, fallback }) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt || ""}
        className={className}
      />
    );
  }

  return fallback;
}

export default function WebsiteRenderer({
  config,
  compact = false,
  showAdminBackLink = true
}) {
  const sections = {
    hero:
      config.hero.visible && (
        <section
          id="home"
          key="hero"
          className="ws-public-hero"
        >
          <div className="ws-public-hero-copy">
            <span>{config.hero.eyebrow}</span>
            <h1>{config.hero.title}</h1>
            <p>{config.hero.description}</p>

            <div className="ws-public-hero-actions">
              <a href={config.hero.primaryButtonUrl}>
                <GraduationCap size={17} />
                {config.hero.primaryButtonText}
                <ArrowRight size={15} />
              </a>

              <a
                href={config.hero.secondaryButtonUrl}
                className="secondary"
              >
                <Building2 size={17} />
                {config.hero.secondaryButtonText}
              </a>
            </div>
          </div>

          <div className="ws-public-hero-media">
            <Media
              src={config.hero.imageUrl}
              alt={config.hero.imageAlt}
              className="ws-public-hero-image"
              fallback={
                <div className="ws-public-hero-placeholder">
                  <School size={50} />
                  <strong>{config.hero.bannerLabel}</strong>
                </div>
              }
            />

            <div className="ws-public-quick-links">
              <a href="#admissions">
                <ClipboardList size={20} />
                <strong>{config.admissions.buttonText}</strong>
              </a>
              <a href="#notices">
                <Bell size={20} />
                <strong>{config.notices.title}</strong>
              </a>
              <a href="#events">
                <CalendarDays size={20} />
                <strong>{config.events.title}</strong>
              </a>
              <a href="#toppers">
                <Trophy size={20} />
                <strong>{config.toppers.title}</strong>
              </a>
            </div>
          </div>
        </section>
      ),

    statistics:
      config.statistics.visible && (
        <section
          key="statistics"
          className="ws-public-statistics"
        >
          {config.statistics.items.map((item, index) => {
            const icons = [
              Award,
              Users,
              CheckCircle2,
              Building2
            ];
            const Icon = icons[index % icons.length];

            return (
              <article key={item.id}>
                <Icon size={20} />
                <div>
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </div>
              </article>
            );
          })}
        </section>
      ),

    facilities:
      config.facilities.visible && (
        <section
          id="facilities"
          key="facilities"
          className="ws-public-section"
        >
          <div className="ws-public-heading">
            <span>{config.facilities.eyebrow}</span>
            <h2>{config.facilities.title}</h2>
            {config.facilities.description && (
              <p>{config.facilities.description}</p>
            )}
          </div>

          <div className="ws-public-card-grid">
            {config.facilities.items.map((item, index) => (
              <article key={item.id}>
                <Media
                  src={item.imageUrl}
                  alt={item.title}
                  className="ws-public-card-image"
                  fallback={
                    <span className="ws-public-card-icon">
                      <Building2 size={25} />
                    </span>
                  }
                />
                <small>FACILITY {index + 1}</small>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>
      ),

    about:
      config.about.visible && (
        <section
          id="about"
          key="about"
          className="ws-public-about"
        >
          <article>
            <span>{config.about.eyebrow}</span>
            <h2>{config.about.title}</h2>
            <p>{config.about.description}</p>
          </article>

          <article className="ws-public-principal">
            <Media
              src={config.about.principalPhotoUrl}
              alt={config.about.principalName}
              className="ws-public-principal-photo"
              fallback={<Award size={30} />}
            />
            <span>{config.about.principalEyebrow}</span>
            <h3>{config.about.principalTitle}</h3>
            <blockquote>
              “{config.about.principalMessage}”
            </blockquote>
            <strong>{config.about.principalName}</strong>
            <small>{config.about.principalRole}</small>
          </article>
        </section>
      ),

    notices:
      config.notices.visible && (
        <section
          id="notices"
          key="notices"
          className="ws-public-section alt"
        >
          <div className="ws-public-heading">
            <span>{config.notices.eyebrow}</span>
            <h2>{config.notices.title}</h2>
          </div>

          <div className="ws-public-notice-list">
            {config.notices.items.map((item) => (
              <article key={item.id}>
                <div>
                  <Bell size={16} />
                  <time>{item.date}</time>
                </div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>
      ),

    events:
      config.events.visible && (
        <section
          id="events"
          key="events"
          className="ws-public-section"
        >
          <div className="ws-public-heading">
            <span>{config.events.eyebrow}</span>
            <h2>{config.events.title}</h2>
          </div>

          <div className="ws-public-card-grid">
            {config.events.items.map((item) => (
              <article key={item.id}>
                <Media
                  src={item.imageUrl}
                  alt={item.title}
                  className="ws-public-card-image"
                  fallback={
                    <span className="ws-public-card-icon">
                      <CalendarDays size={25} />
                    </span>
                  }
                />
                <div className="ws-public-meta">
                  <strong>{item.type}</strong>
                  <time>{item.date}</time>
                </div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <span className="ws-public-venue">
                  <MapPin size={14} />
                  {item.venue}
                </span>
              </article>
            ))}
          </div>
        </section>
      ),

    toppers:
      config.toppers.visible && (
        <section
          id="toppers"
          key="toppers"
          className="ws-public-section alt"
        >
          <div className="ws-public-heading centered">
            <span>{config.toppers.eyebrow}</span>
            <h2>{config.toppers.title}</h2>
          </div>

          <div className="ws-public-topper-grid">
            {config.toppers.items.map((item) => (
              <article key={item.id}>
                <Media
                  src={item.photoUrl}
                  alt={item.name}
                  className="ws-public-topper-photo"
                  fallback={
                    <span className="ws-public-avatar">
                      <Users size={24} />
                    </span>
                  }
                />
                <small>{item.position}</small>
                <h3>{item.name}</h3>
                <p>{item.className}</p>
                <strong>
                  {item.score} {item.scoreLabel}
                </strong>
              </article>
            ))}
          </div>
        </section>
      ),

    admissions:
      config.admissions.visible && (
        <section
          id="admissions"
          key="admissions"
          className="ws-public-admissions"
        >
          <div>
            <GraduationCap size={34} />
            <h2>{config.admissions.title}</h2>
            <p>{config.admissions.description}</p>
          </div>

          <a href={config.admissions.buttonUrl}>
            {config.admissions.buttonText}
            <ArrowRight size={16} />
          </a>
        </section>
      )
  };

  return (
    <div
      className={`ws-public-site ${
        compact ? "compact" : ""
      }`}
      style={{
        "--ws-primary": config.theme.primaryColor,
        "--ws-accent": config.theme.accentColor,
        "--ws-background": config.theme.backgroundColor,
        "--ws-surface": config.theme.surfaceColor,
        "--ws-text": config.theme.textColor,
        "--ws-muted": config.theme.mutedColor,
        "--ws-header": config.theme.headerBackground,
        "--ws-footer": config.theme.footerBackground,
        "--ws-font": config.theme.fontFamily,
        "--ws-max-width": config.theme.maxWidth,
        "--ws-section-padding": config.theme.sectionPadding,
        "--ws-card-radius": config.theme.cardRadius,
        "--ws-button-radius": config.theme.buttonRadius
      }}
    >
      {config.customCss && (
        <style>{config.customCss}</style>
      )}

      {config.portalBar.visible && (
        <div className="ws-public-portal-bar">
          <div>
            <ShieldCheck size={16} />
            <strong>{config.portalBar.modeText}</strong>
            <span>{config.portalBar.description}</span>
          </div>

          <div>
            <span>{config.portalBar.verifiedText}</span>

            {showAdminBackLink && (
              <a href={config.portalBar.backUrl}>
                {config.portalBar.backLabel}
              </a>
            )}
          </div>
        </div>
      )}

      <header className="ws-public-header">
        <a href="#home" className="ws-public-brand">
          {config.branding.logoType === "image" &&
          config.branding.logoUrl ? (
            <img
              src={config.branding.logoUrl}
              alt={config.branding.instituteName}
            />
          ) : (
            <span>{config.branding.logoText}</span>
          )}

          <div>
            <strong>
              {config.branding.instituteName}
            </strong>
            <small>{config.branding.tagline}</small>
          </div>
        </a>

        <nav>
          {config.navigation
            .filter((item) => item.visible)
            .map((item) => (
              <a key={item.id} href={item.target}>
                {item.label}
              </a>
            ))}
        </nav>

        {config.headerButton.visible && (
          <a
            href={config.headerButton.target}
            className="ws-public-header-button"
          >
            <ClipboardList size={15} />
            {config.headerButton.text}
          </a>
        )}
      </header>

      <main>
        {config.sectionOrder.map(
          (section) => sections[section] || null
        )}
      </main>

      {config.footer.visible && (
        <footer
          id="contact"
          className="ws-public-footer"
        >
          <div>
            <strong>{config.footer.instituteName}</strong>
            <p>{config.footer.tagline}</p>
          </div>

          <div className="ws-public-contact">
            <a href={`mailto:${config.footer.email}`}>
              <Mail size={15} />
              {config.footer.email}
            </a>
            <a href={`tel:${config.footer.phone}`}>
              <Phone size={15} />
              {config.footer.phone}
            </a>
            <span>
              <MapPin size={15} />
              {config.footer.address}
            </span>
          </div>

          <div className="ws-public-footer-bottom">
            <span>{config.footer.copyright}</span>
            <strong>
              {config.footer.verifiedText}
            </strong>
          </div>
        </footer>
      )}
    </div>
  );
}
