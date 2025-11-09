import { useCallback, useMemo, useState, useEffect } from "react";
import { X, Wifi, Clock, Zap } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis
} from "recharts";
import { useAdminStore } from "../store.ts";
import type {
  AdminDeviceSnapshot,
  AdminEventSnapshot,
  AdminLatencySample
} from "@samay/scape-protocol";
import { formatRelativeTime } from "../utils/time.ts";

interface MonitorModalProps {
  open: boolean;
  onClose: () => void;
}

const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
};

const getStatusColor = (status?: string): string => {
  switch (status) {
    case "online":
      return "bg-emerald-400/20 text-emerald-700 border-emerald-400/40";
    case "offline":
      return "bg-slate-400/20 text-slate-600 border-slate-400/40";
    case "error":
      return "bg-rose-400/20 text-rose-700 border-rose-400/40";
    default:
      return "bg-amber-400/20 text-amber-700 border-amber-400/40";
  }
};

const getEventTypeColor = (type: string): string => {
  switch (type) {
    case "direct":
      return "bg-blue-400/20 text-blue-700 border-blue-400/40";
    case "hardware":
      return "bg-purple-400/20 text-purple-700 border-purple-400/40";
    case "monitor":
      return "bg-teal-400/20 text-teal-700 border-teal-400/40";
    case "device":
      return "bg-indigo-400/20 text-indigo-700 border-indigo-400/40";
    default:
      return "bg-slate-400/20 text-slate-600 border-slate-400/40";
  }
};

const DEVICE_COLORS: Record<string, string> = {
  "admin-ipad": "#3b82f6", // blue-500
  "main-screen": "#10b981", // emerald-500
  "tablet-feedback": "#f59e0b", // amber-500
  "totem": "#8b5cf6", // violet-500
  "buttons-game": "#ec4899", // pink-500
  "ai-app": "#06b6d4", // cyan-500
  "buttons-arduino": "#ef4444" // red-500
};

