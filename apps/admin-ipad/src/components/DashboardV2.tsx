import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  Menu,
  RotateCw,
  Trophy,
  X,
  Play,
  StopCircle,
  Pause,
  LineChart,
} from "lucide-react";

import { useAdminStore } from "../store.ts";
import type { ArduinoState, ModuleId, ModuleState } from "../store.ts";
import { useDeviceCommands } from "../hooks/useDeviceCommands.ts";
import { resolveModuleDeviceId } from "../utils/moduleDevices.ts";
import { DEVICE } from "@samay/scape-protocol";
import { MarkerLayer } from "./MarkerLayer.tsx";
import { HardwareDrawer, type DrawerAction } from "./HardwareDrawer.tsx";
import { VictoryModal } from "./VictoryModal.tsx";
import { MonitorModal } from "./MonitorModal.tsx";
import { DEFAULT_MARKERS } from "./markerConfig.ts";
import { deriveMarkerDetails, type MarkerDetails } from "./status.ts";
import type { MarkerStatus, StageMarker } from "./types.ts";

const BACKGROUND_SRC = "/background.png";

type ModuleMap = Record<ModuleId, ModuleState>;

interface ProjectionMetrics {
  scale: number;
  scaledWidth: number;
  scaledHeight: number;
  offsetX: number;
  offsetY: number;
}

type DraggingState = {
  id: string;
  pointerId: number;
} | null;

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

