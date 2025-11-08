import type { ReactNode } from "react";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  X,
  RotateCw,
  AlertCircle,
  Info,
  Wifi,
  WifiOff,
  Activity,
  HelpCircle,
} from "lucide-react";
import type { MarkerDetails } from "./status.ts";
import type { MarkerStatus, StageMarker } from "./types.ts";
import { LatencySparkline } from "./LatencySparkline.tsx";
import { resolveModuleDeviceId } from "../utils/moduleDevices.ts";

export interface DrawerAction {
  id: string;
  label: string;
  description?: string;
  onClick: () => void;
  tone?: "primary" | "neutral" | "danger";
  disabled?: boolean;
  requireHold?: boolean; // Nueva propiedad para botones que requieren mantener presionado
}

interface HardwareDrawerProps {
  open: boolean;
  marker: StageMarker | null;
  details: MarkerDetails | null;
  actions: DrawerAction[];
  onClose: () => void;
}

const ACTION_STYLE: Record<NonNullable<DrawerAction["tone"]>, string> = {
  primary:
    "border-emerald-400/40 bg-gradient-to-br from-emerald-50 to-emerald-100/50 text-emerald-700 hover:from-emerald-100 hover:to-emerald-200/60 hover:border-emerald-400/60 shadow-[0_2px_12px_-2px_rgba(16,185,129,0.2)]",
  neutral:
    "border-slate-300/60 bg-gradient-to-br from-slate-50 to-slate-100/50 text-slate-700 hover:from-slate-100 hover:to-slate-150 hover:border-slate-400/60 shadow-[0_2px_12px_-2px_rgba(100,116,139,0.15)]",
  danger:
    "border-rose-400/40 bg-gradient-to-br from-rose-50 to-rose-100/50 text-rose-700 hover:from-rose-100 hover:to-rose-200/60 hover:border-rose-400/60 shadow-[0_2px_12px_-2px_rgba(244,63,94,0.2)]",
};

const STATUS_ICON_MAP: Record<MarkerStatus["connection"], typeof Wifi> = {
  online: Wifi,
  standby: Activity,
  offline: WifiOff,
  error: AlertCircle,
  unknown: HelpCircle,
};

const STATUS_STYLE: Record<MarkerStatus["connection"], string> = {
  online:
    "bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-400/50 text-emerald-700 shadow-[0_2px_16px_-4px_rgba(16,185,129,0.3)]",
  standby:
    "bg-gradient-to-br from-cyan-50 to-cyan-100/50 border-cyan-400/50 text-cyan-700 shadow-[0_2px_16px_-4px_rgba(34,211,238,0.3)]",
  offline:
    "bg-gradient-to-br from-slate-50 to-slate-100/50 border-slate-400/50 text-slate-600 shadow-[0_2px_16px_-4px_rgba(148,163,184,0.25)]",
  error:
    "bg-gradient-to-br from-rose-50 to-rose-100/50 border-rose-400/50 text-rose-700 shadow-[0_2px_16px_-4px_rgba(244,63,94,0.3)]",
  unknown:
    "bg-gradient-to-br from-slate-50 to-slate-100/40 border-slate-300/50 text-slate-600 shadow-[0_2px_16px_-4px_rgba(100,116,139,0.2)]",
};

function Divider({ children }: { children?: ReactNode }) {
  if (!children) {
    return (
      <div className="my-4 h-px bg-gradient-to-r from-transparent via-slate-300/40 to-transparent" />
    );
  }
  return (
    <div className="my-4 flex items-center gap-3 text-[10px] uppercase tracking-[0.3em] text-slate-500">
      <div className="grow h-px bg-gradient-to-r from-transparent via-slate-300/40 to-slate-300/20" />
      {children}
      <div className="grow h-px bg-gradient-to-r from-slate-300/20 via-slate-300/40 to-transparent" />
    </div>
  );
}

