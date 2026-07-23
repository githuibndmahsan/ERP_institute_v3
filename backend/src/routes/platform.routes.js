import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { authenticate, allowRoles } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const platformRouter = Router();
platformRouter.use(authenticate, allowRoles("SUPER_ADMIN"));

platformRouter.get("/dashboard", asyncHandler(async (req, res) => {
  const now = new Date();
  const [institutions, active, suspended, users, invoices, inquiries, overdueInvoices] = await Promise.all([
    prisma.institution.count(),
    prisma.institution.count({ where: { status: "ACTIVE" } }),
    prisma.institution.count({ where: { status: "SUSPENDED" } }),
    prisma.user.count(),
    prisma.saaSInvoice.aggregate({ _sum: { totalAmount: true, paidAmount: true } }),
    prisma.clientInquiry.count({ where: { status: "NEW" } }),
    prisma.saaSInvoice.count({ where: { dueDate: { lt: now }, status: { in: ["PENDING", "PARTIAL", "OVERDUE"] } } })
  ]);
  const billed = Number(invoices._sum.totalAmount || 0);
  const collected = Number(invoices._sum.paidAmount || 0);
  res.json({ success: true, data: { institutions, active, suspended, users, billed, collected, outstanding: billed - collected, newInquiries: inquiries, overdueInvoices } });
}));

platformRouter.get("/institutions", asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
  const search = String(req.query.search || "").trim();
  const status = String(req.query.status || "").trim();
  const where = {
    ...(status && { status }),
    ...(search && { OR: [
      { name: { contains: search } }, { code: { contains: search } },
      { officialEmail: { contains: search } }, { primaryPhone: { contains: search } }
    ] })
  };
  const [items, total] = await Promise.all([
    prisma.institution.findMany({
      where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: "desc" },
      include: { _count: { select: { users: true, invoices: true } }, subscriptions: { take: 1, orderBy: { createdAt: "desc" }, include: { plan: true } } }
    }),
    prisma.institution.count({ where })
  ]);
  res.json({ success: true, data: { items, total, page, limit, totalPages: Math.max(Math.ceil(total / limit), 1) } });
}));

const institutionSchema = z.object({
  name: z.string().trim().min(2), code: z.string().trim().min(2).max(30), tenantKey: z.string().trim().min(2),
  subdomain: z.string().trim().min(2), officialEmail: z.string().email().optional().or(z.literal("")),
  billingEmail: z.string().email().optional().or(z.literal("")), primaryPhone: z.string().optional(), secondaryPhone: z.string().optional(),
  contactPersonName: z.string().optional(), contactPersonTitle: z.string().optional(), address: z.string().optional(), city: z.string().optional(),
  adminName: z.string().trim().min(2), adminUsername: z.string().trim().min(3), adminEmail: z.string().email(), adminPassword: z.string().min(8),
  planId: z.coerce.number().int().positive(), customPrice: z.coerce.number().nonnegative().optional(), concessionAmount: z.coerce.number().nonnegative().default(0)
});

platformRouter.post("/institutions", asyncHandler(async (req, res) => {
  const input = institutionSchema.parse(req.body);
  const passwordHash = await bcrypt.hash(input.adminPassword, 12);
  const startDate = new Date();
  const nextBillingDate = new Date(startDate);
  nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

  const data = await prisma.$transaction(async (tx) => {
    const institution = await tx.institution.create({ data: {
      name: input.name, code: input.code.toUpperCase(), tenantKey: input.tenantKey.toLowerCase(), subdomain: input.subdomain.toLowerCase(),
      officialEmail: input.officialEmail || null, billingEmail: input.billingEmail || null, primaryPhone: input.primaryPhone || null,
      secondaryPhone: input.secondaryPhone || null, contactPersonName: input.contactPersonName || null, contactPersonTitle: input.contactPersonTitle || null,
      address: input.address || null, city: input.city || null, activatedAt: new Date()
    }});
    const admin = await tx.user.create({ data: {
      institutionId: institution.id, name: input.adminName, username: input.adminUsername.toLowerCase(), email: input.adminEmail.toLowerCase(),
      passwordHash, role: "INSTITUTE_ADMIN", isActive: true
    }});
    const subscription = await tx.subscription.create({ data: {
      institutionId: institution.id, planId: input.planId, status: "ACTIVE", startDate, nextBillingDate,
      customPrice: input.customPrice ?? null, concessionAmount: input.concessionAmount
    }});
    return { institution, admin, subscription };
  });
  res.status(201).json({ success: true, data });
}));

platformRouter.patch("/institutions/:id/status", asyncHandler(async (req, res) => {
  const status = z.enum(["ACTIVE", "SUSPENDED", "MAINTENANCE"]).parse(req.body.status);
  const id = Number(req.params.id);
  const institution = await prisma.institution.update({ where: { id }, data: {
    status, suspendedAt: status === "SUSPENDED" ? new Date() : null,
    suspensionReason: status === "SUSPENDED" ? String(req.body.reason || "Subscription or administrative hold") : null
  }});
  res.json({ success: true, data: institution });
}));


platformRouter.get("/institutions/:id", asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const institution = await prisma.institution.findUnique({
    where: { id },
    include: {
      users: {
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, username: true, email: true, role: true, isActive: true, lastLoginAt: true, createdAt: true }
      },
      subscriptions: {
        orderBy: { createdAt: "desc" },
        include: { plan: true },
        take: 5
      },
      invoices: {
        orderBy: { createdAt: "desc" },
        include: { payments: true },
        take: 10
      },
      _count: { select: { users: true, invoices: true } }
    }
  });
  if (!institution) return res.status(404).json({ success: false, message: "Institution not found." });
  res.json({ success: true, data: institution });
}));

