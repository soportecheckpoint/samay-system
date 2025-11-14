import { promises as fs } from "fs";
import { join, relative as relativePath } from "path";
import { randomBytes } from "crypto";
import { logger } from "../utils/logger.js";

export interface SaveRecognitionOptions {
  /** Prefijo opcional para el public_id en Cloudinary */
  kind?: string;
}

export interface SaveRecognitionResult {
  /** URL devuelta por Cloudinary (si se quiere obtener explícitamente) */
  cloudinaryUrl: string | null;
  /** public_id usado en Cloudinary (si se quiere obtener explícitamente) */
  publicId: string | null;
}

export interface SavePhotoLocallyOptions {
  kind?: string;
  subfolder?: string;
}

export interface SavePhotoLocallyResult {
  filePath: string;
  relativePath: string;
  publicPath: string;
}

interface CloudinaryUploadResponse {
  secure_url?: string;
  url?: string;
  public_id: string;
  [key: string]: unknown;
}

const getCloudinaryConfig = () => {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } = process.env;

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error(
      "Missing CLOUDINARY_CLOUD_NAME or CLOUDINARY_UPLOAD_PRESET environment variables",
    );
  }

  return {
    cloudName: CLOUDINARY_CLOUD_NAME,
    uploadPreset: CLOUDINARY_UPLOAD_PRESET,
  };
};

const buildPublicId = (kind?: string) => {
  const prefix = kind?.replace(/[^a-zA-Z0-9_-]/g, "") || "recognition";
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${prefix}/${stamp}`;
};

const PUBLIC_ASSETS_ROOT =
  process.env.PUBLIC_ASSETS_DIR ??
  process.env.RECOGNITION_IMAGE_DIR ??
  join(process.cwd(), "public");

const DEFAULT_SUBFOLDER = "recognitions";

const trimSlashes = (value: string) =>
  value.replace(/^\/+/, "").replace(/\/+$/, "");

const PUBLIC_ROUTE_PREFIX = trimSlashes(
  process.env.PUBLIC_ASSETS_ROUTE ?? "public",
);

const sanitizeSegment = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, "");

const toPathSegments = (value?: string) =>
  (value ?? "")
    .split(/[\/\\]+/)
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
  const match =
    /^data:(?<mime>image\/(png|jpeg|jpg));base64,(?<data>.+)$/i.exec(value);

  if (!match || !match.groups) {
    throw new Error("Invalid image data URL received");
  }

  const { mime, data } = match.groups;
  const extension = mime.endsWith("png") ? "png" : "jpg";
  const buffer = Buffer.from(data, "base64");

  return { buffer, extension };
};

const buildFilename = (extension: string, kind?: string) => {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const randomSuffix = randomBytes(4).toString("hex");
  const prefix = kind ? sanitizeSegment(kind) : "recognition";
  return `${prefix}-${stamp}-${randomSuffix}.${extension}`;
};

const buildPublicPath = (filename: string, subfolder: string) => {
  const segments = [
    PUBLIC_ROUTE_PREFIX,
    ...toPathSegments(subfolder),
    filename,
  ].filter((segment) => segment.length > 0);
  return `/${segments.join("/")}`;
};

/**
 * Guarda una imagen (foto sin editar) localmente en public/
 * @param dataUrl - Data URL de la imagen
 * @param options - Opciones para organizar la imagen
 * @returns Información de la imagen guardada localmente
 */
export const savePhotoLocally = async (
  dataUrl: string,
  options: SavePhotoLocallyOptions = {},
): Promise<SavePhotoLocallyResult> => {
  if (!dataUrl || typeof dataUrl !== "string") {
    throw new Error("Invalid dataUrl: must be a non-empty string");
  }

  const { directory, resolvedSubfolder } = await ensureOutputDirectory(
    options.subfolder,
  );

  const { buffer, extension } = parseDataUrl(dataUrl);
  const filename = buildFilename(extension, options.kind);
  const filePath = join(directory, filename);
  const relative = relativePath(process.cwd(), filePath);
  const publicPath = buildPublicPath(filename, resolvedSubfolder);

  await fs.writeFile(filePath, buffer);

  logger.info(`[LOCAL] Saved photo: ${publicPath}`);

  return {
    filePath,
    relativePath: relative,
    publicPath,
  };
};

export const saveRecognitionImage = async (
  dataUrl: string,
  options: SaveRecognitionOptions = {},
): Promise<SaveRecognitionResult> => {
  if (!dataUrl || typeof dataUrl !== "string") {
    throw new Error("Invalid dataUrl: must be a non-empty string");
  }

  const config = getCloudinaryConfig();

  // Cloudinary acepta directamente data URLs en el campo "file"
  const publicId = buildPublicId(options.kind);

  // Lanzamos la subida en background, sin bloquear el request
  setImmediate(async () => {
    try {
      const formData = new URLSearchParams();
      formData.append("file", dataUrl);
      formData.append("upload_preset", config.uploadPreset);
      formData.append("public_id", publicId);

      const uploadUrl = `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`;

      const response = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(
          `[CLOUDINARY] Upload failed: ${response.status} ${response.statusText} - ${errorText}`,
        );
        return;
      }

      const result = (await response.json()) as CloudinaryUploadResponse;
      const url = result.secure_url ?? result.url;

      if (!url) {
        logger.error("[CLOUDINARY] Upload did not return a URL");
        return;
      }

      logger.info(`[CLOUDINARY] Uploaded ${publicId} -> ${url}`);
    } catch (error) {
      logger.error(
        `[CLOUDINARY] Unexpected error uploading image: ${(error as Error).message}`,
      );
    }
  });

  // Devolvemos inmediatamente sin esperar a Cloudinary
  return {
    cloudinaryUrl: null,
    publicId,
  };
};
