import { gameState, Session } from '../state/gameState.js';
import { logger } from '../utils/logger.js';

const TICK_RATE_MS = 1000;

export type TimerStatus = Session['status'];

export interface TimerSnapshot {
  total: number;
  elapsed: number;
  remaining: number;
  status: TimerStatus;
}

export type TimerStopReason = 'completed' | 'forced' | 'reset';

type TimerListener = (snapshot: TimerSnapshot) => void;
type TimerStopListener = (reason: TimerStopReason, snapshot: TimerSnapshot) => void;

let timerInterval: NodeJS.Timeout | null = null;
let lastTickAt = 0;
const tickListeners = new Set<TimerListener>();
const stopListeners = new Set<TimerStopListener>();

const clampTimerValues = () => {
  const { totalTime } = gameState.session;
  gameState.session.elapsedTime = Math.max(0, Math.min(gameState.session.elapsedTime, totalTime));
  const remaining = Math.max(0, totalTime - gameState.session.elapsedTime);
  gameState.session.remainingTime = remaining;
};

const notifyTick = () => {
  const snapshot = getTimerSnapshot();
  tickListeners.forEach((listener) => listener(snapshot));
};

const notifyStop = (reason: TimerStopReason) => {
  const snapshot = getTimerSnapshot();
  stopListeners.forEach((listener) => listener(reason, snapshot));
};

const clearIntervalRef = () => {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
};

const tick = () => {
  if (gameState.session.status !== 'active') {
    return;
  }

  const now = Date.now();
  const diffSeconds = Math.floor((now - lastTickAt) / 1000);

  if (diffSeconds <= 0) {
    return;
  }

  lastTickAt = now;
  gameState.session.elapsedTime += diffSeconds;
  clampTimerValues();
  notifyTick();

  if (gameState.session.remainingTime <= 0) {
    clearIntervalRef();
    gameState.session.status = 'completed';
    clampTimerValues();
    notifyTick();
    notifyStop('completed');
    logger.info('Timer completed');
  }
};

export const subscribeToTimer = (listener: TimerListener): (() => void) => {
  tickListeners.add(listener);
  return () => tickListeners.delete(listener);
};

export const subscribeToTimerStop = (listener: TimerStopListener): (() => void) => {
  stopListeners.add(listener);
  return () => stopListeners.delete(listener);
};

export const getTimerSnapshot = (): TimerSnapshot => ({
  total: gameState.session.totalTime,
  elapsed: gameState.session.elapsedTime,
  remaining: gameState.session.remainingTime,
  status: gameState.session.status,
});

export const startTimer = (duration: number) => {
  clearIntervalRef();

  gameState.session.totalTime = Math.max(0, Math.floor(duration));
  gameState.session.elapsedTime = 0;
  gameState.session.remainingTime = gameState.session.totalTime;
  gameState.session.startTime = new Date().toISOString();
  gameState.session.status = 'active';

  lastTickAt = Date.now();
  notifyTick();

  if (gameState.session.totalTime > 0) {
    timerInterval = setInterval(tick, TICK_RATE_MS);
  }

  logger.info(`Timer started (${gameState.session.totalTime}s)`);
};

export const pauseTimer = () => {
  if (gameState.session.status !== 'active') {
    return;
  }

  clearIntervalRef();
  gameState.session.status = 'paused';
  clampTimerValues();
  notifyTick();
  logger.info('Timer paused');
};

export const resumeTimer = () => {
  if (gameState.session.status !== 'paused') {
    return;
  }

  if (gameState.session.remainingTime <= 0) {
    return;
  }

  gameState.session.status = 'active';
  lastTickAt = Date.now();
  notifyTick();
  timerInterval = setInterval(tick, TICK_RATE_MS);
  logger.info('Timer resumed');
};

export const resetTimer = () => {
  clearIntervalRef();
  gameState.session.status = 'waiting';
  gameState.session.totalTime = 0;
  gameState.session.elapsedTime = 0;
  gameState.session.remainingTime = 0;
  notifyTick();
  notifyStop('reset');
  logger.info('Timer reset');
};

export const stopTimer = (reason: TimerStopReason = 'forced') => {
  if (gameState.session.status === 'waiting') {
    return;
  }

  clearIntervalRef();
  clampTimerValues();
  gameState.session.status = 'completed';
  notifyTick();
  notifyStop(reason);
  logger.info(`Timer stopped (${reason})`);
};
