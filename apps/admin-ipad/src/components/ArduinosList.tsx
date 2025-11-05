import { useAdminStore } from '../store';
import { formatRelativeTime } from '../utils/time';
import { restartArduino, restartAllArduinos } from '../socket';

const STATUS_LABEL = {
  connected: 'Conectado',
  disconnected: 'Desconectado',
  error: 'Error',
} as const;

const STATUS_STYLE = {
  connected: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
  disconnected: 'border-slate-500/40 bg-slate-500/10 text-slate-300',
  error: 'border-rose-500/40 bg-rose-500/10 text-rose-200',
} as const;

export function ArduinosList() {
  const arduinos = useAdminStore((state) => state.arduinos);

  if (arduinos.length === 0) {
    return (
      <section className="rounded-3xl border border-dashed border-white/10 bg-black/20 p-6 text-center backdrop-blur">
        <div className="space-y-3">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-white/5 text-2xl">
            📡
          </div>
          <h2 className="text-lg font-semibold text-white">Sin conexiones activas</h2>
          <p className="text-sm text-slate-400">
            Los arduinos aparecerán aquí en cuanto envíen un heartbeat.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Arduinos</h2>
          <p className="text-sm text-slate-400">
            Monitorea la conexión y actividad de cada dispositivo.
          </p>
        </div>
        <span className="text-sm font-semibold text-slate-300">
          {arduinos.length} conectados
        </span>
      </header>

      {/* Controles Globales */}
      <div className="space-y-4 rounded-2xl border border-white/10 bg-gradient-to-br from-black/40 to-black/20 p-5 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-slate-400 font-semibold">
              Controles globales
            </p>
            <p className="text-xs text-slate-500">
              Aplica acciones a todos los dispositivos
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-400/30">
            <svg className="h-5 w-5 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>
        
        <button
          type="button"
          onClick={() => restartAllArduinos()}
          className="group relative w-full overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-rose-500/10 px-4 py-3 text-sm font-semibold text-amber-100 transition-all duration-300 hover:border-amber-400/50 hover:shadow-lg hover:shadow-amber-500/20 active:scale-[0.98]"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-amber-400/0 via-amber-400/10 to-amber-400/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <div className="relative flex items-center justify-center gap-3">
            <svg className="h-5 w-5 transition-transform duration-300 group-hover:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Reiniciar todos los dispositivos</span>
          </div>
        </button>
      </div>

      {/* Dispositivos individuales */}
      <div className="space-y-4">
        {arduinos.map((arduino) => (
          <article
            key={arduino.id}
            className="rounded-2xl border border-white/10 bg-black/30 p-4"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  ID del dispositivo
                </p>
                <p className="mt-1 text-lg font-medium text-white">
                  {arduino.id}
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLE[arduino.status]}`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    arduino.status === 'connected'
                      ? 'bg-emerald-400'
                      : arduino.status === 'error'
                        ? 'bg-rose-400'
                        : 'bg-slate-400'
                  } ${arduino.status === 'connected' ? 'animate-pulse' : ''}`}
                />
                {STATUS_LABEL[arduino.status]}
              </span>
            </div>

            <div className="mt-4 grid gap-4 text-xs text-slate-400 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="font-medium text-slate-300">Último heartbeat</p>
                <p className="text-slate-200">
                  {formatRelativeTime(arduino.lastHeartbeat)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-slate-300">Dirección IP</p>
                <p className="text-slate-200">{arduino.ip ?? 'Sin registro'}</p>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <p className="font-medium text-slate-300">Último comando</p>
                <p className="text-slate-200">
                  {arduino.lastCommand ?? 'Sin comandos enviados'}
                </p>
                <p className="text-slate-500">
                  {formatRelativeTime(arduino.lastCommandTime)}
                </p>
              </div>
            </div>

            {/* Botones de control individual */}
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => restartArduino(arduino.id)}
                className="group relative overflow-hidden rounded-lg border border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 px-4 py-2 text-sm font-medium text-cyan-100 transition-all duration-300 hover:border-cyan-400/50 hover:shadow-lg hover:shadow-cyan-500/20 active:scale-95"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/0 via-cyan-400/10 to-cyan-400/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="relative flex items-center gap-2">
                  <svg className="h-4 w-4 transition-transform duration-300 group-hover:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Reiniciar dispositivo</span>
                </div>
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
