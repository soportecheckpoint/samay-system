import { Router, type Request, type Response } from "express";
import { saveRecognitionImage, savePhotoLocally } from "../services/recognitionImage.js";
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

  router.post(
    "/image",
    async (
      req: Request<unknown, unknown, RecognitionRequestBody>,
      res: Response,
    ) => {
      const {
        dataUrl,
        recognitionDataUrl,
        photoDataUrl,
        kind,
        message,
        sessionId,
        metadata,
      } = req.body ?? {};

      const primaryDataUrl =
        typeof recognitionDataUrl === "string" &&
        recognitionDataUrl.trim().length > 0
          ? recognitionDataUrl
          : dataUrl;

      if (
        typeof primaryDataUrl !== "string" ||
        primaryDataUrl.trim().length === 0
      ) {
        res.status(400).json({ error: "recognitionDataUrl is required" });
        return;
      }

      // Ya no subimos la foto original; solo la imagen generada (primaryDataUrl)
      // Además, no esperamos a Cloudinary: lanzamos la subida en background
      try {
        const recognitionResult = await saveRecognitionImage(primaryDataUrl, {
          kind: kind ?? "recognition",
        });

        // Si viene photoDataUrl, la guardamos localmente
        let photoPublicPath: string | null = null;
        if (typeof photoDataUrl === "string" && photoDataUrl.trim().length > 0) {
          try {
            const photoResult = await savePhotoLocally(photoDataUrl, {
              kind: "photo",
              subfolder: "recognitions/photos",
            });
            photoPublicPath = photoResult.publicPath;
            logger.info(`[Recognition] Photo saved locally: ${photoPublicPath}`);
          } catch (photoError) {
            logger.warn(
              `[Recognition] Failed to save photo locally, but continuing: ${(photoError as Error).message}`,
            );
          }
        }

        res.status(201).json({
          status: "ok",
          message: message ?? null,
          sessionId: sessionId ?? null,
          metadata: metadata ?? null,
          // No devolvemos la URL de Cloudinary porque la subida es async
          cloudinaryUrl: null,
          publicId: recognitionResult.publicId,
          photoPublicPath,
          assets: {
            recognition: recognitionResult,
            photo: photoPublicPath ? { publicPath: photoPublicPath } : null,
          },
        });
      } catch (error) {
        const errorMessage = (error as Error).message;
        logger.error(
          `[Recognition] Failed to store recognition image: ${errorMessage}`,
        );

        // Provide more specific error messages to client
        if (errorMessage.includes("too large")) {
          res.status(413).json({ error: "Image too large" });
        } else if (errorMessage.includes("Invalid dataUrl")) {
          res.status(400).json({ error: "Invalid image data" });
        } else {
          res.status(500).json({ error: "Failed to store recognition image" });
        }
      }
    },
  );

  return router;
};
