import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma.js";
import { authenticate, allowRoles } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const attendanceRouter = Router();
attendanceRouter.use(authenticate);

const canManage = allowRoles("INSTITUTE_ADMIN", "PRINCIPAL", "TEACHER", "SUPER_ADMIN");

const querySchema = z.object({
  className: z.string().min(1),
  section: z.string().optional().default(""),
  date: z.string().min(1)
});

const saveSchema = z.object({
  className: z.string().min(1),
  section: z.string().optional().default(""),
  date: z.string().min(1),
  complete: z.boolean().default(true),
  records: z.array(z.object({
    studentId: z.number().int().positive(),
    status: z.enum(["PRESENT", "ABSENT", "LEAVE", "LATE"]),
    remarks: z.string().max(500).optional().nullable()
  })).min(1)
});

const toDate = (value) => new Date(`${value}T00:00:00.000Z`);

attendanceRouter.get("/options", asyncHandler(async (req, res) => {
  const rows = await prisma.student.findMany({
    where: {
      institutionId: req.user.institutionId,
      deletedAt: null,
      status: "ACTIVE"
    },
    select: { className: true, section: true },
    orderBy: [{ className: "asc" }, { section: "asc" }]
  });

  const classes = [...new Set(rows.map((r) => r.className).filter(Boolean))];
  const sectionsByClass = {};

  for (const row of rows) {
    if (!row.className) continue;
    sectionsByClass[row.className] ||= [];
    if (row.section && !sectionsByClass[row.className].includes(row.section)) {
      sectionsByClass[row.className].push(row.section);
    }
  }

  res.json({ success: true, data: { classes, sectionsByClass } });
}));

attendanceRouter.get("/daily", asyncHandler(async (req, res) => {
  const query = querySchema.parse(req.query);
  const attendanceDate = toDate(query.date);

  const students = await prisma.student.findMany({
    where: {
      institutionId: req.user.institutionId,
      deletedAt: null,
      status: "ACTIVE",
      className: query.className,
      ...(query.section ? { section: query.section } : {})
    },
    select: {
      id: true,
      studentId: true,
      rollNo: true,
      firstName: true,
      lastName: true,
      className: true,
      section: true
    },
    orderBy: [{ rollNo: "asc" }, { firstName: "asc" }]
  });

  const session = await prisma.attendanceSession.findFirst({
    where: {
      institutionId: req.user.institutionId,
      className: query.className,
      section: query.section || null,
      attendanceDate
    },
    include: { records: true }
  });

  const existing = new Map((session?.records || []).map((r) => [r.studentId, r]));

  const records = students.map((student) => ({
    ...student,
    attendanceStatus: existing.get(student.id)?.status || "PRESENT",
    remarks: existing.get(student.id)?.remarks || ""
  }));

  res.json({
    success: true,
    data: {
      session: session ? { id: session.id, status: session.status } : null,
      records
    }
  });
}));

attendanceRouter.post("/daily", canManage, asyncHandler(async (req, res) => {
  const payload = saveSchema.parse(req.body);
  const attendanceDate = toDate(payload.date);

  const session = await prisma.$transaction(async (tx) => {
    let current = await tx.attendanceSession.findFirst({
      where: {
        institutionId: req.user.institutionId,
        className: payload.className,
        section: payload.section || null,
        attendanceDate
      }
    });

    const sessionData = {
      status: payload.complete ? "COMPLETED" : "DRAFT",
      markedById: req.user.id,
      completedAt: payload.complete ? new Date() : null
    };

    current = current
      ? await tx.attendanceSession.update({ where: { id: current.id }, data: sessionData })
      : await tx.attendanceSession.create({
          data: {
            institutionId: req.user.institutionId,
            className: payload.className,
            section: payload.section || null,
            attendanceDate,
            ...sessionData
          }
        });

    for (const record of payload.records) {
      const student = await tx.student.findFirst({
        where: {
          id: record.studentId,
          institutionId: req.user.institutionId,
          className: payload.className,
          deletedAt: null
        },
        select: { id: true }
      });

      if (!student) throw new Error("Invalid student for selected class.");

      await tx.studentAttendance.upsert({
        where: {
          sessionId_studentId: {
            sessionId: current.id,
            studentId: record.studentId
          }
        },
        update: {
          status: record.status,
          remarks: record.remarks || null,
          markedById: req.user.id
        },
        create: {
          institutionId: req.user.institutionId,
          sessionId: current.id,
          studentId: record.studentId,
          status: record.status,
          remarks: record.remarks || null,
          markedById: req.user.id
        }
      });
    }

    return current;
  });

  res.json({
    success: true,
    message: payload.complete ? "Attendance completed." : "Attendance draft saved.",
    data: session
  });
}));

