import { AlertTriangle, RotateCw, XCircle } from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";

interface FailureModalProps {
  onReset: () => void;
  remainingSeconds?: number;
  totalSeconds?: number;
}

const formatTime = (seconds?: number): string => {
  if (typeof seconds !== "number" || Number.isNaN(seconds)) {
    return "00:00";
  }

  const bounded = Math.max(seconds, 0);
  const mins = Math.floor(bounded / 60);
  const secs = bounded % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

const formatInitialDuration = (seconds?: number): string | null => {
  if (typeof seconds !== "number" || seconds <= 0) {
    return null;
  }

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

export function FailureModal({ onReset, remainingSeconds = 0, totalSeconds }: FailureModalProps) {
  const [isPressingReset, setIsPressingReset] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    });
  }, []);

  const handleResetPointerDown = useCallback(() => {
    pressTimerRef.current = setTimeout(() => {
      setIsPressingReset(true);
      onReset();
      setTimeout(() => setIsPressingReset(false), 500);
    }, 800);
  }, [onReset]);

  const clearPressTimer = useCallback(() => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    setIsPressingReset(false);
  }, []);

  const initialDuration = formatInitialDuration(totalSeconds);

  return (
    <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center p-6">
      <div
        className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-all duration-700 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
        style={{ transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}
      />

      <div
        className={`relative z-10 w-[520px] max-w-full transition-all duration-700 ${
          isVisible ? "translate-y-0 scale-100 opacity-100 blur-0" : "translate-y-8 scale-95 opacity-0 blur-sm"
        }`}
        style={{ transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}
      >
        <div className="rounded-3xl border border-rose-400/40 bg-gradient-to-br from-rose-50/95 via-white/95 to-slate-50/95 backdrop-blur-3xl shadow-[0_25px_80px_-20px_rgba(244,63,94,0.35),inset_0_1px_0_0_rgba(255,255,255,0.6)]">
          <div className="border-b border-rose-400/30 bg-gradient-to-br from-rose-50/50 to-transparent px-8 py-8">
            <div className="flex items-center justify-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-rose-600 shadow-[0_8px_32px_-8px_rgba(244,63,94,0.6)]">
                <XCircle className="h-7 w-7 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-rose-600" strokeWidth={2.5} />
                  <p className="text-[10px] uppercase tracking-[0.3em] text-rose-600/70">Sesión Finalizada</p>
                </div>
                <h1 className="text-3xl font-bold text-rose-700 tracking-tight">Tiempo Agotado</h1>
              </div>
            </div>
          </div>

          <div className="space-y-6 px-8 py-8">
            <div className="rounded-2xl border border-rose-200/60 bg-gradient-to-br from-white/60 to-rose-50/40 p-6">
              <p className="mb-3 text-center text-[10px] uppercase tracking-[0.3em] text-rose-500">
                Tiempo Restante
              </p>
              <p className="text-center text-6xl font-bold text-rose-700 tracking-tight tabular-nums">
                {formatTime(remainingSeconds)}
              </p>
              {initialDuration && (
                <div className="mt-4 flex justify-center">
                  <div className="inline-flex items-center gap-2 rounded-full border border-rose-400/30 bg-rose-50/60 px-4 py-1.5 text-xs font-medium text-rose-700">
                    <div className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                    Tiempo inicial: {initialDuration}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200/60 bg-gradient-to-br from-white/60 to-slate-50/40 p-5 text-center text-xs text-slate-600">
              <p className="font-semibold text-slate-700">Los jugadores se quedaron sin tiempo.</p>
              <p className="mt-2 leading-relaxed text-slate-500">
                Mantén presionado el botón para reiniciar la sala y preparar una nueva partida.
              </p>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-slate-300/40 to-transparent" />

            <button
              type="button"
              onPointerDown={handleResetPointerDown}
              onPointerUp={clearPressTimer}
              onPointerLeave={clearPressTimer}
              onContextMenu={(event) => event.preventDefault()}
              style={{ touchAction: "none", WebkitTouchCallout: "none", userSelect: "none" }}
              className={`group relative w-full rounded-2xl border-2 px-6 py-4 transition-all duration-300 ${
                isPressingReset
                  ? "scale-95 shadow-[0_0_30px_rgba(59,130,246,0.45)]"
                  : "scale-100 shadow-[0_4px_20px_rgba(59,130,246,0.2)] hover:scale-[1.02]"
              } border-blue-400/40 bg-gradient-to-br from-blue-50 to-blue-100/60 hover:border-blue-400/60`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/60 transition-transform duration-300 group-hover:rotate-90">
                  <RotateCw className="h-5 w-5 text-blue-600" strokeWidth={2.5} />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-bold text-blue-700 leading-tight">Mantén para Reiniciar</div>
                  <div className="mt-0.5 text-[10px] text-blue-600/70 leading-relaxed">
                    Restaura el estado inicial de la sala
                  </div>
                </div>
              </div>
              {isPressingReset && (
                <div className="absolute inset-0 rounded-2xl border-2 border-blue-400/50 animate-ping pointer-events-none" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
