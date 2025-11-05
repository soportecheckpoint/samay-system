import type { StageMarker } from "./types.ts";

export const DEFAULT_MARKERS: StageMarker[] = [
  {
    id: "pelotas",
    label: "Pelotas",
    description: "Arduino que mueve la cabeza al detectar pelotas.",
    type: "arduino",
    deviceId: "pelotas",
    position: {
      x: 0.6209,
      y: 0.7247,
    },
    icon: "🤖",
  },
  {
    id: "connections-board",
    label: "Tablero de Conexiones",
    description: "Mesa flotante para completar circuitos con cables.",
    type: "arduino",
    deviceId: "connections",
    position: {
      x: 0.5159,
      y: 0.8054,
    },
    icon: "🧩",
  },
  {
    id: "ai-app",
    label: "Laptop e Impresora",
    description: "Puesto de control y generación de pistas impresas.",
    type: "module",
    moduleId: "printer",
    position: {
      x: 0.3154,
      y: 0.3624,
    },
    icon: "💻",
  },
  {
    id: "buttons-arduino",
    label: "Arduino de Botones",
    description: "Controla el panel físico de botones rojos.",
    type: "arduino",
    deviceId: "buttons-arduino",
    position: {
      x: 0.518,
      y: 0.383,
    },
    icon: "🔴",
  },
  {
    id: "buttons",
    label: "Buttons Game",
    description: "Televisor con el juego y feedback del módulo.",
    type: "module",
    moduleId: "buttons",
    position: {
      x: 0.4175,
      y: 0.2552,
    },
    icon: "🕹️",
  },
  {
    id: "rfid-board",
    label: "Tablero RFID",
    description: "Lector RFID para insignias y llaves.",
    type: "arduino",
    deviceId: "rfid",
    position: {
      x: 0.5217,
      y: 0.133,
    },
    icon: "📡",
  },
  {
    id: "totem",
    label: "Totem Táctil",
    description: "Pantalla interactiva para contratos y mensajes.",
    type: "module",
    moduleId: "totem",
    position: {
      x: 0.7072,
      y: 0.2285,
    },
    icon: "📱",
  },
  {
    id: "main-screen",
    label: "Pantalla Principal",
    description: "Display general con avances y pistas.",
    type: "module",
    moduleId: "main-screen",
    position: {
      x: 0.7788,
      y: 0.2686,
    },
    icon: "📺",
  },
];