const institutionUpdateSchema = z.object({
  name: z.string().trim().min(2),
  code: z.string().trim().min(2).max(30),
  tenantKey: z.string().trim().min(2),
  subdomain: z.string().trim().min(2),
  customDomain: z.string().trim().optional().or(z.literal("")),
  officialEmail: z.string().email().optional().or(z.literal("")),
  billingEmail: z.string().email().optional().or(z.literal("")),
  primaryPhone: z.string().optional(),
  secondaryPhone: z.string().optional(),
  contactPersonName: z.string().optional(),
  contactPersonTitle: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional()
});

platformRouter.put("/institutions/:id", asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const input = institutionUpdateSchema.parse(req.body);
  const exists = await prisma.institution.findUnique({ where: { id } });
  if (!exists) return res.status(404).json({ success: false, message: "Institution not found." });

  const institution = await prisma.institution.update({
    where: { id },
    data: {
      name: input.name,
      code: input.code.toUpperCase(),
      tenantKey: input.tenantKey.toLowerCase(),
      subdomain: input.subdomain.toLowerCase(),
      customDomain: input.customDomain || null,
      officialEmail: input.officialEmail || null,
      billingEmail: input.billingEmail || null,
      primaryPhone: input.primaryPhone || null,
      secondaryPhone: input.secondaryPhone || null,
      contactPersonName: input.contactPersonName || null,
      contactPersonTitle: input.contactPersonTitle || null,
      address: input.address || null,
      city: input.city || null,
      country: input.country || "Pakistan"
    }
  });
  res.json({ success: true, message: "Institution updated successfully.", data: institution });
}));

platformRouter.delete("/institutions/:id", asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const institution = await prisma.institution.findUnique({
    where: { id },
    include: { _count: { select: { users: true, invoices: true } } }
  });
  if (!institution) return res.status(404).json({ success: false, message: "Institution not found." });
  if (institution.status !== "SUSPENDED") {
    return res.status(409).json({ success: false, message: "Suspend the institution before removing it." });
  }
  await prisma.institution.delete({ where: { id } });
  res.json({ success: true, message: "Institution removed successfully." });
}));


platformRouter.get("/billing/summary", asyncHandler(async (_req, res) => {
  const now = new Date();
  await prisma.saaSInvoice.updateMany({ where: { dueDate: { lt: now }, status: { in: ["PENDING", "PARTIAL"] } }, data: { status: "OVERDUE" } });
  const [totals, overdueCount, paidCount, partialCount, activeSubscriptions] = await Promise.all([
    prisma.saaSInvoice.aggregate({ _sum: { totalAmount: true, paidAmount: true, concessionAmount: true } }),
    prisma.saaSInvoice.count({ where: { status: "OVERDUE" } }), prisma.saaSInvoice.count({ where: { status: "PAID" } }),
    prisma.saaSInvoice.count({ where: { status: "PARTIAL" } }), prisma.subscription.count({ where: { status: "ACTIVE" } })
  ]);
  const billed=Number(totals._sum.totalAmount||0), collected=Number(totals._sum.paidAmount||0);
  res.json({success:true,data:{billed,collected,outstanding:Math.max(billed-collected,0),concessions:Number(totals._sum.concessionAmount||0),overdueCount,paidCount,partialCount,activeSubscriptions}});
}));

platformRouter.get("/billing/invoices", asyncHandler(async (req, res) => {
  const page=Math.max(Number(req.query.page)||1,1), limit=Math.min(Math.max(Number(req.query.limit)||10,1),100);
  const search=String(req.query.search||"").trim(), status=String(req.query.status||"").trim(), institutionId=Number(req.query.institutionId||0);
  const now=new Date();
  await prisma.saaSInvoice.updateMany({ where:{dueDate:{lt:now},status:{in:["PENDING","PARTIAL"]}}, data:{status:"OVERDUE"} });
  const where={...(status&&{status}),...(institutionId>0&&{institutionId}),...(search&&{OR:[{invoiceNo:{contains:search}},{institution:{name:{contains:search}}},{institution:{code:{contains:search}}}]})};
  const [items,total]=await Promise.all([
    prisma.saaSInvoice.findMany({where,skip:(page-1)*limit,take:limit,orderBy:{createdAt:"desc"},include:{institution:{select:{id:true,name:true,code:true,status:true,billingEmail:true}},subscription:{include:{plan:true}},payments:{orderBy:{paymentDate:"desc"}}}}),
    prisma.saaSInvoice.count({where})
  ]);
  res.json({success:true,data:{items,total,page,limit,totalPages:Math.max(Math.ceil(total/limit),1)}});
}));

const billingPlanSchema=z.object({name:z.string().trim().min(2),billingCycle:z.enum(["MONTHLY","ANNUAL"]),basePrice:z.coerce.number().nonnegative(),currency:z.string().trim().min(2).default("PKR"),maxStudents:z.coerce.number().int().positive().optional(),maxUsers:z.coerce.number().int().positive().optional()});
platformRouter.post("/billing/plans",asyncHandler(async(req,res)=>{const i=billingPlanSchema.parse(req.body);const plan=await prisma.subscriptionPlan.create({data:{name:i.name,billingCycle:i.billingCycle,basePrice:i.basePrice,currency:i.currency.toUpperCase(),maxStudents:i.maxStudents||null,maxUsers:i.maxUsers||null,isActive:true}});res.status(201).json({success:true,message:"Subscription plan created.",data:plan});}));
platformRouter.patch("/billing/plans/:id/status",asyncHandler(async(req,res)=>{const plan=await prisma.subscriptionPlan.update({where:{id:Number(req.params.id)},data:{isActive:z.boolean().parse(req.body.isActive)}});res.json({success:true,data:plan});}));

