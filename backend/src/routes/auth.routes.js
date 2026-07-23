import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { authenticate } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const authRouter = Router();
const loginSchema = z.object({ login: z.string().trim().min(3), password: z.string().min(8) });

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    institutionId: user.institutionId,
    institution: user.institution
  };
}

authRouter.post("/login", asyncHandler(async (req, res) => {
  const input = loginSchema.parse(req.body);
  const user = await prisma.user.findFirst({
    where: { OR: [{ username: input.login.toLowerCase() }, { email: input.login.toLowerCase() }] },
    include: { institution: true }
  });
  const valid = user ? await bcrypt.compare(input.password, user.passwordHash) : false;
  if (!user || !valid) return res.status(401).json({ success: false, message: "Invalid login credentials." });
  if (!user.isActive) return res.status(403).json({ success: false, message: "Account is disabled." });
  if (user.institution && user.institution.status === "SUSPENDED") {
    return res.status(403).json({ success: false, message: "Institution is suspended." });
  }
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  const accessToken = jwt.sign({ role: user.role, institutionId: user.institutionId }, process.env.JWT_ACCESS_SECRET, { subject: String(user.id), expiresIn: "8h" });
  res.json({ success: true, data: { accessToken, user: publicUser(user) } });
}));

authRouter.get("/me", authenticate, (req, res) => res.json({ success: true, data: publicUser(req.user) }));
