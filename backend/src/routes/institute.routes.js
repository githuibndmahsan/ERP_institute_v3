import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { authenticate, allowRoles } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const instituteRouter = Router();

instituteRouter.use(
  authenticate,
  allowRoles("INSTITUTE_ADMIN", "TEACHER", "ACCOUNTANT", "STAFF")
);

async function safeValue(callback, fallback = 0) {
  try {
    return await callback();
  } catch {
    return fallback;
  }
}

instituteRouter.get(
  "/dashboard",
  asyncHandler(async (req, res) => {
    const institutionId = req.user.institutionId;

    if (!institutionId) {
      return res.status(403).json({
        success: false,
        message: "Institution account is not linked to a tenant."
      });
    }

    const [
      institution,
      totalUsers,
      admins,
      teachers,
      accountants,
      staff,
      students,
      activeStudents,
      invoices,
      subscription
    ] = await Promise.all([
      prisma.institution.findUnique({
        where: { id: institutionId },
        select: {
          id: true,
          name: true,
          code: true,
          tenantKey: true,
          subdomain: true,
          customDomain: true,
          officialEmail: true,
          primaryPhone: true,
          city: true,
          country: true,
          status: true
        }
      }),

      prisma.user.count({
        where: { institutionId, isActive: true }
      }),

      prisma.user.count({
        where: {
          institutionId,
          role: "INSTITUTE_ADMIN",
          isActive: true
        }
      }),

      prisma.user.count({
        where: {
          institutionId,
          role: "TEACHER",
          isActive: true
        }
      }),

      prisma.user.count({
        where: {
          institutionId,
          role: "ACCOUNTANT",
          isActive: true
        }
      }),

      prisma.user.count({
        where: {
          institutionId,
          role: "STAFF",
          isActive: true
        }
      }),

      safeValue(
        () =>
          prisma.student.count({
            where: { institutionId, deletedAt: null }
          }),
        0
      ),

      safeValue(
        () =>
          prisma.student.count({
            where: {
              institutionId,
              status: "ACTIVE",
              deletedAt: null
            }
          }),
        0
      ),

      safeValue(
        () =>
          prisma.saaSInvoice.findMany({
            where: { institutionId },
            select: {
              status: true,
              totalAmount: true,
              paidAmount: true,
              balanceAmount: true,
              dueDate: true
            }
          }),
        []
      ),

      safeValue(
        () =>
          prisma.subscription.findFirst({
            where: { institutionId },
            orderBy: { createdAt: "desc" },
            include: {
              plan: {
                select: {
                  name: true,
                  billingCycle: true,
                  basePrice: true,
                  currency: true
                }
              }
            }
          }),
        null
      )
    ]);

    const billed = invoices.reduce(
      (sum, item) => sum + Number(item.totalAmount || 0),
      0
    );

    const collected = invoices.reduce(
      (sum, item) => sum + Number(item.paidAmount || 0),
      0
    );

    const outstanding = invoices.reduce(
      (sum, item) => sum + Number(item.balanceAmount || 0),
      0
    );

    const overdueInvoices = invoices.filter(
      (item) =>
        item.status === "OVERDUE" ||
        (
          item.status !== "PAID" &&
          item.dueDate &&
          new Date(item.dueDate) < new Date()
        )
    ).length;

    res.json({
      success: true,
      data: {
        institution,
        role: req.user.role,
        users: {
          total: totalUsers,
          admins,
          teachers,
          accountants,
          staff
        },
        students: {
          total: students,
          active: activeStudents,
          pending: Math.max(students - activeStudents, 0)
        },
        attendance: {
          presentToday: 0,
          absentToday: 0,
          leaveToday: 0,
          percentageToday: 0
        },
        fees: {
          collectedToday: 0,
          pendingStudentFees: 0
        },
        subscription: subscription
          ? {
              status: subscription.status,
              nextBillingDate: subscription.nextBillingDate,
              planName: subscription.plan?.name || "Custom Plan",
              billingCycle: subscription.plan?.billingCycle || "—",
              currency: subscription.plan?.currency || "PKR",
              billed,
              collected,
              outstanding,
              overdueInvoices
            }
          : {
              status: "NOT_CONFIGURED",
              nextBillingDate: null,
              planName: "No Plan",
              billingCycle: "—",
              currency: "PKR",
              billed,
              collected,
              outstanding,
              overdueInvoices
            },
        academics: {
          upcomingExams: 0,
          pendingMarksEntries: 0,
          resultCardsPending: 0,
          upcomingPtms: 0
        },
        website: {
          published: institution?.status === "ACTIVE",
          publicPath: institution?.subdomain
            ? `https://${institution.subdomain}`
            : null,
          customDomain: institution?.customDomain || null
        }
      }
    });
  })
);
