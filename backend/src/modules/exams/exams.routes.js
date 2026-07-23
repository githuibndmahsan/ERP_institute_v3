import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();
export const examsRouter = Router();

const bands = [
  [90, "A+", 4.0, "Outstanding performance"],
  [80, "A", 3.7, "Excellent performance"],
  [70, "B", 3.0, "Very good performance"],
  [60, "C", 2.5, "Good performance"],
  [50, "D", 2.0, "Satisfactory performance"],
  [33, "E", 1.0, "Pass; improvement recommended"],
  [0, "F", 0, "Needs immediate improvement"]
];

const gradeFor = (percentage) => {
  const [min, grade, gpa, comment] =
    bands.find(([minimum]) => percentage >= minimum);
  return { min, grade, gpa, comment };
};

examsRouter.post("/bootstrap-bise-lahore-ssc-science", async (req, res, next) => {
  try {
    const institutionId = req.user.institutionId;

    const scheme = await prisma.examBoardScheme.upsert({
      where: {
        institutionId_boardCode_version_level_groupName: {
          institutionId,
          boardCode: "BISE-LHR",
          version: "2025-27",
          level: "SSC",
          groupName: "SCIENCE"
        }
      },
      update: {},
      create: {
        institutionId,
        boardCode: "BISE-LHR",
        boardName: "BISE Lahore",
        name: "SSC Science Scheme",
        level: "SSC",
        groupName: "SCIENCE",
        version: "2025-27",
        certificateTotal: 1200,
        passingPercent: 33,
        status: "PUBLISHED"
      }
    });

    const subjects = [
      ["URDU", "Urdu", 150, "COMPULSORY", 1],
      ["ENG", "English", 150, "COMPULSORY", 2],
      ["MATH", "Mathematics", 150, "COMPULSORY", 3],
      ["ISL", "Islamiyat / Religious Education", 100, "COMPULSORY", 4],
      ["PST", "Pakistan Studies", 100, "COMPULSORY", 5],
      ["TQ", "Translation of Holy Quran / Ethics", 100, "COMPULSORY", 6],
      ["PHY", "Physics", 150, "COMPULSORY", 7],
      ["CHEM", "Chemistry", 150, "COMPULSORY", 8],
      ["BIO", "Biology", 150, "ELECTIVE", 9],
      ["CS", "Computer Science & Entrepreneurship", 150, "ELECTIVE", 10]
    ];

    const saved = [];

    for (const [code, name, totalMarks, subjectType, displayOrder] of subjects) {
      saved.push(await prisma.examSchemeSubject.upsert({
        where: { schemeId_code: { schemeId: scheme.id, code } },
        update: {
          name,
          totalMarks,
          passingMarks: Math.ceil(totalMarks * 0.33),
          subjectType,
          displayOrder
        },
        create: {
          institutionId,
          schemeId: scheme.id,
          code,
          name,
          subjectType,
          theoryMarks: totalMarks,
          totalMarks,
          passingMarks: Math.ceil(totalMarks * 0.33),
          displayOrder
        }
      }));
    }

    const group = await prisma.examElectiveGroup.upsert({
      where: {
        schemeId_name: {
          schemeId: scheme.id,
          name: "Biology or Computer Science"
        }
      },
      update: { minSelections: 1, maxSelections: 1, isRequired: true },
      create: {
        institutionId,
        schemeId: scheme.id,
        name: "Biology or Computer Science",
        minSelections: 1,
        maxSelections: 1,
        isRequired: true
      }
    });

    for (const code of ["BIO", "CS"]) {
      const subject = saved.find((item) => item.code === code);

      await prisma.examElectiveOption.upsert({
        where: {
          electiveGroupId_schemeSubjectId: {
            electiveGroupId: group.id,
            schemeSubjectId: subject.id
          }
        },
        update: {},
        create: {
          institutionId,
          electiveGroupId: group.id,
          schemeSubjectId: subject.id
        }
      });
    }

    res.json({
      success: true,
      message: "BISE Lahore SSC Science scheme created.",
      data: { schemeId: scheme.id }
    });
  } catch (error) {
    next(error);
  }
});