// PHASE16_ANNUAL_ATTENDANCE_START
attendanceRouter.get("/annual", asyncHandler(async (req, res) => {
  const query = z.object({
    className: z.string().trim().min(1),
    section: z.string().trim().optional().default(""),
    year: z.coerce.number().int().min(2000).max(2100)
  }).parse(req.query);

  const yearStart = new Date(Date.UTC(query.year, 0, 1));
  const yearEnd = new Date(Date.UTC(query.year + 1, 0, 1));
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonthIndex =
    query.year === currentYear ? now.getUTCMonth() : 11;

  const students = await prisma.student.findMany({
    where: {
      institutionId: req.user.institutionId,
      deletedAt: null,
      status: "ACTIVE",
      className: query.className,
      ...(query.section ? { section: query.section } : {})
    },
    select: {
      id: true,
      studentId: true,
      rollNo: true,
      firstName: true,
      lastName: true,
      className: true,
      section: true
    },
    orderBy: [
      { rollNo: "asc" },
      { firstName: "asc" }
    ]
  });

  const sessions = await prisma.attendanceSession.findMany({
    where: {
      institutionId: req.user.institutionId,
      className: query.className,
      section: query.section || null,
      status: "COMPLETED",
      attendanceDate: {
        gte: yearStart,
        lt: yearEnd
      }
    },
    include: {
      records: {
        where: {
          studentId: {
            in: students.map((student) => student.id)
          }
        }
      }
    },
    orderBy: {
      attendanceDate: "asc"
    }
  });

  const months = Array.from({ length: 12 }, (_, monthIndex) => ({
    monthIndex,
    monthName: new Date(Date.UTC(query.year, monthIndex, 1))
      .toLocaleString("en-US", {
        month: "long",
        timeZone: "UTC"
      }),
    workingDays: 0,
    completed: monthIndex <= currentMonthIndex,
    isCurrentMonth:
      query.year === currentYear &&
      monthIndex === now.getUTCMonth(),
    dates: []
  }));

  const studentMap = new Map(
    students.map((student) => [
      student.id,
      {
        ...student,
        months: Array.from({ length: 12 }, (_, monthIndex) => ({
          monthIndex,
          presentDays: 0,
          absentDays: 0,
          leaveDays: 0,
          lateDays: 0,
          workingDays: 0,
          percentage: 0,
          dailyRecords: []
        }))
      }
    ])
  );

  for (const session of sessions) {
    const monthIndex = session.attendanceDate.getUTCMonth();
    const dateValue = session.attendanceDate.toISOString().slice(0, 10);

    months[monthIndex].workingDays += 1;
    months[monthIndex].dates.push(dateValue);

    const recordMap = new Map(
      session.records.map((record) => [
        record.studentId,
        record
      ])
    );

    for (const student of students) {
      const month = studentMap.get(student.id).months[monthIndex];
      const record = recordMap.get(student.id);

      month.workingDays += 1;

      if (!record) {
        month.absentDays += 1;
        month.dailyRecords.push({
          date: dateValue,
          status: "ABSENT",
          remarks: ""
        });
        continue;
      }

      if (record.status === "PRESENT") month.presentDays += 1;
      if (record.status === "ABSENT") month.absentDays += 1;
      if (record.status === "LEAVE") month.leaveDays += 1;
      if (record.status === "LATE") month.lateDays += 1;

      month.dailyRecords.push({
        date: dateValue,
        status: record.status,
        remarks: record.remarks || ""
      });
    }
  }

  for (const student of studentMap.values()) {
    for (const month of student.months) {
      month.percentage = month.workingDays
        ? Number(((month.presentDays / month.workingDays) * 100).toFixed(1))
        : 0;

      if (!months[month.monthIndex].isCurrentMonth) {
        delete month.dailyRecords;
      }
    }
  }

  res.json({
    success: true,
    data: {
      year: query.year,
      currentMonthIndex:
        query.year === currentYear ? now.getUTCMonth() : null,
      className: query.className,
      section: query.section || "",
      months,
      students: [...studentMap.values()]
    }
  });
}));
// PHASE16_ANNUAL_ATTENDANCE_END

