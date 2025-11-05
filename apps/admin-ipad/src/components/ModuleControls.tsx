import { MODULES, useAdminStore } from '../store';
import type { ModuleStatus } from '../store';
import { formatRelativeTime } from '../utils/time';
import { resetModule, triggerVictory, resetGame } from '../socket';

const STATUS_LABEL: Record<ModuleStatus, string> = {
  inactive: 'Sin iniciar',
  waiting: 'Listo',
  active: 'En progreso',
  completed: 'Completado',
  error: 'Con errores',
};

const STATUS_STYLE: Record<ModuleStatus, string> = {
  inactive: 'border-white/10 bg-white/[0.02] text-slate-300',
  waiting: 'border-sky-500/40 bg-sky-500/10 text-sky-200',
  active: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
  completed: 'border-violet-500/40 bg-violet-500/10 text-violet-200',
  error: 'border-rose-500/40 bg-rose-500/10 text-rose-200',
};

export function ModuleControls() {
  const modules = useAdminStore((state) => state.modules);

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
      <header className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-white">Módulos del juego</h2>
        <p className="text-sm text-slate-400">
          Monitorea el estado y reinicia cada módulo cuando lo necesites.
        </p>
      </header>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {MODULES.map((definition) => {
          const module = modules[definition.id] ?? {
            ...definition,
            status: 'inactive' as ModuleStatus,
          };

          return (
            <article
              key={definition.id}
              className="flex flex-col gap-5 rounded-2xl border border-white/10 bg-black/30 p-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs uppercase tracking-wide text-slate-400">
                    {definition.icon} {definition.label}
                  </span>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {STATUS_LABEL[module.status]}
                  </p>
                  <p className="mt-2 text-xs text-slate-400">
                    {definition.description}
                  </p>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLE[module.status]}`}
                >
                  {STATUS_LABEL[module.status]}
                </span>
              </div>

              {typeof module.progress === 'number' && module.progress > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Progreso</span>
                    <span>{Math.min(100, Math.round(module.progress))}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-emerald-400"
                      style={{ width: `${Math.min(100, Math.round(module.progress))}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>
                  Último cambio: {formatRelativeTime(module.lastEventTime)}
                </span>
                <button
                  type="button"
                  onClick={() => resetModule(definition.id)}
                  className="rounded-lg border border-white/10 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-white/30 hover:bg-white/10"
                >
                  Reiniciar
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <footer className="mt-6 grid gap-3 md:grid-cols-2">
        <button
          type="button"
          onClick={triggerVictory}
          className="rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:from-amber-300 hover:to-orange-400"
        >
          Mostrar victoria
        </button>
        <button
          type="button"
          onClick={resetGame}
          className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-white/30 hover:bg-white/10"
        >
          Reset general
        </button>
      </footer>
    </section>
  );
}