const getDeviceColor = (deviceId: string): string => {
  if (deviceId in DEVICE_COLORS) {
    return DEVICE_COLORS[deviceId];
  }
  let hash = 0;
  for (let i = 0; i < deviceId.length; i++) {
    hash = deviceId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = ((hash % 360) + 360) % 360;
  return `hsl(${hue}, 65%, 55%)`;
};

const gradientIdForDevice = (deviceId: string): string =>
  `latencyGradient-${deviceId.replace(/[^a-zA-Z0-9-]/g, "_")}`;

interface LatencyTooltipEntry {
  color?: string;
  dataKey?: string | number;
  value?: number | string;
}

interface LatencyTooltipProps {
  active?: boolean;
  payload?: LatencyTooltipEntry[];
  label?: string | number;
}

const formatTooltipLabel = (value: LatencyTooltipProps["label"]): string => {
  if (typeof value === "number") {
    return formatTimestamp(value);
  }
  return typeof value === "string" ? value : "";
};

const LatencyTooltip = ({ active, payload, label }: LatencyTooltipProps) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-slate-300/60 bg-white/95 px-3 py-2 shadow-lg backdrop-blur">
      <p className="text-xs font-semibold text-slate-600">{formatTooltipLabel(label)}</p>
      <div className="mt-2 space-y-1">
        {payload.map((entry) => {
          if (typeof entry.value !== "number") {
            return null;
          }
          const deviceName = String(entry.dataKey ?? "");
          return (
            <div
              key={`${deviceName}-${entry.value}`}
              className="flex items-center justify-between gap-4 text-xs text-slate-600"
            >
              <span className="flex items-center gap-2 font-medium">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: entry.color ?? "#0ea5e9" }}
                />
                {deviceName}
              </span>
              <span className="font-mono text-slate-700">{entry.value}ms</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const LatencyHistoryChart = ({
  latencySamples,
  deviceSnapshots
}: {
  latencySamples: AdminLatencySample[];
  deviceSnapshots: AdminDeviceSnapshot[];
}) => {
  const { chartData, deviceIds, maxLatency, totalSamples, xDomain } = useMemo(() => {
    const windowMs = 60000;
    const bucketCount = 60;
    const bucketSize = Math.max(1, Math.round(windowMs / bucketCount));
    const windowSize = bucketSize * bucketCount;

    const samples = latencySamples
      .filter((sample) => typeof sample.at === "number")
      .sort((a, b) => a.at - b.at);

    const now = Date.now();
    const latestSampleAt = samples.length > 0 ? samples[samples.length - 1].at : now;
    const windowEndCandidate = Math.max(now, latestSampleAt);
    const alignedWindowEnd = Math.ceil(windowEndCandidate / bucketSize) * bucketSize;
    const windowStart = alignedWindowEnd - windowSize;

    const allDeviceIds = new Set<string>();
    deviceSnapshots.forEach((snapshot) => {
      if (snapshot.device) {
        allDeviceIds.add(snapshot.device);
      }
    });
    samples.forEach((sample) => {
      allDeviceIds.add(sample.device);
    });
    const deviceIds = Array.from(allDeviceIds).sort();

    const rawBuckets: Array<Record<string, number | string | null>> = Array.from(
      { length: bucketCount },
      (_, index) => {
        const timestamp = windowStart + index * bucketSize;
        return {
          time: timestamp,
          label: new Date(timestamp).toLocaleTimeString("es-ES", {
            minute: "2-digit",
            second: "2-digit"
          })
        } as Record<string, number | string | null>;
      }
    );

    let computedMaxLatency = 0;
  const lastLatencyBeforeWindow = new Map<string, number>();

    samples.forEach((sample) => {
      let bucketIndex = Math.floor((sample.at - windowStart) / bucketSize);
      if (bucketIndex < 0) {
        const latency = typeof sample.latencyMs === "number" ? sample.latencyMs : null;
        if (latency !== null) {
          lastLatencyBeforeWindow.set(sample.device, latency);
        }
        return;
      }
      if (bucketIndex >= bucketCount) {
        bucketIndex = bucketCount - 1;
      }

      const latency = typeof sample.latencyMs === "number" ? sample.latencyMs : 0;
      computedMaxLatency = Math.max(computedMaxLatency, latency);
      rawBuckets[bucketIndex][sample.device] = latency;
    });

    const normalizedMaxLatency = Math.max(
      100,
      Math.ceil(Math.max(computedMaxLatency, 1) / 50) * 50
    );

    const rollingLatency = new Map<string, number>();
    const chartData = rawBuckets.map((bucket) => {
      const point: Record<string, number | string | null> = {
        time: bucket.time,
        label: bucket.label
      };
      deviceIds.forEach((device) => {
        const current = bucket[device];
        if (typeof current === "number") {
          rollingLatency.set(device, current);
        } else if (!rollingLatency.has(device) && lastLatencyBeforeWindow.has(device)) {
          rollingLatency.set(device, lastLatencyBeforeWindow.get(device)!);
        }
        const latest = rollingLatency.get(device);
        point[device] = typeof latest === "number" ? latest : null;
      });
      return point;
    });

    return {
      chartData,
      deviceIds,
      maxLatency: normalizedMaxLatency,
      totalSamples: samples.length,
      xDomain: [windowStart, alignedWindowEnd] as [number, number]
    };
  }, [deviceSnapshots, latencySamples]);

  const yAxisTicks = useMemo(() => {
    const ticks = new Set<number>();
    ticks.add(0);
    ticks.add(Math.round(maxLatency / 2));
    ticks.add(maxLatency);
    return Array.from(ticks).sort((a, b) => a - b);
  }, [maxLatency]);

  return (
    <div className="rounded-3xl border border-slate-300/40 bg-white/80 p-6 backdrop-blur-3xl">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-600">
          Latencia de Dispositivos (último minuto)
        </h3>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Zap className="h-4 w-4" />
          <span>{totalSamples} muestras</span>
        </div>
      </div>

      {deviceIds.length > 0 ? (
        <div className="mb-4 flex flex-wrap gap-3">
          {deviceIds.map((device) => (
            <div key={device} className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-sm"
                style={{ backgroundColor: getDeviceColor(device) }}
              />
              <span className="text-xs font-medium text-slate-600">{device}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mb-4 text-xs text-slate-400">Sin datos de latencia recientes</p>
      )}

      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 12, right: 16, bottom: 0, left: 0 }}>
            <defs>
              {deviceIds.map((device) => {
                const gradientId = gradientIdForDevice(device);
                const color = getDeviceColor(device);
                return (
                  <linearGradient key={device} id={gradientId} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.38} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.05} />
                  </linearGradient>
                );
              })}
            </defs>
            <CartesianGrid stroke="rgba(148, 163, 184, 0.25)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="time"
              type="number"
              domain={xDomain}
              tick={{ fill: "#64748b", fontSize: 11, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              minTickGap={24}
              tickFormatter={(value) => formatTimestamp(Number(value))}
            />
            <YAxis
              tick={{ fill: "#64748b", fontSize: 11, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              width={52}
              ticks={yAxisTicks}
              domain={[0, maxLatency]}
              tickFormatter={(value) => `${value}ms`}
            />
            <RechartsTooltip
              cursor={{ stroke: "rgba(148, 163, 184, 0.35)", strokeWidth: 1 }}
              content={<LatencyTooltip />}
            />
            {deviceIds.map((device) => {
              const color = getDeviceColor(device);
              const gradientId = gradientIdForDevice(device);
              return (
                <Area
                  key={device}
                  type="monotone"
                  dataKey={device}
                  stroke={color}
                  fill={`url(#${gradientId})`}
                  strokeWidth={2}
                  fillOpacity={1}
                  connectNulls
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  isAnimationActive={false}
                />
              );
            })}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const DevicesTable = ({ devices }: { devices: AdminDeviceSnapshot[] }) => {
  const sortedDevices = useMemo(() => {
    return [...devices].sort((a, b) => {
      if (a.device !== b.device) {
        return a.device.localeCompare(b.device);
      }
      return a.instanceId.localeCompare(b.instanceId);
    });
  }, [devices]);

  return (
    <div className="rounded-3xl border border-slate-300/40 bg-white/80 backdrop-blur-3xl overflow-hidden">
      <div className="p-6 border-b border-slate-300/40">
        <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-600">
          Dispositivos Conectados
        </h3>
      </div>

      <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: "touch" }}>
        <table className="w-full">
          <thead className="border-b border-slate-300/40 bg-slate-50/50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                Estado
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                Device ID
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                Transporte
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                Latencia
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                IP
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                Última Actividad
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300/20">
            {sortedDevices.map((device) => (
              <tr
                key={`${device.device}::${device.instanceId}`}
                className="transition-colors hover:bg-slate-50/50"
              >
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${getStatusColor(device.connectionStatus)}`}
                  >
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${
                        device.connectionStatus === "online"
                          ? "bg-emerald-500"
                          : device.connectionStatus === "error"
                            ? "bg-rose-500"
                            : "bg-slate-400"
                      }`}
                    />
                    {device.connectionStatus ?? "unknown"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-700">{device.device}</span>
                    {typeof device.metadata?.label === "string" && (
                      <span className="text-xs text-slate-500">{device.metadata.label}</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-300/40 bg-slate-100/50 px-2.5 py-1 text-xs font-medium text-slate-600">
                    <Wifi className="h-3 w-3" />
                    {device.transport}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {typeof device.latencyMs === "number" ? (
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700">
                      <Zap className="h-3.5 w-3.5 text-amber-500" />
                      {device.latencyMs}ms
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {device.ip ? (
                    <span className="font-mono text-xs text-slate-600">{device.ip}</span>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    {formatRelativeTime(device.lastSeenAt ?? device.connectedAt)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sortedDevices.length === 0 && (
        <div className="px-6 py-12 text-center">
          <p className="text-sm text-slate-500">No hay dispositivos conectados</p>
        </div>
      )}
    </div>
  );
};

const EventsLog = ({ events }: { events: AdminEventSnapshot[] }) => {
  const sortedEvents = useMemo(() => {
    // Filtrar eventos de latencia del registro
    const filteredEvents = events.filter((event) => event.channel !== "latency");
    return filteredEvents.sort((a, b) => b.at - a.at).slice(0, 50);
  }, [events]);

  return (
    <div className="rounded-3xl border border-slate-300/40 bg-white/80 backdrop-blur-3xl overflow-hidden">
      <div className="p-6 border-b border-slate-300/40">
        <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-600">
          Registro de Eventos (últimos 50)
        </h3>
      </div>

      <div className="max-h-96 overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
        <table className="w-full">
          <thead className="sticky top-0 border-b border-slate-300/40 bg-slate-50/90 backdrop-blur">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                Hora
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                Tipo
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                Source
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                Target
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                Canal
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                Descripción
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300/20">
            {sortedEvents.map((event) => (
              <tr key={event.id} className="transition-colors hover:bg-slate-50/50">
                <td className="px-6 py-3">
                  <span className="text-xs font-mono text-slate-600">
                    {formatTimestamp(event.at)}
                  </span>
                </td>
                <td className="px-6 py-3">
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getEventTypeColor(event.type)}`}
                  >
                    {event.type}
                  </span>
                </td>
                <td className="px-6 py-3">
                  <span className="text-xs text-slate-700">{event.source ?? "—"}</span>
                </td>
                <td className="px-6 py-3">
                  <span className="text-xs text-slate-700">{event.target ?? "—"}</span>
                </td>
                <td className="px-6 py-3">
                  <span className="text-xs font-medium text-slate-600">{event.channel ?? "—"}</span>
                </td>
                <td className="px-6 py-3">
                  <span className="text-xs text-slate-500">{event.description ?? "—"}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sortedEvents.length === 0 && (
        <div className="px-6 py-12 text-center">
          <p className="text-sm text-slate-500">No hay eventos registrados</p>
        </div>
      )}
    </div>
  );
};

export function MonitorModal({ open, onClose }: MonitorModalProps) {
  const { deviceSnapshots, events, latencyHistory } = useAdminStore((state) => ({
    deviceSnapshots: state.devices,
    events: state.events,
    latencyHistory: state.latencyHistory
  }));

  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  const handleBackdropClick = useCallback(() => {
    onClose();
  }, [onClose]);

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
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [open]);

  if (!shouldRender) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50"
      style={{
        touchAction: "none",
      }}
    >
      {/* Backdrop con blur */}
      <div 
        className={`fixed inset-0 bg-slate-900/30 backdrop-blur-md transition-opacity duration-400 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
        style={{
          transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        onClick={handleBackdropClick}
      />

      {/* Content - Full Screen Scrollable */}
      <div 
        className={`fixed inset-0 overflow-y-auto px-6 pb-6 pt-24 transition-all duration-500 ${
          isVisible 
            ? "translate-y-0 opacity-100 scale-100" 
            : "translate-y-8 opacity-0 scale-95"
        }`}
        style={{ 
          WebkitOverflowScrolling: "touch",
          touchAction: "pan-y",
          overscrollBehavior: "contain",
          pointerEvents: "auto",
          transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        onClick={(e) => {
          // Solo cerrar si el click es directamente en el contenedor, no en los cards
          if (e.target === e.currentTarget) {
            handleBackdropClick();
          }
        }}
      >
        {/* Close Button - Inside Scrollable Container */}
        <div className={`absolute left-1/2 top-6 z-30 -translate-x-1/2 transition-all duration-500 delay-100 ${
          isVisible 
            ? "translate-y-0 opacity-100 scale-100" 
            : "-translate-y-4 opacity-0 scale-90"
        }`}
        style={{
          transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
        >
          <button
            type="button"
            onClick={onClose}
            className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/30 bg-white/10 text-white shadow-2xl backdrop-blur-xl transition-all duration-300 hover:rotate-90 hover:scale-110 hover:border-white/50 hover:bg-white/20"
          >
            <X className="h-6 w-6" strokeWidth={2.5} />
          </button>
        </div>

        <div className="mx-auto max-w-7xl space-y-6">
          {/* Latency Chart */}
          <LatencyHistoryChart latencySamples={latencyHistory} deviceSnapshots={deviceSnapshots} />

          {/* Devices Table */}
          <DevicesTable devices={deviceSnapshots} />

          {/* Events Log */}
          <EventsLog events={events} />
        </div>
      </div>
    </div>
  );
}