// PHASE20_ATTENDANCE_DASHBOARD_START
attendanceRouter.get("/dashboard", asyncHandler(async (req, res) => {
  const query = z.object({
    date: z.string().trim().optional(),
    alertThreshold: z.coerce.number().min(1).max(100).optional().default(75),
    absentPage: z.coerce.number().int().min(1).optional().default(1),
    absentLimit: z.coerce.number().int().min(5).max(100).optional().default(10)
  }).parse(req.query);

  const requestedDate = query.date || new Date().toISOString().slice(0, 10);
  const attendanceDate = new Date(`${requestedDate}T00:00:00.000Z`);

  if (Number.isNaN(attendanceDate.getTime())) {
    return res.status(400).json({ success: false, message: "Invalid dashboard date." });
  }

  const monthStart = new Date(Date.UTC(
    attendanceDate.getUTCFullYear(),
    attendanceDate.getUTCMonth(),
    1
  ));

  const monthEnd = new Date(Date.UTC(
    attendanceDate.getUTCFullYear(),
    attendanceDate.getUTCMonth() + 1,
    1
  ));

  const students = await prisma.student.findMany({
    where: {
      institutionId: req.user.institutionId,
      deletedAt: null,
      status: "ACTIVE"
    },
    select: {
      id: true,
      studentId: true,
      rollNo: true,
      firstName: true,
      lastName: true,
      className: true,
      section: true,
      guardianName: true,
      guardianPhone: true
    },
    orderBy: [
      { className: "asc" },
      { section: "asc" },
      { rollNo: "asc" }
    ]
  });

  const todaySessions = await prisma.attendanceSession.findMany({
    where: {
      institutionId: req.user.institutionId,
      attendanceDate
    },
    include: { records: true },
    orderBy: [{ className: "asc" }, { section: "asc" }]
  });

  const monthSessions = await prisma.attendanceSession.findMany({
    where: {
      institutionId: req.user.institutionId,
      status: "COMPLETED",
      attendanceDate: { gte: monthStart, lt: monthEnd }
    },
    include: { records: true }
  });

  const todayRecordMap = new Map();

  for (const session of todaySessions) {
    for (const record of session.records) {
      todayRecordMap.set(record.studentId, {
        ...record,
        sessionStatus: session.status
      });
    }
  }

  const totals = {
    totalStudents: students.length,
    present: 0,
    absent: 0,
    leave: 0,
    late: 0,
    unmarked: 0,
    markedStudents: 0,
    attendancePercentage: 0
  };

  for (const student of students) {
    const record = todayRecordMap.get(student.id);

    if (!record) {
      totals.unmarked += 1;
      continue;
    }

    totals.markedStudents += 1;
    if (record.status === "PRESENT") totals.present += 1;
    if (record.status === "ABSENT") totals.absent += 1;
    if (record.status === "LEAVE") totals.leave += 1;
    if (record.status === "LATE") totals.late += 1;
  }

  totals.attendancePercentage = totals.markedStudents
    ? Number(((totals.present / totals.markedStudents) * 100).toFixed(1))
    : 0;

  const classMap = new Map();

  for (const student of students) {
    const key = `${student.className}|||${student.section || ""}`;

    if (!classMap.has(key)) {
      classMap.set(key, {
        className: student.className,
        section: student.section || "",
        totalStudents: 0,
        present: 0,
        absent: 0,
        leave: 0,
        late: 0,
        unmarked: 0,
        attendancePercentage: 0,
        status: "PENDING"
      });
    }

    const item = classMap.get(key);
    item.totalStudents += 1;
    const record = todayRecordMap.get(student.id);

    if (!record) {
      item.unmarked += 1;
      continue;
    }

    if (record.status === "PRESENT") item.present += 1;
    if (record.status === "ABSENT") item.absent += 1;
    if (record.status === "LEAVE") item.leave += 1;
    if (record.status === "LATE") item.late += 1;
  }

  for (const session of todaySessions) {
    const key = `${session.className}|||${session.section || ""}`;
    const item = classMap.get(key);
    if (item) item.status = session.status;
  }

  const classSummary = [...classMap.values()].map((item) => {
    const marked = item.present + item.absent + item.leave + item.late;
    return {
      ...item,
      attendancePercentage: marked
        ? Number(((item.present / marked) * 100).toFixed(1))
        : 0
    };
  });

  const absentStudents = students
    .filter((student) => todayRecordMap.get(student.id)?.status === "ABSENT")
    .map((student) => ({
      ...student,
      remarks: todayRecordMap.get(student.id)?.remarks || ""
    }));

  const absentTotal = absentStudents.length;
  const absentTotalPages = Math.max(1, Math.ceil(absentTotal / query.absentLimit));
  const absentSafePage = Math.min(query.absentPage, absentTotalPages);
  const absentSkip = (absentSafePage - 1) * query.absentLimit;

  const monthStudentMap = new Map(
    students.map((student) => [student.id, { student, present: 0, workingDays: 0 }])
  );

  for (const session of monthSessions) {
    const recordMap = new Map(
      session.records.map((record) => [record.studentId, record])
    );

    for (const student of students) {
      const summary = monthStudentMap.get(student.id);
      summary.workingDays += 1;
      if (recordMap.get(student.id)?.status === "PRESENT") summary.present += 1;
    }
  }

  const lowAttendanceAlerts = [...monthStudentMap.values()]
    .map(({ student, present, workingDays }) => ({
      ...student,
      presentDays: present,
      workingDays,
      percentage: workingDays
        ? Number(((present / workingDays) * 100).toFixed(1))
        : 0
    }))
    .filter((item) => item.workingDays > 0 && item.percentage < query.alertThreshold)
    .sort((a, b) => a.percentage - b.percentage)
    .slice(0, 20);

  const sessionStatus = {
    totalClasses: classSummary.length,
    completed: classSummary.filter((item) => item.status === "COMPLETED").length,
    draft: classSummary.filter((item) => item.status === "DRAFT").length,
    pending: classSummary.filter((item) => item.status === "PENDING").length
  };

  res.json({
    success: true,
    data: {
      date: requestedDate,
      totals,
      sessionStatus,
      classSummary,
      lowAttendanceAlerts,
      absentStudents: {
        records: absentStudents.slice(absentSkip, absentSkip + query.absentLimit),
        pagination: {
          page: absentSafePage,
          limit: query.absentLimit,
          totalRecords: absentTotal,
          totalPages: absentTotalPages
        }
      }
    }
  });
}));
// PHASE20_ATTENDANCE_DASHBOARD_END