const billingInvoiceSchema=z.object({institutionId:z.coerce.number().int().positive(),subscriptionId:z.coerce.number().int().positive().optional(),issueDate:z.coerce.date(),dueDate:z.coerce.date(),subtotal:z.coerce.number().nonnegative(),concessionAmount:z.coerce.number().nonnegative().default(0),taxAmount:z.coerce.number().nonnegative().default(0),notes:z.string().optional()});
platformRouter.post("/billing/invoices",asyncHandler(async(req,res)=>{const i=billingInvoiceSchema.parse(req.body);const totalAmount=Math.max(i.subtotal-i.concessionAmount+i.taxAmount,0);const count=await prisma.saaSInvoice.count();const invoiceNo=`SINV-${new Date().getFullYear()}-${String(count+1).padStart(5,"0")}`;const invoice=await prisma.saaSInvoice.create({data:{institutionId:i.institutionId,subscriptionId:i.subscriptionId||null,invoiceNo,issueDate:i.issueDate,dueDate:i.dueDate,subtotal:i.subtotal,concessionAmount:i.concessionAmount,taxAmount:i.taxAmount,totalAmount,paidAmount:0,status:"PENDING",notes:i.notes||null},include:{institution:true,subscription:{include:{plan:true}},payments:true}});res.status(201).json({success:true,message:"SaaS invoice generated.",data:invoice});}));

const billingPaymentSchema=z.object({amount:z.coerce.number().positive(),paymentDate:z.coerce.date(),method:z.string().trim().min(2),referenceNo:z.string().optional(),receivedBy:z.string().optional(),notes:z.string().optional()});
platformRouter.post("/billing/invoices/:id/payments",asyncHandler(async(req,res)=>{const id=Number(req.params.id),i=billingPaymentSchema.parse(req.body);const invoice=await prisma.saaSInvoice.findUnique({where:{id}});if(!invoice)return res.status(404).json({success:false,message:"Invoice not found."});const outstanding=Number(invoice.totalAmount)-Number(invoice.paidAmount);if(i.amount>outstanding+.001)return res.status(409).json({success:false,message:`Payment exceeds outstanding amount of ${outstanding}.`});const paidAmount=Number(invoice.paidAmount)+i.amount,status=paidAmount>=Number(invoice.totalAmount)?"PAID":"PARTIAL";const data=await prisma.$transaction(async tx=>{const payment=await tx.saaSPayment.create({data:{invoiceId:id,amount:i.amount,paymentDate:i.paymentDate,method:i.method,referenceNo:i.referenceNo||null,receivedBy:i.receivedBy||null,notes:i.notes||null}});const updatedInvoice=await tx.saaSInvoice.update({where:{id},data:{paidAmount,status}});return{payment,invoice:updatedInvoice}});res.status(201).json({success:true,message:"Payment recorded.",data});}));

platformRouter.post("/billing/run-overdue",asyncHandler(async(_req,res)=>{const now=new Date();const updated=await prisma.saaSInvoice.updateMany({where:{dueDate:{lt:now},status:{in:["PENDING","PARTIAL"]}},data:{status:"OVERDUE"}});const subs=await prisma.subscription.findMany({where:{autoSuspend:true,invoices:{some:{status:"OVERDUE"}}},include:{institution:true,invoices:{where:{status:"OVERDUE"}}}});let suspended=0;for(const sub of subs){const oldest=sub.invoices.sort((a,b)=>new Date(a.dueDate)-new Date(b.dueDate))[0];const suspendDate=new Date(oldest.dueDate);suspendDate.setDate(suspendDate.getDate()+sub.graceDays);if(suspendDate<now&&sub.institution.status!=="SUSPENDED"){await prisma.$transaction([prisma.institution.update({where:{id:sub.institutionId},data:{status:"SUSPENDED",suspendedAt:now,suspensionReason:"Automatically suspended due to overdue SaaS subscription."}}),prisma.subscription.update({where:{id:sub.id},data:{status:"SUSPENDED"}})]);suspended++;}}res.json({success:true,message:"Overdue processing completed.",data:{invoicesMarkedOverdue:updated.count,institutionsSuspended:suspended}});}));


function reportDateRange(query) {
  const now = new Date();
  const fallbackFrom = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const from = query.from ? new Date(`${query.from}T00:00:00.000Z`) : fallbackFrom;
  const to = query.to ? new Date(`${query.to}T23:59:59.999Z`) : now;
  return { from, to };
}

