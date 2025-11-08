import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import View from "../view-manager/View";
import useViewStore from "../view-manager/view-manager-store";
import { useTotemStore } from "../store";

type GroupId = "traditional" | "push" | "mail";
type MovableCardId = "traditional-card" | "push-card" | "mail-card";

type Group = {
  id: GroupId;
  title: string;
  targetCard: MovableCardId;
  staticImages: string[];
};

type MovableCard = {
  id: MovableCardId;
  image: string;
};

const GROUPS: Group[] = [
  {
    id: "traditional",
    title: "Mensajería Tradicional",
    targetCard: "traditional-card",
    staticImages: ["/match/mt-1.png", "/match/mt-2.png"],
  },
  {
    id: "push",
    title: "Notificación Push",
    targetCard: "push-card",
    staticImages: ["/match/np-1.png", "/match/np-2.png"],
  },
  {
    id: "mail",
    title: "Bandeja de Correo",
    targetCard: "mail-card",
    staticImages: ["/match/bc-1.png", "/match/bc-2.png"],
  },
];

const MOVABLE_CARDS: Record<MovableCardId, MovableCard> = {
  "traditional-card": { id: "traditional-card", image: "/match/mt-3.png" },
  "push-card": { id: "push-card", image: "/match/np-3.png" },
  "mail-card": { id: "mail-card", image: "/match/bc-3.png" },
};

const INITIAL_ASSIGNMENTS: Record<GroupId, MovableCardId> = {
  traditional: "push-card",
  push: "mail-card",
  mail: "traditional-card",
};

const TARGET_ASSIGNMENTS: Record<GroupId, MovableCardId> = {
  traditional: "traditional-card",
  push: "push-card",
  mail: "mail-card",
};

const SLOT_BASE_CLASSES =
  "flex h-full items-center justify-center rounded-3xl overflow-hidden select-none";

type DraggableCardProps = {
  card: MovableCard;
  groupId: GroupId;
  solved: boolean;
};

function DraggableCard({
  card,
  groupId,
  solved,
}: DraggableCardProps) {
  // Usar un ID único que combine la tarjeta y el grupo
  const draggableId = `${groupId}-${card.id}`;
  
  const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({
    id: draggableId,
    disabled: solved,
    data: { groupId, cardId: card.id },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.3 : 1,
        zIndex: isDragging ? 20 : "auto",
      }
    : {
        opacity: 1,
        zIndex: "auto",
      };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`absolute inset-0 flex h-full w-full items-center justify-center rounded-3xl overflow-hidden ${
        solved ? "cursor-default" : "cursor-grab active:cursor-grabbing"
      }`}
      style={{
        touchAction: "none",
        ...style,
      }}
    >
      <img
        src={card.image}
        alt=""
        className="h-full w-full object-contain pointer-events-none"
        draggable={false}
      />
    </div>
  );
}

type DroppableSlotProps = {
  groupId: GroupId;
  card: MovableCard;
  solved: boolean;
};

function DroppableSlot({
  groupId,
  card,
  solved,
}: DroppableSlotProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: groupId,
    data: { groupId },
  });

  return (
    <div
      ref={setNodeRef}
      className={`${SLOT_BASE_CLASSES} relative overflow-visible ${
        isOver ? "ring-4 ring-blue-400" : ""
      }`}
    >
      <DraggableCard
        card={card}
        groupId={groupId}
        solved={solved}
      />
    </div>
  );
}

export function DragDropPhase() {
  const [assignments, setAssignments] =
    useState<Record<GroupId, MovableCardId>>(INITIAL_ASSIGNMENTS);
  const [activeCard, setActiveCard] = useState<MovableCardId | null>(null);
  const [dragOriginGroup, setDragOriginGroup] = useState<GroupId | null>(null);
  const solvedRef = useRef(false);
  const setView = useViewStore((state) => state.setView);
  const { markMatchCompleted, matchCompleted } = useTotemStore((state) => ({
    markMatchCompleted: state.markMatchCompleted,
    matchCompleted: state.matchCompleted,
  }));

  // Resetear el juego cuando matchCompleted vuelva a false
  useEffect(() => {
    if (!matchCompleted) {
      setAssignments(INITIAL_ASSIGNMENTS);
      setActiveCard(null);
      setDragOriginGroup(null);
      solvedRef.current = false;
    }
  }, [matchCompleted]);

  // Configurar sensores para pantallas táctiles y mouse
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Requiere arrastrar 5px antes de activar
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 100, // Delay de 100ms para distinguir tap de drag
        tolerance: 8, // Tolerancia de movimiento durante el delay
      },
    }),
  );

  const solved = useMemo(
    () =>
      GROUPS.every(
        (group) => assignments[group.id] === TARGET_ASSIGNMENTS[group.id],
      ),
    [assignments],
  );

  useEffect(() => {
    if (!solved || solvedRef.current) return;
    solvedRef.current = true;

    markMatchCompleted();

    const timeout = setTimeout(() => setView("message-code"), 1200);
    return () => clearTimeout(timeout);
  }, [assignments, markMatchCompleted, setView, solved]);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const data = event.active.data.current;
      if (data && data.cardId && data.groupId) {
        setActiveCard(data.cardId);
        setDragOriginGroup(data.groupId);
      }
    },
    [],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { over } = event;
      setActiveCard(null);

      if (!over || !dragOriginGroup) {
        setDragOriginGroup(null);
        return;
      }

      const targetGroupId = over.id as GroupId;
      const originGroupId = dragOriginGroup;

      if (targetGroupId === originGroupId) {
        setDragOriginGroup(null);
        return;
      }

      // Intercambiar las tarjetas entre los grupos
      setAssignments((prev) => {
        const next = { ...prev };
        const originCard = next[originGroupId];
        next[originGroupId] = next[targetGroupId];
        next[targetGroupId] = originCard;
        return next;
      });

      setDragOriginGroup(null);
    },
    [dragOriginGroup],
  );

  const activeMovableCard = activeCard ? MOVABLE_CARDS[activeCard] : null;

  return (
    <View viewId="match">
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div
          className="h-full w-full bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url(/match1.png)" }}
        >
          <div className="flex h-full w-full px-10">
            <div className="w-full space-y-8 mt-24">
              {GROUPS.map((group) => {
                const movableCard = MOVABLE_CARDS[assignments[group.id]];
                return (
                  <div key={group.id} className="space-y-6">
                    <h2 className="text-6xl font-bold italic text-white">
                      {group.title}
                    </h2>
                    <div className="grid grid-cols-3 gap-4 h-80">
                      <div className={SLOT_BASE_CLASSES}>
                        <img
                          src={group.staticImages[0]}
                          alt=""
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <div className={SLOT_BASE_CLASSES}>
                        <img
                          src={group.staticImages[1]}
                          alt=""
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <DroppableSlot
                        groupId={group.id}
                        card={movableCard}
                        solved={solved}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* DragOverlay para mostrar la tarjeta mientras se arrastra */}
        <DragOverlay>
          {activeMovableCard ? (
            <div className="flex h-80 w-full items-center justify-center rounded-3xl overflow-hidden opacity-90 cursor-grabbing">
              <img
                src={activeMovableCard.image}
                alt=""
                className="h-full w-full object-contain"
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </View>
  );
}
