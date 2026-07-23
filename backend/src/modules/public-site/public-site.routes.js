import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
export const publicSiteRouter = Router();

const pick = (record, keys, fallback = null) => {
  for (const key of keys) {
    if (record?.[key] !== undefined && record?.[key] !== null && record?.[key] !== "") {
      return record[key];
    }
  }
  return fallback;
};

async function findInstitution(code) {
  const model = prisma.institution || prisma.school || prisma.tenant;
  if (!model) return null;

  for (const where of [
    { code },
    { institutionCode: code },
    { slug: code },
    { subdomain: code }
  ]) {
    try {
      const record = await model.findFirst({ where });
      if (record) return record;
    } catch {}
  }

  return null;
}

async function safeMany(modelName, where, options = {}) {
  const model = prisma[modelName];
  if (!model) return [];
  try {
    return await model.findMany({ where, ...options });
  } catch {
    return [];
  }
}

publicSiteRouter.get("/:institutionCode", async (req, res, next) => {
  try {
    const code = String(req.params.institutionCode || "").trim();
    const institution = await findInstitution(code);

    if (!institution) {
      return res.status(404).json({ success: false, message: "Institution website not found." });
    }

    const institutionId = institution.id;
    const website = (
      await safeMany("institutionWebsite", { institutionId }, { take: 1, orderBy: { updatedAt: "desc" } })
    )[0] || (
      await safeMany("websiteSetting", { institutionId }, { take: 1, orderBy: { updatedAt: "desc" } })
    )[0] || {};

    const announcements = await safeMany("publicAnnouncement", { institutionId, isPublic: true }, { take: 6, orderBy: { createdAt: "desc" } });
    const events = await safeMany("institutionEvent", { institutionId, isPublic: true }, { take: 6, orderBy: { startDate: "asc" } });
    const toppers = await safeMany("publicTopper", { institutionId, isPublic: true }, { take: 9, orderBy: [{ className: "asc" }, { position: "asc" }] });

    const name = pick(institution, ["name", "institutionName", "schoolName", "title"], "Your Institution");

    res.json({
      success: true,
      data: {
        institution: {
          id: institutionId,
          code: pick(institution, ["code", "institutionCode", "slug", "subdomain"], code),
          name,
          logoUrl: pick(website, ["logoUrl", "logo"], pick(institution, ["logoUrl", "logo"], null)),
          email: pick(website, ["email", "contactEmail"], pick(institution, ["email", "officialEmail"], "")),
          phone: pick(website, ["phone", "contactPhone"], pick(institution, ["phone", "officialPhone"], "")),
          address: pick(website, ["address", "contactAddress"], pick(institution, ["address", "fullAddress"], ""))
        },
        theme: {
          primaryColor: pick(website, ["primaryColor"], "#072957"),
          accentColor: pick(website, ["accentColor"], "#ff9418")
        },
        hero: {
          eyebrow: pick(website, ["heroEyebrow"], `WELCOME TO ${name.toUpperCase()}`),
          title: pick(website, ["heroTitle"], "Smart Education, Better Future"),
          description: pick(website, ["heroDescription"], "A modern institution focused on academic excellence, character building and student success."),
          imageUrl: pick(website, ["heroImageUrl", "heroImage", "bannerImageUrl"], null)
        },
        about: {
          title: pick(website, ["aboutTitle"], "We Provide Quality Education for a Bright Future"),
          description: pick(website, ["aboutDescription"], `${name} provides a safe, inclusive and inspiring environment for every student.`),
          principalMessage: pick(website, ["principalMessage"], "Welcome to our learning community.")
        },
        announcements: announcements.map(item => ({
          id: item.id,
          title: pick(item, ["title", "name"], "Announcement"),
          summary: pick(item, ["summary", "description", "content"], ""),
          category: pick(item, ["category", "type"], "General"),
          publishDate: pick(item, ["publishedAt", "createdAt"], null)
        })),
        events: events.map(item => ({
          id: item.id,
          title: pick(item, ["title", "name"], "Institution Event"),
          description: pick(item, ["description", "summary"], ""),
          type: pick(item, ["type", "category"], "Event"),
          startDate: pick(item, ["startDate", "eventDate"], null),
          venue: pick(item, ["venue", "location"], "")
        })),
        toppers: toppers.map(item => ({
          id: item.id,
          studentName: pick(item, ["studentName", "name"], "Student"),
          className: pick(item, ["className", "gradeName"], ""),
          position: pick(item, ["position", "rank"], null),
          percentage: pick(item, ["percentage"], null),
          grade: pick(item, ["grade"], null),
          photoUrl: pick(item, ["photoUrl", "imageUrl"], null)
        }))
      }
    });
  } catch (error) {
    next(error);
  }
});