export function DashboardV2() {
  const stageRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const { connected, modules, arduinos, timer, gameCompleted, completionTime } =
    useAdminStore((state) => ({
      connected: state.connected,
      modules: state.modules,
      arduinos: state.arduinos,
      timer: state.timer,
      gameCompleted: state.gameCompleted,
      completionTime: state.completionTime,
    }));

  const [isPressingStart, setIsPressingStart] = useState(false);
  const [isPressingPause, setIsPressingPause] = useState(false);
  const pressStartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressPauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [markers, setMarkers] = useState<StageMarker[]>(DEFAULT_MARKERS);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [editing] = useState(false);
  const [dragging, setDragging] = useState<DraggingState>(null);
  const [exportVisible, setExportVisible] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [shouldRenderMenu, setShouldRenderMenu] = useState(false);
  const [monitorOpen, setMonitorOpen] = useState(false);

  const [imageDimensions, setImageDimensions] = useState({
    width: 1,
    height: 1,
    ready: false,
  });
  const [metrics, setMetrics] = useState<ProjectionMetrics | null>(null);

  const updateMetrics = useCallback(() => {
    if (!imageDimensions.ready) {
      return;
    }
    const container = stageRef.current;
    if (!container) {
      return;
    }
    const rect = container.getBoundingClientRect();
    const containerWidth = rect.width;
    const containerHeight = rect.height;
    if (containerWidth === 0 || containerHeight === 0) {
      return;
    }

    const scale = Math.max(
      containerWidth / imageDimensions.width,
      containerHeight / imageDimensions.height,
    );
    const scaledWidth = imageDimensions.width * scale;
    const scaledHeight = imageDimensions.height * scale;
    const offsetX = (scaledWidth - containerWidth) / 2;
    const offsetY = (scaledHeight - containerHeight) / 2;

    setMetrics({ scale, scaledWidth, scaledHeight, offsetX, offsetY });
  }, [imageDimensions]);

  useEffect(() => {
    updateMetrics();
    if (!stageRef.current) {
      return;
    }
    const observer = new ResizeObserver(updateMetrics);
    observer.observe(stageRef.current);
    return () => observer.disconnect();
  }, [updateMetrics]);

  useEffect(() => {
    if (menuOpen) {
      setShouldRenderMenu(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setMenuVisible(true);
        });
      });
    } else {
      setMenuVisible(false);
      const timer = setTimeout(() => {
        setShouldRenderMenu(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [menuOpen]);

  const handleImageLoad = useCallback(() => {
    const img = imageRef.current;
    if (!img) {
      return;
    }
    setImageDimensions({
      width: img.naturalWidth,
      height: img.naturalHeight,
      ready: true,
    });
  }, []);

  const projectPosition = useCallback(
    (marker: StageMarker) => {
      if (!metrics) {
        return null;
      }
      const x = marker.position.x * metrics.scaledWidth - metrics.offsetX;
      const y = marker.position.y * metrics.scaledHeight - metrics.offsetY;
      return { x, y };
    },
    [metrics],
  );

  const updateMarkerPosition = useCallback(
    (markerId: string, clientX: number, clientY: number) => {
      if (!stageRef.current || !metrics) {
        return;
      }
      const rect = stageRef.current.getBoundingClientRect();
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;
      const normalizedX = clamp(
        (localX + metrics.offsetX) / metrics.scaledWidth,
      );
      const normalizedY = clamp(
        (localY + metrics.offsetY) / metrics.scaledHeight,
      );

      setMarkers((prev) =>
        prev.map((marker) =>
          marker.id === markerId
            ? {
                ...marker,
                position: {
                  x: Number(normalizedX.toFixed(4)),
                  y: Number(normalizedY.toFixed(4)),
                },
              }
            : marker,
        ),
      );
    },
    [metrics],
  );

  useEffect(() => {
    if (!dragging) {
      return;
    }

    const handleMove = (event: PointerEvent) => {
      event.preventDefault();
      updateMarkerPosition(dragging.id, event.clientX, event.clientY);
    };

    const handleUp = (event: PointerEvent) => {
      if (event.pointerId === dragging.pointerId) {
        setDragging(null);
      }
    };

    const handleCancel = (event: PointerEvent) => {
      if (event.pointerId === dragging.pointerId) {
        setDragging(null);
      }
    };

    window.addEventListener("pointermove", handleMove, { passive: false });
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleCancel);

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleCancel);
    };
  }, [dragging, updateMarkerPosition]);

  const handleMarkerSelect = useCallback(
    (marker: StageMarker) => {
      if (editing) {
        return;
      }
      setSelectedMarkerId(marker.id);
    },
    [editing],
  );

  const handleMarkerDragStart = useCallback(
    (marker: StageMarker, event: ReactPointerEvent<HTMLButtonElement>) => {
      if (!editing) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      setDragging({ id: marker.id, pointerId: event.pointerId });
    },
    [editing],
  );

  const { statusMap, detailMap } = useMemo(() => {
    const mapStatus: Record<string, MarkerStatus> = {};
    const mapDetails: Record<string, MarkerDetails> = {};

    markers.forEach((marker) => {
      const details = deriveMarkerDetails(
        marker,
        modules as ModuleMap,
        arduinos as ArduinoState[],
      );
      mapStatus[marker.id] = details.status;
      mapDetails[marker.id] = details;
    });

    return { statusMap: mapStatus, detailMap: mapDetails };
  }, [markers, modules, arduinos]);

  const selectedMarker = useMemo(
    () => markers.find((marker) => marker.id === selectedMarkerId) ?? null,
    [markers, selectedMarkerId],
  );

  const selectedDetails = selectedMarker
    ? (detailMap[selectedMarker.id] ?? null)
    : null;

  const exportJson = useMemo(() => JSON.stringify(markers, null, 2), [markers]);

  const handleCloseDrawer = useCallback(() => {
    setSelectedMarkerId(null);
  }, []);

  const { getCommands, sendCommand, resetAll, statusStart, statusPause, statusRestart } = useDeviceCommands();

  const targetDevice = useMemo(() => {
    if (!selectedMarker) {
      return null;
    }

    if (selectedMarker.type === "module") {
      const deviceId = resolveModuleDeviceId(selectedMarker.moduleId);
      if (!deviceId) {
        return null;
      }

      return {
        deviceId,
        instanceId: selectedDetails?.module?.instanceId ?? undefined,
      };
    }

    if (selectedMarker.type === "arduino") {
      const deviceId =
        selectedMarker.deviceId ?? selectedDetails?.arduino?.id ?? undefined;
      if (!deviceId) {
        return null;
      }

      return {
        deviceId,
        instanceId: selectedDetails?.arduino?.instanceId ?? undefined,
      };
    }

    return null;
  }, [selectedMarker, selectedDetails]);

  const targetDeviceId = targetDevice?.deviceId;
  const targetInstanceId = targetDevice?.instanceId;

  const deviceCommands = useMemo(
    () => getCommands(targetDeviceId, { instanceId: targetInstanceId }),
    [getCommands, targetDeviceId, targetInstanceId],
  );

  const {
    reset: resetSelectedDevice,
    execute: executeCommand,
    isReady: isDeviceReady,
  } = deviceCommands;

  const canTriggerReset = isDeviceReady;

  const drawerActions: DrawerAction[] = useMemo(() => {
    if (!selectedMarker || !targetDeviceId) {
      return [];
    }

    const actions: DrawerAction[] = [];

    const baseMetadata = {
      origin: "admin-ipad",
      markerId: selectedMarker.id,
    } as Record<string, unknown>;

    if (selectedMarker.type === "module") {
      if (selectedMarker.moduleId === "printer") {
        actions.push({
          id: "start-ai-app",
          label: "Iniciar IA",
          description: "Envía el comando de inicio al módulo de IA.",
          tone: "primary",
          requireHold: true,
          disabled: !isDeviceReady,
          onClick: () => {
            executeCommand("start", {
              payload: {
                ...baseMetadata,
              },
            });
          },
        });
      }

      if (selectedMarker.moduleId === "buttons") {
        actions.push(
          {
            id: "buttons-skip-code",
            label: "Saltar código",
            description: "Avanza al siguiente paso sin validar el código.",
            tone: "neutral",
            requireHold: true,
            disabled: !isDeviceReady,
            onClick: () => {
              executeCommand("command", {
                payload: {
                  ...baseMetadata,
                  action: "skip-code",
                },
              });
            },
          },
          {
            id: "buttons-force-complete",
            label: "Completar juego",
            description: "Marca el módulo como completado manualmente.",
            tone: "danger",
            requireHold: true,
            disabled: !isDeviceReady,
            onClick: () => {
              executeCommand("command", {
                payload: {
                  ...baseMetadata,
                  action: "force-complete",
                },
              });
            },
          },
        );
      }

      if (selectedMarker.moduleId === "totem") {
        actions.push(
          {
            id: "totem-start-phase-1",
            label: "Iniciar juego 1",
            description: "Inicia la primera fase del totem.",
            tone: "primary",
            requireHold: true,
            disabled: !isDeviceReady,
            onClick: () => {
              executeCommand("start", {
                payload: {
                  ...baseMetadata,
                  phase: 1,
                },
              });
            },
          },
          {
            id: "totem-start-phase-2",
            label: "Iniciar juego 2",
            description: "Lanza la segunda fase del totem.",
            tone: "primary",
            requireHold: true,
            disabled: !isDeviceReady,
            onClick: () => {
              executeCommand("start", {
                payload: {
                  ...baseMetadata,
                  phase: 2,
                },
              });
            },
          },
        );
      }
    }

    if (selectedMarker.type === "arduino" && targetDeviceId === DEVICE.BUTTONS_ARDUINO) {
      actions.push({
        id: "start-buttons-arduino",
        label: "Iniciar Buttons Arduino",
        description: "Envía el comando de inicio al Arduino de botones.",
        tone: "primary",
        requireHold: true,
        onClick: () => {
          sendCommand(DEVICE.BUTTONS_ARDUINO, "start", {
            targetInstanceId: targetDevice?.instanceId,
            payload: {
              ...baseMetadata,
            },
          });
        },
        disabled: !isDeviceReady,
      });
    }

    actions.push(
      {
        id: "reset-device",
        label: "Reset dispositivo",
        description: "Envía un reset al equipo seleccionado.",
        tone: "danger",
        requireHold: true,
        disabled: !canTriggerReset,
        onClick: () => {
          resetSelectedDevice({
            metadata: baseMetadata,
          });
        },
      },
    );

    return actions;
  }, [
    selectedMarker,
    targetDeviceId,
    targetInstanceId,
    canTriggerReset,
    resetSelectedDevice,
    isDeviceReady,
    executeCommand,
    sendCommand,
  ]);

  const handleStartStopMouseDown = useCallback(() => {
    pressStartTimerRef.current = setTimeout(() => {
      setIsPressingStart(true);
      if (timer.isRunning) {
        resetAll({ reason: "admin-stop-reset", metadata: { source: "dashboard" } });
      } else if (timer.status === "paused") {
        statusRestart({ durationSeconds: Math.max(timer.remainingTime, 0) });
      } else {
        statusStart();
      }
    }, 500);
  }, [timer.isRunning, timer.status, timer.remainingTime, resetAll, statusStart, statusRestart]);

  const handleStartStopMouseUp = useCallback(() => {
    if (pressStartTimerRef.current) {
      clearTimeout(pressStartTimerRef.current);
      pressStartTimerRef.current = null;
    }
    setIsPressingStart(false);
  }, []);

  const handlePauseMouseDown = useCallback(() => {
    pressPauseTimerRef.current = setTimeout(() => {
      setIsPressingPause(true);
      if (timer.status === "paused") {
        statusRestart({ durationSeconds: Math.max(timer.remainingTime, 0) });
      } else if (timer.isRunning) {
        statusPause();
      }
    }, 500);
  }, [timer.status, timer.isRunning, timer.remainingTime, statusPause, statusRestart]);

  const handlePauseMouseUp = useCallback(() => {
    if (pressPauseTimerRef.current) {
      clearTimeout(pressPauseTimerRef.current);
      pressPauseTimerRef.current = null;
    }
    setIsPressingPause(false);
  }, []);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const handleVictoryReset = useCallback(() => {
    resetAll({ reason: "admin-victory-reset", metadata: { source: "dashboard" } });
  }, [resetAll]);

  return (
    <div
      className="fixed top-0 left-0 h-full w-full overflow-hidden bg-slate-950 text-white"
      style={{
        touchAction: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        ref={stageRef}
        className="relative flex h-screen w-full items-stretch justify-center"
      >
        <img
          ref={imageRef}
          src={BACKGROUND_SRC}
          alt="Distribución del escape room"
          className="absolute inset-0 h-full w-full object-cover"
          onLoad={handleImageLoad}
          draggable={false}
        />

        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/70 via-slate-900/20 to-slate-900/60 opacity-30" />

        <div className="pointer-events-none absolute inset-0">
          <div className="pointer-events-auto absolute left-0 right-0 top-0 flex items-center justify-between px-6 py-6">
            <div className="rounded-3xl border border-white/15 bg-white/10 px-4 py-2 backdrop-blur">
              <div className="flex items-center gap-3 text-sm font-semibold">
                <span
                  className={`inline-flex h-2.5 w-2.5 rounded-full ${
                    connected
                      ? "bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.8)]"
                      : "bg-rose-400 shadow-[0_0_16px_rgba(248,113,113,0.8)]"
                  } ${connected ? "animate-pulse" : ""}`}
                />
                {connected
                  ? "Conectado al servidor"
                  : "Sin conexión con el servidor"}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMonitorOpen(true)}
                className="rounded-2xl border border-white/15 bg-white/10 p-3 text-white transition hover:border-white/30 hover:bg-white/15 backdrop-blur"
              >
                <LineChart className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                className="rounded-2xl border border-white/15 bg-white/10 p-3 text-white transition hover:border-white/30 hover:bg-white/15 backdrop-blur"
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="pointer-events-auto absolute left-6 top-20 flex flex-col gap-3">
            <div className="rounded-3xl border border-white/15 bg-white/10 px-6 py-4 backdrop-blur">
              <div className="text-center">
                <p className="text-xs uppercase tracking-[0.3em] text-white/40 mb-2">
                  Tiempo
                </p>
                <p className="text-4xl font-semibold italic tracking-tight text-white">
                  {formatTime(timer.remainingTime)}
                </p>
                <p className="text-xs text-white/50 mt-1">
                  {timer.status === "active" && "En curso"}
                  {timer.status === "paused" && "Pausado"}
                  {timer.status === "waiting" && "En espera"}
                  {timer.status === "completed" && "Completado"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onPointerDown={handleStartStopMouseDown}
              onPointerUp={handleStartStopMouseUp}
              onPointerLeave={handleStartStopMouseUp}
              onContextMenu={(e) => e.preventDefault()}
              style={{
                touchAction: "none",
                WebkitTouchCallout: "none",
                userSelect: "none",
              }}
              className={`relative rounded-2xl border-2 px-6 py-5 text-white transition-all duration-300 backdrop-blur ${
                isPressingStart
                  ? "scale-95 shadow-[0_0_30px_rgba(52,211,153,0.6)]"
                  : "scale-100 shadow-[0_4px_20px_rgba(0,0,0,0.3)]"
              } ${
                timer.isRunning
                  ? "border-rose-400/40 bg-rose-500/20 hover:border-rose-400/60 hover:bg-rose-500/30"
                  : "border-emerald-400/40 bg-emerald-500/20 hover:border-emerald-400/60 hover:bg-emerald-500/30"
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                {timer.isRunning ? (
                  <StopCircle className="h-8 w-8" strokeWidth={2} />
                ) : (
                  <Play className="h-8 w-8" strokeWidth={2} />
                )}
                <span className="text-sm font-semibold">
                  {timer.isRunning
                    ? "Mantén para Detener"
                    : "Mantén para Iniciar"}
                </span>
                {isPressingStart && (
                  <div className="absolute inset-0 rounded-2xl border-2 border-white/50 animate-ping" />
                )}
              </div>
            </button>

            <button
              type="button"
              onPointerDown={handlePauseMouseDown}
              onPointerUp={handlePauseMouseUp}
              onPointerLeave={handlePauseMouseUp}
              onContextMenu={(e) => e.preventDefault()}
              style={{
                touchAction: "none",
                WebkitTouchCallout: "none",
                userSelect: "none",
              }}
              disabled={!timer.isRunning && timer.status !== "paused"}
              className={`relative rounded-2xl border-2 px-4 py-3 text-white transition-all duration-300 backdrop-blur ${
                isPressingPause
                  ? "scale-95 shadow-[0_0_20px_rgba(59,130,246,0.6)]"
                  : "scale-100 shadow-[0_2px_12px_rgba(0,0,0,0.2)]"
              } ${
                !timer.isRunning && timer.status !== "paused"
                  ? "opacity-40 cursor-not-allowed border-slate-400/20 bg-slate-500/10"
                  : "border-blue-400/40 bg-blue-500/20 hover:border-blue-400/60 hover:bg-blue-500/30"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Pause className="h-5 w-5" strokeWidth={2} />
                <span className="text-xs font-semibold">
                  {timer.status === "paused"
                    ? "Mantén para Reanudar"
                    : "Mantén para Pausar"}
                </span>
                {isPressingPause && (
                  <div className="absolute inset-0 rounded-2xl border-2 border-white/50 animate-ping" />
                )}
              </div>
            </button>
          </div>
        </div>

        <MarkerLayer
          markers={markers}
          editing={editing}
          selectedId={selectedMarkerId}
          statuses={statusMap}
          projectPosition={projectPosition}
          onSelect={handleMarkerSelect}
          onDragStart={handleMarkerDragStart}
        />

        <HardwareDrawer
          open={Boolean(selectedMarker)}
          marker={selectedMarker}
          details={selectedDetails}
          actions={drawerActions}
          onClose={handleCloseDrawer}
        />

        {shouldRenderMenu && (
          <div className="pointer-events-none absolute inset-0">
            <div
              className={`pointer-events-auto absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity duration-500 ${
                menuVisible ? "opacity-100" : "opacity-0"
              }`}
              style={{
                transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
              }}
              onClick={() => setMenuOpen(false)}
            />
            <div
              className={`pointer-events-auto absolute right-6 top-20 w-80 rounded-3xl border border-slate-300/40 bg-white/80 backdrop-blur-3xl transition-all duration-500 ${
                menuVisible
                  ? "translate-y-0 scale-100 opacity-100 blur-0"
                  : "-translate-y-4 scale-95 opacity-0 blur-sm"
              }`}
              style={{
                boxShadow:
                  "0 25px 80px -20px rgba(0, 0, 0, 0.15), inset 0 1px 0 0 rgba(255, 255, 255, 0.5)",
                transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              <div className="p-5">
                <div className="mb-4 flex items-center justify-between border-b border-slate-300/60 pb-4">
                  <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-600">
                    Menú de control
                  </h3>
                  <button
                    type="button"
                    onClick={() => setMenuOpen(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-300/60 bg-slate-100/50 text-slate-600 transition-all duration-300 hover:border-slate-400/60 hover:bg-slate-200/60 hover:text-slate-800 hover:rotate-90"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      // TODO: Implementar con scape-sdk
                      console.log("Restart all arduinos - TODO con scape-sdk");
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl border-2 border-slate-300/60 bg-gradient-to-br from-slate-50 to-slate-100/50 px-4 py-3 text-left text-sm font-semibold text-slate-700 transition-all duration-300 hover:scale-[1.02] hover:border-slate-400/60"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/60">
                      <RotateCw className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div>Reiniciar todos los arduinos</div>
                      <div className="text-[10px] opacity-70">
                        Reinicia todos los dispositivos
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      // TODO: Implementar con scape-sdk
                      console.log("Trigger victory - TODO con scape-sdk");
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl border-2 border-emerald-400/40 bg-gradient-to-br from-emerald-50 to-emerald-100/50 px-4 py-3 text-left text-sm font-semibold text-emerald-700 transition-all duration-300 hover:scale-[1.02] hover:border-emerald-400/60 shadow-[0_2px_12px_-2px_rgba(16,185,129,0.2)]"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/60">
                      <Trophy className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div>Mostrar victoria</div>
                      <div className="text-[10px] opacity-70">
                        Dispara el evento de ganar
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      // TODO: Implementar con scape-sdk
                      console.log("Reset game - TODO con scape-sdk");
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl border-2 border-rose-400/40 bg-gradient-to-br from-rose-50 to-rose-100/50 px-4 py-3 text-left text-sm font-semibold text-rose-700 transition-all duration-300 hover:scale-[1.02] hover:border-rose-400/60 shadow-[0_2px_12px_-2px_rgba(244,63,94,0.2)]"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/60">
                      <RotateCw className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div>Reset completo</div>
                      <div className="text-[10px] opacity-70">
                        Reinicia toda la sesión
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {exportVisible && (
          <div className="pointer-events-none absolute right-6 top-28 w-96 max-w-full">
            <div className="pointer-events-auto rounded-3xl border border-white/15 bg-slate-950/90 p-4 backdrop-blur">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.3em] text-white/40">
                  Layout JSON
                </p>
                <button
                  type="button"
                  onClick={() => setExportVisible(false)}
                  className="rounded-full border border-white/20 px-2 py-1 text-xs text-white/70 transition hover:border-white/40 hover:text-white"
                >
                  Ocultar
                </button>
              </div>
              <textarea
                readOnly
                value={exportJson}
                className="mt-3 h-56 w-full resize-none rounded-2xl border border-white/10 bg-black/50 p-3 text-xs leading-relaxed text-white/80"
              />
            </div>
          </div>
        )}

        {gameCompleted && completionTime !== undefined && (
          <VictoryModal completionTime={completionTime} onReset={handleVictoryReset} />
        )}

        <MonitorModal open={monitorOpen} onClose={() => setMonitorOpen(false)} />
      </div>
    </div>
  );
}

export default DashboardV2;