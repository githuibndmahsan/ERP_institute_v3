import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const temporaryPassword = "Institute@12345";

const institutions = [
  {
    name: "City Beaconhouse School",
    code: "CITY-BEACON",
    tenantKey: "city-beaconhouse",
    subdomain: "city-beaconhouse.your-erp.com",
    officialEmail: "info@city-beaconhouse.example",
    billingEmail: "accounts@city-beaconhouse.example",
    primaryPhone: "0300-4101001",
    secondaryPhone: "0301-4101001",
    contactPersonName: "Ayesha Siddiqui",
    contactPersonTitle: "Campus Principal",
    address: "12 Education Avenue, Johar Town",
    city: "Lahore",
    country: "Pakistan",
    adminName: "City Beaconhouse Administrator",
    adminUsername: "city-beacon-admin",
    adminEmail: "admin@city-beaconhouse.example",
    customPrice: 28000
  },
  {
    name: "Aligarh Model School",
    code: "ALIGARH",
    tenantKey: "aligarh-model",
    subdomain: "aligarh-model.your-erp.com",
    officialEmail: "info@aligarh-model.example",
    billingEmail: "accounts@aligarh-model.example",
    primaryPhone: "0300-4101002",
    secondaryPhone: "0301-4101002",
    contactPersonName: "Muhammad Hamza",
    contactPersonTitle: "Principal",
    address: "44 Scholars Road, Gulgasht Colony",
    city: "Multan",
    country: "Pakistan",
    adminName: "Aligarh School Administrator",
    adminUsername: "aligarh-admin",
    adminEmail: "admin@aligarh-model.example",
    customPrice: 25000
  },
  {
    name: "ILM Scholars School",
    code: "ILM-SCHOLARS",
    tenantKey: "ilm-scholars",
    subdomain: "ilm-scholars.your-erp.com",
    officialEmail: "info@ilm-scholars.example",
    billingEmail: "accounts@ilm-scholars.example",
    primaryPhone: "0300-4101003",
    secondaryPhone: "0301-4101003",
    contactPersonName: "Sana Rauf",
    contactPersonTitle: "Director Academics",
    address: "18 Knowledge Boulevard, Canal Road",
    city: "Faisalabad",
    country: "Pakistan",
    adminName: "ILM Scholars Administrator",
    adminUsername: "ilm-scholars-admin",
    adminEmail: "admin@ilm-scholars.example",
    customPrice: 27000
  },
  {
    name: "Crescent Grammar School",
    code: "CRESCENT-GS",
    tenantKey: "crescent-grammar",
    subdomain: "crescent-grammar.your-erp.com",
    officialEmail: "info@crescent-grammar.example",
    billingEmail: "accounts@crescent-grammar.example",
    primaryPhone: "0300-4101004",
    secondaryPhone: "0301-4101004",
    contactPersonName: "Farah Imran",
    contactPersonTitle: "Head of School",
    address: "7 Crescent Campus Road, G-11",
    city: "Islamabad",
    country: "Pakistan",
    adminName: "Crescent Grammar Administrator",
    adminUsername: "crescent-admin",
    adminEmail: "admin@crescent-grammar.example",
    customPrice: 30000
  },
  {
    name: "The Knowledge City School",
    code: "KNOWLEDGE-CITY",
    tenantKey: "knowledge-city",
    subdomain: "knowledge-city.your-erp.com",
    officialEmail: "info@knowledge-city.example",
    billingEmail: "accounts@knowledge-city.example",
    primaryPhone: "0300-4101005",
    secondaryPhone: "0301-4101005",
    contactPersonName: "Usman Khalid",
    contactPersonTitle: "Executive Principal",
    address: "25 Learning Street, Bahria Town",
    city: "Rawalpindi",
    country: "Pakistan",
    adminName: "Knowledge City Administrator",
    adminUsername: "knowledge-city-admin",
    adminEmail: "admin@knowledge-city.example",
    customPrice: 32000
  },
  {
    name: "Bright Future Academy",
    code: "BRIGHT-FUTURE",
    tenantKey: "bright-future",
    subdomain: "bright-future.your-erp.com",
    officialEmail: "info@bright-future.example",
    billingEmail: "accounts@bright-future.example",
    primaryPhone: "0300-4101006",
    secondaryPhone: "0301-4101006",
    contactPersonName: "Hira Mahmood",
    contactPersonTitle: "Principal",
    address: "31 Model Education Colony",
    city: "Bahawalpur",
    country: "Pakistan",
    adminName: "Bright Future Administrator",
    adminUsername: "bright-future-admin",
    adminEmail: "admin@bright-future.example",
    customPrice: 24000
  },
  {
    name: "Pak Heritage School",
    code: "PAK-HERITAGE",
    tenantKey: "pak-heritage",
    subdomain: "pak-heritage.your-erp.com",
    officialEmail: "info@pak-heritage.example",
    billingEmail: "accounts@pak-heritage.example",
    primaryPhone: "0300-4101007",
    secondaryPhone: "0301-4101007",
    contactPersonName: "Noman Akhtar",
    contactPersonTitle: "Campus Director",
    address: "16 Heritage Lane, Civil Lines",
    city: "Gujranwala",
    country: "Pakistan",
    adminName: "Pak Heritage Administrator",
    adminUsername: "pak-heritage-admin",
    adminEmail: "admin@pak-heritage.example",
    customPrice: 26000
  },
  {
    name: "Oxford Progressive School",
    code: "OXFORD-PROG",
    tenantKey: "oxford-progressive",
    subdomain: "oxford-progressive.your-erp.com",
    officialEmail: "info@oxford-progressive.example",
    billingEmail: "accounts@oxford-progressive.example",
    primaryPhone: "0300-4101008",
    secondaryPhone: "0301-4101008",
    contactPersonName: "Mariam Saleem",
    contactPersonTitle: "School Principal",
    address: "9 Progressive Campus Avenue, Cantt",
    city: "Sialkot",
    country: "Pakistan",
    adminName: "Oxford Progressive Administrator",
    adminUsername: "oxford-progressive-admin",
    adminEmail: "admin@oxford-progressive.example",
    customPrice: 29000
  },
  {
    name: "National Science School",
    code: "NATIONAL-SCI",
    tenantKey: "national-science",
    subdomain: "national-science.your-erp.com",
    officialEmail: "info@national-science.example",
    billingEmail: "accounts@national-science.example",
    primaryPhone: "0300-4101009",
    secondaryPhone: "0301-4101009",
    contactPersonName: "Dr. Ali Raza",
    contactPersonTitle: "Academic Director",
    address: "63 Science Park Road, Gulshan-e-Iqbal",
    city: "Karachi",
    country: "Pakistan",
    adminName: "National Science Administrator",
    adminUsername: "national-science-admin",
    adminEmail: "admin@national-science.example",
    customPrice: 35000
  },
  {
    name: "Green Valley Public School",
    code: "GREEN-VALLEY",
    tenantKey: "green-valley",
    subdomain: "green-valley.your-erp.com",
    officialEmail: "info@green-valley.example",
    billingEmail: "accounts@green-valley.example",
    primaryPhone: "0300-4101010",
    secondaryPhone: "0301-4101010",
    contactPersonName: "Khadija Noor",
    contactPersonTitle: "Principal",
    address: "22 Green Campus Road, University Town",
    city: "Peshawar",
    country: "Pakistan",
    adminName: "Green Valley Administrator",
    adminUsername: "green-valley-admin",
    adminEmail: "admin@green-valley.example",
    customPrice: 25000
  }
];

