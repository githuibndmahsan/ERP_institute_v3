import { Router } from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const websiteStudioRouter = Router();

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);
const dataDirectory = path.resolve(
  currentDirectory,
  "../../../data/public-sites"
);

const defaultConfig = {
  version: 2,
  institutionCode: "EDUCARE",
  status: "DRAFT",
  publicUrl: "/site/EDUCARE",
  updatedAt: null,
  publishedAt: null,

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

  portalBar: {
    visible: true,
    modeText: "Public Portal Mode",
    description: "Live view rendered from Website Studio Controls",
    backLabel: "Back to ERP Admin Panel",
    backUrl: "/dashboard",
    verifiedText: "Verified Public Portal"
  },

  branding: {
    logoType: "text",
    logoText: "E",
    logoUrl: "",
    instituteName: "EduCare International Academy",
    tagline: "Nurturing Dreams. Building Leaders. Shaping Futures."
  },

  navigation: [
    { id: "nav-home", label: "Home", target: "#home", visible: true },
    { id: "nav-about", label: "About", target: "#about", visible: true },
    {
      id: "nav-facilities",
      label: "STEM Facilities",
      target: "#facilities",
      visible: true
    },
    {
      id: "nav-notices",
      label: "Notice Board",
      target: "#notices",
      visible: true
    },
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
      "EduCare International Academy is committed to cultivating critical thinking, moral integrity, and modern technological competency. Our state-of-the-art facilities and dedicated faculty prepare students for world-class universities.",
    principalEyebrow: "PRINCIPAL",
    principalTitle: "Message from the Desk of Principal",
    principalMessage:
      "Education is not merely the learning of facts, but training the mind to think critically and compassionately. At EduCare, we empower every child to uncover their highest potential.",
    principalName: "Dr. Eleanor Vance",
    principalRole: "Principal & Academic Director (Ph.D. Education)",
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
        title: "Parent-Teacher Interactive Meeting for Term 1",
        description:
          "All parents are invited for the term progress assessment and individual teacher consultations from 9:00 AM to 1:00 PM."
      },
      {
        id: "notice-2",
        date: "2026-08-12",
        title: "National Science & Robotics Expo 2026 Registration",
        description:
          "Students from Grade VII to XII can register their innovative science projects with their respective class teachers by August 10."
      },
      {
        id: "notice-3",
        date: "2026-08-15",
        title: "Mid-Term Examination Timetable Released",
        description:
          "The detailed schedule for Grade IX-XII mid-term examinations is now available on the student portal."
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
          "Over 25 schools competing in line-follower, autonomous drone obstacle, and AI problem-solving challenges.",
        venue: "Main Auditorium & Innovation Lab",
        imageUrl: ""
      },
      {
        id: "event-2",
        type: "Seminar",
        date: "2026-08-28",
        title: "Career Counseling & University Fair",
        description:
          "Representatives from 40+ international universities will present scholarship opportunities and application guidance.",
        venue: "Campus Sports Complex",
        imageUrl: ""
      },
      {
        id: "event-3",
        type: "Sports",
        date: "2026-09-02",
        title: "EduCare Champions League Sports Meet",
        description:
          "Track and field events, football finals, and archery championships.",
        venue: "Central Stadium Track",
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
      },
      {
        id: "topper-2",
        position: "Position 2",
        name: "Sophia Rodriguez",
        className: "Grade XII - Commerce Stream",
        score: "97.8%",
        scoreLabel: "Score",
        photoUrl: ""
      },
      {
        id: "topper-3",
        position: "Position 3",
        name: "Rohan Patel",
        className: "Grade X Board Examinations",
        score: "98.2%",
        scoreLabel: "Score",
        photoUrl: ""
      },
      {
        id: "topper-4",
        position: "Position 4",
        name: "Ananya Deshmukh",
        className: "Grade XII - Humanities Stream",
        score: "97.4%",
        scoreLabel: "Score",
        photoUrl: ""
      }
    ]
  },

  admissions: {
    visible: true,
    title: "Admissions Open for Academic Year 2026-27",
    description:
      "Join our vibrant academic community! Seats are available for Nursery to Grade XII across Science, Commerce, and Humanities streams.",
    buttonText: "Submit Admission Request",
    buttonUrl: "#contact"
  },

  footer: {
    visible: true,
    instituteName: "EduCare International Academy",
    tagline: "Nurturing Dreams. Building Leaders. Shaping Futures.",
    email: "admissions@educare-academy.edu",
    phone: "+1 (800) 555-0199",
    address:
      "742 Evergreen Knowledge Parkway, Innovation District, CA 90210",
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

function safeString(value, fallback = "", maxLength = 5000) {
  return String(value ?? fallback).slice(0, maxLength);
}

function safeBoolean(value, fallback = true) {
  return typeof value === "boolean" ? value : fallback;
}

function safeCode(value) {
  return (
    safeString(value, "EDUCARE", 80)
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "EDUCARE"
  );
}

function safeId(value, prefix, index) {
  return (
    safeString(value, `${prefix}-${index + 1}`, 120)
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, "-") ||
    `${prefix}-${index + 1}`
  );
}

