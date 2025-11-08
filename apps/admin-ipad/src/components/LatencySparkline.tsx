import { useMemo } from "react";
import { Zap } from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { useAdminStore } from "../store";
import type { CommunicationType } from "./status";

interface LatencySparklineProps {
  deviceId?: string;
  instanceId?: string;
  communicationType?: CommunicationType;
}

interface ChartPoint {
  time: number;
  label: string;
  latency: number | null;
}

const WINDOW_MS = 120_000; // 2 minutos
const BUCKET_COUNT = 24;

const DEVICE_COLORS: Record<string, string> = {
  "admin-ipad": "#3b82f6",
  "main-screen": "#10b981",
  "tablet-feedback": "#f59e0b",
  totem: "#8b5cf6",
  "buttons-game": "#ef4444",
  "ai-app": "#06b6d4",
  "buttons-arduino": "#ec4899",
};

const getDeviceColor = (deviceId?: string): string => {
  if (!deviceId) {
    return "#0ea5e9";
  }
  if (deviceId in DEVICE_COLORS) {
    return DEVICE_COLORS[deviceId];
  }
  let hash = 0;
  for (let index = 0; index < deviceId.length; index += 1) {
    hash = deviceId.charCodeAt(index) + ((hash << 5) - hash);
  }
  const hue = ((hash % 360) + 360) % 360;
  return `hsl(${hue}, 65%, 55%)`;
};

const sanitizeId = (value?: string): string => {
  if (!value) {
    return "unknown";
  }
  return value.replace(/[^a-zA-Z0-9-_]/g, "_");
};

export function LatencySparkline({
  deviceId,
  instanceId,
  communicationType,
}: LatencySparklineProps) {
  const heartbeats = useAdminStore((state) => state.heartbeats);

  const {
    chartData,
    latestLatency,
    sampleCount,
    yDomainMax,
  } = useMemo(() => {
    if (!deviceId) {
      return {
        chartData: [] as ChartPoint[],
        latestLatency: undefined as number | undefined,
        sampleCount: 0,
        yDomainMax: 100,
      };
    }

    const now = Date.now();
    const windowStart = now - WINDOW_MS;
    const bucketSize = WINDOW_MS / BUCKET_COUNT;

    const samples = heartbeats
      .filter((heartbeat) => {
        if (heartbeat.device !== deviceId) {
          return false;
        }
        if (instanceId && heartbeat.instanceId !== instanceId) {
          return false;
        }
        return heartbeat.at >= windowStart;
      })
      .sort((a, b) => a.at - b.at);

    const rawBuckets: ChartPoint[] = Array.from({ length: BUCKET_COUNT }, (_, index) => {
      const time = windowStart + index * bucketSize;
      return {
        time,
        label: new Date(time).toLocaleTimeString("es-ES", {
          minute: "2-digit",
          second: "2-digit",
        }),
        latency: null,
      };
    });

    const latencyValues: number[] = [];

    samples.forEach((heartbeat) => {
      let bucketIndex = Math.floor((heartbeat.at - windowStart) / bucketSize);
      if (bucketIndex < 0) {
        return;
      }
      if (bucketIndex >= BUCKET_COUNT) {
        bucketIndex = BUCKET_COUNT - 1;
      }
      const latency = typeof heartbeat.latencyMs === "number" ? heartbeat.latencyMs : null;
      if (latency === null) {
        return;
      }
      rawBuckets[bucketIndex] = {
        ...rawBuckets[bucketIndex],
        latency,
      };
      latencyValues.push(latency);
    });

    let rollingLatency: number | null = null;
    const chartData = rawBuckets.map((bucket) => {
      if (typeof bucket.latency === "number") {
        rollingLatency = bucket.latency;
      }
      return {
        ...bucket,
        latency: rollingLatency,
      };
    });

    const sampleCount = latencyValues.length;
    const latestLatency = sampleCount > 0 ? latencyValues[sampleCount - 1] : undefined;
    const maxLatency = sampleCount > 0 ? Math.max(...latencyValues) : 0;
    const yDomainMax = Math.max(50, Math.ceil(Math.max(maxLatency, latestLatency ?? 0) / 20) * 20);

    return {
      chartData,
      latestLatency,
      sampleCount,
      yDomainMax,
    };
  }, [deviceId, heartbeats, instanceId]);

  const color = getDeviceColor(deviceId);
  const gradientId = `drawerLatency-${sanitizeId(deviceId)}-${sanitizeId(instanceId)}`;

  return (
    <section className="rounded-xl border border-slate-200/60 bg-gradient-to-br from-white/60 to-slate-50/40 p-3">
      <header className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Zap className="h-3 w-3 text-amber-500" />
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600">
            Latencia
          </p>
          {communicationType && (
            <span className="ml-1 rounded-full border border-slate-300/40 bg-white/50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-500">
              {communicationType}
            </span>
          )}
        </div>
        <div className="text-right">
          <p className="text-base font-bold text-slate-800 tabular-nums">
            {typeof latestLatency === "number" ? `${latestLatency}ms` : "—"}
          </p>
        </div>
      </header>

      <div className="h-16">
        {deviceId ? (
          sampleCount > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.32} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" hide />
                <YAxis domain={[0, yDomainMax]} hide />
                <Area
                  type="monotone"
                  dataKey="latency"
                  stroke={color}
                  fill={`url(#${gradientId})`}
                  strokeWidth={1.5}
                  fillOpacity={1}
                  connectNulls
                  isAnimationActive={false}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-[10px] text-slate-400">
              Sin datos
            </div>
          )
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] text-slate-400">
            Sin dispositivo
          </div>
        )}
      </div>
    </section>
  );
}