// PHASE21_ATTENDANCE_REPORTS_START
attendanceRouter.get("/reports/student-history", asyncHandler(async (req, res) => {
  const query = z.object({
    studentId: z.string().trim().min(1),
    dateFrom: z.string().trim().min(10),
    dateTo: z.string().trim().min(10),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(5).max(100).optional().default(10)
  }).parse(req.query);

  const student = await prisma.student.findFirst({
    where: {
      institutionId: req.user.institutionId,
      deletedAt: null,
      OR: [
        { studentId: query.studentId },
        { admissionNo: query.studentId }
      ]
    },
    select: {
      id: true,
      studentId: true,
      admissionNo: true,
      rollNo: true,
      firstName: true,
      lastName: true,
      className: true,
      section: true
    }
  });

  if (!student) {
    return res.status(404).json({
      success: false,
      message: "Student not found."
    });
  }

  const from = new Date(`${query.dateFrom}T00:00:00.000Z`);
  const to = new Date(`${query.dateTo}T23:59:59.999Z`);

  const sessions = await prisma.attendanceSession.findMany({
    where: {
      institutionId: req.user.institutionId,
      attendanceDate: {
        gte: from,
        lte: to
      }
    },
    include: {
      records: {
        where: {
          studentId: student.id
        }
      }
    },
    orderBy: {
      attendanceDate: "desc"
    }
  });

  const history = sessions
    .filter((session) => session.records.length)
    .map((session) => {
      const record = session.records[0];

      return {
        date: session.attendanceDate.toISOString().slice(0, 10),
        className: session.className,
        section: session.section || "",
        sessionStatus: session.status,
        status: record.status,
        remarks: record.remarks || ""
      };
    });

  const totalRecords = history.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / query.limit));
  const safePage = Math.min(query.page, totalPages);
  const skip = (safePage - 1) * query.limit;
  const pageRecords = history.slice(skip, skip + query.limit);

  const summary = history.reduce(
    (result, item) => {
      result.workingDays += 1;
      if (item.status === "PRESENT") result.present += 1;
      if (item.status === "ABSENT") result.absent += 1;
      if (item.status === "LEAVE") result.leave += 1;
      if (item.status === "LATE") result.late += 1;
      return result;
    },
    {
      workingDays: 0,
      present: 0,
      absent: 0,
      leave: 0,
      late: 0
    }
  );

  summary.percentage = summary.workingDays
    ? Number(((summary.present / summary.workingDays) * 100).toFixed(1))
    : 0;

  res.json({
    success: true,
    data: {
      student,
      summary,
      records: pageRecords,
      exportRecords: history,
      pagination: {
        page: safePage,
        limit: query.limit,
        totalRecords,
        totalPages
      }
    }
  });
}));

