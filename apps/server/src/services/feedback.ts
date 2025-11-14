import { access, appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { logger } from "../utils/logger.js";

const DATA_DIR = path.resolve(process.cwd(), "data");
const FEEDBACK_FILE = path.join(DATA_DIR, "feedback.csv");
const HEADER_ROW = "timestamp,message,sessionId,metadata\n";

const sanitizeField = (value: string): string => {
  return value.replace(/"/g, '""').replace(/\r?\n/g, " ");
};

const quote = (value: string): string => `"${sanitizeField(value)}"`;

const ensureHeaderIfNeeded = async (): Promise<string> => {
  try {
    await access(FEEDBACK_FILE);
    return "";
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
      return HEADER_ROW;
    }
    throw error;
  }
};

export interface SaveFeedbackOptions {
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

export const saveFeedback = async (
  message: string,
  options: SaveFeedbackOptions = {},
): Promise<void> => {
  const normalizedMessage = message.trim();
  if (!normalizedMessage) {
    throw new Error("Feedback message cannot be empty");
  }

  const timestamp = new Date().toISOString();
  const formattedFields = [
    quote(timestamp),
    quote(normalizedMessage),
    quote(options.sessionId ?? ""),
    quote(JSON.stringify(options.metadata ?? {})),
  ];
  const row = `${formattedFields.join(",")}\n`;

  await mkdir(DATA_DIR, { recursive: true });
  const header = await ensureHeaderIfNeeded();
  await appendFile(FEEDBACK_FILE, `${header}${row}`, "utf-8");

  logger.info("[Feedback] Saved new message", {
    timestamp,
    sessionId: options.sessionId ?? "unknown",
  });
};