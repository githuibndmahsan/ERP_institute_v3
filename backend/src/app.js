import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import { authRouter } from "./routes/auth.routes.js";
import { platformRouter } from "./routes/platform.routes.js";
import { instituteRouter } from "./routes/institute.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { platformSettingsRouter } from "./modules/platform-settings/platform-settings.routes.js";
import { studentRouter } from "./modules/students/student.routes.js";

import { attendanceRouter } from "./modules/attendance/attendance.routes.js";

import { examsRouter } from "./modules/exams/exams.routes.js";
import { publicSiteRouter } from "./modules/public-site/public-site.routes.js";

import { recoveryWebsiteStudioRouter } from "./modules/website-studio/recovery-website-studio.routes.js";
export const app = express();
app.use("/uploads", express.static("uploads"));
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || "http://127.0.0.1:5173", credentials: true }));
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: "5mb" }));
app.use(morgan("dev"));
app.use("/api", rateLimit({ windowMs: 15 * 60 * 1000, limit: 500 }));
app.use("/api/v1/attendance", attendanceRouter);
app.use("/api/v1/platform/settings", platformSettingsRouter);
app.get("/api/v1/health", (req, res) => res.json({ success: true, message: "ERP V3 API running" }));
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/platform", platformRouter);
app.use("/api/v1/institute", instituteRouter);
app.use("/api/v1/students", studentRouter);
app.use("/api/v1/exams", examsRouter);
app.use("/api/v1/public/site", publicSiteRouter);
app.use("/api/v1/website-studio", recoveryWebsiteStudioRouter);

app.use(errorHandler);
