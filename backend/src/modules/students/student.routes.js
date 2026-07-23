import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma.js";
import { authenticate, allowRoles } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

import { uploadStudentPhoto } from "./student-upload.middleware.js";
export const studentRouter = Router();

studentRouter.use(
  authenticate,
  allowRoles("INSTITUTE_ADMIN", "TEACHER", "ACCOUNTANT", "STAFF")
);

function canWrite(req, res, next) {
  if (!["INSTITUTE_ADMIN", "STAFF"].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: "You do not have permission to modify student records."
    });
  }
  next();
}

const studentSchema = z.object({
  studentId: z.string().trim().min(3).optional(),
  admissionNo: z.string().trim().min(1).optional(),
  rollNo: z.coerce.number().int().positive().optional().nullable(),
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  dateOfBirth: z.string().optional().nullable(),
  bFormNo: z.string().trim().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  phone: z.string().optional().nullable(),
  className: z.string().trim().min(1),
  section: z.string().trim().optional().nullable(),
  guardianName: z.string().trim().min(1),
  guardianPhone: z.string().trim().min(1),
  guardianRelation: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  photoUrl: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "PENDING", "ARCHIVED"]).optional(),
  admissionDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable()
});

async function nextStudentIdentity(institutionId) {
  const institution = await prisma.institution.findUnique({
    where: { id: institutionId },
    select: { id: true, code: true, studentSeq: true }
  });

  if (!institution) throw new Error("Institution not found.");

  const nextSeq = Number(institution.studentSeq || 0) + 1;
  const year = new Date().getFullYear();

  await prisma.institution.update({
    where: { id: institutionId },
    data: { studentSeq: nextSeq }
  });

  return {
    studentId: `${institution.code}-${year}-${String(nextSeq).padStart(4, "0")}`,
    admissionNo: `ADM-${institution.code}-${String(nextSeq).padStart(4, "0")}`
  };
}

studentRouter.get("/", asyncHandler(async (req, res) => {
  const institutionId = req.user.institutionId;
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 5), 100);
  const search = String(req.query.search || "").trim();
  const className = String(req.query.className || "").trim();
  const section = String(req.query.section || "").trim();
  const status = String(req.query.status || "").trim();
  const gender = String(req.query.gender || "").trim();

  const where = {
    institutionId,
    deletedAt: null,
    ...(className && { className }),
    ...(section && { section }),
    ...(status && { status }),
    ...(gender && { gender }),
    ...(search && {
      OR: [
        { studentId: { contains: search } },
        { admissionNo: { contains: search } },
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { guardianName: { contains: search } },
        { guardianPhone: { contains: search } },
        { bFormNo: { contains: search } }
      ]
    })
  };

  const [items, total, classes, sections, statusCounts] = await Promise.all([
    prisma.student.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" }
    }),
    prisma.student.count({ where }),
    prisma.student.findMany({
      where: { institutionId, deletedAt: null },
      distinct: ["className"],
      select: { className: true },
      orderBy: { className: "asc" }
    }),
    prisma.student.findMany({
      where: { institutionId, deletedAt: null },
      distinct: ["section"],
      select: { section: true },
      orderBy: { section: "asc" }
    }),
    prisma.student.groupBy({
      by: ["status"],
      where: { institutionId, deletedAt: null },
      _count: { _all: true }
    })
  ]);

  const counts = Object.fromEntries(
    statusCounts.map((row) => [row.status, row._count._all])
  );

  res.json({
    success: true,
    data: {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1)
      },
      filters: {
        classes: classes.map((item) => item.className).filter(Boolean),
        sections: sections.map((item) => item.section).filter(Boolean)
      },
      stats: {
        total: Object.values(counts).reduce((sum, value) => sum + value, 0),
        active: counts.ACTIVE || 0,
        pending: counts.PENDING || 0,
        inactive: counts.INACTIVE || 0,
        archived: counts.ARCHIVED || 0
      }
    }
  });
}));