function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function sendCsv(res, filename, headers, rows) {
  const csv = [headers, ...rows]
    .map((row) => row.map(csvEscape).join(","))
    .join("\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(`\uFEFF${csv}`);
}

platformRouter.get("/reports/summary", asyncHandler(async (req, res) => {
  const { from, to } = reportDateRange(req.query);
  const period = { gte: from, lte: to };

  const [
    institutions,
    subscriptions,
    invoiceTotals,
    invoiceStatuses,
    payments,
    concessions,
    inquiries,
    inquiryStatuses,
    users,
    userRoles,
    recentInstitutions,
    topInstitutions,
  ] = await Promise.all([
    prisma.institution.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.subscription.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.saaSInvoice.aggregate({
      where: { issueDate: period },
      _sum: { totalAmount: true, paidAmount: true, concessionAmount: true, taxAmount: true },
      _count: { _all: true },
    }),
    prisma.saaSInvoice.groupBy({
      by: ["status"],
      where: { issueDate: period },
      _count: { _all: true },
      _sum: { totalAmount: true, paidAmount: true },
    }),
    prisma.saaSPayment.findMany({
      where: { paymentDate: period },
      select: { amount: true, paymentDate: true, method: true },
      orderBy: { paymentDate: "asc" },
    }),
    prisma.saaSInvoice.aggregate({
      where: { issueDate: period },
      _sum: { concessionAmount: true },
    }),
    prisma.clientInquiry.count({ where: { createdAt: period } }),
    prisma.clientInquiry.groupBy({
      by: ["status"],
      where: { createdAt: period },
      _count: { _all: true },
    }),
    prisma.user.count(),
    prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
    prisma.institution.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, code: true, status: true, createdAt: true },
    }),
    prisma.institution.findMany({
      take: 10,
      orderBy: { invoices: { _count: "desc" } },
      select: {
        id: true,
        name: true,
        code: true,
        status: true,
        _count: { select: { users: true, invoices: true } },
        invoices: {
          where: { issueDate: period },
          select: { totalAmount: true, paidAmount: true, concessionAmount: true },
        },
      },
    }),
  ]);

  const monthlyMap = new Map();
  const methodMap = new Map();
  for (const payment of payments) {
    const date = new Date(payment.paymentDate);
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    monthlyMap.set(key, (monthlyMap.get(key) || 0) + Number(payment.amount));
    methodMap.set(payment.method, (methodMap.get(payment.method) || 0) + Number(payment.amount));
  }

  const billed = Number(invoiceTotals._sum.totalAmount || 0);
  const collected = Number(invoiceTotals._sum.paidAmount || 0);
  const outstanding = Math.max(billed - collected, 0);
  const activeInstitutions = institutions.find((x) => x.status === "ACTIVE")?._count?._all || 0;
  const totalInstitutions = institutions.reduce((sum, x) => sum + x._count._all, 0);
  const converted = inquiryStatuses.find((x) => x.status === "CONVERTED")?._count?._all || 0;

  const institutionPerformance = topInstitutions.map((institution) => {
    const totals = institution.invoices.reduce(
      (acc, invoice) => {
        acc.billed += Number(invoice.totalAmount || 0);
        acc.collected += Number(invoice.paidAmount || 0);
        acc.concessions += Number(invoice.concessionAmount || 0);
        return acc;
      },
      { billed: 0, collected: 0, concessions: 0 },
    );
    return {
      id: institution.id,
      name: institution.name,
      code: institution.code,
      status: institution.status,
      users: institution._count.users,
      invoiceCount: institution._count.invoices,
      ...totals,
      outstanding: Math.max(totals.billed - totals.collected, 0),
      collectionRate: totals.billed ? Number(((totals.collected / totals.billed) * 100).toFixed(1)) : 0,
    };
  });

  res.json({
    success: true,
    data: {
      range: { from, to },
      kpis: {
        totalInstitutions,
        activeInstitutions,
        billed,
        collected,
        outstanding,
        concessions: Number(concessions._sum.concessionAmount || 0),
        invoices: invoiceTotals._count._all,
        inquiries,
        conversionRate: inquiries ? Number(((converted / inquiries) * 100).toFixed(1)) : 0,
        users,
      },
      institutionStatuses: institutions.map((x) => ({ name: x.status, value: x._count._all })),
      subscriptionStatuses: subscriptions.map((x) => ({ name: x.status, value: x._count._all })),
      invoiceStatuses: invoiceStatuses.map((x) => ({
        name: x.status,
        count: x._count._all,
        billed: Number(x._sum.totalAmount || 0),
        collected: Number(x._sum.paidAmount || 0),
      })),
      inquiryStatuses: inquiryStatuses.map((x) => ({ name: x.status, value: x._count._all })),
      userRoles: userRoles.map((x) => ({ name: x.role, value: x._count._all })),
      monthlyRevenue: [...monthlyMap.entries()].map(([month, amount]) => ({ month, amount })),
      paymentMethods: [...methodMap.entries()].map(([name, value]) => ({ name, value })),
      recentInstitutions,
      institutionPerformance,
    },
  });
}));

platformRouter.get("/reports/export/:type", asyncHandler(async (req, res) => {
  const { from, to } = reportDateRange(req.query);
  const period = { gte: from, lte: to };
  const type = String(req.params.type || "").toLowerCase();
  const stamp = new Date().toISOString().slice(0, 10);

  if (type === "institutions") {
    const rows = await prisma.institution.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { users: true, invoices: true } },
        subscriptions: { take: 1, orderBy: { createdAt: "desc" }, include: { plan: true } },
      },
    });
    return sendCsv(res, `institutions-${stamp}.csv`,
      ["ID", "Institution", "Code", "Status", "Official Email", "Billing Email", "Primary Phone", "City", "Subdomain", "Plan", "Subscription Status", "Users", "Invoices", "Created At"],
      rows.map((x) => [x.id, x.name, x.code, x.status, x.officialEmail, x.billingEmail, x.primaryPhone, x.city, x.subdomain, x.subscriptions[0]?.plan?.name, x.subscriptions[0]?.status, x._count.users, x._count.invoices, x.createdAt.toISOString()])
    );
  }

  if (type === "invoices") {
    const rows = await prisma.saaSInvoice.findMany({
      where: { issueDate: period },
      orderBy: { issueDate: "desc" },
      include: { institution: true, subscription: { include: { plan: true } } },
    });
    return sendCsv(res, `invoices-${stamp}.csv`,
      ["Invoice No", "Institution", "Code", "Plan", "Issue Date", "Due Date", "Subtotal", "Concession", "Tax", "Total", "Paid", "Outstanding", "Status"],
      rows.map((x) => [x.invoiceNo, x.institution.name, x.institution.code, x.subscription?.plan?.name, x.issueDate.toISOString().slice(0,10), x.dueDate.toISOString().slice(0,10), x.subtotal, x.concessionAmount, x.taxAmount, x.totalAmount, x.paidAmount, Number(x.totalAmount)-Number(x.paidAmount), x.status])
    );
  }

  if (type === "payments") {
    const rows = await prisma.saaSPayment.findMany({
      where: { paymentDate: period },
      orderBy: { paymentDate: "desc" },
      include: { invoice: { include: { institution: true } } },
    });
    return sendCsv(res, `payments-${stamp}.csv`,
      ["Payment ID", "Invoice No", "Institution", "Code", "Amount", "Date", "Method", "Reference", "Received By"],
      rows.map((x) => [x.id, x.invoice.invoiceNo, x.invoice.institution.name, x.invoice.institution.code, x.amount, x.paymentDate.toISOString().slice(0,10), x.method, x.referenceNo, x.receivedBy])
    );
  }

  if (type === "crm") {
    const rows = await prisma.clientInquiry.findMany({ where: { createdAt: period }, orderBy: { createdAt: "desc" } });
    return sendCsv(res, `crm-inquiries-${stamp}.csv`,
      ["ID", "Institution", "Contact", "Email", "Phone", "City", "Source", "Status", "Assigned To", "Follow Up", "Created At"],
      rows.map((x) => [x.id, x.institutionName, x.contactName, x.email, x.phone, x.city, x.source, x.status, x.assignedTo, x.followUpAt?.toISOString(), x.createdAt.toISOString()])
    );
  }

  if (type === "users") {
    const rows = await prisma.user.findMany({ orderBy: { createdAt: "desc" }, include: { institution: true } });
    return sendCsv(res, `users-${stamp}.csv`,
      ["ID", "Name", "Username", "Email", "Role", "Institution", "Institution Code", "Active", "Last Login", "Created At"],
      rows.map((x) => [x.id, x.name, x.username, x.email, x.role, x.institution?.name, x.institution?.code, x.isActive ? "Yes" : "No", x.lastLoginAt?.toISOString(), x.createdAt.toISOString()])
    );
  }

  return res.status(400).json({ success: false, message: "Unknown report export type." });
}));

