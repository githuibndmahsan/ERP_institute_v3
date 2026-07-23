import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const firstNamesMale = [
  "Ahmad", "Ali", "Hassan", "Usman", "Hamza", "Bilal", "Ibrahim",
  "Talha", "Saad", "Zain", "Abdullah", "Ayaan", "Rayyan", "Huzaifa"
];

const firstNamesFemale = [
  "Fatima", "Ayesha", "Maryam", "Hania", "Zoya", "Noor", "Laiba",
  "Eman", "Maham", "Areeba", "Iqra", "Anaya", "Amna", "Mehwish"
];

const lastNames = [
  "Raza", "Khan", "Ahmed", "Hussain", "Malik", "Sheikh", "Qureshi",
  "Siddiqui", "Butt", "Chaudhry", "Abbasi", "Mughal", "Hashmi", "Javed"
];

const guardianNames = [
  "Muhammad Raza", "Naveed Khan", "Imran Ahmed", "Abdul Hameed",
  "Tariq Hussain", "Rashid Malik", "Farooq Sheikh", "Khalid Qureshi",
  "Sajid Siddiqui", "Asif Mehmood", "Shahid Iqbal", "Kamran Javed"
];

const classes = [
  ["Grade 6", "A"],
  ["Grade 6", "B"],
  ["Grade 7", "A"],
  ["Grade 7", "B"],
  ["Grade 8", "A"],
  ["Grade 8", "B"],
  ["Grade 9", "A"],
  ["Grade 9", "B"],
  ["Grade 10", "A"],
  ["Grade 10", "B"]
];

const statuses = ["ACTIVE", "ACTIVE", "ACTIVE", "ACTIVE", "PENDING", "INACTIVE"];

function phone(index) {
  return `030${index % 10}-${String(1000000 + index * 137).slice(-7)}`;
}

function bForm(index) {
  return `31202-${String(1000000 + index * 91).slice(-7)}-${(index % 9) + 1}`;
}

function birthDate(index) {
  const year = 2010 + (index % 6);
  const month = (index % 12) + 1;
  const day = (index % 27) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

async function main() {
  const institution = await prisma.institution.findFirst({
    orderBy: [
      { status: "asc" },
      { createdAt: "asc" }
    ]
  });

  if (!institution) {
    throw new Error("No institution found. Create an institution first.");
  }

  const totalToCreate = 40;
  let createdCount = 0;
  let updatedCount = 0;

  for (let index = 1; index <= totalToCreate; index += 1) {
    const isFemale = index % 2 === 0;
    const firstName = isFemale
      ? firstNamesFemale[(index - 1) % firstNamesFemale.length]
      : firstNamesMale[(index - 1) % firstNamesMale.length];

    const lastName = lastNames[(index - 1) % lastNames.length];
    const guardianName = guardianNames[(index - 1) % guardianNames.length];
    const [className, section] = classes[(index - 1) % classes.length];
    const studentId = `${institution.code}-2026-${String(index).padStart(4, "0")}`;
    const admissionNo = `ADM-${institution.code}-${String(index).padStart(4, "0")}`;
    const status = statuses[(index - 1) % statuses.length];

    const existing = await prisma.student.findUnique({
      where: {
        institutionId_studentId: {
          institutionId: institution.id,
          studentId
        }
      }
    });

    const studentData = {
      admissionNo,
      rollNo: index,
      firstName,
      lastName,
      gender: isFemale ? "FEMALE" : "MALE",
      dateOfBirth: birthDate(index),
      bFormNo: bForm(index),
      email: `${firstName}.${lastName}${index}@example.edu`.toLowerCase(),
      phone: phone(index + 40),
      className,
      section,
      guardianName,
      guardianPhone: phone(index),
      guardianRelation: index % 3 === 0 ? "Mother" : "Father",
      address: `House ${20 + index}, Model Town, Lahore`,
      status,
      admissionDate: new Date(Date.UTC(2026, index % 6, (index % 25) + 1)),
      notes: index % 5 === 0
        ? "Dummy student record created for ERP testing."
        : null,
      deletedAt: status === "ARCHIVED" ? new Date() : null
    };

    let student;

    if (existing) {
      student = await prisma.student.update({
        where: { id: existing.id },
        data: studentData
      });
      updatedCount += 1;
    } else {
      student = await prisma.student.create({
        data: {
          institutionId: institution.id,
          studentId,
          ...studentData
        }
      });
      createdCount += 1;
    }

    const primaryGuardian = await prisma.studentGuardian.findFirst({
      where: {
        studentId: student.id,
        institutionId: institution.id,
        isPrimary: true
      }
    });

    if (!primaryGuardian) {
      await prisma.studentGuardian.create({
        data: {
          studentId: student.id,
          institutionId: institution.id,
          name: guardianName,
          relation: studentData.guardianRelation,
          phone: studentData.guardianPhone,
          alternatePhone: phone(index + 70),
          email: `guardian${index}@example.com`,
          occupation: index % 2 === 0 ? "Business" : "Service",
          address: studentData.address,
          isPrimary: true
        }
      });
    }
  }

  const currentMax = await prisma.student.count({
    where: { institutionId: institution.id }
  });

  await prisma.institution.update({
    where: { id: institution.id },
    data: {
      studentSeq: Math.max(Number(institution.studentSeq || 0), currentMax)
    }
  });

  console.log("");
  console.log("✅ Dummy students seeded successfully.");
  console.log(`Institution: ${institution.name}`);
  console.log(`Created: ${createdCount}`);
  console.log(`Updated: ${updatedCount}`);
  console.log(`Total processed: ${totalToCreate}`);
  console.log("");
}

main()
  .catch((error) => {
    console.error("❌ Student seeding failed:");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
