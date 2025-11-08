import { Router, type Request, type Response } from "express";
import { saveRecognitionImage } from "../services/recognitionImage.js";
import { logger } from "../utils/logger.js";

interface RecognitionRequestBody {
  dataUrl?: string;
  recognitionDataUrl?: string;
  photoDataUrl?: string;
  message?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
  kind?: string;
}

export const createRecognitionRouter = (): Router => {
  const router = Router();

  router.post("/image", async (
    req: Request<unknown, unknown, RecognitionRequestBody>,
    res: Response
  ) => {
    const {
      dataUrl,
      recognitionDataUrl,
      photoDataUrl,
      kind,
      message,
      sessionId,
      metadata
    } = req.body ?? {};

    const primaryDataUrl = typeof recognitionDataUrl === "string" && recognitionDataUrl.trim().length > 0
      ? recognitionDataUrl
      : dataUrl;

    if (typeof primaryDataUrl !== "string" || primaryDataUrl.trim().length === 0) {
      res.status(400).json({ error: "recognitionDataUrl is required" });
      return;
    }

    if (typeof photoDataUrl !== "undefined" && (typeof photoDataUrl !== "string" || photoDataUrl.trim().length === 0)) {
      res.status(400).json({ error: "photoDataUrl must be a non-empty string when provided" });
      return;
    }

    try {
      const recognitionResult = await saveRecognitionImage(primaryDataUrl, {
        kind: kind ?? "recognition",
        subfolder: "recognitions/generated"
      });

      const photoResult = typeof photoDataUrl === "string"
        ? await saveRecognitionImage(photoDataUrl, {
            kind: "photo",
            subfolder: "recognitions/photos"
          })
        : null;

      res.status(201).json({
        status: "ok",
        message: message ?? null,
        sessionId: sessionId ?? null,
        metadata: metadata ?? null,
        filePath: recognitionResult.filePath,
        relativePath: recognitionResult.relativePath,
        publicPath: recognitionResult.publicPath,
        cloudinaryUrl: recognitionResult.cloudinaryUrl,
        assets: {
          recognition: recognitionResult,
          photo: photoResult
        }
      });
    } catch (error) {
      logger.error(`[Recognition] Failed to store recognition image: ${(error as Error).message}`);
      res.status(500).json({ error: "Failed to store recognition image" });
    }
  });

  return router;
};
