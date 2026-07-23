import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const classes = [
  "Prep",
  "Nursery",
  "KG1",
  "KG2",
  "1st Class",
  "2nd Class",
  "3rd Class",
  "4th Class",
  "5th Class",
  "6th Class",
  "7th Class",
  "8th Class",
  "9th Class",
  "10th Class"
];

const sections = ["A", "B"];

const boys = [
  ["Ahmad", "Raza"],
  ["Ali", "Hassan"],
  ["Hamza", "Khan"],
  ["Bilal", "Ahmed"],
  ["Usman", "Malik"],
  ["Ibrahim", "Sheikh"],
  ["Saad", "Qureshi"],
  ["Talha", "Siddiqui"],
  ["Zain", "Hussain"],
  ["Abdullah", "Javed"]
];

const girls = [
  ["Fatima", "Noor"],
  ["Ayesha", "Khan"],
  ["Maryam", "Ahmed"],
  ["Hania", "Malik"],
  ["Zoya", "Hussain"],
  ["Laiba", "Sheikh"],
  ["Eman", "Qureshi"],
  ["Areeba", "Raza"],
  ["Iqra", "Javed"],
  ["Amna", "Siddiqui"]
];

function phone(index) {
  return `030${index % 10}-${String(1000000 + index * 173).slice(-7)}`;
}

function safeCode(value) {
  return String(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 10);
}

async function resolveInstitution() {
  const demoInstitution = await prisma.institution.findFirst({
    where: {
      OR: [
        { name: { contains: "Demo" } },
        { code: { contains: "DEMO" } }
      ]
    },
    orderBy: { createdAt: "asc" }
  });

  if (demoInstitution) {
    return demoInstitution;
  }

  const userWithInstitution = await prisma.user.findFirst({
    where: {
      institutionId: { not: null }
    },
    orderBy: { createdAt: "asc" }
  });

  if (userWithInstitution?.institutionId) {
    return prisma.institution.findUnique({
      where: { id: userWithInstitution.institutionId }
    });
  }

  return prisma.institution.findFirst({
    orderBy: { createdAt: "asc" }
  });
}

async function main() {
  const institution = await resolveInstitution();

  if (!institution) {
    throw new Error("No institution found.");
  }

  console.log(`Target institution: ${institution.name}`);

  let sequence = Number(institution.studentSeq || 0);
  let created = 0;
  let updated = 0;

  for (let classIndex = 0; classIndex < classes.length; classIndex += 1) {
    const className = classes[classIndex];

    for (const section of sections) {
      for (let i = 1; i <= 10; i += 1) {
        sequence += 1;

        const female = i % 2 === 0;
        const pool = female ? girls : boys;
        const [firstName, lastName] = pool[(i - 1) % pool.length];

        const classCode = safeCode(className);
        const studentId =
          `${institution.code}-${classCode}-${section}-${String(i).padStart(2, "0")}`;

        const admissionNo =
          `ADM-${institution.code}-${classCode}-${section}-${String(i).padStart(2, "0")}`;

        const existing = await prisma.student.findFirst({
          where: {
            institutionId: institution.id,
            className,
            section,
            rollNo: i
          }
        });

        const birthYear = 2010 + Math.max(0, 10 - classIndex);

        const data = {
          studentId,
          admissionNo,
          rollNo: i,
          firstName,
          lastName,
          gender: female ? "FEMALE" : "MALE",
          dateOfBirth: new Date(
            Date.UTC(
              Math.min(2021, birthYear),
              (classIndex + i) % 12,
              (i % 24) + 1
            )
          ),
          bFormNo:
            `31202-${String(2000000 + classIndex * 1000 + i * 37).slice(-7)}-${(i % 9) + 1}`,
          email:
            `${firstName}.${lastName}.${classCode}.${section}.${i}@demo.edu`.toLowerCase(),
          phone: phone(classIndex * 100 + i),
          className,
          section,
          guardianName: `Guardian of ${firstName}`,
          guardianPhone: phone(classIndex * 100 + i + 500),
          guardianRelation: i % 3 === 0 ? "Mother" : "Father",
          address: `House ${100 + classIndex * 20 + i}, Model Town, Lahore`,
          status: "ACTIVE",
          admissionDate: new Date(Date.UTC(2026, classIndex % 7, (i % 24) + 1)),
          deletedAt: null
        };

        if (existing) {
          await prisma.student.update({
            where: { id: existing.id },
            data
          });
          updated += 1;
        } else {
          await prisma.student.create({
            data: {
              institutionId: institution.id,
              ...data
            }
          });
          created += 1;
        }
      }
    }
  }

  const total = await prisma.student.count({
    where: {
      institutionId: institution.id,
      deletedAt: null
    }
  });

  await prisma.institution.update({
    where: { id: institution.id },
    data: {
      studentSeq: Math.max(sequence, total)
    }
  });

  console.log("");
  console.log("✅ Attendance class dummy data ready.");
  console.log(`Classes: ${classes.length}`);
  console.log(`Sections per class: ${sections.length}`);
  console.log(`Students per section: 10`);
  console.log(`Expected seeded students: ${classes.length * sections.length * 10}`);
  console.log(`Created: ${created}`);
  console.log(`Updated: ${updated}`);
  console.log(`Total active students in institution: ${total}`);
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
