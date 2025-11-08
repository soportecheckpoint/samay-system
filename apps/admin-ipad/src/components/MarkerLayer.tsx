import type { PointerEvent } from 'react';
import { Marker } from './Marker.tsx';
import type { MarkerStatus, StageMarker } from './types.ts';

interface MarkerLayerProps {
  markers: StageMarker[];
  editing: boolean;
  selectedId: string | null;
  statuses: Record<string, MarkerStatus>;
  projectPosition: (marker: StageMarker) => { x: number; y: number } | null;
  onSelect: (marker: StageMarker) => void;
  onDragStart: (marker: StageMarker, event: PointerEvent<HTMLButtonElement>) => void;
}

export function MarkerLayer({
  markers,
  editing,
  selectedId,
  statuses,
  projectPosition,
  onSelect,
  onDragStart,
}: MarkerLayerProps) {
  return (
    <div className="pointer-events-none absolute inset-0">
      {markers.map((marker) => (
        <Marker
          key={marker.id}
          marker={marker}
          status={statuses[marker.id] ?? { connection: 'unknown', label: 'Sin datos' }}
          position={projectPosition(marker)}
          editing={editing}
          isSelected={selectedId === marker.id}
          onSelect={onSelect}
          onDragStart={onDragStart}
        />
      ))}
    </div>
  );
}