// PHASE12_BULK_ACTIONS_START
studentRouter.post("/bulk-action", canWrite, asyncHandler(async (req, res) => {
  const payload = z.object({
    studentIds: z.array(z.coerce.number().int().positive()).min(1).max(500),
    action: z.enum(["ACTIVATE", "INACTIVATE", "PENDING", "ARCHIVE"])
  }).parse(req.body);

  const existing = await prisma.student.findMany({
    where: {
      id: { in: payload.studentIds },
      institutionId: req.user.institutionId
    },
    select: { id: true }
  });

  const allowedIds = existing.map((item) => item.id);

  if (!allowedIds.length) {
    return res.status(404).json({
      success: false,
      message: "No matching students found."
    });
  }

  const statusMap = {
    ACTIVATE: "ACTIVE",
    INACTIVATE: "INACTIVE",
    PENDING: "PENDING",
    ARCHIVE: "ARCHIVED"
  };

  const result = await prisma.student.updateMany({
    where: {
      id: { in: allowedIds },
      institutionId: req.user.institutionId
    },
    data: {
      status: statusMap[payload.action],
      ...(payload.action === "ARCHIVE"
        ? { deletedAt: new Date() }
        : { deletedAt: null })
    }
  });

  res.json({
    success: true,
    message: `${result.count} student record(s) updated.`,
    data: { count: result.count }
  });
}));
// PHASE12_BULK_ACTIONS_END


studentRouter.get("/:id", asyncHandler(async (req, res) => {
  const student = await prisma.student.findFirst({
    where: {
      id: Number(req.params.id),
      institutionId: req.user.institutionId
    },
    include: {
      documents: { orderBy: { uploadedAt: "desc" } },
      guardians: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
      studentNotes: { orderBy: { createdAt: "desc" } }
    }
  });

  if (!student) {
    return res.status(404).json({ success: false, message: "Student not found." });
  }

  res.json({ success: true, data: student });
}));

studentRouter.post("/", canWrite, asyncHandler(async (req, res) => {
  const institutionId = req.user.institutionId;
  const input = studentSchema.parse(req.body);

  if (input.bFormNo) {
    const duplicate = await prisma.student.findFirst({
      where: { institutionId, bFormNo: input.bFormNo, deletedAt: null }
    });
    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: "A student with this B-Form number already exists."
      });
    }
  }

  const generated = await nextStudentIdentity(institutionId);

  const created = await prisma.$transaction(async (tx) => {
    const student = await tx.student.create({
      data: {
        institutionId,
        studentId: input.studentId || generated.studentId,
        admissionNo: input.admissionNo || generated.admissionNo,
        rollNo: input.rollNo || null,
        firstName: input.firstName,
        lastName: input.lastName,
        gender: input.gender,
        dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
        bFormNo: input.bFormNo || null,
        email: input.email || null,
        phone: input.phone || null,
        className: input.className,
        section: input.section || null,
        guardianName: input.guardianName,
        guardianPhone: input.guardianPhone,
        guardianRelation: input.guardianRelation || null,
        address: input.address || null,
        photoUrl: input.photoUrl || null,
        status: input.status || "ACTIVE",
        admissionDate: input.admissionDate ? new Date(input.admissionDate) : new Date(),
        notes: input.notes || null
      }
    });

    await tx.studentGuardian.create({
      data: {
        studentId: student.id,
        institutionId,
        name: input.guardianName,
        relation: input.guardianRelation || "Guardian",
        phone: input.guardianPhone,
        isPrimary: true
      }
    });

    return student;
  });

  res.status(201).json({
    success: true,
    message: "Student admitted successfully.",
    data: created
  });
}));

studentRouter.put("/:id", canWrite, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const institutionId = req.user.institutionId;
  const input = studentSchema.partial().parse(req.body);

  const existing = await prisma.student.findFirst({ where: { id, institutionId } });
  if (!existing) {
    return res.status(404).json({ success: false, message: "Student not found." });
  }

  const data = {
    ...input,
    ...(input.dateOfBirth !== undefined && {
      dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null
    }),
    ...(input.admissionDate !== undefined && {
      admissionDate: input.admissionDate ? new Date(input.admissionDate) : null
    })
  };

  const updated = await prisma.student.update({ where: { id }, data });
  res.json({ success: true, message: "Student updated.", data: updated });
}));

