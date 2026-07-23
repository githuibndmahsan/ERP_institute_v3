import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma.js";
import { authenticate, allowRoles } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const platformSettingsRouter = Router();
platformSettingsRouter.use(authenticate, allowRoles("SUPER_ADMIN"));

const defaults = {
  companyName: "Enterprise ERP",
  country: "Pakistan",
  currency: "PKR",
  timezone: "Asia/Karachi",
  invoicePrefix: "ERP-INV",
  invoiceDueDays: 7,
  gracePeriodDays: 7,
  autoSuspendEnabled: false,
  autoSuspendAfterDays: 15,
  defaultBillingCycle: "MONTHLY",
  defaultMonthlyPrice: 0,
  defaultAnnualPrice: 0,
  defaultConcession: 0,
  subdomainBase: "your-erp.com",
  allowCustomDomains: true,
  maintenanceMode: false,
  strongPasswords: true,
  sessionTimeoutMinutes: 60,
  maxLoginAttempts: 5,
  auditRetentionDays: 365,
  backupRetentionDays: 30,
  dailyBackupEnabled: true,
  emailFromName: "Enterprise ERP",
  smtpSecure: true
};

async function getSettings() {
  return (await prisma.platformSetting.findFirst()) ||
    prisma.platformSetting.create({ data: defaults });
}

platformSettingsRouter.get("/", asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await getSettings() });
}));

platformSettingsRouter.put("/", asyncHandler(async (req, res) => {
  const current = await getSettings();
  const allowed = [
    "companyName","legalName","supportEmail","billingEmail","supportPhone",
    "secondaryPhone","websiteUrl","address","city","country","currency",
    "timezone","taxName","taxRate","invoicePrefix","invoiceDueDays",
    "gracePeriodDays","autoSuspendEnabled","autoSuspendAfterDays",
    "defaultBillingCycle","defaultMonthlyPrice","defaultAnnualPrice",
    "defaultConcession","subdomainBase","allowCustomDomains",
    "maintenanceMode","maintenanceMessage","strongPasswords",
    "sessionTimeoutMinutes","maxLoginAttempts","auditRetentionDays",
    "backupRetentionDays","dailyBackupEnabled","emailFromName",
    "emailFromAddress","smtpHost","smtpPort","smtpUsername","smtpSecure"
  ];

  const data = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(req.body, key)) data[key] = req.body[key];
  }

  const updated = await prisma.platformSetting.update({
    where: { id: current.id },
    data
  });

  await prisma.platformAuditEvent.create({
    data: {
      userId: req.user?.id || null,
      action: "PLATFORM_SETTINGS_UPDATED",
      module: "SETTINGS",
      entityType: "PlatformSetting",
      entityId: String(updated.id),
      description: "Platform settings were updated."
    }
  });

  res.json({ success: true, message: "Settings updated.", data: updated });
}));

platformSettingsRouter.get("/templates", asyncHandler(async (_req, res) => {
  const data = await prisma.notificationTemplate.findMany({
    orderBy: { name: "asc" }
  });
  res.json({ success: true, data });
}));

platformSettingsRouter.post("/templates", asyncHandler(async (req, res) => {
  const payload = z.object({
    code: z.string().min(2),
    name: z.string().min(2),
    subject: z.string().min(1),
    body: z.string().min(1),
    channel: z.enum(["EMAIL","SMS","IN_APP"]).default("EMAIL"),
    isActive: z.boolean().default(true)
  }).parse(req.body);

  const data = await prisma.notificationTemplate.create({ data: payload });
  res.status(201).json({ success: true, data });
}));

platformSettingsRouter.put("/templates/:id", asyncHandler(async (req, res) => {
  const data = await prisma.notificationTemplate.update({
    where: { id: Number(req.params.id) },
    data: req.body
  });
  res.json({ success: true, data });
}));

platformSettingsRouter.get("/audit", asyncHandler(async (req, res) => {
  const data = await prisma.platformAuditEvent.findMany({
    take: Math.min(Number(req.query.limit) || 50, 200),
    orderBy: { createdAt: "desc" }
  });
  res.json({ success: true, data });
}));
