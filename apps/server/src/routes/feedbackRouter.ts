import { Router, type Request, type Response } from "express";
import { saveFeedback, type SaveFeedbackOptions } from "../services/feedback.js";
import { logger } from "../utils/logger.js";

interface FeedbackRequestBody {
  message?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

export const createFeedbackRouter = (): Router => {
  const router = Router();

  router.post(
    "/",
    async (
      req: Request<unknown, unknown, FeedbackRequestBody>,
      res: Response,
    ) => {
      const { message, sessionId, metadata } = req.body ?? {};
      if (typeof message !== "string" || message.trim().length === 0) {
        res.status(400).json({ error: "message is required" });
        return;
      }

      try {
        const options: SaveFeedbackOptions = {
          sessionId,
          metadata,
        };
        await saveFeedback(message, options);
        res.status(201).json({ status: "ok" });
      } catch (error) {
        const err = error as Error;
        logger.error("[Feedback] Unable to persist message", {
          message,
          sessionId,
          error: err.message,
        });
        res.status(500).json({ error: "Failed to store feedback" });
      }
    },
  );

  return router;
};