studentRouter.patch("/:id/status", canWrite, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const status = z.enum(["ACTIVE", "INACTIVE", "PENDING", "ARCHIVED"]).parse(req.body.status);

  const existing = await prisma.student.findFirst({
    where: { id, institutionId: req.user.institutionId }
  });

  if (!existing) {
    return res.status(404).json({ success: false, message: "Student not found." });
  }

  const updated = await prisma.student.update({ where: { id }, data: { status } });
  res.json({ success: true, message: "Student status updated.", data: updated });
}));

studentRouter.post("/:id/notes", canWrite, asyncHandler(async (req, res) => {
  const note = z.string().trim().min(2).parse(req.body.note);
  const student = await prisma.student.findFirst({
    where: { id: Number(req.params.id), institutionId: req.user.institutionId }
  });

  if (!student) {
    return res.status(404).json({ success: false, message: "Student not found." });
  }

  const created = await prisma.studentNote.create({
    data: {
      studentId: student.id,
      institutionId: req.user.institutionId,
      note,
      createdById: req.user.id
    }
  });

  res.status(201).json({ success: true, data: created });
}));

studentRouter.delete("/:id", canWrite, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.student.findFirst({
    where: { id, institutionId: req.user.institutionId }
  });

  if (!existing) {
    return res.status(404).json({ success: false, message: "Student not found." });
  }

  await prisma.student.update({
    where: { id },
    data: { deletedAt: new Date(), status: "ARCHIVED" }
  });

  res.json({ success: true, message: "Student archived." });
}));

studentRouter.post("/:id/guardians", canWrite, asyncHandler(async (req, res) => {
  const payload = z.object({
    name: z.string().trim().min(2),
    relation: z.string().trim().min(2),
    phone: z.string().trim().min(5),
    alternatePhone: z.string().optional().nullable(),
    email: z.string().email().optional().nullable().or(z.literal("")),
    cnic: z.string().optional().nullable(),
    occupation: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    isPrimary: z.boolean().default(false)
  }).parse(req.body);

  const student = await prisma.student.findFirst({
    where: { id: Number(req.params.id), institutionId: req.user.institutionId }
  });

  if (!student) {
    return res.status(404).json({ success: false, message: "Student not found." });
  }

  if (payload.isPrimary) {
    await prisma.studentGuardian.updateMany({
      where: { studentId: student.id, institutionId: req.user.institutionId },
      data: { isPrimary: false }
    });
  }

  const guardian = await prisma.studentGuardian.create({
    data: {
      ...payload,
      email: payload.email || null,
      studentId: student.id,
      institutionId: req.user.institutionId
    }
  });

  await prisma.studentHistory.create({
    data: {
      studentId: student.id,
      institutionId: req.user.institutionId,
      action: "GUARDIAN_ADDED",
      newData: guardian,
      createdById: req.user.id
    }
  });

  res.status(201).json({ success: true, message: "Guardian added.", data: guardian });
}));

studentRouter.post("/:id/documents", canWrite, asyncHandler(async (req, res) => {
  const payload = z.object({
    documentType: z.string().trim().min(2),
    fileName: z.string().trim().min(1),
    fileUrl: z.string().trim().min(1),
    notes: z.string().optional().nullable()
  }).parse(req.body);

  const student = await prisma.student.findFirst({
    where: { id: Number(req.params.id), institutionId: req.user.institutionId }
  });

  if (!student) {
    return res.status(404).json({ success: false, message: "Student not found." });
  }

  const document = await prisma.studentDocument.create({
    data: {
      ...payload,
      studentId: student.id,
      institutionId: req.user.institutionId
    }
  });

  await prisma.studentHistory.create({
    data: {
      studentId: student.id,
      institutionId: req.user.institutionId,
      action: "DOCUMENT_ADDED",
      newData: document,
      createdById: req.user.id
    }
  });

  res.status(201).json({ success: true, message: "Document added.", data: document });
}));