function mergeKnown(base, incoming) {
  if (Array.isArray(base)) {
    return Array.isArray(incoming) ? incoming : clone(base);
  }

  if (base && typeof base === "object") {
    const result = {};
    const source =
      incoming && typeof incoming === "object" ? incoming : {};

    for (const key of Object.keys(base)) {
      result[key] = mergeKnown(base[key], source[key]);
    }

    return result;
  }

  if (typeof base === "boolean") {
    return safeBoolean(incoming, base);
  }

  return safeString(incoming, base);
}

function normalizeItems(items, defaults, prefix, fields, limit) {
  const source = Array.isArray(items)
    ? items.slice(0, limit)
    : defaults;

  return source.map((item, index) => {
    const result = {
      id: safeId(item?.id, prefix, index)
    };

    for (const [field, maxLength] of fields) {
      result[field] = safeString(item?.[field], "", maxLength);
    }

    return result;
  });
}

function normalizeConfig(input = {}) {
  const merged = mergeKnown(defaultConfig, input);
  const institutionCode = safeCode(input.institutionCode);

  merged.version = 2;
  merged.institutionCode = institutionCode;
  merged.publicUrl = `/site/${institutionCode}`;
  merged.status =
    input.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT";
  merged.updatedAt = input.updatedAt || null;
  merged.publishedAt = input.publishedAt || null;

  merged.navigation = normalizeItems(
    input.navigation,
    defaultConfig.navigation,
    "nav",
    [
      ["label", 100],
      ["target", 300]
    ],
    20
  ).map((item, index) => ({
    ...item,
    visible: safeBoolean(
      input.navigation?.[index]?.visible,
      true
    )
  }));

  merged.statistics.items = normalizeItems(
    input.statistics?.items,
    defaultConfig.statistics.items,
    "stat",
    [
      ["value", 80],
      ["label", 160]
    ],
    16
  );

  merged.facilities.items = normalizeItems(
    input.facilities?.items,
    defaultConfig.facilities.items,
    "facility",
    [
      ["title", 220],
      ["description", 3000],
      ["imageUrl", 1000]
    ],
    20
  );

  merged.notices.items = normalizeItems(
    input.notices?.items,
    defaultConfig.notices.items,
    "notice",
    [
      ["date", 40],
      ["title", 250],
      ["description", 3000]
    ],
    40
  );

  merged.events.items = normalizeItems(
    input.events?.items,
    defaultConfig.events.items,
    "event",
    [
      ["type", 100],
      ["date", 40],
      ["title", 250],
      ["description", 3000],
      ["venue", 250],
      ["imageUrl", 1000]
    ],
    40
  );

  merged.toppers.items = normalizeItems(
    input.toppers?.items,
    defaultConfig.toppers.items,
    "topper",
    [
      ["position", 100],
      ["name", 180],
      ["className", 220],
      ["score", 80],
      ["scoreLabel", 80],
      ["photoUrl", 1000]
    ],
    30
  );

  const allowedSections = new Set(defaultConfig.sectionOrder);
  const requestedOrder = Array.isArray(input.sectionOrder)
    ? input.sectionOrder.filter((section) =>
        allowedSections.has(section)
      )
    : [];

  merged.sectionOrder = [
    ...new Set([
      ...requestedOrder,
      ...defaultConfig.sectionOrder
    ])
  ];

  merged.customCss = safeString(input.customCss, "", 20000);

  return merged;
}

function institutionContext(req) {
  const institutionId =
    req.user?.institutionId ||
    req.user?.institution?.id ||
    req.user?.schoolId ||
    req.user?.tenantId ||
    req.headers["x-institution-id"];

  const institutionCode =
    req.user?.institution?.code ||
    req.user?.institutionCode ||
    req.headers["x-institution-code"];

  if (institutionId) {
    return {
      id: safeCode(institutionId),
      code: institutionCode ? safeCode(institutionCode) : null
    };
  }

  if (process.env.NODE_ENV !== "production") {
    return {
      id: "LOCAL-DEVELOPMENT-INSTITUTION",
      code: institutionCode ? safeCode(institutionCode) : null
    };
  }

  return null;
}

