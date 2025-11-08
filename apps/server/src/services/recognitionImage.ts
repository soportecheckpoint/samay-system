import { promises as fs } from "fs";
import { join, relative as relativePath } from "path";
import { randomBytes } from "crypto";
import { v2 as cloudinary } from "cloudinary";
import { logger } from "../utils/logger.js";

export interface SaveRecognitionOptions {
  kind?: string;
  subfolder?: string;
}

export interface SaveRecognitionResult {
  filePath: string;
  relativePath: string;
  publicPath: string;
  cloudinaryUrl: string | null;
}

const PUBLIC_ASSETS_ROOT =
  process.env.PUBLIC_ASSETS_DIR ??
  process.env.RECOGNITION_IMAGE_DIR ??
  join(process.cwd(), "public");

const trimSlashes = (value: string) => value.replace(/^\/+/u, "").replace(/\/+$/u, "");

const PUBLIC_ROUTE_PREFIX = trimSlashes(process.env.PUBLIC_ASSETS_ROUTE ?? "public");

const DEFAULT_SUBFOLDER = trimSlashes(process.env.RECOGNITION_PUBLIC_SUBDIR ?? "recognitions");

const CLOUDINARY_FOLDER =
  process.env.CLOUDINARY_RECOGNITION_FOLDER ?? "recognition-images";

let cloudinaryConfigured = false;
let cloudinaryWarningLogged = false;

const sanitizeSegment = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, "");

const toPathSegments = (value?: string) =>
  (value ?? "")
    .split(/[\\/]+/)
    .map((segment) => sanitizeSegment(segment))
    .filter((segment) => segment.length > 0);

const resolveSubfolder = (value?: string) => {
  const segments = toPathSegments(value ?? DEFAULT_SUBFOLDER);
  return segments.length > 0 ? segments.join("/") : "";
};

const ensureOutputDirectory = async (subfolder?: string) => {
  const resolved = resolveSubfolder(subfolder);
  const directory = resolved
    ? join(PUBLIC_ASSETS_ROOT, ...resolved.split("/"))
    : PUBLIC_ASSETS_ROOT;
  await fs.mkdir(directory, { recursive: true });
  return { directory, resolvedSubfolder: resolved };
};

const parseDataUrl = (value: string) => {
  const match = /^data:(?<mime>image\/(png|jpeg|jpg));base64,(?<data>.+)$/i.exec(
    value
  );

  if (!match || !match.groups) {
    throw new Error("Invalid image data URL received");
  }

  const { mime, data } = match.groups;
  const extension = mime.endsWith("png") ? "png" : "jpg";
  const buffer = Buffer.from(data, "base64");

  return { buffer, extension };
};

const configureCloudinary = () => {
  if (cloudinaryConfigured) {
    return true;
  }

  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
    process.env;

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    return false;
  }

  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true
  });

  cloudinaryConfigured = true;
  return true;
};

const buildFilename = (extension: string, kind?: string) => {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const randomSuffix = randomBytes(4).toString("hex");
  const prefix = kind ? kind.replace(/[^a-zA-Z0-9_-]/g, "") : "recognition";
  return `${prefix}-${stamp}-${randomSuffix}.${extension}`;
};

const buildPublicPath = (filename: string, subfolder: string) => {
  const segments = [PUBLIC_ROUTE_PREFIX, ...toPathSegments(subfolder), filename]
    .filter((segment) => segment.length > 0);
  return `/${segments.join("/")}`;
};

const buildCloudinaryPublicId = (
  filename: string,
  kind?: string,
  subfolder?: string
) => {
  const baseName = filename.replace(/\.[^.]+$/, "");
  const folderSegments = [CLOUDINARY_FOLDER, ...toPathSegments(subfolder)];
  const sanitizedKind = kind ? sanitizeSegment(kind) : "";

  if (sanitizedKind) {
    folderSegments.push(sanitizedKind);
  }

  const folderPath = folderSegments.filter((segment) => segment.length > 0).join("/");
  return folderPath ? `${folderPath}/${baseName}` : baseName;
};

const scheduleCloudinaryUpload = (
  filePath: string,
  filename: string,
  kind?: string,
  subfolder?: string
) => {
  if (!configureCloudinary()) {
    if (!cloudinaryWarningLogged) {
      logger.warn(
        "[CLOUDINARY] Skipping upload. Missing CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY or CLOUDINARY_API_SECRET"
      );
      cloudinaryWarningLogged = true;
    }
    return;
  }

  const publicId = buildCloudinaryPublicId(filename, kind, subfolder);

  setTimeout(() => {
    cloudinary.uploader
      .upload(filePath, {
        public_id: publicId,
        overwrite: true,
        resource_type: "image"
      })
      .then((result) => {
        const url = result.secure_url ?? result.url ?? null;
        if (url) {
          logger.info(`[CLOUDINARY] Uploaded ${publicId} -> ${url}`);
        } else {
          logger.info(`[CLOUDINARY] Upload completed for ${publicId}`);
        }
      })
      .catch((error) => {
        logger.error(
          `[CLOUDINARY] Failed to upload ${publicId}: ${(error as Error).message}`
        );
      });
  }, 0);
};

export const saveRecognitionImage = async (
  dataUrl: string,
  options: SaveRecognitionOptions = {}
): Promise<SaveRecognitionResult> => {
  const { directory, resolvedSubfolder } = await ensureOutputDirectory(options.subfolder);

  const { buffer, extension } = parseDataUrl(dataUrl);
  const filename = buildFilename(extension, options.kind);
  const filePath = join(directory, filename);
  const relative = relativePath(process.cwd(), filePath);
  const publicPath = buildPublicPath(filename, resolvedSubfolder);

  await fs.writeFile(filePath, buffer);

  scheduleCloudinaryUpload(filePath, filename, options.kind, resolvedSubfolder);

  return { filePath, relativePath: relative, publicPath, cloudinaryUrl: null };
};