studentRouter.post("/:id/class-change", canWrite, asyncHandler(async (req, res) => {
  const payload = z.object({
    className: z.string().trim().min(1),
    section: z.string().trim().optional().nullable(),
    rollNo: z.coerce.number().int().positive().optional().nullable(),
    remarks: z.string().optional().nullable()
  }).parse(req.body);

  const student = await prisma.student.findFirst({
    where: { id: Number(req.params.id), institutionId: req.user.institutionId }
  });

  if (!student) {
    return res.status(404).json({ success: false, message: "Student not found." });
  }

  const updated = await prisma.student.update({
    where: { id: student.id },
    data: {
      className: payload.className,
      section: payload.section || null,
      rollNo: payload.rollNo || null
    }
  });

  await prisma.studentHistory.create({
    data: {
      studentId: student.id,
      institutionId: req.user.institutionId,
      action: "CLASS_CHANGED",
      previousData: {
        className: student.className,
        section: student.section,
        rollNo: student.rollNo
      },
      newData: {
        className: updated.className,
        section: updated.section,
        rollNo: updated.rollNo
      },
      remarks: payload.remarks || null,
      createdById: req.user.id
    }
  });

  res.json({ success: true, message: "Class and section updated.", data: updated });
}));


// PHASE14_STUDENT_PHOTO_UPLOAD_START
studentRouter.post("/:id/photo-upload", canWrite, uploadStudentPhoto, asyncHandler(async (req, res) => {
  const student = await prisma.student.findFirst({
    where: { id: Number(req.params.id), institutionId: req.user.institutionId }
  });

  if (!student) {
    return res.status(404).json({ success: false, message: "Student not found." });
  }

  if (!req.file) {
    return res.status(400).json({ success: false, message: "Photo file is required." });
  }

  const photoUrl = `/uploads/students/${req.file.filename}`;
  const updated = await prisma.student.update({
    where: { id: student.id },
    data: { photoUrl }
  });

  await prisma.studentHistory.create({
    data: {
      studentId: student.id,
      institutionId: req.user.institutionId,
      action: "PHOTO_UPLOADED",
      previousData: { photoUrl: student.photoUrl },
      newData: { photoUrl },
      createdById: req.user.id
    }
  });

  res.json({ success: true, message: "Student photo uploaded.", data: updated });
}));
// PHASE14_STUDENT_PHOTO_UPLOAD_END

studentRouter.patch("/:id/photo", canWrite, asyncHandler(async (req, res) => {
  const photoUrl = z.string().trim().min(1).parse(req.body.photoUrl);

  const student = await prisma.student.findFirst({
    where: { id: Number(req.params.id), institutionId: req.user.institutionId }
  });

  if (!student) {
    return res.status(404).json({ success: false, message: "Student not found." });
  }

  const updated = await prisma.student.update({
    where: { id: student.id },
    data: { photoUrl }
  });

  await prisma.studentHistory.create({
    data: {
      studentId: student.id,
      institutionId: req.user.institutionId,
      action: "PHOTO_UPDATED",
      previousData: { photoUrl: student.photoUrl },
      newData: { photoUrl },
      createdById: req.user.id
    }
  });

  res.json({ success: true, message: "Student photo updated.", data: updated });
}));

studentRouter.get("/:id/history", asyncHandler(async (req, res) => {
  const student = await prisma.student.findFirst({
    where: { id: Number(req.params.id), institutionId: req.user.institutionId }
  });

  if (!student) {
    return res.status(404).json({ success: false, message: "Student not found." });
  }

  const history = await prisma.studentHistory.findMany({
    where: { studentId: student.id, institutionId: req.user.institutionId },
    orderBy: { createdAt: "desc" }
  });

  res.json({ success: true, data: history });
}));