examsRouter.get("/schemes", async (req, res, next) => {
  try {
    const data = await prisma.examBoardScheme.findMany({
      where: { institutionId: req.user.institutionId },
      include: {
        subjects: {
          where: { isActive: true },
          orderBy: { displayOrder: "asc" }
        },
        electiveGroups: {
          include: {
            options: {
              include: { schemeSubject: true }
            }
          }
        }
      }
    });

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

examsRouter.post("/subject-selection", async (req, res, next) => {
  try {
    const body = z.object({
      studentId: z.union([z.string().min(1), z.number().int()]),
      schemeId: z.string().min(1),
      academicSession: z.string().min(1),
      selectedSubjectIds: z.array(z.string().min(1))
    }).parse(req.body);

    const scheme = await prisma.examBoardScheme.findFirst({
      where: {
        id: body.schemeId,
        institutionId: req.user.institutionId
      },
      include: {
        subjects: true,
        electiveGroups: { include: { options: true } }
      }
    });

    if (!scheme) {
      return res.status(404).json({ success: false, message: "Scheme not found." });
    }

    for (const group of scheme.electiveGroups) {
      const allowed = new Set(group.options.map((item) => item.schemeSubjectId));
      const count = body.selectedSubjectIds.filter((id) => allowed.has(id)).length;

      if (count < group.minSelections || count > group.maxSelections) {
        return res.status(400).json({
          success: false,
          message: `${group.name}: select exactly one subject.`
        });
      }
    }

    const compulsory = scheme.subjects
      .filter((item) => item.subjectType === "COMPULSORY")
      .map((item) => item.id);

    const finalIds = [...new Set([...compulsory, ...body.selectedSubjectIds])];

    await prisma.$transaction([
      prisma.studentSubjectSelection.deleteMany({
        where: {
          institutionId: req.user.institutionId,
          studentId: body.studentId,
          academicSession: body.academicSession,
          schemeSubject: { schemeId: body.schemeId }
        }
      }),
      ...finalIds.map((schemeSubjectId) =>
        prisma.studentSubjectSelection.create({
          data: {
            institutionId: req.user.institutionId,
            studentId: body.studentId,
            schemeSubjectId,
            academicSession: body.academicSession
          }
        })
      )
    ]);

    res.json({
      success: true,
      message: "Student subjects saved.",
      data: { subjectCount: finalIds.length }
    });
  } catch (error) {
    next(error);
  }
});

examsRouter.post("/results/calculate", async (req, res, next) => {
  try {
    const body = z.object({
      examId: z.string().min(1),
      studentId: z.union([z.string().min(1), z.number().int()]),
      teacherComment: z.string().optional().default(""),
      reviewerComment: z.string().optional().default(""),
      recommendation: z.string().optional().default(""),
      principalComment: z.string().optional().default(""),
      resultCardPhotoUrl: z.string().optional().nullable()
    }).parse(req.body);

    const papers = await prisma.examSubjectPaper.findMany({
      where: {
        examId: body.examId,
        institutionId: req.user.institutionId
      },
      include: {
        schemeSubject: true,
        marks: {
          where: { studentId: body.studentId }
        }
      }
    });

    if (!papers.length) {
      return res.status(400).json({ success: false, message: "No exam papers found." });
    }

    const subjectResults = papers.map((paper) => {
      const mark = paper.marks[0];
      const obtainedMarks = mark?.isAbsent ? 0 : Number(mark?.totalObtained || 0);
      const percentage = paper.totalMarks
        ? Number(((obtainedMarks / paper.totalMarks) * 100).toFixed(2))
        : 0;
      const band = gradeFor(percentage);
      const passed = !mark?.isAbsent && obtainedMarks >= paper.passingMarks;

      return {
        schemeSubjectId: paper.schemeSubjectId,
        totalMarks: paper.totalMarks,
        obtainedMarks,
        passingMarks: paper.passingMarks,
        percentage,
        grade: passed ? band.grade : "F",
        resultStatus: passed ? "PASS" : "FAIL",
        remarks: mark?.remarks || band.comment
      };
    });

    const totalMarks = subjectResults.reduce((a, b) => a + b.totalMarks, 0);
    const obtainedMarks = subjectResults.reduce((a, b) => a + b.obtainedMarks, 0);
    const percentage = totalMarks
      ? Number(((obtainedMarks / totalMarks) * 100).toFixed(2))
      : 0;
    const band = gradeFor(percentage);
    const resultStatus = subjectResults.some((item) => item.resultStatus === "FAIL")
      ? "FAIL"
      : "PASS";

    const result = await prisma.examResult.upsert({
      where: { examId_studentId: { examId: body.examId, studentId: body.studentId } },
      update: {
        totalMarks,
        obtainedMarks,
        percentage,
        grade: resultStatus === "PASS" ? band.grade : "F",
        gpa: resultStatus === "PASS" ? band.gpa : 0,
        resultStatus,
        teacherComment: body.teacherComment,
        reviewerComment: body.reviewerComment,
        recommendation: body.recommendation || band.comment,
        principalComment: body.principalComment,
        resultCardPhotoUrl: body.resultCardPhotoUrl,
        status: "REVIEWED"
      },
      create: {
        institutionId: req.user.institutionId,
        examId: body.examId,
        studentId: body.studentId,
        totalMarks,
        obtainedMarks,
        percentage,
        grade: resultStatus === "PASS" ? band.grade : "F",
        gpa: resultStatus === "PASS" ? band.gpa : 0,
        resultStatus,
        teacherComment: body.teacherComment,
        reviewerComment: body.reviewerComment,
        recommendation: body.recommendation || band.comment,
        principalComment: body.principalComment,
        resultCardPhotoUrl: body.resultCardPhotoUrl,
        status: "REVIEWED"
      }
    });

    await prisma.examResultSubject.deleteMany({ where: { resultId: result.id } });

    await prisma.examResultSubject.createMany({
      data: subjectResults.map((item) => ({
        institutionId: req.user.institutionId,
        resultId: result.id,
        ...item
      }))
    });

    res.json({
      success: true,
      message: "Result calculated.",
      data: { resultId: result.id, totalMarks, obtainedMarks, percentage, grade: result.grade, resultStatus }
    });
  } catch (error) {
    next(error);
  }
});

examsRouter.get("/results/:id/card", async (req, res, next) => {
  try {
    const result = await prisma.examResult.findFirst({
      where: {
        id: req.params.id,
        institutionId: req.user.institutionId
      },
      include: {
        exam: true,
        student: true,
        subjects: {
          include: { schemeSubject: true }
        }
      }
    });

    if (!result) {
      return res.status(404).json({ success: false, message: "Result card not found." });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// PHASE24_COMPLETE_EXAMS_RESULTS_START
examsRouter.get("/options", async (req, res, next) => {
  try {
    const institutionId = req.user.institutionId;

    const [schemes, students] = await Promise.all([
      prisma.examBoardScheme.findMany({
        where: {
          institutionId,
          status: "PUBLISHED"
        },
        include: {
          subjects: {
            where: { isActive: true },
            orderBy: { displayOrder: "asc" }
          },
          electiveGroups: {
            include: {
              options: {
                include: { schemeSubject: true }
              }
            }
          }
        },
        orderBy: { createdAt: "desc" }
      }),

      prisma.student.findMany({
        where: {
          institutionId,
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
          photoUrl: true
        },
        orderBy: [
          { className: "asc" },
          { section: "asc" },
          { rollNo: "asc" }
        ],
        take: 500
      })
    ]);

    const classes = [...new Set(students.map((item) => item.className).filter(Boolean))];
    const sectionsByClass = {};

    for (const student of students) {
      if (!student.className || !student.section) continue;

      sectionsByClass[student.className] ||= [];

      if (!sectionsByClass[student.className].includes(student.section)) {
        sectionsByClass[student.className].push(student.section);
      }
    }

    res.json({
      success: true,
      data: {
        schemes,
        classes,
        sectionsByClass
      }
    });
  } catch (error) {
    next(error);
  }
});

examsRouter.post("/", async (req, res, next) => {
  try {
    const institutionId = req.user.institutionId;

    const body = z.object({
      schemeId: z.string().min(1),
      academicSession: z.string().min(1),
      name: z.string().min(2),
      term: z.string().min(1),
      className: z.string().min(1),
      section: z.string().optional().default(""),
      resultDate: z.string().optional().nullable(),
      paperMode: z.enum(["SCHEME", "CUSTOM"]).default("SCHEME"),
      customMaximumMarks: z.coerce.number().positive().optional().nullable()
    }).parse(req.body);

    const scheme = await prisma.examBoardScheme.findFirst({
      where: {
        id: body.schemeId,
        institutionId
      },
      include: {
        subjects: {
          where: { isActive: true },
          orderBy: { displayOrder: "asc" }
        }
      }
    });

    if (!scheme) {
      return res.status(404).json({
        success: false,
        message: "Board scheme not found."
      });
    }

    const exam = await prisma.examDefinition.create({
      data: {
        institutionId,
        schemeId: scheme.id,
        academicSession: body.academicSession,
        name: body.name,
        term: body.term,
        className: body.className,
        section: body.section || null,
        resultDate: body.resultDate
          ? new Date(`${body.resultDate}T00:00:00.000Z`)
          : null
      }
    });

    const paperData = scheme.subjects.map((subject) => {
      const totalMarks =
        body.paperMode === "CUSTOM" && body.customMaximumMarks
          ? body.customMaximumMarks
          : subject.totalMarks;

      return {
        institutionId,
        examId: exam.id,
        schemeSubjectId: subject.id,
        theoryMax: totalMarks,
        practicalMax: 0,
        internalMax: 0,
        totalMarks,
        passingMarks: Math.ceil(
          totalMarks * (scheme.passingPercent / 100)
        )
      };
    });

    await prisma.examSubjectPaper.createMany({
      data: paperData
    });

    res.status(201).json({
      success: true,
      message: "Exam created successfully.",
      data: exam
    });
  } catch (error) {
    next(error);
  }
});

examsRouter.get("/", async (req, res, next) => {
  try {
    const query = z.object({
      search: z.string().optional().default(""),
      className: z.string().optional().default(""),
      academicSession: z.string().optional().default(""),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(5).max(100).default(10)
    }).parse(req.query);

    const where = {
      institutionId: req.user.institutionId,
      ...(query.className ? { className: query.className } : {}),
      ...(query.academicSession
        ? { academicSession: query.academicSession }
        : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search } },
              { term: { contains: query.search } },
              { className: { contains: query.search } }
            ]
          }
        : {})
    };

    const totalRecords = await prisma.examDefinition.count({ where });
    const totalPages = Math.max(1, Math.ceil(totalRecords / query.limit));
    const safePage = Math.min(query.page, totalPages);

    const records = await prisma.examDefinition.findMany({
      where,
      include: {
        scheme: {
          select: {
            boardName: true,
            name: true,
            version: true
          }
        },
        _count: {
          select: {
            subjects: true,
            results: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      skip: (safePage - 1) * query.limit,
      take: query.limit
    });

    res.json({
      success: true,
      data: {
        records,
        pagination: {
          page: safePage,
          limit: query.limit,
          totalRecords,
          totalPages
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

examsRouter.get("/:examId/marks-sheet", async (req, res, next) => {
  try {
    const query = z.object({
      subjectId: z.string().min(1),
      search: z.string().optional().default(""),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(5).max(100).default(10)
    }).parse(req.query);

    const exam = await prisma.examDefinition.findFirst({
      where: {
        id: req.params.examId,
        institutionId: req.user.institutionId
      },
      include: {
        subjects: {
          where: {
            id: query.subjectId
          },
          include: {
            schemeSubject: true
          }
        }
      }
    });

    if (!exam || !exam.subjects.length) {
      return res.status(404).json({
        success: false,
        message: "Exam subject not found."
      });
    }

    const paper = exam.subjects[0];

    const studentWhere = {
      institutionId: req.user.institutionId,
      deletedAt: null,
      status: "ACTIVE",
      className: exam.className,
      ...(exam.section ? { section: exam.section } : {}),
      ...(query.search
        ? {
            OR: [
              { firstName: { contains: query.search } },
              { lastName: { contains: query.search } },
              { studentId: { contains: query.search } },
              { rollNo: { contains: query.search } }
            ]
          }
        : {})
    };

    const totalRecords = await prisma.student.count({
      where: studentWhere
    });

    const totalPages = Math.max(1, Math.ceil(totalRecords / query.limit));
    const safePage = Math.min(query.page, totalPages);

    const students = await prisma.student.findMany({
      where: studentWhere,
      select: {
        id: true,
        studentId: true,
        rollNo: true,
        firstName: true,
        lastName: true,
        photoUrl: true
      },
      orderBy: [
        { rollNo: "asc" },
        { firstName: "asc" }
      ],
      skip: (safePage - 1) * query.limit,
      take: query.limit
    });

    const marks = await prisma.examMarksEntry.findMany({
      where: {
        institutionId: req.user.institutionId,
        examSubjectId: paper.id,
        studentId: {
          in: students.map((item) => item.id)
        }
      }
    });

    const markMap = new Map(
      marks.map((item) => [String(item.studentId), item])
    );

    res.json({
      success: true,
      data: {
        exam: {
          id: exam.id,
          name: exam.name,
          term: exam.term,
          className: exam.className,
          section: exam.section,
          academicSession: exam.academicSession
        },
        paper: {
          id: paper.id,
          subjectId: paper.schemeSubjectId,
          subjectName: paper.schemeSubject.name,
          theoryMax: paper.theoryMax,
          practicalMax: paper.practicalMax,
          internalMax: paper.internalMax,
          totalMarks: paper.totalMarks,
          passingMarks: paper.passingMarks
        },
        records: students.map((student) => {
          const mark = markMap.get(String(student.id));

          return {
            ...student,
            theoryObtained: mark?.theoryObtained ?? 0,
            practicalObtained: mark?.practicalObtained ?? 0,
            internalObtained: mark?.internalObtained ?? 0,
            totalObtained: mark?.totalObtained ?? 0,
            isAbsent: mark?.isAbsent ?? false,
            remarks: mark?.remarks ?? ""
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
  } catch (error) {
    next(error);
  }
});

examsRouter.post("/:examId/marks-sheet", async (req, res, next) => {
  try {
    const body = z.object({
      examSubjectId: z.string().min(1),
      records: z.array(
        z.object({
          studentId: z.union([z.string().min(1), z.number().int()]),
          theoryObtained: z.coerce.number().min(0),
          practicalObtained: z.coerce.number().min(0),
          internalObtained: z.coerce.number().min(0),
          isAbsent: z.boolean().default(false),
          remarks: z.string().optional().default("")
        })
      ).min(1)
    }).parse(req.body);

    const paper = await prisma.examSubjectPaper.findFirst({
      where: {
        id: body.examSubjectId,
        examId: req.params.examId,
        institutionId: req.user.institutionId
      }
    });

    if (!paper) {
      return res.status(404).json({
        success: false,
        message: "Exam subject paper not found."
      });
    }

    for (const record of body.records) {
      if (record.theoryObtained > paper.theoryMax) {
        return res.status(400).json({
          success: false,
          message: "Theory marks exceed maximum marks."
        });
      }

      if (record.practicalObtained > paper.practicalMax) {
        return res.status(400).json({
          success: false,
          message: "Practical marks exceed maximum marks."
        });
      }

      if (record.internalObtained > paper.internalMax) {
        return res.status(400).json({
          success: false,
          message: "Internal marks exceed maximum marks."
        });
      }
    }

    await prisma.$transaction(
      body.records.map((record) => {
        const totalObtained = record.isAbsent
          ? 0
          : record.theoryObtained +
            record.practicalObtained +
            record.internalObtained;

        return prisma.examMarksEntry.upsert({
          where: {
            examSubjectId_studentId: {
              examSubjectId: body.examSubjectId,
              studentId: record.studentId
            }
          },
          update: {
            theoryObtained: record.isAbsent ? 0 : record.theoryObtained,
            practicalObtained: record.isAbsent ? 0 : record.practicalObtained,
            internalObtained: record.isAbsent ? 0 : record.internalObtained,
            totalObtained,
            isAbsent: record.isAbsent,
            remarks: record.remarks || null
          },
          create: {
            institutionId: req.user.institutionId,
            examSubjectId: body.examSubjectId,
            studentId: record.studentId,
            theoryObtained: record.isAbsent ? 0 : record.theoryObtained,
            practicalObtained: record.isAbsent ? 0 : record.practicalObtained,
            internalObtained: record.isAbsent ? 0 : record.internalObtained,
            totalObtained,
            isAbsent: record.isAbsent,
            remarks: record.remarks || null
          }
        });
      })
    );

    res.json({
      success: true,
      message: "Marks saved successfully."
    });
  } catch (error) {
    next(error);
  }
});

examsRouter.get("/:examId/subjects", async (req, res, next) => {
  try {
    const records = await prisma.examSubjectPaper.findMany({
      where: {
        examId: req.params.examId,
        institutionId: req.user.institutionId
      },
      include: {
        schemeSubject: true
      },
      orderBy: {
        schemeSubject: {
          displayOrder: "asc"
        }
      }
    });

    res.json({
      success: true,
      data: records
    });
  } catch (error) {
    next(error);
  }
});

examsRouter.post("/:examId/generate-results", async (req, res, next) => {
  try {
    const body = z.object({
      teacherComment: z.string().optional().default(""),
      reviewerComment: z.string().optional().default(""),
      recommendation: z.string().optional().default(""),
      principalComment: z.string().optional().default("")
    }).parse(req.body);

    const exam = await prisma.examDefinition.findFirst({
      where: {
        id: req.params.examId,
        institutionId: req.user.institutionId
      }
    });

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found."
      });
    }

    const students = await prisma.student.findMany({
      where: {
        institutionId: req.user.institutionId,
        deletedAt: null,
        status: "ACTIVE",
        className: exam.className,
        ...(exam.section ? { section: exam.section } : {})
      },
      select: {
        id: true,
        photoUrl: true
      }
    });

    const generated = [];

    for (const student of students) {
      const response = await fetch(
        `http://127.0.0.1:${process.env.PORT || 4000}/api/v1/exams/results/calculate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: req.headers.authorization || ""
          },
          body: JSON.stringify({
            examId: exam.id,
            studentId: student.id,
            teacherComment: body.teacherComment,
            reviewerComment: body.reviewerComment,
            recommendation: body.recommendation,
            principalComment: body.principalComment,
            resultCardPhotoUrl: student.photoUrl || null
          })
        }
      );

      if (response.ok) {
        generated.push(await response.json());
      }
    }

    res.json({
      success: true,
      message: `${generated.length} result cards generated.`,
      data: {
        generatedCount: generated.length
      }
    });
  } catch (error) {
    next(error);
  }
});

examsRouter.get("/:examId/results", async (req, res, next) => {
  try {
    const query = z.object({
      search: z.string().optional().default(""),
      status: z.string().optional().default(""),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(5).max(100).default(10)
    }).parse(req.query);

    const where = {
      institutionId: req.user.institutionId,
      examId: req.params.examId,
      ...(query.status ? { resultStatus: query.status } : {}),
      ...(query.search
        ? {
            student: {
              OR: [
                { firstName: { contains: query.search } },
                { lastName: { contains: query.search } },
                { studentId: { contains: query.search } }
              ]
            }
          }
        : {})
    };

    const totalRecords = await prisma.examResult.count({ where });
    const totalPages = Math.max(1, Math.ceil(totalRecords / query.limit));
    const safePage = Math.min(query.page, totalPages);

    const records = await prisma.examResult.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            rollNo: true,
            firstName: true,
            lastName: true,
            photoUrl: true
          }
        }
      },
      orderBy: [
        { percentage: "desc" },
        { obtainedMarks: "desc" }
      ],
      skip: (safePage - 1) * query.limit,
      take: query.limit
    });

    res.json({
      success: true,
      data: {
        records,
        pagination: {
          page: safePage,
          limit: query.limit,
          totalRecords,
          totalPages
        }
      }
    });
  } catch (error) {
    next(error);
  }
});
// PHASE24_COMPLETE_EXAMS_RESULTS_END
