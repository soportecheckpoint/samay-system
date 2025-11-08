import type { PointerEvent } from 'react';
import {
  Wifi,
  WifiOff,
  Activity,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import type { MarkerStatus, StageMarker } from './types.ts';

const STATUS_CONFIG: Record<
  MarkerStatus['connection'],
  { bg: string; border: string; text: string; icon: typeof Wifi }
> = {
  online: {
    bg: 'bg-emerald-500/20',
    border: 'border-emerald-400/60',
    text: 'text-emerald-100',
    icon: Wifi,
  },
  standby: {
    bg: 'bg-cyan-500/20',
    border: 'border-cyan-400/60',
    text: 'text-cyan-100',
    icon: Activity,
  },
  offline: {
    bg: 'bg-slate-500/20',
    border: 'border-slate-400/60',
    text: 'text-slate-200',
    icon: WifiOff,
  },
  error: {
    bg: 'bg-rose-500/20',
    border: 'border-rose-400/60',
    text: 'text-rose-100',
    icon: AlertCircle,
  },
  unknown: {
    bg: 'bg-white/10',
    border: 'border-white/40',
    text: 'text-white',
    icon: HelpCircle,
  },
};

interface MarkerProps {
  marker: StageMarker;
  status: MarkerStatus;
  position: { x: number; y: number } | null;
  editing: boolean;
  isSelected: boolean;
  onSelect: (marker: StageMarker) => void;
  onDragStart: (marker: StageMarker, event: PointerEvent<HTMLButtonElement>) => void;
}

export function Marker({
  marker,
  status,
  position,
  editing,
  isSelected,
  onSelect,
  onDragStart,
}: MarkerProps) {
  if (!position) {
    return null;
  }

  const config = STATUS_CONFIG[status.connection] ?? STATUS_CONFIG.unknown;
  const StatusIcon = config.icon;

  const dynamicClasses = [
    'group absolute flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 transition-all duration-300 ease-out',
    'backdrop-blur-md will-change-transform pointer-events-auto shadow-lg',
    config.bg,
    config.border,
    config.text,
    isSelected ? 'ring-4 ring-white/50 scale-110' : 'scale-100',
    editing ? 'cursor-grab active:cursor-grabbing' : 'hover:scale-125',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      onClick={() => {
        if (!editing) {
          onSelect(marker);
        }
      }}
      onPointerDown={(event) => {
        if (editing) {
          event.stopPropagation();
          onDragStart(marker, event);
        }
      }}
      style={{
        left: position.x,
        top: position.y,
        touchAction: editing ? 'none' : 'auto',
      }}
      className={dynamicClasses}
      title={`${marker.label} - ${status.label}`}
    >
      <StatusIcon className="h-6 w-6" strokeWidth={2.5} />
    </button>
  );
}
