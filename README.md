# Escape Room Software - Monorepo

Sistema modular de Escape Room con arquitectura de **máxima independencia** donde cada módulo funciona autónomamente.

## Estructura del Proyecto

```
scape-room-software/
├── apps/
│   ├── server/              # Servidor central (Express + Socket.io)
│   ├── main-screen/         # Pantalla principal (React)
│   ├── tablet-feedback/     # Tablet para feedback y QR (React PWA)
│   ├── buttons-game/        # Juego de botones (React)
│   ├── totem-tactil/        # Totem táctil con drag&drop y NFC (React)
│   ├── admin-ipad/          # iPad de administración (React)
│   └── usb-totem/           # Totem USB con audio (Electron - Por crear)
├── packages/
│   ├── ui/                  # Componentes compartidos
│   ├── typescript-config/   # Configuraciones de TypeScript
│   └── eslint-config/       # Configuraciones de ESLint
├── base-apps.md             # Arquitectura detallada del sistema
└── README.md
```

## Instalación Rápida

```sh
# Instalar dependencias
pnpm install

# Ejecutar todo en desarrollo
pnpm dev

# Ejecutar apps específicas
pnpm --filter @scape-room/server dev
pnpm --filter @scape-room/main-screen dev
```

## Aplicaciones

### 1. **Server** - Servidor Central (`apps/server`)
- Puerto: **3001**
- Express + Socket.io + REST API para Arduinos
- Orquesta la comunicación entre todos los módulos
- Mantiene estado global y logs

### 2. **Main Screen** - Pantalla Principal (`apps/main-screen`)
- Puerto: **5173**
- Muestra cronómetro, mensaje anterior y proyección de tablet
- Pantalla de victoria cuando completan el escape room

### 3. **Tablet Feedback** (`apps/tablet-feedback`)
- PWA con QR scanner, feedback, captura de foto y códigos

### 4. **Buttons Game** (`apps/buttons-game`)
- Visualización en tiempo real del juego de 10 botones

### 5. **Totem Táctil** (`apps/totem-tactil`)
- Drag & Drop, insignias NFC y contrato de no divulgación

### 6. **Admin iPad** (`apps/admin-ipad`)
- Dashboard administrativo con control de todos los módulos

Ver `base-apps.md` para arquitectura detallada.

## Stack Técnico

- **Monorepo:** Turborepo + pnpm workspaces
- **Server:** Node.js, Express, Socket.io, Axios, Winston
- **Frontend:** React 18+, Vite, TypeScript
- **Styles:** TailwindCSS
- **State:** Zustand
- **Real-time:** WebSocket (Socket.io)
- **Type Checking:** TypeScript 5+

## Comandos

### Build
```bash
# Build todas las aplicaciones
pnpm build

# Build aplicación específica
pnpm --filter @scape-room/server build
pnpm --filter @scape-room/main-screen build
```

### Desarrollo
```bash
# Ejecutar todo en desarrollo
pnpm dev

# Ejecutar aplicaciones específicas
pnpm --filter @scape-room/server dev
pnpm --filter @scape-room/main-screen dev
pnpm --filter @scape-room/tablet-feedback dev
pnpm --filter @scape-room/buttons-game dev
pnpm --filter @scape-room/totem-tactil dev
pnpm --filter @scape-room/admin-ipad dev
```

### Lint y Type Check
```bash
pnpm lint
pnpm check-types
```

## Configuración

Cada aplicación requiere su archivo `.env`:

### Server
```env
PORT=3001
NODE_ENV=development
ARDUINO_TIMEOUT=30000
```

### Apps React
```env
VITE_SERVER_URL=http://192.168.18.165:3001
```

Copia los archivos `.env.example` a `.env` en cada aplicación.

## Comunicación

### WebSocket Events
- `register` - Cliente se registra
- `timer:update` - Actualización de cronómetro
- `timer:stop` - Detener cronómetro
- `tablet:mirror` - Proyección de tablet
- `completion` - Módulo completado
- `game:victory` - Victoria del juego

### Arduino REST API
- `POST /connect` - Arduino se registra
- `POST /dispatch` - Arduino envía evento
- `POST /heartbeat` - Heartbeat de Arduino

Ver `base-apps.md` para detalles completos de la arquitectura.

## Próximos Pasos

- [ ] Implementar app USB Totem con Electron
- [ ] Configurar PWA para tablet-feedback
- [ ] Implementar Google Drive API para fotos
- [ ] Agregar impresión de certificados
- [ ] Testing end-to-end

## Arquitectura

El sistema sigue el principio de **máxima independencia**:
- Cada módulo funciona autónomamente
- Comunicación mínima entre módulos
- Local-first: funciona offline
- El servidor solo orquesta, no controla lógica

Ver `base-apps.md` para arquitectura completa.

## Licencia

Privado - Escape Room Software