attendanceRouter.get("/reports/class-register", asyncHandler(async (req, res) => {
  const query = z.object({
    className: z.string().trim().min(1),
    section: z.string().trim().optional().default(""),
    year: z.coerce.number().int().min(2000).max(2100),
    month: z.coerce.number().int().min(1).max(12),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(5).max(100).optional().default(10)
  }).parse(req.query);

  const from = new Date(Date.UTC(query.year, query.month - 1, 1));
  const to = new Date(Date.UTC(query.year, query.month, 1));

  const studentWhere = {
    institutionId: req.user.institutionId,
    deletedAt: null,
    status: "ACTIVE",
    className: query.className,
    ...(query.section ? { section: query.section } : {})
  };

  const totalRecords = await prisma.student.count({
    where: studentWhere
  });

  const totalPages = Math.max(1, Math.ceil(totalRecords / query.limit));
  const safePage = Math.min(query.page, totalPages);
  const skip = (safePage - 1) * query.limit;

  const students = await prisma.student.findMany({
    where: studentWhere,
    select: {
      id: true,
      studentId: true,
      rollNo: true,
      firstName: true,
      lastName: true,
      className: true,
      section: true
    },
    orderBy: [
      { rollNo: "asc" },
      { firstName: "asc" }
    ],
    skip,
    take: query.limit
  });

  const sessions = await prisma.attendanceSession.findMany({
    where: {
      institutionId: req.user.institutionId,
      className: query.className,
      section: query.section || null,
      status: "COMPLETED",
      attendanceDate: {
        gte: from,
        lt: to
      }
    },
    include: {
      records: {
        where: {
          studentId: {
            in: students.map((student) => student.id)
          }
        }
      }
    },
    orderBy: {
      attendanceDate: "asc"
    }
  });

  const days = sessions.map((session) =>
    session.attendanceDate.toISOString().slice(0, 10)
  );

  const rows = students.map((student) => {
    const daily = [];
    let present = 0;
    let absent = 0;
    let leave = 0;
    let late = 0;

    for (const session of sessions) {
      const record = session.records.find(
        (item) => item.studentId === student.id
      );

      const status = record?.status || "ABSENT";

      if (status === "PRESENT") present += 1;
      if (status === "ABSENT") absent += 1;
      if (status === "LEAVE") leave += 1;
      if (status === "LATE") late += 1;

      daily.push({
        date: session.attendanceDate.toISOString().slice(0, 10),
        status
      });
    }

    const workingDays = sessions.length;

    return {
      ...student,
      daily,
      present,
      absent,
      leave,
      late,
      workingDays,
      percentage: workingDays
        ? Number(((present / workingDays) * 100).toFixed(1))
        : 0
    };
  });

  res.json({
    success: true,
    data: {
      className: query.className,
      section: query.section || "",
      year: query.year,
      month: query.month,
      monthName: from.toLocaleString("en-US", {
        month: "long",
        timeZone: "UTC"
      }),
      days,
      records: rows,
      pagination: {
        page: safePage,
        limit: query.limit,
        totalRecords,
        totalPages
      }
    }
  });
}));

