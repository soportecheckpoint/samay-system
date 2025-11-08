import fs from 'node:fs/promises';
import path from 'node:path';
import { logger } from '../utils/logger.js';

export interface PreviousMessageSnapshot {
  message: string;
  teamName: string;
  updatedAt: string;
}

const DEFAULT_SNAPSHOT: PreviousMessageSnapshot = {
  message: '',
  teamName: '',
  updatedAt: '',
};

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'previous-message.json');

let snapshot: PreviousMessageSnapshot = { ...DEFAULT_SNAPSHOT };
let isLoaded = false;
let pendingWrite: Promise<void> | null = null;

const sanitizeString = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  return trimmed;
};

const persistSnapshot = async () => {
  if (!pendingWrite) {
    pendingWrite = (async () => {
      await fs.mkdir(DATA_DIR, { recursive: true });
      const payload = JSON.stringify(snapshot, null, 2);
      try {
        await fs.writeFile(DATA_FILE, payload, 'utf-8');
      } catch (error) {
        logger.error('[PreviousMessageStore] Error persisting snapshot', { error });
        throw error;
      }
    })().finally(() => {
      pendingWrite = null;
    });
  }

  await pendingWrite;
};

const loadSnapshot = async () => {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8');
    const data = JSON.parse(raw) as Partial<PreviousMessageSnapshot>;
    snapshot = {
      message: sanitizeString(data?.message),
      teamName: sanitizeString(data?.teamName),
      updatedAt: sanitizeString(data?.updatedAt),
    };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code;
    if (code && code !== 'ENOENT') {
      logger.error('[PreviousMessageStore] Error loading snapshot', { error });
    }

    snapshot = { ...DEFAULT_SNAPSHOT };
    await persistSnapshot();
  }

  isLoaded = true;
};

const ensureLoaded = async () => {
  if (!isLoaded) {
    await loadSnapshot();
  }
};

export const initPreviousMessageStore = async () => {
  await ensureLoaded();
};

export const getPreviousMessage = (): PreviousMessageSnapshot => ({
  message: snapshot.message,
  teamName: snapshot.teamName,
  updatedAt: snapshot.updatedAt,
});

export const setPreviousMessage = async (message: string, teamName?: string) => {
  await ensureLoaded();

  const nextMessage = sanitizeString(message);
  const nextTeam = sanitizeString(teamName);

  snapshot = {
    message: nextMessage,
    teamName: nextTeam,
    updatedAt: new Date().toISOString(),
  };

  await persistSnapshot();

  return getPreviousMessage();
};

export const clearPreviousMessage = async () => {
  await ensureLoaded();

  snapshot = {
    ...DEFAULT_SNAPSHOT,
    updatedAt: new Date().toISOString(),
  };

  await persistSnapshot();

  return getPreviousMessage();
};
