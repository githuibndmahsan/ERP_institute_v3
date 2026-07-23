const PREFIX = "educare_public_site_";

export const defaultWebsiteData = {
  institutionCode: "EDUCARE",
  status: "PUBLISHED",
  branding: {
    name: "EduCare International Academy",
    tagline: "Nurturing Dreams. Building Leaders. Shaping Futures.",
    logoUrl: "",
    primaryColor: "#073B78",
    accentColor: "#FF8A00",
    backgroundColor: "#F7FAFC"
  },
  hero: {
    eyebrow: "WELCOME TO EDUCARE INTERNATIONAL ACADEMY",
    title: "Empowering Next-Gen Learners to Excel & Inspire",
    description:
      "A premier educational institution delivering academic excellence, innovative STEM programs, holistic sports, and character development in a modern smart campus environment.",
    primaryButtonText: "Apply For Admission 2026",
    secondaryButtonText: "Explore Campus Tour"
  },
  statistics: [
    { value: "1998", label: "Established" },
    { value: "1,850+", label: "Students Enrolled" },
    { value: "100%", label: "Board Result Pass" },
    { value: "25 Acres", label: "Smart Campus" }
  ],
  about: {
    title: "Inspiring Academic & Character Excellence Since 1998",
    description:
      "EduCare International Academy is committed to cultivating critical thinking, moral integrity, and modern technological competency.",
    principalName: "Dr. Eleanor Vance",
    principalRole: "Principal & Academic Director",
    principalMessage:
      "Education is not merely the learning of facts, but training the mind to think critically and compassionately."
  },
  admissions: {
    title: "Admissions Open for Academic Year 2026-27",
    description:
      "Seats are available for Nursery to Grade XII.",
    buttonText: "Submit Admission Request"
  },
  contact: {
    email: "admissions@educare-academy.edu",
    phone: "+1 (800) 555-0199",
    address: "742 Evergreen Knowledge Parkway, Innovation District"
  },
  visibility: {
    hero: true,
    statistics: true,
    about: true,
    admissions: true,
    contact: true
  }
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function normalizeInstitutionCode(code) {
  return (
    String(code || "EDUCARE")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "EDUCARE"
  );
}

export function getWebsiteData(code) {
  const normalized = normalizeInstitutionCode(code);

  try {
    const raw = localStorage.getItem(`${PREFIX}${normalized}`);

    if (!raw) {
      return {
        ...clone(defaultWebsiteData),
        institutionCode: normalized
      };
    }

    const parsed = JSON.parse(raw);

    return {
      ...clone(defaultWebsiteData),
      ...parsed,
      institutionCode: normalized,
      branding: {
        ...clone(defaultWebsiteData.branding),
        ...(parsed.branding || {})
      },
      hero: {
        ...clone(defaultWebsiteData.hero),
        ...(parsed.hero || {})
      },
      about: {
        ...clone(defaultWebsiteData.about),
        ...(parsed.about || {})
      },
      admissions: {
        ...clone(defaultWebsiteData.admissions),
        ...(parsed.admissions || {})
      },
      contact: {
        ...clone(defaultWebsiteData.contact),
        ...(parsed.contact || {})
      },
      visibility: {
        ...clone(defaultWebsiteData.visibility),
        ...(parsed.visibility || {})
      },
      statistics: Array.isArray(parsed.statistics)
        ? parsed.statistics
        : clone(defaultWebsiteData.statistics)
    };
  } catch {
    return {
      ...clone(defaultWebsiteData),
      institutionCode: normalized
    };
  }
}

export function saveWebsiteData(code, data) {
  const normalized = normalizeInstitutionCode(code);
  const payload = {
    ...data,
    institutionCode: normalized,
    updatedAt: new Date().toISOString()
  };

  localStorage.setItem(
    `${PREFIX}${normalized}`,
    JSON.stringify(payload)
  );

  window.dispatchEvent(
    new CustomEvent("educare-website-updated", {
      detail: { institutionCode: normalized }
    })
  );

  return payload;
}

export function publishWebsiteData(code, data) {
  return saveWebsiteData(code, {
    ...data,
    status: "PUBLISHED",
    publishedAt: new Date().toISOString()
  });
}