function addMonths(date, months) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

async function main() {
  const passwordHash = await bcrypt.hash(
    temporaryPassword,
    12
  );

  const plan = await prisma.subscriptionPlan.upsert({
    where: {
      name: "Professional Monthly"
    },
    update: {
      isActive: true
    },
    create: {
      name: "Professional Monthly",
      billingCycle: "MONTHLY",
      basePrice: 25000,
      currency: "PKR",
      maxStudents: 3000,
      maxUsers: 100,
      isActive: true
    }
  });

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    for (const record of institutions) {
      const institution =
        await tx.institution.upsert({
          where: {
            code: record.code
          },
          update: {
            name: record.name,
            tenantKey: record.tenantKey,
            subdomain: record.subdomain,
            officialEmail: record.officialEmail,
            billingEmail: record.billingEmail,
            primaryPhone: record.primaryPhone,
            secondaryPhone: record.secondaryPhone,
            contactPersonName:
              record.contactPersonName,
            contactPersonTitle:
              record.contactPersonTitle,
            address: record.address,
            city: record.city,
            country: record.country,
            status: "ACTIVE",
            activatedAt: now,
            suspendedAt: null,
            suspensionReason: null
          },
          create: {
            name: record.name,
            code: record.code,
            tenantKey: record.tenantKey,
            subdomain: record.subdomain,
            officialEmail: record.officialEmail,
            billingEmail: record.billingEmail,
            primaryPhone: record.primaryPhone,
            secondaryPhone: record.secondaryPhone,
            contactPersonName:
              record.contactPersonName,
            contactPersonTitle:
              record.contactPersonTitle,
            address: record.address,
            city: record.city,
            country: record.country,
            status: "ACTIVE",
            activatedAt: now
          }
        });

      await tx.user.upsert({
        where: {
          username: record.adminUsername
        },
        update: {
          institutionId: institution.id,
          name: record.adminName,
          email: record.adminEmail,
          passwordHash,
          role: "INSTITUTE_ADMIN",
          isActive: true
        },
        create: {
          institutionId: institution.id,
          name: record.adminName,
          username: record.adminUsername,
          email: record.adminEmail,
          passwordHash,
          role: "INSTITUTE_ADMIN",
          isActive: true
        }
      });

      const subscription =
        await tx.subscription.findFirst({
          where: {
            institutionId: institution.id,
            planId: plan.id,
            status: {
              in: [
                "TRIAL",
                "ACTIVE",
                "OVERDUE",
                "SUSPENDED"
              ]
            }
          }
        });

      if (subscription) {
        await tx.subscription.update({
          where: {
            id: subscription.id
          },
          data: {
            status: "ACTIVE",
            customPrice: record.customPrice,
            concessionAmount: 0,
            nextBillingDate: addMonths(now, 1),
            endDate: null,
            autoSuspend: true,
            graceDays: 7
          }
        });
      } else {
        await tx.subscription.create({
          data: {
            institutionId: institution.id,
            planId: plan.id,
            status: "ACTIVE",
            startDate: now,
            nextBillingDate: addMonths(now, 1),
            customPrice: record.customPrice,
            concessionAmount: 0,
            concessionPercent: 0,
            autoSuspend: true,
            graceDays: 7
          }
        });
      }
    }
  });

  console.log(
    `✅ ${institutions.length} professional demo institutions are ready.`
  );

  console.table(
    institutions.map((record) => ({
      institution: record.name,
      code: record.code,
      admin: record.adminUsername,
      publicWebsite: `/site/${record.code}`
    }))
  );

  console.log(
    `Temporary institute-admin password: ${temporaryPassword}`
  );
}

main()
  .catch((error) => {
    console.error("❌ Demo institution seed failed.");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
