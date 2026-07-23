export function normalizeWebsiteCode(value) {
  return (
    String(value || "EDUCARE")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "EDUCARE"
  );
}

export function makeWebsiteItemId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export const defaultWebsiteConfig = {
  version: 3,
  institutionCode: "EDUCARE",
  status: "DRAFT",
  publicUrl: "/site/EDUCARE",
  updatedAt: null,
  publishedAt: null,

  portalBar: {
    visible: true,
    modeText: "Public Portal Mode",
    description: "Live view rendered from Website Studio controls",
    backLabel: "Back to ERP Admin Panel",
    backUrl: "/dashboard",
    verifiedText: "Verified Public Portal"
  },

  theme: {
    primaryColor: "#073b78",
    accentColor: "#ff8a00",
    backgroundColor: "#f7fafc",
    surfaceColor: "#ffffff",
    textColor: "#10213d",
    mutedColor: "#64748b",
    headerBackground: "#ffffff",
    footerBackground: "#041d3d",
    fontFamily: "Inter",
    maxWidth: "1440px",
    sectionPadding: "72px",
    cardRadius: "16px",
    buttonRadius: "9px"
  },

  branding: {
    logoType: "text",
    logoText: "E",
    logoUrl: "",
    instituteName: "EduCare International Academy",
    name: "EduCare International Academy",
    tagline: "Nurturing Dreams. Building Leaders. Shaping Futures."
  },

  navigation: [
    { id: "nav-home", label: "Home", target: "#home", visible: true },
    { id: "nav-about", label: "About", target: "#about", visible: true },
    { id: "nav-facilities", label: "STEM Facilities", target: "#facilities", visible: true },
    { id: "nav-notices", label: "Notice Board", target: "#notices", visible: true },
    { id: "nav-events", label: "Events", target: "#events", visible: true },
    { id: "nav-toppers", label: "Toppers", target: "#toppers", visible: true },
    { id: "nav-contact", label: "Contact", target: "#contact", visible: true }
  ],

  headerButton: {
    visible: true,
    text: "Submit Admission Request",
    target: "#admissions"
  },

  hero: {
    visible: true,
    eyebrow: "WELCOME TO EDUCARE INTERNATIONAL ACADEMY",
    title: "Empowering Next-Gen Learners to Excel & Inspire",
    description:
      "A premier educational institution delivering academic excellence, innovative STEM programs, holistic sports, and character development in a modern smart campus environment.",
    primaryButtonText: "Apply For Admission 2026",
    primaryButtonUrl: "#admissions",
    secondaryButtonText: "Explore Campus Tour",
    secondaryButtonUrl: "#facilities",
    imageUrl: "",
    imageAlt: "EduCare International Academy hero banner",
    bannerLabel: "EduCare International Academy Hero Banner"
  },

  statistics: {
    visible: true,
    items: [
      { id: "stat-1", value: "1998", label: "Established" },
      { id: "stat-2", value: "1,850+", label: "Students Enrolled" },
      { id: "stat-3", value: "100%", label: "Board Result Pass" },
      { id: "stat-4", value: "25 Acres", label: "Smart Campus" }
    ]
  },

  facilities: {
    visible: true,
    eyebrow: "WORLD-CLASS CAMPUS",
    title: "Cutting-Edge Learning & Sports Infrastructure",
    description: "",
    items: [
      {
        id: "facility-1",
        title: "Smart STEM & Robotics Labs",
        description:
          "Equipped with 3D printers, IoT kits, micro-controllers, and AI workstations.",
        imageUrl: ""
      },
      {
        id: "facility-2",
        title: "Olympic Digital Sports Complex",
        description:
          "All-weather indoor swimming pool, basketball court, synthetic turf field, and gymnastics arena.",
        imageUrl: ""
      },
      {
        id: "facility-3",
        title: "Central Digital Library & Research Center",
        description:
          "Over 45,000 physical volumes plus access to digital scientific databases and quiet study pods.",
        imageUrl: ""
      }
    ]
  },

  about: {
    visible: true,
    eyebrow: "ABOUT OUR INSTITUTION",
    title: "Inspiring Academic & Character Excellence Since 1998",
    description:
      "EduCare International Academy is committed to cultivating critical thinking, moral integrity, and modern technological competency.",
    principalEyebrow: "PRINCIPAL",
    principalTitle: "Message from the Desk of Principal",
    principalMessage:
      "Education is not merely the learning of facts, but training the mind to think critically and compassionately.",
    principalName: "Dr. Eleanor Vance",
    principalRole: "Principal & Academic Director",
    principalPhotoUrl: ""
  },

  notices: {
    visible: true,
    eyebrow: "PUBLIC NOTICE BOARD",
    title: "Official Alerts",
    items: [
      {
        id: "notice-1",
        date: "2026-08-05",
        title: "Parent-Teacher Interactive Meeting",
        description:
          "Parents are invited for the term progress assessment and individual teacher consultations."
      }
    ]
  },

  events: {
    visible: true,
    eyebrow: "CAMPUS CALENDAR",
    title: "Upcoming School Events",
    items: [
      {
        id: "event-1",
        type: "Workshop",
        date: "2026-08-20",
        title: "Annual Inter-School Robotics Competition",
        description:
          "Students compete in robotics and AI problem-solving challenges.",
        venue: "Main Auditorium & Innovation Lab",
        imageUrl: ""
      }
    ]
  },

  toppers: {
    visible: true,
    eyebrow: "HALL OF ACADEMIC FAME",
    title: "Board Examination Toppers",
    items: [
      {
        id: "topper-1",
        position: "Position 1",
        name: "Aarav Sharma",
        className: "Grade XII - Science Stream",
        score: "98.6%",
        scoreLabel: "Score",
        photoUrl: ""
      }
    ]
  },

  admissions: {
    visible: true,
    title: "Admissions Open for Academic Year 2026-27",
    description:
      "Join our vibrant academic community. Seats are available from Nursery to Grade XII.",
    buttonText: "Submit Admission Request",
    buttonUrl: "#contact"
  },

  footer: {
    visible: true,
    instituteName: "EduCare International Academy",
    tagline: "Nurturing Dreams. Building Leaders. Shaping Futures.",
    email: "admissions@educare-academy.edu",
    phone: "+92 300 9623 321",
    address: "742 Evergreen Knowledge Parkway, Innovation District",
    copyright:
      "© 2026 EduCare International Academy. Powered by EduCare ERP.",
    verifiedText: "✓ Verified Public Portal"
  },

  sectionOrder: [
    "hero",
    "statistics",
    "facilities",
    "about",
    "notices",
    "events",
    "toppers",
    "admissions"
  ],

  customCss: ""
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function deepMerge(base, incoming) {
  if (Array.isArray(base)) {
    return Array.isArray(incoming) ? clone(incoming) : clone(base);
  }

  if (base && typeof base === "object" && !Array.isArray(base)) {
    const result = clone(base);
    const source =
      incoming && typeof incoming === "object" && !Array.isArray(incoming)
        ? incoming
        : {};

    for (const [key, value] of Object.entries(source)) {
      result[key] =
        key in base ? deepMerge(base[key], value) : clone(value);
    }

    return result;
  }

  return incoming === undefined ? base : incoming;
}

function listSection(value, defaultSection) {
  if (Array.isArray(value)) {
    return {
      ...clone(defaultSection),
      items: clone(value)
    };
  }

  return value;
}

export function normalizeWebsiteConfig(raw = {}) {
  const source = raw?.config || raw || {};
  const branding = source.branding || {};
  const contact = source.contact || source.footer || {};

  const prepared = {
    ...source,

    theme: {
      ...source.theme,
      primaryColor: source.theme?.primaryColor || source.primaryColor,
      accentColor: source.theme?.accentColor || source.accentColor,
      backgroundColor:
        source.theme?.backgroundColor || source.backgroundColor
    },

    branding: {
      ...branding,
      instituteName:
        branding.instituteName ||
        branding.name ||
        source.instituteDisplayName,
      name:
        branding.name ||
        branding.instituteName ||
        source.instituteDisplayName,
      tagline: branding.tagline || source.instituteTagline
    },

    hero: {
      ...source.hero,
      eyebrow: source.hero?.eyebrow || source.heroEyebrow,
      title: source.hero?.title || source.heroTitle,
      description:
        source.hero?.description || source.heroDescription,
      primaryButtonText:
        source.hero?.primaryButtonText || source.primaryButtonText,
      primaryButtonUrl:
        source.hero?.primaryButtonUrl || source.primaryButtonUrl
    },

    statistics: listSection(
      source.statistics,
      defaultWebsiteConfig.statistics
    ),

    facilities: listSection(
      source.facilities,
      defaultWebsiteConfig.facilities
    ),

    notices: listSection(
      source.notices || source.announcements,
      defaultWebsiteConfig.notices
    ),

    events: listSection(source.events, defaultWebsiteConfig.events),

    toppers: listSection(source.toppers, defaultWebsiteConfig.toppers),

    footer: {
      ...source.footer,
      instituteName:
        source.footer?.instituteName ||
        branding.instituteName ||
        branding.name,
      tagline: source.footer?.tagline || branding.tagline,
      email:
        source.footer?.email ||
        contact.email ||
        source.contactEmail,
      phone:
        source.footer?.phone ||
        contact.phone ||
        source.contactPhone,
      address:
        source.footer?.address ||
        contact.address ||
        source.contactAddress
    }
  };

  const merged = deepMerge(defaultWebsiteConfig, prepared);
  const institutionCode = normalizeWebsiteCode(
    source.institutionCode || merged.institutionCode
  );

  merged.version = 3;
  merged.institutionCode = institutionCode;
  merged.publicUrl = `/site/${institutionCode}`;
  merged.status =
    source.status === "PUBLISHED" ||
    source.publishStatus === "PUBLISHED"
      ? "PUBLISHED"
      : "DRAFT";

  merged.branding.name = merged.branding.instituteName;
  merged.footer.instituteName =
    merged.footer.instituteName || merged.branding.instituteName;

  return merged;
}
