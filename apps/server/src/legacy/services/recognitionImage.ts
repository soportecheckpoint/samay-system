import { promises as fs } from "fs";
import { join, relative as relativePath } from "path";
import { randomBytes } from "crypto";
import { v2 as cloudinary } from "cloudinary";
import { logger } from "../utils/logger.js";

type ParsedDataUrl = {
  buffer: Buffer;
  extension: string;
};

type SaveOptions = {
  kind?: string;
};

type SaveResult = {
  filePath: string;
  relativePath: string;
  cloudinaryUrl: string | null;
};

const OUTPUT_DIRECTORY =
  process.env.RECOGNITION_IMAGE_DIR ||
  join(process.cwd(), "to-print", "recognition-images");

const CLOUDINARY_FOLDER =
  process.env.CLOUDINARY_RECOGNITION_FOLDER || "recognition-images";

let cloudinaryConfigured = false;
let cloudinaryWarningLogged = false;

const ensureOutputDirectory = async () => {
  await fs.mkdir(OUTPUT_DIRECTORY, { recursive: true });
};

const parseDataUrl = (value: string): ParsedDataUrl => {
  const match = /^data:(?<mime>image\/(png|jpeg|jpg));base64,(?<data>.+)$/i.exec(
    value,
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
    secure: true,
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

export const saveRecognitionImage = async (
  dataUrl: string,
  options: SaveOptions = {},
): Promise<SaveResult> => {
  await ensureOutputDirectory();

  const { buffer, extension } = parseDataUrl(dataUrl);
  const filename = buildFilename(extension, options.kind);
  const filePath = join(OUTPUT_DIRECTORY, filename);
  const relative = relativePath(process.cwd(), filePath);

  await fs.writeFile(filePath, buffer);

  let cloudinaryUrl: string | null = null;

  if (configureCloudinary()) {
    try {
      const publicId = `${CLOUDINARY_FOLDER}/${filename.replace(/\.[^.]+$/, "")}`;
      const uploadResult = await cloudinary.uploader.upload(filePath, {
        public_id: publicId,
        overwrite: true,
        resource_type: "image",
      });
      cloudinaryUrl = uploadResult.secure_url || uploadResult.url || null;
    } catch (error) {
      logger.error(
        `[CLOUDINARY] Failed to upload recognition image: ${(error as Error).message}`,
      );
    }
  } else if (!cloudinaryWarningLogged) {
    logger.warn(
      "[CLOUDINARY] Skipping upload. Missing CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY or CLOUDINARY_API_SECRET",
    );
    cloudinaryWarningLogged = true;
  }

  return { filePath, relativePath: relative, cloudinaryUrl };
};
