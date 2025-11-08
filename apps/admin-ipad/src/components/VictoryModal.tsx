import { Trophy, RotateCw, CheckCircle2 } from 'lucide-react';
import { useState, useRef, useCallback, useEffect } from 'react';

interface VictoryModalProps {
  completionTime: number;
  onReset: () => void;
}

export function VictoryModal({ completionTime, onReset }: VictoryModalProps) {
  const [isPressingReset, setIsPressingReset] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Animación de entrada suave
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    });
  }, []);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleResetMouseDown = useCallback(() => {
    pressTimerRef.current = setTimeout(() => {
      setIsPressingReset(true);
      onReset();
      setTimeout(() => setIsPressingReset(false), 500);
    }, 800);
  }, [onReset]);

  const handleResetMouseUp = useCallback(() => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    setIsPressingReset(false);
  }, []);

  return (
    <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center p-6">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-all duration-700 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
      />
      
      {/* Modal */}
      <div 
        className={`relative z-10 w-[520px] max-w-full transition-all duration-700 ${
          isVisible 
            ? 'translate-y-0 scale-100 opacity-100 blur-0' 
            : 'translate-y-8 scale-95 opacity-0 blur-sm'
        }`}
        style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        <div className="rounded-3xl border border-emerald-400/40 bg-gradient-to-br from-emerald-50/95 via-white/95 to-slate-50/95 backdrop-blur-3xl shadow-[0_25px_80px_-20px_rgba(16,185,129,0.4),inset_0_1px_0_0_rgba(255,255,255,0.6)]">
          
          {/* Header con icono */}
          <div className="border-b border-emerald-400/30 bg-gradient-to-br from-emerald-50/50 to-transparent px-8 py-8">
            <div className="flex items-center justify-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[0_8px_32px_-8px_rgba(16,185,129,0.6)]">
                <Trophy className="h-7 w-7 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" strokeWidth={2.5} />
                  <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-600/70">
                    Sesión Completada
                  </p>
                </div>
                <h1 className="text-3xl font-bold text-emerald-700 tracking-tight">
                  ¡Escape Exitoso!
                </h1>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-8 py-8 space-y-6">
            
            {/* Time Display */}
            <div className="rounded-2xl border border-slate-200/60 bg-gradient-to-br from-white/60 to-slate-50/40 p-6 transition-all duration-300">
              <p className="mb-3 text-center text-[10px] uppercase tracking-[0.3em] text-slate-500">
                Tiempo Final
              </p>
              <p className="text-center text-6xl font-bold text-slate-800 tracking-tight tabular-nums">
                {formatTime(completionTime)}
              </p>
              <div className="mt-4 flex justify-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-50/50 px-4 py-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="text-xs font-medium text-emerald-700">Completado</span>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-slate-300/40 to-transparent" />

            {/* Reset Button */}
            <button
              type="button"
              onPointerDown={handleResetMouseDown}
              onPointerUp={handleResetMouseUp}
              onPointerLeave={handleResetMouseUp}
              onContextMenu={(e) => e.preventDefault()}
              style={{ touchAction: 'none', WebkitTouchCallout: 'none', userSelect: 'none' }}
              className={`group relative w-full rounded-2xl border-2 px-6 py-4 transition-all duration-300 ${
                isPressingReset
                  ? 'scale-95 shadow-[0_0_30px_rgba(244,63,94,0.5)]'
                  : 'scale-100 shadow-[0_4px_20px_rgba(244,63,94,0.2)] hover:scale-[1.02]'
              } border-rose-400/40 bg-gradient-to-br from-rose-50 to-rose-100/50 hover:from-rose-100 hover:to-rose-200/60 hover:border-rose-400/60`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/60 transition-transform duration-300 group-hover:rotate-90">
                  <RotateCw className="h-5 w-5 text-rose-600" strokeWidth={2.5} />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-bold text-rose-700 leading-tight">
                    Mantén para Reiniciar
                  </div>
                  <div className="mt-0.5 text-[10px] text-rose-600/70 leading-relaxed">
                    Resetea todo para nueva partida
                  </div>
                </div>
              </div>
              {isPressingReset && (
                <div className="absolute inset-0 rounded-2xl border-2 border-rose-400/50 animate-ping pointer-events-none" />
              )}
            </button>

          </div>

        </div>
      </div>
    </div>
  );
}
