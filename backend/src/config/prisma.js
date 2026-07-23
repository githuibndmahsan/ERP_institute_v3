import { PrismaClient } from "@prisma/client";
export const prisma = globalThis.__erpPrisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalThis.__erpPrisma = prisma;
