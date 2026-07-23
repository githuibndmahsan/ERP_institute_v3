import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const superHash = await bcrypt.hash("Admin@12345", 12);
  const instituteHash = await bcrypt.hash("Institute@12345", 12);

  await prisma.user.upsert({
    where: { username: "admin-ndmahsan" },
    update: { name: "ERP Super Admin", passwordHash: superHash, role: "SUPER_ADMIN", institutionId: null, isActive: true },
    create: { name: "ERP Super Admin", username: "admin-ndmahsan", email: "superadmin@erp.local", passwordHash: superHash, role: "SUPER_ADMIN" }
  });

  const monthly = await prisma.subscriptionPlan.upsert({
    where: { name: "Professional Monthly" },
    update: {},
    create: { name: "Professional Monthly", billingCycle: "MONTHLY", basePrice: 25000, maxStudents: 3000, maxUsers: 100 }
  });
  await prisma.subscriptionPlan.upsert({
    where: { name: "Professional Annual" },
    update: {},
    create: { name: "Professional Annual", billingCycle: "ANNUAL", basePrice: 250000, maxStudents: 3000, maxUsers: 100 }
  });

  const institution = await prisma.institution.upsert({
    where: { code: "DEMO" },
    update: {},
    create: {
      name: "Demo International School", code: "DEMO", tenantKey: "demo", subdomain: "demo.your-erp.com",
      officialEmail: "info@demo.edu.pk", billingEmail: "accounts@demo.edu.pk", primaryPhone: "0300-1234567",
      secondaryPhone: "0301-7654321", contactPersonName: "Demo Principal", contactPersonTitle: "Principal", city: "Lahore", activatedAt: new Date()
    }
  });

  await prisma.user.upsert({
    where: { username: "demo-admin" },
    update: { institutionId: institution.id, passwordHash: instituteHash, role: "INSTITUTE_ADMIN", isActive: true },
    create: { institutionId: institution.id, name: "Demo Institute Admin", username: "demo-admin", email: "admin@demo.edu.pk", passwordHash: instituteHash, role: "INSTITUTE_ADMIN" }
  });

  const existingSub = await prisma.subscription.findFirst({ where: { institutionId: institution.id } });
  if (!existingSub) {
    const next = new Date(); next.setMonth(next.getMonth() + 1);
    await prisma.subscription.create({ data: { institutionId: institution.id, planId: monthly.id, status: "ACTIVE", startDate: new Date(), nextBillingDate: next } });
  }

  const invoice = await prisma.saaSInvoice.findUnique({ where: { invoiceNo: "SINV-2026-0001" } });
  if (!invoice) {
    const due = new Date(); due.setDate(due.getDate() + 7);
    await prisma.saaSInvoice.create({ data: { institutionId: institution.id, invoiceNo: "SINV-2026-0001", issueDate: new Date(), dueDate: due, subtotal: 25000, concessionAmount: 2500, totalAmount: 22500, paidAmount: 10000, status: "PARTIAL" } });
  }

  const inquiryCount = await prisma.clientInquiry.count();
  if (!inquiryCount) {
    await prisma.clientInquiry.createMany({ data: [
      { institutionName: "Greenfield College", contactName: "Ali Khan", email: "admin@greenfield.edu.pk", phone: "0300-1112233", city: "Islamabad", message: "Need ERP demo", source: "Marketing Website" },
      { institutionName: "Future Scholars School", contactName: "Sara Ahmed", email: "principal@future.edu.pk", phone: "0321-5556677", city: "Karachi", message: "Need pricing details", source: "Website Contact Form" }
    ]});
  }

  console.log("Seed complete");
  console.log("Super Admin: admin-ndmahsan / Admin@12345");
  console.log("Institute Admin: demo-admin / Institute@12345");
}
main().catch(console.error).finally(() => prisma.$disconnect());
