import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const maleNames = [
  ["Ahmad", "Raza"], ["Ali", "Hassan"], ["Hamza", "Khan"],
  ["Bilal", "Ahmed"], ["Usman", "Malik"], ["Ibrahim", "Sheikh"],
  ["Saad", "Qureshi"], ["Talha", "Siddiqui"], ["Zain", "Hussain"],
  ["Abdullah", "Javed"]
];

const femaleNames = [
  ["Fatima", "Noor"], ["Ayesha", "Khan"], ["Maryam", "Ahmed"],
  ["Hania", "Malik"], ["Zoya", "Hussain"], ["Laiba", "Sheikh"],
  ["Eman", "Qureshi"], ["Areeba", "Raza"], ["Iqra", "Javed"],
  ["Amna", "Siddiqui"]
];

const classes = [
  ["Grade 6", "A"], ["Grade 6", "B"],
  ["Grade 7", "A"], ["Grade 7", "B"],
  ["Grade 8", "A"], ["Grade 8", "B"],
  ["Grade 9", "A"], ["Grade 9", "B"],
  ["Grade 10", "A"], ["Grade 10", "B"]
];

function phone(index) {
  return `030${index % 10}-${String(1100000 + index * 173).slice(-7)}`;
}

async function resolveDemoInstitution() {
  const demoUser = await prisma.user.findFirst({
    where: {
      OR: [
        { username: "demo-admin" },
        { username: "admin-ndmahsan" },
        { email: { contains: "demo" } }
      ]
    }
  });

  if (demoUser?.institutionId) {
    return prisma.institution.findUnique({
      where: { id: demoUser.institutionId }
    });
  }

  const namedInstitution = await prisma.institution.findFirst({
    where: {
      OR: [
        { name: { contains: "Demo" } },
        { code: { contains: "DEMO" } }
      ]
    },
    orderBy: { createdAt: "asc" }
  });

  if (namedInstitution) return namedInstitution;

  return prisma.institution.findFirst({
    orderBy: { createdAt: "asc" }
  });
}

async function main() {
  const institution = await resolveDemoInstitution();

  if (!institution) {
    throw new Error("No institution found.");
  }

  console.log(`Target institution: ${institution.name} (${institution.id})`);

  let created = 0;
  let updated = 0;

  for (let index = 1; index <= 40; index += 1) {
    const female = index % 2 === 0;
    const pool = female ? femaleNames : maleNames;
    const [firstName, lastName] = pool[(index - 1) % pool.length];
    const [className, section] = classes[(index - 1) % classes.length];

    const studentId =
      `${institution.code}-2026-${String(index).padStart(4, "0")}`;

    const admissionNo =
      `ADM-${institution.code}-${String(index).padStart(4, "0")}`;

    const status =
      index % 9 === 0 ? "INACTIVE" :
      index % 7 === 0 ? "PENDING" :
      "ACTIVE";

    const data = {
      admissionNo,
      rollNo: index,
      firstName,
      lastName,
      gender: female ? "FEMALE" : "MALE",
      dateOfBirth: new Date(
        Date.UTC(2010 + (index % 6), index % 12, (index % 26) + 1)
      ),
      bFormNo:
        `31202-${String(1200000 + index * 81).slice(-7)}-${(index % 9) + 1}`,
      email:
        `${firstName}.${lastName}.${index}@demo-school.edu`.toLowerCase(),
      phone: phone(index + 50),
      className,
      section,
      guardianName: `Guardian of ${firstName}`,
      guardianPhone: phone(index),
      guardianRelation: index % 4 === 0 ? "Mother" : "Father",
      address: `House ${100 + index}, Model Town, Lahore`,
      status,
      admissionDate: new Date(
        Date.UTC(2026, index % 7, (index % 24) + 1)
      ),
      deletedAt: null
    };

    const existing = await prisma.student.findFirst({
      where: {
        institutionId: institution.id,
        studentId
      }
    });

    let student;

    if (existing) {
      student = await prisma.student.update({
        where: { id: existing.id },
        data
      });
      updated += 1;
    } else {
      student = await prisma.student.create({
        data: {
          institutionId: institution.id,
          studentId,
          ...data
        }
      });
      created += 1;
    }

    const guardian = await prisma.studentGuardian.findFirst({
      where: {
        studentId: student.id,
        institutionId: institution.id,
        isPrimary: true
      }
    });

    if (!guardian) {
      await prisma.studentGuardian.create({
        data: {
          studentId: student.id,
          institutionId: institution.id,
          name: data.guardianName,
          relation: data.guardianRelation,
          phone: data.guardianPhone,
          alternatePhone: phone(index + 80),
          email: `guardian.${index}@example.com`,
          occupation: index % 2 === 0 ? "Business" : "Service",
          address: data.address,
          isPrimary: true
        }
      });
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
      studentSeq: Math.max(
        Number(institution.studentSeq || 0),
        total
      )
    }
  });

  console.log("");
  console.log("✅ Demo Institute student data fixed.");
  console.log(`Created: ${created}`);
  console.log(`Updated: ${updated}`);
  console.log(`Visible active database records: ${total}`);
}

main()
  .catch((error) => {
    console.error("❌ Failed:");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