export function HardwareDrawer({
  open,
  marker,
  details,
  actions,
  onClose,
}: HardwareDrawerProps) {
  const status: MarkerStatus | undefined = details?.status;
  const StatusIcon = status ? STATUS_ICON_MAP[status.connection] : HelpCircle;
  const statusStyle = status
    ? STATUS_STYLE[status.connection]
    : STATUS_STYLE.unknown;

  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [pressingButton, setPressingButton] = useState<string | null>(null);
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { deviceId, instanceId } = useMemo(() => {
    if (!marker) {
      return { deviceId: undefined as string | undefined, instanceId: undefined as string | undefined };
    }

    if (marker.type === "arduino") {
      return {
        deviceId: marker.deviceId ?? details?.arduino?.id,
        instanceId: details?.arduino?.instanceId ?? undefined,
      };
    }

    if (marker.type === "module") {
      return {
        deviceId: resolveModuleDeviceId(marker.moduleId),
        instanceId: details?.module?.instanceId ?? undefined,
      };
    }

    return { deviceId: undefined as string | undefined, instanceId: undefined as string | undefined };
  }, [marker, details]);

  const handleButtonPress = useCallback((action: DrawerAction, event: React.PointerEvent) => {
    if (action.disabled) return;

    // Solo activar hold si el pointer no se mueve (no es scroll)
    if (action.requireHold) {
      const startX = event.clientX;
      const startY = event.clientY;
      
      pressTimerRef.current = setTimeout(() => {
        // Solo ejecutar si no hubo movimiento significativo
        const moveThreshold = 10;
        if (
          Math.abs(event.clientX - startX) < moveThreshold &&
          Math.abs(event.clientY - startY) < moveThreshold
        ) {
          setPressingButton(action.id);
          action.onClick();
          setTimeout(() => setPressingButton(null), 500);
        }
      }, 500);
    } else {
      action.onClick();
    }
  }, []);

  const handleButtonRelease = useCallback(() => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (open) {
      setShouldRender(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsVisible(true);
        });
      });
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [open]);

  if (!shouldRender || !marker) {
    return null;
  }

  return (
    <>
      <div
        className={`pointer-events-auto fixed inset-0 bg-slate-900/20 backdrop-blur-sm transition-all duration-500 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />
      <aside
        className={`pointer-events-auto fixed right-6 top-6 bottom-6 w-80 rounded-3xl border border-slate-300/40 bg-gradient-to-br from-slate-50/98 via-gray-50/98 to-slate-50/98 backdrop-blur-3xl transition-all bg-white/80 overflow-hidden duration-500 ${
          isVisible
            ? "translate-x-0 scale-100 opacity-100 blur-0"
            : "translate-x-12 scale-90 opacity-0 blur-sm"
        }`}
        style={{
          boxShadow: isVisible
            ? "0 25px 80px -20px rgba(0, 0, 0, 0.15), inset 0 1px 0 0 rgba(255, 255, 255, 0.5), 0 0 40px -10px rgba(100, 116, 139, 0.1)"
            : "0 10px 40px -10px rgba(0, 0, 0, 0.1)",
          transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex h-full flex-col overflow-hidden">
          <header className="border-b border-slate-300/60 bg-gradient-to-br from-white/40 to-transparent px-5 py-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h2 className="text-xl font-bold text-slate-800 tracking-tight">
                  {marker.label}
                </h2>
                {marker.description && (
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                    {marker.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300/60 bg-slate-100/50 text-slate-600 transition-all duration-300 hover:border-slate-400/60 hover:bg-slate-200/60 hover:text-slate-800 hover:rotate-90"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div
            className="flex-1 overflow-y-auto px-5 py-5 scrollbar-thin scrollbar-thumb-slate-300/40 scrollbar-track-transparent"
            style={{ 
              touchAction: "pan-y",
              WebkitOverflowScrolling: "touch",
              overscrollBehavior: "contain",
            }}
          >
            <section
              className={`rounded-2xl border-2 p-4 transition-all duration-300 ${statusStyle}`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/60">
                  <StatusIcon className="h-5 w-5" strokeWidth={2.5} />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] uppercase tracking-[0.3em] opacity-60">
                    Estado del equipo
                  </p>
                  <p className="mt-0.5 text-sm font-semibold">
                    {status?.label ?? "Sin datos"}
                  </p>
                </div>
              </div>
              {status?.helper && (
                <p className="mt-3 text-xs opacity-70 leading-relaxed">
                  {status.helper}
                </p>
              )}
            </section>

            <Divider>Métricas</Divider>

            <LatencySparkline
              deviceId={deviceId}
              instanceId={instanceId}
              communicationType={details?.communicationType}
            />

            <Divider>Información</Divider>

            <section className="space-y-2.5">
              {(details?.meta ?? []).map((item) => (
                <article
                  key={item.label}
                  className="group rounded-xl border border-slate-200/60 bg-gradient-to-br from-white/60 to-slate-50/40 p-3.5 transition-all duration-300 hover:border-slate-300/70 hover:from-white/80 hover:to-slate-50/60"
                >
                  <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500 group-hover:text-slate-600 transition-colors">
                    {item.label}
                  </p>
                  <p className="mt-2 text-xs text-slate-700 leading-relaxed break-words font-medium">
                    {item.value ?? "Sin registro"}
                  </p>
                </article>
              ))}
              {details?.meta?.length === 0 && (
                <div className="flex items-start gap-3 rounded-xl border border-slate-200/60 bg-gradient-to-br from-white/60 to-slate-50/40 p-3.5 text-xs text-slate-600">
                  <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-slate-400" />
                  <p className="leading-relaxed">
                    Conecta este marcador a un módulo o dispositivo para ver
                    métricas en tiempo real.
                  </p>
                </div>
              )}
            </section>

            <Divider>Acciones disponibles</Divider>

            <div className="space-y-2.5">
              {actions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onPointerDown={(e) => handleButtonPress(action, e)}
                  onPointerUp={handleButtonRelease}
                  onPointerLeave={handleButtonRelease}
                  onContextMenu={(e) => e.preventDefault()}
                  style={{
                    touchAction: "manipulation",
                    WebkitTouchCallout: "none",
                    userSelect: "none",
                  }}
                  disabled={action.disabled}
                  className={`group relative w-full rounded-xl border-2 px-4 py-3 text-left text-xs font-semibold transition-all duration-300 flex items-start gap-3 ${
                    ACTION_STYLE[action.tone ?? "neutral"]
                  } ${
                    action.disabled
                      ? "opacity-40 cursor-not-allowed"
                      : "hover:scale-[1.02] active:scale-[0.98]"
                  } ${pressingButton === action.id ? "scale-95" : ""}`}
                >
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/60">
                    {action.tone === "primary" && (
                      <RotateCw className="h-3.5 w-3.5" strokeWidth={2.5} />
                    )}
                    {action.tone === "danger" && (
                      <AlertCircle className="h-3.5 w-3.5" strokeWidth={2.5} />
                    )}
                    {!action.tone || action.tone === "neutral" ? (
                      <Info className="h-3.5 w-3.5" strokeWidth={2.5} />
                    ) : null}
                  </div>
                  <div className="flex-1 pt-0.5">
                    <span className="block leading-tight">
                      {action.requireHold ? "" : ""}
                      {action.label}
                    </span>
                    {action.description && (
                      <span className="mt-1.5 block text-[10px] opacity-70 leading-relaxed">
                        {action.requireHold
                          ? "Mantén presionado para activar. "
                          : ""}
                        {action.description}
                      </span>
                    )}
                  </div>
                  {pressingButton === action.id && (
                    <div className="absolute inset-0 rounded-xl border-2 border-white/50 animate-ping pointer-events-none" />
                  )}
                </button>
              ))}
              {actions.length === 0 && (
                <div className="flex items-start gap-3 rounded-xl border border-slate-200/60 bg-gradient-to-br from-white/60 to-slate-50/40 p-3.5 text-xs text-slate-600">
                  <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-slate-400" />
                  <p className="leading-relaxed">
                    No hay acciones directas para este marcador.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