attendanceRouter.get("/reports/date-range", asyncHandler(async (req, res) => {
  const query = z.object({
    className: z.string().trim().optional().default(""),
    section: z.string().trim().optional().default(""),
    dateFrom: z.string().trim().min(10),
    dateTo: z.string().trim().min(10),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(5).max(100).optional().default(10)
  }).parse(req.query);

  const from = new Date(`${query.dateFrom}T00:00:00.000Z`);
  const to = new Date(`${query.dateTo}T23:59:59.999Z`);

  const studentWhere = {
    institutionId: req.user.institutionId,
    deletedAt: null,
    status: "ACTIVE",
    ...(query.className ? { className: query.className } : {}),
    ...(query.section ? { section: query.section } : {})
  };

  const totalRecords = await prisma.student.count({
    where: studentWhere
  });

  const totalPages = Math.max(1, Math.ceil(totalRecords / query.limit));
  const safePage = Math.min(query.page, totalPages);
  const skip = (safePage - 1) * query.limit;

  const students = await prisma.student.findMany({
    where: studentWhere,
    select: {
      id: true,
      studentId: true,
      rollNo: true,
      firstName: true,
      lastName: true,
      className: true,
      section: true
    },
    orderBy: [
      { className: "asc" },
      { section: "asc" },
      { rollNo: "asc" }
    ],
    skip,
    take: query.limit
  });

  const sessions = await prisma.attendanceSession.findMany({
    where: {
      institutionId: req.user.institutionId,
      status: "COMPLETED",
      attendanceDate: {
        gte: from,
        lte: to
      },
      ...(query.className ? { className: query.className } : {}),
      ...(query.section ? { section: query.section } : {})
    },
    include: {
      records: {
        where: {
          studentId: {
            in: students.map((student) => student.id)
          }
        }
      }
    }
  });

  const rows = students.map((student) => {
    let present = 0;
    let absent = 0;
    let leave = 0;
    let late = 0;

    for (const session of sessions) {
      const record = session.records.find(
        (item) => item.studentId === student.id
      );

      const status = record?.status || "ABSENT";

      if (status === "PRESENT") present += 1;
      if (status === "ABSENT") absent += 1;
      if (status === "LEAVE") leave += 1;
      if (status === "LATE") late += 1;
    }

    const workingDays = sessions.length;

    return {
      ...student,
      present,
      absent,
      leave,
      late,
      workingDays,
      percentage: workingDays
        ? Number(((present / workingDays) * 100).toFixed(1))
        : 0
    };
  });

  res.json({
    success: true,
    data: {
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      records: rows,
      pagination: {
        page: safePage,
        limit: query.limit,
        totalRecords,
        totalPages
      }
    }
  });
}));
// PHASE21_ATTENDANCE_REPORTS_END