platformRouter.get("/plans", asyncHandler(async (req, res) => {
  const items = await prisma.subscriptionPlan.findMany({ where: { isActive: true }, orderBy: { basePrice: "asc" } });
  res.json({ success: true, data: items });
}));

platformRouter.get("/invoices", asyncHandler(async (req, res) => {
  const items = await prisma.saaSInvoice.findMany({ take: 50, orderBy: { createdAt: "desc" }, include: { institution: true } });
  res.json({ success: true, data: items });
}));

platformRouter.get("/inquiries", asyncHandler(async (req, res) => {
  const items = await prisma.clientInquiry.findMany({ take: 100, orderBy: { createdAt: "desc" } });
  res.json({ success: true, data: items });
}));


const inquiryCreateSchema = z.object({
  institutionName: z.string().trim().min(2),
  institutionType: z.string().trim().optional().or(z.literal("")),
  contactName: z.string().trim().min(2),
  designation: z.string().trim().optional().or(z.literal("")),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  alternatePhone: z.string().trim().optional().or(z.literal("")),
  city: z.string().trim().optional().or(z.literal("")),
  address: z.string().trim().optional().or(z.literal("")),
  website: z.string().trim().optional().or(z.literal("")),
  expectedStudents: z.coerce.number().int().nonnegative().optional().nullable(),
  message: z.string().trim().optional().or(z.literal("")),
  source: z.string().trim().optional().or(z.literal("")),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  assignedTo: z.string().trim().optional().or(z.literal("")),
  followUpAt: z.string().optional().or(z.literal(""))
});

const inquiryUpdateSchema = inquiryCreateSchema.partial().extend({
  status: z.enum(["NEW", "CONTACTED", "QUALIFIED", "CONVERTED", "CLOSED"]).optional()
});

const activitySchema = z.object({
  type: z.enum(["NOTE", "EMAIL", "CALL", "MEETING", "FOLLOW_UP", "STATUS_CHANGE"]),
  subject: z.string().trim().optional().or(z.literal("")),
  details: z.string().trim().min(2),
  performedBy: z.string().trim().optional().or(z.literal("")),
  activityAt: z.string().optional().or(z.literal(""))
});

const noticeSchema = z.object({
  title: z.string().trim().min(3),
  message: z.string().trim().min(3),
  severity: z.enum(["INFO", "SUCCESS", "WARNING", "CRITICAL"]).default("INFO"),
  publishAt: z.string().optional().or(z.literal("")),
  expiresAt: z.string().optional().or(z.literal("")),
  isBroadcast: z.boolean().default(true),
  institutionIds: z.array(z.coerce.number().int().positive()).default([])
});

platformRouter.get("/crm/summary", asyncHandler(async (_req, res) => {
  const now = new Date();
  const [total, newLeads, qualified, converted, overdueFollowUps, notices] = await Promise.all([
    prisma.clientInquiry.count(),
    prisma.clientInquiry.count({ where: { status: "NEW" } }),
    prisma.clientInquiry.count({ where: { status: "QUALIFIED" } }),
    prisma.clientInquiry.count({ where: { status: "CONVERTED" } }),
    prisma.clientInquiry.count({ where: { followUpAt: { lt: now }, status: { notIn: ["CONVERTED", "CLOSED"] } } }),
    prisma.globalNotice.count({ where: { OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] } })
  ]);
  res.json({ success: true, data: { total, newLeads, qualified, converted, overdueFollowUps, activeNotices: notices } });
}));

platformRouter.get("/crm/inquiries", asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
  const search = String(req.query.search || "").trim();
  const status = String(req.query.status || "").trim();
  const priority = String(req.query.priority || "").trim();
  const where = {
    ...(status && { status }),
    ...(priority && { priority }),
    ...(search && { OR: [
      { institutionName: { contains: search } },
      { contactName: { contains: search } },
      { email: { contains: search } },
      { phone: { contains: search } },
      { city: { contains: search } }
    ] })
  };
  const [items, total] = await Promise.all([
    prisma.clientInquiry.findMany({
      where,
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
      include: { activities: { orderBy: { activityAt: "desc" }, take: 1 } }
    }),
    prisma.clientInquiry.count({ where })
  ]);
  res.json({ success: true, data: { items, total, page, limit, totalPages: Math.max(Math.ceil(total / limit), 1) } });
}));

