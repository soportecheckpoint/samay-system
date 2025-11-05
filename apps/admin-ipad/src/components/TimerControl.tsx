import { useEffect, useMemo, useState } from 'react';
import { useAdminStore } from '../store';
import { startTimer, pauseTimer, resumeTimer, resetTimer } from '../socket';

const PRESETS = [30, 45, 60, 75, 90];

const formatTime = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const mins = Math.floor(safeSeconds / 60)
    .toString()
    .padStart(2, '0');
  const secs = (safeSeconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
};

export function TimerControl() {
  const timer = useAdminStore((state) => state.timer);
  const [minutes, setMinutes] = useState(() => Math.max(1, Math.round((timer.totalTime || 3600) / 60)));

  useEffect(() => {
    if (!timer.isRunning && timer.totalTime > 0) {
      setMinutes(Math.max(1, Math.round(timer.totalTime / 60)));
    }
  }, [timer.isRunning, timer.totalTime]);

  const progress = useMemo(() => {
    if (timer.totalTime <= 0) {
      return 0;
    }
    return Math.min(100, Math.max(0, (timer.remainingTime / timer.totalTime) * 100));
  }, [timer.remainingTime, timer.totalTime]);

  const handleStart = () => {
    const sanitizedMinutes = Math.max(1, Math.min(minutes, 180));
    startTimer(sanitizedMinutes * 60);
  };

  const handlePreset = (value: number) => {
    setMinutes(value);
    startTimer(value * 60);
  };

  return (
    <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950/90 via-slate-900/70 to-slate-900/50 p-6 text-slate-100 shadow-xl">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Cronómetro principal</h2>
          <p className="text-sm text-slate-400">
            Controla el tiempo de juego y coordina a todos los módulos.
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
            timer.isRunning
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
              : 'border-slate-500/40 bg-slate-500/10 text-slate-300'
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              timer.isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'
            }`}
          />
          {timer.isRunning ? 'En ejecución' : 'Detenido'}
        </span>
      </header>

      <div className="mt-6 rounded-2xl border border-white/5 bg-black/30 p-6 text-center">
        <div className="text-6xl font-semibold tracking-tight text-white">
          {formatTime(timer.remainingTime)}
        </div>
        <p className="mt-3 text-sm text-slate-400">Tiempo restante</p>
        <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full ${
              progress > 0 ? 'bg-emerald-400' : 'bg-slate-600'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Duración total configurada: {Math.max(0, Math.round(timer.totalTime / 60))} min
        </p>
      </div>

      <div className="mt-6 space-y-5">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Duración en minutos
          </label>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="number"
              min={1}
              max={180}
              value={minutes}
              onChange={(event) => {
                const value = Number(event.target.value);
                setMinutes(Number.isFinite(value) ? value : 0);
              }}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/10 sm:w-32"
            />
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePreset(preset)}
                  className="rounded-lg border border-white/10 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-white/30 hover:bg-white/10"
                >
                  {preset} min
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={handleStart}
            className="rounded-2xl bg-white/90 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-white"
          >
            Iniciar con duración
          </button>
          {timer.isRunning ? (
            <button
              type="button"
              onClick={pauseTimer}
              className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-white/30 hover:bg-white/10"
            >
              Pausar
            </button>
          ) : (
            <button
              type="button"
              onClick={resumeTimer}
              className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-white/30 hover:bg-white/10"
            >
              Reanudar
            </button>
          )}
          <button
            type="button"
            onClick={resetTimer}
            className="sm:col-span-2 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-200 transition hover:border-rose-400 hover:bg-rose-500/20"
          >
            Reiniciar cronómetro
          </button>
        </div>
      </div>
    </section>
  );
}
