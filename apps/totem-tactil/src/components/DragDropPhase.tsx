import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import View from '../view-manager/View';
import useViewStore from '../view-manager/view-manager-store';
import { emitMessagesOrdered } from '../socket';
import { useTotemStore } from '../store';

type GroupId = 'traditional' | 'push' | 'mail';
type MovableCardId = 'traditional-card' | 'push-card' | 'mail-card';

type Group = {
  id: GroupId;
  title: string;
  targetCard: MovableCardId;
};

type MovableCard = {
  id: MovableCardId;
  label: string;
};

const CARD_TEXT = 'falta\ngraficar\nviñetas';

const GROUPS: Group[] = [
  { id: 'traditional', title: 'Mensajería Tradicional', targetCard: 'traditional-card' },
  { id: 'push', title: 'Notificación Push', targetCard: 'push-card' },
  { id: 'mail', title: 'Bandeja de Correo', targetCard: 'mail-card' },
];

const MOVABLE_CARDS: Record<MovableCardId, MovableCard> = {
  'traditional-card': { id: 'traditional-card', label: CARD_TEXT },
  'push-card': { id: 'push-card', label: CARD_TEXT },
  'mail-card': { id: 'mail-card', label: CARD_TEXT },
};

const INITIAL_ASSIGNMENTS: Record<GroupId, MovableCardId> = {
  traditional: 'push-card',
  push: 'mail-card',
  mail: 'traditional-card',
};

const TARGET_ASSIGNMENTS: Record<GroupId, MovableCardId> = {
  traditional: 'traditional-card',
  push: 'push-card',
  mail: 'mail-card',
};

const SLOT_BASE_CLASSES = 'flex h-28 items-center justify-center rounded-3xl border border-white/35 bg-white/10 px-4 text-sm font-medium text-white text-center leading-tight whitespace-pre-line select-none';

export function DragDropPhase() {
  const [assignments, setAssignments] = useState<Record<GroupId, MovableCardId>>(INITIAL_ASSIGNMENTS);
  const [draggingCard, setDraggingCard] = useState<MovableCardId | null>(null);
  const [dragOriginGroup, setDragOriginGroup] = useState<GroupId | null>(null);
  const solvedRef = useRef(false);
  const setView = useViewStore((state) => state.setView);
  const { markMatchCompleted } = useTotemStore((state) => ({ markMatchCompleted: state.markMatchCompleted }));

  const solved = useMemo(
    () => GROUPS.every((group) => assignments[group.id] === TARGET_ASSIGNMENTS[group.id]),
    [assignments]
  );

  useEffect(() => {
    if (!solved || solvedRef.current) return;
    solvedRef.current = true;

    emitMessagesOrdered(GROUPS.map((group) => assignments[group.id]));
    markMatchCompleted();

    const timeout = setTimeout(() => setView('message-code'), 1200);
    return () => clearTimeout(timeout);
  }, [assignments, markMatchCompleted, setView, solved]);

  const handleDragStart = useCallback(
    (cardId: MovableCardId, origin: GroupId) => {
      setDraggingCard(cardId);
      setDragOriginGroup(origin);
    },
    []
  );

  const handleDragEnd = useCallback(
    (point: { x: number; y: number }) => {
      const origin = dragOriginGroup;
      setDraggingCard(null);
      setDragOriginGroup(null);

      if (!origin) return;

      const element = document.elementFromPoint(point.x, point.y);
      const targetGroup = element?.closest('[data-group-slot]')?.getAttribute('data-group-slot') as GroupId | null;
      if (!targetGroup || targetGroup === origin) {
        return; // return to original place
      }

      setAssignments((prev) => {
        const next = { ...prev };
        const originCard = next[origin];
        next[origin] = next[targetGroup];
        next[targetGroup] = originCard;
        return next;
      });
    },
    [dragOriginGroup]
  );

  return (
    <View viewId="match">
      <div
        className="h-full w-full bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/match1.png)' }}
      >
        <div className="flex h-full w-full items-center justify-center px-8 py-12">
          <div className="w-full max-w-4xl space-y-10">
            {GROUPS.map((group) => {
              const movableCard = MOVABLE_CARDS[assignments[group.id]];
              const isDragging = draggingCard === movableCard.id;
              return (
                <div key={group.id} className="space-y-5">
                  <h2
                    className="text-center text-xl font-semibold text-white"
                    style={{ fontFamily: 'Georgia, serif' }}
                  >
                    {group.title}
                  </h2>
                  <div className="grid grid-cols-3 gap-6">
                    <div className={SLOT_BASE_CLASSES}>{CARD_TEXT}</div>
                    <div className={SLOT_BASE_CLASSES}>{CARD_TEXT}</div>
                    <div
                      data-group-slot={group.id}
                      className={`${SLOT_BASE_CLASSES} relative overflow-visible`}
                    >
                      <motion.div
                        key={movableCard.id}
                        layout
                        layoutId={movableCard.id}
                        drag={!solved}
                        dragMomentum={false}
                        dragElastic={0}
                        dragSnapToOrigin
                        data-group-slot={group.id}
                        whileTap={!solved ? { scale: 0.98 } : undefined}
                        onDragStart={() => {
                          if (solved) return;
                          handleDragStart(movableCard.id, group.id);
                        }}
                        onDragEnd={(_, info) => {
                          if (solved) return;
                          handleDragEnd(info.point);
                        }}
                        className={`absolute inset-0 flex h-full w-full items-center justify-center rounded-3xl border border-white/35 bg-white/10 px-4 text-sm font-medium text-white text-center leading-tight whitespace-pre-line ${
                          solved ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
                        }`}
                        style={{
                          touchAction: 'none',
                          zIndex: isDragging ? 20 : 'auto',
                        }}
                      >
                        {movableCard.label}
                      </motion.div>
                    </div>
                  </div>
                </div>
              );
            })}
            <p className="text-center text-sm font-medium text-white/80">
              Arrastra el tercer bloque para acomodarlo en el grupo correcto.
            </p>
          </div>
        </div>
      </div>
    </View>
  );
}