platformRouter.post("/crm/inquiries", asyncHandler(async (req, res) => {
  const input = inquiryCreateSchema.parse(req.body);
  const inquiry = await prisma.clientInquiry.create({
    data: {
      ...input,
      institutionType: input.institutionType || null,
      designation: input.designation || null,
      email: input.email || null,
      phone: input.phone || null,
      alternatePhone: input.alternatePhone || null,
      city: input.city || null,
      address: input.address || null,
      website: input.website || null,
      message: input.message || null,
      source: input.source || "MANUAL",
      assignedTo: input.assignedTo || null,
      followUpAt: input.followUpAt ? new Date(input.followUpAt) : null
    }
  });
  await prisma.crmActivity.create({ data: { inquiryId: inquiry.id, type: "NOTE", subject: "Inquiry created", details: input.message || "Inquiry added to CRM.", performedBy: req.user.name } });
  res.status(201).json({ success: true, data: inquiry });
}));

platformRouter.get("/crm/inquiries/:id", asyncHandler(async (req, res) => {
  const inquiry = await prisma.clientInquiry.findUnique({
    where: { id: Number(req.params.id) },
    include: { activities: { orderBy: { activityAt: "desc" } } }
  });
  if (!inquiry) return res.status(404).json({ success: false, message: "Inquiry not found." });
  res.json({ success: true, data: inquiry });
}));

platformRouter.put("/crm/inquiries/:id", asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const input = inquiryUpdateSchema.parse(req.body);
  const current = await prisma.clientInquiry.findUnique({ where: { id } });
  if (!current) return res.status(404).json({ success: false, message: "Inquiry not found." });
  const data = { ...input };
  for (const key of ["institutionType", "designation", "email", "phone", "alternatePhone", "city", "address", "website", "message", "source", "assignedTo"]) {
    if (key in data) data[key] = data[key] || null;
  }
  if ("followUpAt" in data) data.followUpAt = data.followUpAt ? new Date(data.followUpAt) : null;
  if (data.status === "CONVERTED" && current.status !== "CONVERTED") data.convertedAt = new Date();
  const inquiry = await prisma.clientInquiry.update({ where: { id }, data });
  if (input.status && input.status !== current.status) {
    await prisma.crmActivity.create({ data: { inquiryId: id, type: "STATUS_CHANGE", subject: `Status changed to ${input.status}`, details: `${current.status} → ${input.status}`, performedBy: req.user.name } });
  }
  res.json({ success: true, data: inquiry });
}));

platformRouter.post("/crm/inquiries/:id/activities", asyncHandler(async (req, res) => {
  const inquiryId = Number(req.params.id);
  const exists = await prisma.clientInquiry.findUnique({ where: { id: inquiryId } });
  if (!exists) return res.status(404).json({ success: false, message: "Inquiry not found." });
  const input = activitySchema.parse(req.body);
  const activity = await prisma.crmActivity.create({
    data: {
      inquiryId,
      type: input.type,
      subject: input.subject || null,
      details: input.details,
      performedBy: input.performedBy || req.user.name,
      activityAt: input.activityAt ? new Date(input.activityAt) : new Date()
    }
  });
  res.status(201).json({ success: true, data: activity });
}));

platformRouter.post("/crm/inquiries/:id/convert", asyncHandler(async (req, res) => {
  const inquiryId = Number(req.params.id);
  const inquiry = await prisma.clientInquiry.findUnique({ where: { id: inquiryId } });
  if (!inquiry) return res.status(404).json({ success: false, message: "Inquiry not found." });
  const institutionId = req.body.institutionId ? Number(req.body.institutionId) : null;
  if (institutionId) {
    const institution = await prisma.institution.findUnique({ where: { id: institutionId } });
    if (!institution) return res.status(404).json({ success: false, message: "Institution not found." });
  }
  const updated = await prisma.clientInquiry.update({ where: { id: inquiryId }, data: { status: "CONVERTED", convertedAt: new Date(), convertedInstitutionId: institutionId } });
  await prisma.crmActivity.create({ data: { inquiryId, type: "STATUS_CHANGE", subject: "Lead converted", details: institutionId ? `Converted to institution #${institutionId}.` : "Marked as converted.", performedBy: req.user.name } });
  res.json({ success: true, data: updated });
}));

platformRouter.get("/crm/notices", asyncHandler(async (_req, res) => {
  const items = await prisma.globalNotice.findMany({
    orderBy: { createdAt: "desc" },
    include: { recipients: { include: { institution: { select: { id: true, name: true, code: true } } } } },
    take: 100
  });
  res.json({ success: true, data: items });
}));

platformRouter.post("/crm/notices", asyncHandler(async (req, res) => {
  const input = noticeSchema.parse(req.body);
  let institutionIds = input.institutionIds;
  if (input.isBroadcast) {
    institutionIds = (await prisma.institution.findMany({ where: { status: { in: ["ACTIVE", "MAINTENANCE"] } }, select: { id: true } })).map(x => x.id);
  }
  const notice = await prisma.globalNotice.create({
    data: {
      title: input.title,
      message: input.message,
      severity: input.severity,
      publishAt: input.publishAt ? new Date(input.publishAt) : new Date(),
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      isBroadcast: input.isBroadcast,
      recipients: { create: institutionIds.map(institutionId => ({ institutionId })) }
    },
    include: { recipients: true }
  });
  res.status(201).json({ success: true, data: notice });
}));

