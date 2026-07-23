import { Router } from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const recoveryWebsiteStudioRouter = Router();

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);

const dataDirectory = path.resolve(
  currentDirectory,
  "../../../data/public-sites"
);

function safeCode(value) {
  return (
    String(value || "EDUCARE")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "EDUCARE"
  );
}

function institutionContext(req) {
  const institutionId =
    req.user?.institutionId ||
    req.user?.institution?.id ||
    req.user?.schoolId ||
    req.user?.tenantId ||
    req.headers["x-institution-id"];

  if (institutionId) {
    return safeCode(institutionId);
  }

  // Local development fallback only.
  if (process.env.NODE_ENV !== "production") {
    return "LOCAL-DEVELOPMENT-INSTITUTION";
  }

  return null;
}

function normalizeConfig(input = {}) {
  const institutionCode = safeCode(
    input.institutionCode
  );

  return {
    ...input,
    institutionCode,
    publicUrl: `/site/${institutionCode}`,
    status:
      input.status === "PUBLISHED"
        ? "PUBLISHED"
        : "DRAFT"
  };
}

function draftFile(institutionId) {
  return path.join(
    dataDirectory,
    `${safeCode(institutionId)}.draft.json`
  );
}

function publishedFile(institutionCode) {
  return path.join(
    dataDirectory,
    `${safeCode(institutionCode)}.published.json`
  );
}

async function ensureDirectory() {
  await fs.mkdir(dataDirectory, {
    recursive: true
  });
}

async function readJson(file) {
  await ensureDirectory();

  try {
    return JSON.parse(
      await fs.readFile(file, "utf8")
    );
  } catch (error) {
    if (error?.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

async function writeJson(file, value) {
  await ensureDirectory();

  await fs.writeFile(
    file,
    JSON.stringify(value, null, 2),
    "utf8"
  );
}

recoveryWebsiteStudioRouter.get(
  "/health",
  (req, res) => {
    res.json({
      success: true,
      message:
        "Website Studio save and publish API is available."
    });
  }
);

recoveryWebsiteStudioRouter.get(
  "/public/:institutionCode",
  async (req, res, next) => {
    try {
      const institutionCode = safeCode(
        req.params.institutionCode
      );

      const stored = await readJson(
        publishedFile(institutionCode)
      );

      if (
        !stored?.config ||
        stored.config.status !== "PUBLISHED"
      ) {
        return res.status(404).json({
          success: false,
          message:
            "This institution has not published its website."
        });
      }

      return res.json({
        success: true,
        data: normalizeConfig(stored.config)
      });
    } catch (error) {
      next(error);
    }
  }
);

recoveryWebsiteStudioRouter.get(
  "/",
  async (req, res, next) => {
    try {
      const ownerInstitutionId =
        institutionContext(req);

      if (!ownerInstitutionId) {
        return res.status(401).json({
          success: false,
          message:
            "Institution login context is required."
        });
      }

      const requestedCode = safeCode(
        req.query.institutionCode || "EDUCARE"
      );

      const stored = await readJson(
        draftFile(ownerInstitutionId)
      );

      const config = normalizeConfig(
        stored?.config || {
          institutionCode: requestedCode,
          status: "DRAFT",
          updatedAt: null,
          publishedAt: null
        }
      );

      return res.json({
        success: true,
        isNew: !stored?.config,
        data: config
      });
    } catch (error) {
      next(error);
    }
  }
);

recoveryWebsiteStudioRouter.put(
  "/",
  async (req, res, next) => {
    try {
      const ownerInstitutionId =
        institutionContext(req);

      if (!ownerInstitutionId) {
        return res.status(401).json({
          success: false,
          message:
            "Institution login context is required."
        });
      }

      const config = normalizeConfig({
        ...(req.body || {}),
        status: "DRAFT",
        updatedAt: new Date().toISOString()
      });

      await writeJson(
        draftFile(ownerInstitutionId),
        {
          ownerInstitutionId,
          config
        }
      );

      return res.json({
        success: true,
        message:
          "All Website Studio changes were saved.",
        data: config
      });
    } catch (error) {
      next(error);
    }
  }
);

recoveryWebsiteStudioRouter.post(
  "/publish",
  async (req, res, next) => {
    try {
      const ownerInstitutionId =
        institutionContext(req);

      if (!ownerInstitutionId) {
        return res.status(401).json({
          success: false,
          message:
            "Institution login context is required."
        });
      }

      const institutionCode = safeCode(
        req.body?.institutionCode
      );

      const existingPublished = await readJson(
        publishedFile(institutionCode)
      );

      if (
        existingPublished?.ownerInstitutionId &&
        existingPublished.ownerInstitutionId !==
          ownerInstitutionId
      ) {
        return res.status(409).json({
          success: false,
          message:
            "This website code belongs to another institution."
        });
      }

      const now = new Date().toISOString();

      const config = normalizeConfig({
        ...(req.body || {}),
        institutionCode,
        status: "PUBLISHED",
        updatedAt: now,
        publishedAt: now
      });

      const record = {
        ownerInstitutionId,
        config
      };

      await writeJson(
        draftFile(ownerInstitutionId),
        record
      );

      await writeJson(
        publishedFile(institutionCode),
        record
      );

      return res.json({
        success: true,
        message:
          "Website changes were saved and published successfully.",
        data: config
      });
    } catch (error) {
      next(error);
    }
  }
);

recoveryWebsiteStudioRouter.post(
  "/unpublish",
  async (req, res, next) => {
    try {
      const ownerInstitutionId =
        institutionContext(req);

      if (!ownerInstitutionId) {
        return res.status(401).json({
          success: false,
          message:
            "Institution login context is required."
        });
      }

      const stored = await readJson(
        draftFile(ownerInstitutionId)
      );

      if (!stored?.config) {
        return res.status(404).json({
          success: false,
          message: "Website draft was not found."
        });
      }

      const institutionCode = safeCode(
        stored.config.institutionCode
      );

      const config = normalizeConfig({
        ...stored.config,
        status: "DRAFT",
        updatedAt: new Date().toISOString(),
        publishedAt: null
      });

      await writeJson(
        draftFile(ownerInstitutionId),
        {
          ownerInstitutionId,
          config
        }
      );

      const published = await readJson(
        publishedFile(institutionCode)
      );

      if (
        published?.ownerInstitutionId ===
        ownerInstitutionId
      ) {
        await fs
          .unlink(
            publishedFile(institutionCode)
          )
          .catch((error) => {
            if (error?.code !== "ENOENT") {
              throw error;
            }
          });
      }

      return res.json({
        success: true,
        message:
          "Website was unpublished successfully.",
        data: config
      });
    } catch (error) {
      next(error);
    }
  }
);