// PHASE22_STAFF_ATTENDANCE_START
attendanceRouter.get("/staff/options", asyncHandler(async (req, res) => {
  const staff = await prisma.user.findMany({
    where: { institutionId: req.user.institutionId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }]
  });

  res.json({
    success: true,
    data: {
      staff,
      roles: [...new Set(staff.map((item) => item.role))]
    }
  });
}));

attendanceRouter.get("/staff/daily", asyncHandler(async (req, res) => {
  const query = z.object({
    date: z.string().trim().min(10),
    role: z.string().trim().optional().default(""),
    search: z.string().trim().optional().default(""),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(5).max(100).optional().default(10)
  }).parse(req.query);

  const attendanceDate = new Date(`${query.date}T00:00:00.000Z`);

  const where = {
    institutionId: req.user.institutionId,
    ...(query.role ? { role: query.role } : {}),
    ...(query.search
      ? {
          OR: [
            { firstName: { contains: query.search } },
            { lastName: { contains: query.search } },
            { email: { contains: query.search } }
          ]
        }
      : {})
  };

  const totalRecords = await prisma.user.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalRecords / query.limit));
  const safePage = Math.min(query.page, totalPages);
  const skip = (safePage - 1) * query.limit;

  const staff = await prisma.user.findMany({
    where,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    skip,
    take: query.limit
  });

  const records = await prisma.staffAttendance.findMany({
    where: {
      institutionId: req.user.institutionId,
      attendanceDate,
      staffId: { in: staff.map((item) => item.id) }
    }
  });

  const recordMap = new Map(records.map((record) => [record.staffId, record]));

  res.json({
    success: true,
    data: {
      date: query.date,
      records: staff.map((item) => {
        const record = recordMap.get(item.id);

        return {
          ...item,
          attendanceStatus: record?.status || "PRESENT",
          checkIn: record?.checkIn ? record.checkIn.toISOString().slice(11, 16) : "",
          checkOut: record?.checkOut ? record.checkOut.toISOString().slice(11, 16) : "",
          workedMinutes: record?.workedMinutes || 0,
          lateMinutes: record?.lateMinutes || 0,
          overtimeMinutes: record?.overtimeMinutes || 0,
          remarks: record?.remarks || ""
        };
      }),
      pagination: {
        page: safePage,
        limit: query.limit,
        totalRecords,
        totalPages
      }
    }
  });
}));

attendanceRouter.post("/staff/daily", asyncHandler(async (req, res) => {
  const body = z.object({
    date: z.string().trim().min(10),
    records: z.array(z.object({
      staffId: z.union([z.string().min(1), z.number().int()]),
      status: z.enum(["PRESENT", "ABSENT", "LEAVE", "LATE", "HALF_DAY"]),
      checkIn: z.string().trim().optional().nullable(),
      checkOut: z.string().trim().optional().nullable(),
      remarks: z.string().trim().optional().nullable()
    })).min(1)
  }).parse(req.body);

  const attendanceDate = new Date(`${body.date}T00:00:00.000Z`);
  const standardStartMinutes = 8 * 60;
  const standardEndMinutes = 16 * 60;
  const standardWorkMinutes = 8 * 60;

  await prisma.$transaction(body.records.map((record) => {
    const checkInDate = record.checkIn
      ? new Date(`${body.date}T${record.checkIn}:00.000Z`)
      : null;

    const checkOutDate = record.checkOut
      ? new Date(`${body.date}T${record.checkOut}:00.000Z`)
      : null;

    const checkInMinutes = record.checkIn
      ? Number(record.checkIn.slice(0, 2)) * 60 + Number(record.checkIn.slice(3, 5))
      : 0;

    const checkOutMinutes = record.checkOut
      ? Number(record.checkOut.slice(0, 2)) * 60 + Number(record.checkOut.slice(3, 5))
      : 0;

    const workedMinutes =
      checkInDate && checkOutDate && checkOutMinutes >= checkInMinutes
        ? checkOutMinutes - checkInMinutes
        : 0;

    const lateMinutes =
      checkInDate && checkInMinutes > standardStartMinutes
        ? checkInMinutes - standardStartMinutes
        : 0;

    const overtimeMinutes =
      checkOutDate && checkOutMinutes > standardEndMinutes
        ? checkOutMinutes - standardEndMinutes
        : Math.max(0, workedMinutes - standardWorkMinutes);

    return prisma.staffAttendance.upsert({
      where: {
        institutionId_staffId_attendanceDate: {
          institutionId: req.user.institutionId,
          staffId: record.staffId,
          attendanceDate
        }
      },
      update: {
        status: record.status,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        workedMinutes,
        lateMinutes,
        overtimeMinutes,
        remarks: record.remarks || null
      },
      create: {
        institutionId: req.user.institutionId,
        staffId: record.staffId,
        attendanceDate,
        status: record.status,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        workedMinutes,
        lateMinutes,
        overtimeMinutes,
        remarks: record.remarks || null
      }
    });
  }));

  res.json({
    success: true,
    message: "Staff attendance saved successfully."
  });
}));