function draftFile(institutionId) {
  return path.join(
    dataDirectory,
    `${safeCode(institutionId)}.draft.json`
  );
}

function publishedFile(institutionCode) {
  return path.join(
    dataDirectory,
    `${safeCode(institutionCode)}.published.json`
  );
}

async function ensureDirectory() {
  await fs.mkdir(dataDirectory, { recursive: true });
}

async function readJson(file) {
  await ensureDirectory();

  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function writeJson(file, value) {
  await ensureDirectory();

  await fs.writeFile(
    file,
    JSON.stringify(value, null, 2),
    "utf8"
  );
}

websiteStudioRouter.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Full Website Studio API is available."
  });
});

websiteStudioRouter.get(
  "/public/:institutionCode",
  async (req, res, next) => {
    try {
      const code = safeCode(req.params.institutionCode);
      const stored = await readJson(publishedFile(code));

      if (
        !stored?.config ||
        stored.config.status !== "PUBLISHED"
      ) {
        return res.status(404).json({
          success: false,
          message:
            "This institution has not published its website yet."
        });
      }

      return res.json({
        success: true,
        data: normalizeConfig(stored.config)
      });
    } catch (error) {
      next(error);
    }
  }
);

websiteStudioRouter.get("/", async (req, res, next) => {
  try {
    const context = institutionContext(req);

    if (!context) {
      return res.status(401).json({
        success: false,
        message: "Institution context is required."
      });
    }

    const requestedCode = safeCode(
      req.query.institutionCode ||
        context.code ||
        "EDUCARE"
    );

    const stored = await readJson(draftFile(context.id));
    const isNew = !stored?.config;

    const config = normalizeConfig(
      stored?.config || {
        ...defaultConfig,
        institutionCode: requestedCode
      }
    );

    return res.json({
      success: true,
      isNew,
      data: config
    });
  } catch (error) {
    next(error);
  }
});

websiteStudioRouter.put("/", async (req, res, next) => {
  try {
    const context = institutionContext(req);

    if (!context) {
      return res.status(401).json({
        success: false,
        message: "Institution context is required."
      });
    }

    const config = normalizeConfig({
      ...req.body,
      status: "DRAFT",
      updatedAt: new Date().toISOString(),
      publishedAt: req.body?.publishedAt || null
    });

    await writeJson(draftFile(context.id), {
      ownerInstitutionId: context.id,
      config
    });

    return res.json({
      success: true,
      message: "All Website Studio changes were saved.",
      data: config
    });
  } catch (error) {
    next(error);
  }
});

websiteStudioRouter.post(
  "/publish",
  async (req, res, next) => {
    try {
      const context = institutionContext(req);

      if (!context) {
        return res.status(401).json({
          success: false,
          message: "Institution context is required."
        });
      }

      const code = safeCode(req.body?.institutionCode);
      const existing = await readJson(publishedFile(code));

      if (
        existing?.ownerInstitutionId &&
        existing.ownerInstitutionId !== context.id
      ) {
        return res.status(409).json({
          success: false,
          message:
            "This public website code belongs to another institution."
        });
      }

      const now = new Date().toISOString();
      const config = normalizeConfig({
        ...req.body,
        institutionCode: code,
        status: "PUBLISHED",
        updatedAt: now,
        publishedAt: now
      });

      const record = {
        ownerInstitutionId: context.id,
        config
      };

      await writeJson(draftFile(context.id), record);
      await writeJson(publishedFile(code), record);

      return res.json({
        success: true,
        message:
          "Every landing-page change was saved and published.",
        data: config
      });
    } catch (error) {
      next(error);
    }
  }
);

websiteStudioRouter.post(
  "/unpublish",
  async (req, res, next) => {
    try {
      const context = institutionContext(req);

      if (!context) {
        return res.status(401).json({
          success: false,
          message: "Institution context is required."
        });
      }

      const stored = await readJson(draftFile(context.id));

      if (!stored?.config) {
        return res.status(404).json({
          success: false,
          message: "Website draft was not found."
        });
      }

      const code = safeCode(stored.config.institutionCode);
      const config = normalizeConfig({
        ...stored.config,
        status: "DRAFT",
        updatedAt: new Date().toISOString(),
        publishedAt: null
      });

      await writeJson(draftFile(context.id), {
        ownerInstitutionId: context.id,
        config
      });

      const published = await readJson(publishedFile(code));

      if (published?.ownerInstitutionId === context.id) {
        await fs.unlink(publishedFile(code)).catch((error) => {
          if (error?.code !== "ENOENT") throw error;
        });
      }

      return res.json({
        success: true,
        message: "Website was unpublished.",
        data: config
      });
    } catch (error) {
      next(error);
    }
  }
);