platformRouter.delete("/crm/notices/:id", asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const exists = await prisma.globalNotice.findUnique({ where: { id } });
  if (!exists) return res.status(404).json({ success: false, message: "Notice not found." });
  await prisma.globalNotice.delete({ where: { id } });
  res.json({ success: true, message: "Notice deleted." });
}));


const PLATFORM_PERMISSIONS = [
  ["platform.dashboard.view","View platform dashboard","Platform"],
  ["institutions.view","View institutions","Institutions"],
  ["institutions.create","Create institutions","Institutions"],
  ["institutions.update","Update institutions","Institutions"],
  ["institutions.status","Activate or suspend institutions","Institutions"],
  ["billing.view","View SaaS billing","Billing"],
  ["billing.manage_plans","Manage subscription plans","Billing"],
  ["billing.create_invoice","Generate SaaS invoices","Billing"],
  ["billing.record_payment","Record SaaS payments","Billing"],
  ["billing.concessions","Manage concessions","Billing"],
  ["crm.view","View CRM inquiries","CRM"],
  ["crm.manage","Manage CRM and follow-ups","CRM"],
  ["notifications.broadcast","Broadcast global notifications","Communication"],
  ["users.view","View users","Users"],
  ["users.create","Create users","Users"],
  ["users.update","Update users","Users"],
  ["users.status","Activate or disable users","Users"],
  ["users.reset_password","Reset user passwords","Users"],
  ["permissions.manage","Manage roles and permissions","Security"],
  ["reports.view","View platform reports","Reports"],
  ["settings.manage","Manage platform settings","Settings"],
  ["students.view","View students","Institute"],
  ["students.manage","Manage students","Institute"],
  ["attendance.manage","Manage attendance","Institute"],
  ["fees.manage","Manage institute fees","Institute"],
  ["exams.manage","Manage exams and results","Institute"],
  ["result_cards.manage","Manage result cards","Institute"],
  ["ptm.manage","Manage PTM schedules","Institute"],
  ["website.manage","Manage institute website","Institute"],
  ["institute_users.manage","Manage institute users","Institute"],
  ["institute_settings.manage","Manage institute settings","Institute"]
];

async function ensurePermissions() {
  for (const [code,name,module] of PLATFORM_PERMISSIONS) {
    await prisma.permission.upsert({ where:{code}, update:{name,module}, create:{code,name,module} });
  }
  const permissions=await prisma.permission.findMany();
  const defaults={
    SUPER_ADMIN: permissions.map(p=>p.code),
    INSTITUTE_ADMIN: permissions.filter(p=>p.module==="Institute" || ["platform.dashboard.view"].includes(p.code)).map(p=>p.code),
    TEACHER: ["students.view","attendance.manage","exams.manage","result_cards.manage","ptm.manage"],
    ACCOUNTANT: ["students.view","fees.manage"],
    STAFF: ["students.view","students.manage","attendance.manage","ptm.manage"],
    PARENT: [], STUDENT: []
  };
  for (const [role,codes] of Object.entries(defaults)) {
    const count=await prisma.rolePermission.count({where:{role}});
    if(count===0){
      const ids=permissions.filter(p=>codes.includes(p.code)).map(p=>p.id);
      if(ids.length) await prisma.rolePermission.createMany({data:ids.map(permissionId=>({role,permissionId})),skipDuplicates:true});
    }
  }
}

const userCreateSchema=z.object({
  institutionId:z.coerce.number().int().positive().optional().nullable(),
  name:z.string().trim().min(2), username:z.string().trim().min(3).max(100),
  email:z.string().email().optional().or(z.literal("")), password:z.string().min(8),
  role:z.enum(["SUPER_ADMIN","INSTITUTE_ADMIN","TEACHER","ACCOUNTANT","STAFF","PARENT","STUDENT"]),
  isActive:z.boolean().optional().default(true)
});

platformRouter.get("/access/summary", asyncHandler(async (_req,res)=>{
  await ensurePermissions();
  const [total,active,inactive,superAdmins,instituteAdmins,tenantUsers,permissions]=await Promise.all([
    prisma.user.count(), prisma.user.count({where:{isActive:true}}), prisma.user.count({where:{isActive:false}}),
    prisma.user.count({where:{role:"SUPER_ADMIN"}}), prisma.user.count({where:{role:"INSTITUTE_ADMIN"}}),
    prisma.user.count({where:{institutionId:{not:null}}}), prisma.permission.count()
  ]);
  res.json({success:true,data:{total,active,inactive,superAdmins,instituteAdmins,tenantUsers,permissions}});
}));

platformRouter.get("/access/users", asyncHandler(async (req,res)=>{
  const page=Math.max(Number(req.query.page)||1,1), limit=Math.min(Math.max(Number(req.query.limit)||10,1),100);
  const search=String(req.query.search||"").trim(), role=String(req.query.role||"").trim(), institutionId=Number(req.query.institutionId)||null;
  const active=String(req.query.active||"");
  const where={
    ...(role&&{role}), ...(institutionId&&{institutionId}), ...(active!==""&&{isActive:active==="true"}),
    ...(search&&{OR:[{name:{contains:search}},{username:{contains:search}},{email:{contains:search}},{institution:{name:{contains:search}}}]})
  };
  const [items,total,institutions]=await Promise.all([
    prisma.user.findMany({where,skip:(page-1)*limit,take:limit,orderBy:{createdAt:"desc"},include:{institution:true,permissionOverrides:{include:{permission:true}}}}),
    prisma.user.count({where}), prisma.institution.findMany({orderBy:{name:"asc"},select:{id:true,name:true,code:true,status:true}})
  ]);
  res.json({success:true,data:{items:items.map(({passwordHash,...u})=>u),total,page,limit,totalPages:Math.max(Math.ceil(total/limit),1),institutions}});
}));

