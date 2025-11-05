import React from 'react';
import { useFeedbackStore } from '../store';

const STYLE_MAP: Record<string, { container: string; text: string }> = {
  success: {
    container:
      'border-emerald-500/40 bg-emerald-500/10 text-emerald-100 shadow-emerald-500/20',
    text: 'text-emerald-100',
  },
  info: {
    container: 'border-sky-500/40 bg-sky-500/10 text-sky-100 shadow-sky-500/20',
    text: 'text-sky-100',
  },
  warning: {
    container:
      'border-amber-500/40 bg-amber-500/10 text-amber-100 shadow-amber-500/20',
    text: 'text-amber-100',
  },
  error: {
    container: 'border-rose-500/40 bg-rose-500/10 text-rose-100 shadow-rose-500/20',
    text: 'text-rose-100',
  },
  '': {
    container: 'border-slate-500/40 bg-slate-500/10 text-slate-100 shadow-slate-500/20',
    text: 'text-slate-100',
  },
};

export const FeedbackMessage: React.FC = () => {
  const { message, type } = useFeedbackStore();

  if (!message) {
    return null;
  }

  const styles = STYLE_MAP[type] ?? STYLE_MAP[''];

  return (
    <div className="pointer-events-none fixed bottom-8 right-8 z-50">
      <div
        className={`pointer-events-auto rounded-2xl border px-6 py-4 shadow-xl backdrop-blur ${styles.container}`}
      >
        <p className={`text-sm font-medium tracking-wide ${styles.text}`}>{message}</p>
      </div>
    </div>
  );
};