attendanceRouter.get("/staff/monthly-summary", asyncHandler(async (req, res) => {
  const query = z.object({
    year: z.coerce.number().int().min(2000).max(2100),
    month: z.coerce.number().int().min(1).max(12),
    role: z.string().trim().optional().default(""),
    search: z.string().trim().optional().default(""),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(5).max(100).optional().default(10)
  }).parse(req.query);

  const from = new Date(Date.UTC(query.year, query.month - 1, 1));
  const to = new Date(Date.UTC(query.year, query.month, 1));

  const where = {
    institutionId: req.user.institutionId,
    ...(query.role ? { role: query.role } : {}),
    ...(query.search
      ? {
          OR: [
            { firstName: { contains: query.search } },
            { lastName: { contains: query.search } },
            { email: { contains: query.search } }
          ]
        }
      : {})
  };

  const totalRecords = await prisma.user.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalRecords / query.limit));
  const safePage = Math.min(query.page, totalPages);
  const skip = (safePage - 1) * query.limit;

  const staff = await prisma.user.findMany({
    where,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    skip,
    take: query.limit
  });

  const records = await prisma.staffAttendance.findMany({
    where: {
      institutionId: req.user.institutionId,
      staffId: { in: staff.map((item) => item.id) },
      attendanceDate: { gte: from, lt: to }
    }
  });

  const rows = staff.map((item) => {
    const itemRecords = records.filter((record) => record.staffId === item.id);

    const summary = {
      ...item,
      present: 0,
      absent: 0,
      leave: 0,
      late: 0,
      halfDay: 0,
      workingDays: itemRecords.length,
      workedMinutes: 0,
      lateMinutes: 0,
      overtimeMinutes: 0,
      payableDays: 0,
      attendancePercentage: 0
    };

    for (const record of itemRecords) {
      if (record.status === "PRESENT") summary.present += 1;
      if (record.status === "ABSENT") summary.absent += 1;
      if (record.status === "LEAVE") summary.leave += 1;
      if (record.status === "LATE") summary.late += 1;
      if (record.status === "HALF_DAY") summary.halfDay += 1;

      summary.workedMinutes += record.workedMinutes;
      summary.lateMinutes += record.lateMinutes;
      summary.overtimeMinutes += record.overtimeMinutes;
    }

    summary.payableDays =
      summary.present +
      summary.late +
      summary.leave +
      summary.halfDay * 0.5;

    summary.attendancePercentage = summary.workingDays
      ? Number((((summary.present + summary.late + summary.halfDay * 0.5) /
          summary.workingDays) * 100).toFixed(1))
      : 0;

    return summary;
  });

  res.json({
    success: true,
    data: {
      year: query.year,
      month: query.month,
      monthName: from.toLocaleString("en-US", {
        month: "long",
        timeZone: "UTC"
      }),
      records: rows,
      pagination: {
        page: safePage,
        limit: query.limit,
        totalRecords,
        totalPages
      }
    }
  });
}));
// PHASE22_STAFF_ATTENDANCE_END