platformRouter.post("/access/users", asyncHandler(async (req,res)=>{
  const input=userCreateSchema.parse(req.body);
  if(input.role!=="SUPER_ADMIN"&&!input.institutionId) return res.status(422).json({success:false,message:"Institution is required for tenant users."});
  const passwordHash=await bcrypt.hash(input.password,12);
  const user=await prisma.user.create({data:{institutionId:input.role==="SUPER_ADMIN"?null:input.institutionId,name:input.name,username:input.username.toLowerCase(),email:input.email?input.email.toLowerCase():null,passwordHash,role:input.role,isActive:input.isActive},include:{institution:true}});
  await prisma.accessAuditLog.create({data:{actorUserId:req.user.id,targetUserId:user.id,institutionId:user.institutionId,action:"USER_CREATED",details:{role:user.role,username:user.username}}});
  const {passwordHash:_,...safe}=user;res.status(201).json({success:true,data:safe});
}));

platformRouter.put("/access/users/:id", asyncHandler(async (req,res)=>{
  const id=Number(req.params.id);
  const input=z.object({name:z.string().trim().min(2),email:z.string().email().optional().or(z.literal("")),role:z.enum(["SUPER_ADMIN","INSTITUTE_ADMIN","TEACHER","ACCOUNTANT","STAFF","PARENT","STUDENT"]),institutionId:z.coerce.number().int().positive().optional().nullable()}).parse(req.body);
  if(id===req.user.id&&input.role!=="SUPER_ADMIN") return res.status(422).json({success:false,message:"You cannot remove your own Super Admin role."});
  const user=await prisma.user.update({where:{id},data:{name:input.name,email:input.email||null,role:input.role,institutionId:input.role==="SUPER_ADMIN"?null:input.institutionId},include:{institution:true}});
  await prisma.accessAuditLog.create({data:{actorUserId:req.user.id,targetUserId:id,institutionId:user.institutionId,action:"USER_UPDATED",details:{role:user.role}}});
  const {passwordHash,...safe}=user;res.json({success:true,data:safe});
}));

platformRouter.patch("/access/users/:id/status", asyncHandler(async (req,res)=>{
  const id=Number(req.params.id), isActive=z.boolean().parse(req.body.isActive);
  if(id===req.user.id&&!isActive) return res.status(422).json({success:false,message:"You cannot disable your own account."});
  const user=await prisma.user.update({where:{id},data:{isActive},include:{institution:true}});
  await prisma.accessAuditLog.create({data:{actorUserId:req.user.id,targetUserId:id,institutionId:user.institutionId,action:isActive?"USER_ACTIVATED":"USER_DISABLED"}});
  res.json({success:true,data:{id:user.id,isActive:user.isActive}});
}));

platformRouter.post("/access/users/:id/reset-password", asyncHandler(async (req,res)=>{
  const id=Number(req.params.id), password=z.string().min(8).parse(req.body.password);
  await prisma.user.update({where:{id},data:{passwordHash:await bcrypt.hash(password,12)}});
  await prisma.accessAuditLog.create({data:{actorUserId:req.user.id,targetUserId:id,action:"PASSWORD_RESET"}});
  res.json({success:true,message:"Password reset successfully."});
}));

platformRouter.get("/access/permissions", asyncHandler(async (_req,res)=>{
  await ensurePermissions();
  const [permissions,rolePermissions]=await Promise.all([prisma.permission.findMany({orderBy:[{module:"asc"},{name:"asc"}]}),prisma.rolePermission.findMany()]);
  const matrix={}; for(const rp of rolePermissions){(matrix[rp.role]??=[]).push(rp.permissionId)}
  res.json({success:true,data:{permissions,matrix,roles:["SUPER_ADMIN","INSTITUTE_ADMIN","TEACHER","ACCOUNTANT","STAFF","PARENT","STUDENT"]}});
}));

platformRouter.put("/access/roles/:role", asyncHandler(async (req,res)=>{
  const role=z.enum(["SUPER_ADMIN","INSTITUTE_ADMIN","TEACHER","ACCOUNTANT","STAFF","PARENT","STUDENT"]).parse(req.params.role);
  if(role==="SUPER_ADMIN") return res.status(422).json({success:false,message:"Super Admin always retains all permissions."});
  const permissionIds=z.array(z.coerce.number().int().positive()).parse(req.body.permissionIds);
  await prisma.$transaction(async tx=>{await tx.rolePermission.deleteMany({where:{role}});if(permissionIds.length)await tx.rolePermission.createMany({data:permissionIds.map(permissionId=>({role,permissionId})),skipDuplicates:true});});
  await prisma.accessAuditLog.create({data:{actorUserId:req.user.id,action:"ROLE_PERMISSIONS_UPDATED",details:{role,permissionIds}}});
  res.json({success:true,message:`${role} permissions updated.`});
}));

platformRouter.put("/access/users/:id/overrides", asyncHandler(async (req,res)=>{
  const userId=Number(req.params.id);
  const overrides=z.array(z.object({permissionId:z.coerce.number().int().positive(),effect:z.enum(["ALLOW","DENY"])})).parse(req.body.overrides);
  await prisma.$transaction(async tx=>{await tx.userPermission.deleteMany({where:{userId}});if(overrides.length)await tx.userPermission.createMany({data:overrides.map(x=>({...x,userId})),skipDuplicates:true});});
  await prisma.accessAuditLog.create({data:{actorUserId:req.user.id,targetUserId:userId,action:"USER_PERMISSION_OVERRIDES_UPDATED",details:{overrides}}});
  res.json({success:true,message:"User permission overrides updated."});
}));

platformRouter.get("/access/audit", asyncHandler(async (req,res)=>{
  const items=await prisma.accessAuditLog.findMany({take:100,orderBy:{createdAt:"desc"}});
  res.json({success:true,data:items});
}));
