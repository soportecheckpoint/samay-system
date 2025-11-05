# Arquitectura de Software — Escape Room Modular

## Principios de Diseño

1. **Máxima Independencia**: Cada aplicación/módulo funciona de forma autónoma sin depender de otros
2. **Comunicación Mínima**: Solo se comunican cuando es absolutamente necesario (transiciones entre juegos, sincronización de estado)
3. **Local-First**: Todo funciona offline, sin dependencia de internet (excepto subida de fotos a Drive, con fallback a carpeta local)
4. **Servidor Central Ligero**: El servidor solo orquesta y maneja lógica de alto nivel, nunca controla detalles de las apps
5. **Modularidad Total**: Fácil de armar, resetear, sustituir y administrar cada componente

---

## Comunicación General

### Patrones de Comunicación

```json
// Solo 3 tipos de mensajes se envían a las aplicaciones:

// 1. START - Inicia un módulo/juego
{
  "action": "start",
  "moduleId": "MODULE_BALLS",
  "config": {}
}

// 2. STOP - Detiene un módulo/juego (pausa)
{
  "action": "stop",
  "moduleId": "MODULE_BALLS"
}

// 3. RESET - Reinicia el módulo a estado inicial
{
  "action": "reset",
  "moduleId": "MODULE_BALLS"
}

// Las aplicaciones responden con COMPLETION cuando terminan
{
  "event": "completion",
  "moduleId": "MODULE_BALLS",
  "data": {
    "code": "0108",  // Código para siguiente reto (si aplica)
    "status": "completed"
  }
}

// Y con ERROR si algo sale mal
{
  "event": "error",
  "moduleId": "MODULE_BALLS",
  "data": {
    "errorMessage": "Sensor desconectado",
    "severity": "high"
  }
}
```

### Protocolos de Comunicación

- **Servidor ↔ Aplicaciones React**: WebSocket (Socket.io)
- **Servidor ↔ Arduinos**: HTTP POST (REST)
- **Aplicaciones React ↔ Arduinos**: Mediante el Servidor (NO comunicación directa)
- **Totem ↔ Impresora**: Local USB/CUPS (sin pasar por Servidor)

---

# MÓDULOS DE SOFTWARE

## 1. MÓDULO: Pantalla Principal (Main Screen)

### Responsabilidades
- Mostrar cronómetro del escape room (h:mm:ss)
- Mostrar mensaje anterior del equipo previo
- Proyectar actividad en tiempo real de la tablet (excepto foto y mensaje de marco)
- Mostrar estado de cables conectados (Stage 7)
- Mostrar mensajes de feedback durante el juego

### Entrada de Datos
```json
// WebSocket events que escucha:
{
  "event": "timer:update",
  "data": { "elapsed": 120, "remaining": 3480 }
}

{
  "event": "message:update",
  "data": { "message": "¡Lo logramos!", "team": "Team A" }
}

{
  "event": "tablet:mirror",
  "data": {
    "screen": "feedback_step_1",
    "content": { "messageSelected": "Trabajo en equipo" }
  }
}

{
  "event": "feedback:message",
  "data": { "message": "¡Van por buen camino!", "type": "success" }
}
```

### Salida de Datos
```json
// No envía nada al Servidor (solo recibe)
// Es una aplicación puramente receptiva
```

### Estructura de Pantalla
```
┌─────────────────────────────────────────────┐
│          CRONÓMETRO: 02:05                  │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │  Mensaje Anterior: "¡Lo logramos!"   │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │                                      │  │
│  │  PROYECCIÓN TABLET (Feedback)        │  │
│  │  - Paso actual: "Selecciona mensaje" │  │
│  │  - Contenido renderizado en vivo     │  │
│  │                                      │  │
│  └──────────────────────────────────────┘  │
│                                             │
│                                             │
│  Feedback: "¡Van por buen camino!"         │
└─────────────────────────────────────────────┘
```

### Stack Técnico
- React 18+ con Hooks
- Socket.io client
- TailwindCSS para estilos
- Zustand para estado global (timer, proyección tablet)

---

## 2. MÓDULO: Tablet - Aplicación de Feedback y QR

### Responsabilidades
- Escanear QR (mitad) para validar acceso
- Seleccionar mensaje de una lista predefinida
- Escribir feedback textual sobre la experiencia
- Capturar foto grupal con cámara
- Agregar mensaje de marco para la foto
- Generar imagen con marco (foto + mensaje)
- Mostrar código de siguiente locker al finalizar
- Sincronizar cada paso en tiempo real a la Pantalla Principal

### Independencia del Módulo
- **Funciona offline**: Toda la lógica está en frontend
- **No depende de Servidor para lógica**: Solo envía eventos de progreso
- **Sincronización automática**: Al tomar la foto, sube foto a Drive o carpeta local

### Entrada de Datos
```json
// WebSocket events que recibe (mínimos):
{
  "action": "start",
  "moduleId": "MODULE_TABLET_FEEDBACK"
}

{
  "action": "reset",
  "moduleId": "MODULE_TABLET_FEEDBACK"
}
```

### Salida de Datos
```json
// WebSocket events que envía:

// 1. Indica que el módulo está listo
{
  "event": "module:ready",
  "moduleId": "MODULE_TABLET_FEEDBACK"
}

// 2. QR escaneado (validación opcional del servidor)
{
  "event": "qr:scanned",
  "data": { "qrCode": "HALF_QR_001", "valid": true }
}

// 3. Mensaje seleccionado (para proyectar en pantalla principal)
{
  "event": "tablet:message-selected",
  "data": { "messageId": "MSG_001", "messageText": "¡Lo logramos!" }
}

// 4. Proyección en vivo: cada paso
{
  "event": "tablet:mirror",
  "data": {
    "screen": "feedback_form",
    "step": 2,
    "content": { "feedbackText": "Fue increíble..." }
  }
}

// 6. Mensaje de marco agregado
{
  "event": "tablet:frame-message",
  "data": { "message": "Equipo OP 2025" }
}

// 7. Finalización con código
{
  "event": "completion",
  "moduleId": "MODULE_TABLET_FEEDBACK",
  "data": {
    "code": "3421",
    "photoUrl": "drive://...",
    "status": "completed"
  }
}
```

### Flujo de Pantallas en la Tablet

```
┌─────────────────────────────┐
│  1. ESCANEAR QR             │
│  [Cámara]                   │
│  "Escanea el QR para start" │
└─────────────────────────────┘
         ↓
┌─────────────────────────────┐
│  2. SELECCIONAR MENSAJE     │
│  [Botón 1] [Botón 2]        │
│  [Botón 3] [Botón 4]        │
│  [Botón 5]                  │
│                             │
│  Mensaje seleccionado:      │
│  "¡Lo logramos!"            │
└─────────────────────────────┘
         ↓
┌─────────────────────────────┐
│  3. ESCRIBIR FEEDBACK       │
│  [Textarea]                 │
│  "¿Qué te pareció?"         │
│                             │
│  [Siguiente >]              │
└─────────────────────────────┘
         ↓
┌─────────────────────────────┐
│  4. TOMAR FOTO              │
│  [Cámara en vivo]           │
│                             │
│  [Capturar]                 │
└─────────────────────────────┘
         ↓
┌─────────────────────────────┐
│  5. MENSAJE PARA MARCO      │
│  [Textarea]                 │
│  "Equipo OP 2025"           │
│                             │
│  [Siguiente >]              │
└─────────────────────────────┘
         ↓
┌─────────────────────────────┐
│  6. Boton de ayuda          │
│                             |
|           [Ayuda]           │
└─────────────────────────────┘
         ↓
┌─────────────────────────────┐
│  6. Codigo                  │
│                             │
│  CÓDIGO LOCKER 7:           │
│  ┌─────────────────────┐    │
│  │      3421           │    │
│  └─────────────────────┘    │
│                             │
│  (Finaliza en 20 segundos)  │
└─────────────────────────────┘
```

### Stack Técnico
- PWA (WebApp)
- React
- Tailwind
- Escaneo de QR
- Canvas API para generar imagen con marco
- Google Drive API para subida de fotos

---

## 3. MÓDULO: Juego de Botones - Mesa con 10 Botones

### Responsabilidades
- Mostrar pantalla con campo de código para iniciar el juego
- Al ingresar código correcto, notificar al Servidor para que encienda LEDs y active botones físicos en el Arduino
- Recibir en tiempo real el estado de los 10 botones desde el Arduino (vía Servidor)
- Mostrar visualización actualizada de botones presionados (on/off)
- Mostrar mensajes de feedback ocasionales durante el juego
- Detectar completación cuando Arduino envía `completed: true`
- Mostrar mensaje de éxito y esperar 10 segundos
- Mostrar botón "Finalizar" para revelar código de siguiente locker

### Independencia del Módulo
- **Lógica de juego en Arduino**: El Arduino valida que los botones sean correctos
- **Frontend puramente receptivo**: Solo muestra estado, sin lógica de validación
- **Comunicación física directa**: Arduino  → Servidor → App
- **Reporte mínimo**: Solo reporta cuando Arduino indica completación

### Entrada de Datos
```json
// WebSocket events que recibe:

// 1. Inicio del módulo
{
  "action": "start",
  "moduleId": "MODULE_BUTTONS"
}

// 2. Reset del módulo
{
  "action": "reset",
  "moduleId": "MODULE_BUTTONS"
}

// 3. Actualización de estado de botones desde Arduino
{
  "event": "buttons:state-changed",
  "data": {
    "buttons": [
      { "id": 1, "label": "Finanzas", "state": 0 },
      { "id": 2, "label": "RRHH", "state": 1 },
      { "id": 3, "label": "IT", "state": 0 },
      { "id": 4, "label": "Marketing", "state": 1 },
      { "id": 5, "label": "Logística", "state": 1 }
    ],
    "lastPressed": { "id": 2, "label": "RRHH" },
    "completed": false
  }
}

// 4. Actualización indicando completación
{
  "event": "buttons:state-changed",
  "data": {
    "buttons": [
      { "id": 1, "label": "Finanzas", "state": 1 },
      { "id": 2, "label": "RRHH", "state": 1 },
      { "id": 3, "label": "IT", "state": 0 },
      { "id": 4, "label": "Marketing", "state": 1 },
      { "id": 5, "label": "Logística", "state": 1 }
    ],
    "lastPressed": { "id": 1, "label": "Finanzas" },
    "completed": true
  }
}
```

### Salida de Datos
```json
// WebSocket events que envía:

// 1. Código ingresado - iniciar juego
{
  "event": "buttons:code-entered",
  "data": {
    "code": "1606",
    "timestamp": "2025-10-15T10:30:00Z"
  }
}

// 2. Mensaje de feedback a pantalla principal (opcional)
{
  "event": "game:feedback",
  "data": { "message": "¡Buen intento! Sigue adelante", "type": "info" }
}

// 3. Completación del juego
{
  "event": "completion",
  "moduleId": "MODULE_BUTTONS",
  "data": {
    "code": "9457",
    "status": "completed",
    "finalButtonStates": [1, 1, 0, 1, 1],
    "timestamp": "2025-10-15T10:35:45Z"
  }
}
```

### Flujo de Pantallas

```
PANTALLA 1: ENTRADA DE CÓDIGO
┌─────────────────────────────┐
│  INGRESA EL CÓDIGO          │
│                             │
│  ┌─────────────────────┐   │
│  │ [    ____    ]      │   │
│  │ ◄─────────────►     │   │
│  └─────────────────────┘   │
│                             │
│  [Ingresar]                 │
└─────────────────────────────┘
         ↓ (Código correcto)
PANTALLA 2: ESPERANDO ACTIVACIÓN
┌─────────────────────────────┐
│  ESPERANDO...               │
│                             │
│  Los LEDs se encenderán     │
│  y los botones se           │
│  activarán.                 │
│                             │
│  ⟳ Cargando...              │
└─────────────────────────────┘
         ↓ (Arduino activa)
PANTALLA 3: JUEGO ACTIVO - PRESIONA BOTONES
┌─────────────────────────────────────┐
│  PRESIONA LOS BOTONES CORRECTOS     │
│                                     │
│  ┌─┐  ┌─┐  ┌─┐  ┌─┐  ┌─┐          │
│  │✓│  │✓│  │✗│  │✓│  │✓│          │
│  └─┘  └─┘  └─┘  └─┘  └─┘          │
│   F    RH   IT   MK   LG           │
│                                     │
│  Último: RRHH                       │
│  Estado: Presionando...             │
└─────────────────────────────────────┘
         ↓ (Botones correctos presionados)
PANTALLA 4: ¡COMPLETADO!
┌─────────────────────────────┐
│  ¡LO LOGRASTE!              │
│                             │
│  Combinación correcta       │
│  alcanzada                  │
│                             │
│  Esperando 10 segundos...   │
│  ⟳ 08s                      │
└─────────────────────────────┘
         ↓ (Después de 10 segundos)
PANTALLA 5: CÓDIGO FINAL
┌─────────────────────────────┐
│  CÓDIGO LOCKER 3:           │
│                             │
│  ┌─────────────────────┐   │
│  │      9457           │   │
│  └─────────────────────┘   │
│                             │
│  [Finalizar Juego]          │
└─────────────────────────────┘
```

### Stack Técnico
- React con Hooks y Context API para estado local
- WebSocket para recibir actualizaciones de botones en tiempo real
- Tailwind CSS para estilos
- Temporizador con setInterval para la espera de 10 segundos

---

## 4. MÓDULO: Juego USB - PC Separada con Totem

### Responsabilidades
- Detectar inserción de USB
- Reproducir audio automáticamente al detectar USB
- Mostrar 5 opciones cuando termina el audio
- Validar selección (2 opciones correctas)
- Enviar comando de impresión a impresora conectada localmente
- Mostrar código de siguiente locker

### Independencia del Módulo
- **Funciona totalmente aislado**: PC/Totem completamente independiente del servidor principal
- **Detección USB local**: No depende del Servidor
- **Impresión local**: CUPS/USB driver integrado
- **Reporte mínimo**: Solo notifica al Servidor cuando se completa

### Entrada de Datos
```json
// WebSocket events que recibe (opcionales, para log/monitoreo):
{
  "action": "start",
  "moduleId": "MODULE_USB_AUDIO",
  "config": {}
}
```

### Salida de Datos
```json
// WebSocket events que envía (para monitoreo):

// 1. USB detectado
{
  "event": "usb:detected",
  "data": { "device": "usb_001", "timestamp": "2025-10-15T10:30:00Z" }
}

// 2. Audio iniciado
{
  "event": "audio:started",
  "data": { "file": "audio.mp3", "duration": 180 }
}

// 3. Audio completado
{
  "event": "audio:finished",
  "data": { "file": "audio.mp3" }
}

// 4. Impresión enviada
{
  "event": "print:sent",
  "data": { "template": "card_v1", "code": "7056" }
}

// 5. Completación
{
  "event": "completion",
  "moduleId": "MODULE_USB_AUDIO",
  "data": {
    "code": "7056",
    "selectedOptions": [1, 3],
    "status": "completed"
  }
}
```

### Flujo de Pantallas

```
┌─────────────────────────────┐
│  ESPERANDO USB...           │
│                             │
│  [Icono USB parpadeando]    │
└─────────────────────────────┘
         ↓ (USB insertado)
┌─────────────────────────────┐
│  REPRODUCIENDO AUDIO...     │
│                             │
│  ▓▓▓▓▓░░░░ 0:45 / 3:00     │
└─────────────────────────────┘
         ↓ (Audio finalizado)
┌─────────────────────────────┐
│  SELECCIONA 2 OPCIONES      │
│                             │
│  [Opción 1]  [Opción 2]    │
│  [Opción 3]  [Opción 4]    │
│  [Opción 5]                │
│                             │
│  [Validar]                  │
└─────────────────────────────┘
         ↓ (Validación correcta)
┌─────────────────────────────┐
│  CÓDIGO LOCKER 9:           │
│  ┌─────────────────────┐   │
│  │      7056           │   │
│  └─────────────────────┘   │
│                             │
│  Imprimiendo tarjeta...     │
└─────────────────────────────┘
```

### Stack Técnico
- Electron o Node.js + Express para GUI
- USB detection library (usb / udev)
- FFmpeg para reproducción de audio
- CUPS/printer driver para impresión local
- React o Vue para UI simple

---

## 5. MÓDULO: Totem Táctil - Juego Drag & Drop + Insignias NFC

### Responsabilidades
- **Fase 1 - Drag & Drop**: Arrastrar y soltar mensajes/ilustraciones para emparejar
- **Fase 2 - NFC/RFID (Esperando)**: Mostrar estado de insignias detectadas por Arduino
- **Fase 3 - 6ta Insignia Virtual**: Cuando Arduino detecta las 5 insignias NFC físicas correctas, mostrar la 6ta insignia virtual con animación
- **Fase 4 - Contrato**: Mostrar compromiso de no divulgación táctil
- **Fase 5 - Finalización**: Detener reloj, imprimir certificado, mostrar mensaje de victoria en pantalla principal

### Independencia del Módulo
- **Detección NFC/RFID**: Arduino esclavo detecta físicamente las 5 insignias → valida → envía al Servidor
- **Lógica de juego Drag & Drop**: 100% en frontend (React)
- **Reporte de insignias al Totem**: Servidor recibe del Arduino y notifica al Totem
- **Comunicación mínima**: Solo reporta eventos importantes (insignias completas, contrato aceptado)

### Entrada de Datos
```json
// WebSocket events que recibe:

// 1. Inicio del módulo (Fase 1: Drag & Drop)
{
  "action": "start",
  "moduleId": "MODULE_TOTEM",
  "config": { "phase": "drag_and_drop" }
}

// 2. Pasar a Fase 2 (Esperando NFC)
{
  "action": "start",
  "moduleId": "MODULE_TOTEM",
  "config": { "phase": "nfc_waiting" }
}

// 3. Actualización: Se detectó una insignia NFC (desde Arduino vía Servidor)
{
  "event": "nfc:badge-placed",
  "data": {
    "badgeUid": "A3:B2:C1:D4",
    "badgeNumber": 1,
    "totalPlaced": 1,
    "totalRequired": 5
  }
}

// 4. EVENTO CRUCIAL: Todas las 5 insignias NFC están detectadas (desde Arduino vía Servidor)
{
  "event": "nfc:all-badges-complete",
  "data": {
    "totalPlaced": 5,
    "timestamp": "2025-10-15T11:14:30Z"
  }
}

// 5. Reset del módulo
{
  "action": "reset",
  "moduleId": "MODULE_TOTEM"
}
```

### Salida de Datos
```json
// WebSocket events que envía:

// 1. Fase 1 completada (Drag & Drop finalizado)
{
  "event": "game:phase-complete",
  "data": { "phase": "drag_and_drop", "score": 100 }
}

// 2. Pantalla de espera para insignias NFC está lista
{
  "event": "game:phase-complete",
  "data": { "phase": "nfc_waiting", "status": "ready" }
}

// 3. Insignia virtual (6ta) mostrada - animación iniciada
{
  "event": "game:sixth-badge-displayed",
  "data": { "phase": "sixth_badge", "animation": "appearing" }
}

// 4. Contrato mostrado en pantalla táctil
{
  "event": "game:phase-complete",
  "data": { "phase": "contract", "status": "displayed" }
}

// 5. EVENTO IMPORTANTE: Contrato aceptado - detener reloj y mostrar victoria
{
  "event": "contract:accepted",
  "data": { 
    "timestamp": "2025-10-15T11:15:30Z",
    "action": "STOP_TIMER_AND_SHOW_VICTORY"
  }
}

// 6. Impresión de certificado iniciada
{
  "event": "print:initiated",
  "data": { "template": "badge_certificate" }
}

// 7. Completación total del escape room
{
  "event": "completion",
  "moduleId": "MODULE_TOTEM",
  "data": {
    "status": "completed",
    "phases": ["drag_and_drop", "nfc_waiting", "sixth_badge", "contract"],
    "timestamp": "2025-10-15T11:16:00Z"
  }
}
```

### Flujo de Pantallas

```
FASE 1: DRAG & DROP
┌─────────────────────────────┐
│  EMPAREJA MENSAJES Y ARTES   │
│                             │
│  [Mensaje 1] → [Arte 1]     │
│  [Mensaje 2] → [Arte 2]     │
│  [Mensaje 3] → [Arte 3]     │
│  [Mensaje 4] → [Arte 4]     │
│  [Mensaje 5] → [Arte 5]     │
│                             │
│  [Siguiente Fase >]          │
└─────────────────────────────┘
         ↓
FASE 2: ESPERANDO INSIGNIAS NFC
┌──────────────────────────────────────┐
│  COLOCA 5 INSIGNIAS EN EL TOTEM      │
│                                      │
│  Insignias detectadas:               │
│  [✓] [✓] [✓] [✗] [✗]                │
│                                      │
│  Esperando insignia 4...             │
│  (El Arduino detecta físicamente)    │
│                                      │
│  3 de 5 detectadas                   │
└──────────────────────────────────────┘
         ↓ (5 insignias detectadas por Arduino)
FASE 3: 6TA INSIGNIA VIRTUAL - ANIMACIÓN
┌──────────────────────────────────────┐
│                                      │
│              ✨✨✨                   │
│            ╱  ★  ╲                  │
│           │  6TA   │                │
│            ╲  ★  ╱                  │
│              ✨✨✨                   │
│                                      │
│  INSIGNIA ESPECIAL DESBLOQUEADA      │
│                                      │
│  [Continuar]                         │
└──────────────────────────────────────┘
         ↓ (Tras animación)
FASE 4: CONTRATO DE NO DIVULGACIÓN
┌──────────────────────────────────────┐
│  COMPROMISO DE NO DIVULGACIÓN        │
│                                      │
│  "Por favor, no divulges los         │
│   secretos ni pistas de este         │
│   escape room. Guarda la magia       │
│   para los próximos aventureros."    │
│                                      │
│  [ACEPTAR CONTRATO]                  │
│                                      │
│  Al aceptar:                         │
│  • Se detiene el reloj               │
│  • Se muestra "¡GANARON!" en pantalla│
│  • Se imprime certificado            │
└──────────────────────────────────────┘
         ↓ (Toque en pantalla para aceptar)
FASE 5: VICTORIA FINAL
┌──────────────────────────────────────┐
│                                      │
│         ¡FELICIDADES!                │
│                                      │
│     ★ INSIGNIAS COMPLETADAS ★        │
│                                      │
│     Tiempo final: 45:32              │
│     Reloj DETENIDO                   │
│                                      │
│  Imprimiendo certificado...          │
│  [====================================]
│                                      │
│     Contrato Aceptado ✓              │
│                                      │
│  [Finalizar Escape Room]             │
└──────────────────────────────────────┘

PANTALLA PRINCIPAL (En paralelo):
┌──────────────────────────────────────┐
│          CRONÓMETRO: 45:32            │
│          [DETENIDO]                   │
│                                      │
│  ╔════════════════════════════════╗  │
│  ║                                ║  │
│  ║  🎉 ¡GANARON! 🎉              ║  │
│  ║                                ║  │
│  ║  Felicidades por completar     ║  │
│  ║  el escape room exitosamente   ║  │
│  ║                                ║  │
│  ╚════════════════════════════════╝  │
│                                      │
│  Mensaje Anterior: "¡Lo logramos!"  │
└──────────────────────────────────────┘
```

### Stack Técnico
- React con Hooks y Context API para manejo de fases
- Framer Motion para animaciones de la 6ta insignia
- React DnD para drag & drop en Fase 1
- WebSocket para recibir eventos de Arduino (insignias NFC)
- CUPS para impresión local del certificado
- Canvas API para generación de certificados

### Notas Importantes
- **El Arduino es quien valida**: Los 5 NFC/RFID físicos se detectan en el Arduino esclavo, que valida la combinación
- **Servidor transmite**: El Arduino Master envía al Servidor, que transmite al Totem el evento `nfc:all-badges-complete`
- **Totem actúa**: Al recibir `nfc:all-badges-complete`, muestra la 6ta insignia con animación
- **Flujo de victoria**: Al aceptar el contrato, el Totem envía `contract:accepted` al Servidor
- **Pantalla Principal recibe**: El Servidor recibe `contract:accepted` y envía evento para mostrar "¡GANARON!" en la pantalla principal
- **Reloj se detiene**: Junto con el evento de victoria, se envía comando `timer:stop` a la pantalla principal

---

# SERVIDOR CENTRAL (Orquestación Ligera)

## Responsabilidades Clave

1. **Sincronización de Estado**: Mantener estado global simple (quién está en qué fase)
2. **Enrutamiento de Mensajes**: Distribuir eventos entre módulos (React apps y Arduinos)
3. **Gestión de Arduinos**: Registrar, rastrear heartbeat, enviar comandos
4. **Validación de Transiciones**: Asegurar que los módulos avanzan en orden
5. **Detección de Errores**: Monitorear desconexiones y errores
6. **Logging Centralizado**: Guardar eventos para debugging
7. **Generación de Contenido**: Generar imágenes con marcos (foto + texto)

## NO Hace
- ❌ Controlar lógica interna de los módulos
- ❌ Validar entradas de juegos (eso es responsabilidad del módulo)
- ❌ Reproducir audio/video (responsabilidad de cada módulo)
- ❌ Validar hardware (eso lo valida el Arduino)

---

## Comunicación Servidor ↔ Aplicaciones React (WebSocket)

```javascript
// Servidor → App React: Solo START, STOP, RESET
socket.emit('game:action', {
  action: 'start',
  moduleId: 'MODULE_BUTTONS'
});

// App React → Servidor: Solo reporta eventos y COMPLETION
socket.on('completion', (data) => {
  // data.moduleId, data.code, data.status
});

socket.on('error', (data) => {
  // data.moduleId, data.errorMessage
});

socket.on('buttons:state-changed', (data) => {
  // data.buttons, data.lastPressed, data.completed
});
```

---

## Comunicación Servidor ↔ Arduinos (REST API HTTP)

### 1. Ruta: POST `/connect` - Registro de Arduino

**Arduino envía** (al iniciar):
```json
{
  "id": "balls",
  "ip": "192.168.1.101",
  "port": 8080
}
```

**Servidor responde**:
```json
{
  "status": "registered",
  "arduinoId": "balls",
  "message": "Arduino registrado exitosamente"
}
```

**Lo que hace el servidor:**
- Registra el Arduino con su IP y puerto
- Guarda en estado global: `arduinos["balls"] = { ip: "192.168.1.101", port: 8080, lastHeartbeat: <timestamp> }`
- Inicia monitoreo de heartbeat

### 2. Ruta: POST `/dispatch` - Recibir Eventos del Arduino

**Arduino envía** (constantemente durante el juego):
```json
{
  "arduinoId": "buttons",
  "event": "buttons:state-changed",
  "data": {
    "buttons": [
      { "id": 1, "label": "Finanzas", "state": 0 },
      { "id": 2, "label": "RRHH", "state": 1 }
    ],
    "lastPressed": { "id": 2, "label": "RRHH" },
    "completed": false
  }
}
```

**Servidor responde**:
```json
{
  "status": "received",
  "message": "Evento procesado"
}
```

**Lo que hace el servidor:**
- Recibe el evento del Arduino
- Distribuye el evento a todas las apps React conectadas (mediante WebSocket)
- Guarda evento en log para debugging
- Detecta si `completed: true` para avanzar el flujo

### 3. Ruta: POST `/heartbeat` - Monitoreo de Salud

**Arduino envía** (cada 5-10 segundos):
```json
{
  "arduinoId": "balls",
  "timestamp": "2025-10-15T10:30:45Z"
}
```

**Servidor responde**:
```json
{
  "status": "alive",
  "timestamp": "2025-10-15T10:30:45Z"
}
```

**Lo que hace el servidor:**
- Actualiza el `lastHeartbeat` del Arduino
- Si no recibe heartbeat en X segundos, marca como desconectado
- Notifica a apps React sobre desconexión
- Genera alerta para iPad Admin (si aplica)

---

## Comunicación Servidor → Arduinos (REST API HTTP)

### Ruta: POST `/control` - Enviar Comandos

**Servidor envía**:
```json
{
  "command": "start"
}
```

O:
```json
{
  "command": "stop"
}
```

O:
```json
{
  "command": "reset"
}
```

**Arduino responde**:
```json
{
  "status": "acknowledged",
  "command": "start",
  "arduinoId": "balls",
  "timestamp": "2025-10-15T10:30:50Z"
}
```

**Lo que hace el servidor:**
- Lee la IP guardada del Arduino (ej: `arduinos["balls"].ip`)
- Hace POST a `http://<IP>:8080/control` con el comando
- Espera confirmación del Arduino
- Si no recibe respuesta en X segundos, marca error

---

## Estado Global del Servidor (Ejemplo)

```javascript
{
  // Registro de Arduinos conectados
  arduinos: {
    "balls": {
      id: "balls",
      ip: "192.168.1.101",
      port: 8080,
      connectedAt: "2025-10-15T10:00:15Z",
      lastHeartbeat: "2025-10-15T10:30:45Z",
      status: "connected", // "connected", "disconnected", "error"
      lastCommand: "start",
      lastCommandTime: "2025-10-15T10:00:20Z"
    },
    "buttons": {
      id: "buttons",
      ip: "192.168.1.102",
      port: 8080,
      connectedAt: "2025-10-15T10:00:20Z",
      lastHeartbeat: "2025-10-15T10:30:44Z",
      status: "connected",
      lastCommand: null,
      lastCommandTime: null
    },
    "cables": {
      id: "cables",
      ip: "192.168.1.103",
      port: 8080,
      connectedAt: "2025-10-15T10:00:25Z",
      lastHeartbeat: "2025-10-15T10:30:46Z",
      status: "connected",
      lastCommand: null,
      lastCommandTime: null
    },
    "nfc": {
      id: "nfc",
      ip: "192.168.1.104",
      port: 8080,
      connectedAt: "2025-10-15T10:00:30Z",
      lastHeartbeat: "2025-10-15T10:30:43Z",
      status: "connected",
      lastCommand: null,
      lastCommandTime: null
    }
  },

  // Estado de la sesión
  session: {
    id: "SESSION_001",
    startTime: "2025-10-15T10:00:00Z",
    status: "active", // "waiting", "active", "completed"
    teamName: "Team A",
    elapsedTime: 1830,
    totalTime: 3600
  },

  // Estado de los juegos/módulos
  games: {
    "MODULE_BUTTONS": {
      status: "active", // "waiting", "active", "completed", "error"
      progress: 50,
      lastEventTime: "2025-10-15T10:30:45Z",
      data: {
        buttons: [{ id: 1, state: 0 }, { id: 2, state: 1 }],
        lastPressed: { id: 2 },
        completed: false
      }
    }
  },

  // Clientes React conectados
  clients: {
    "socket_001": {
      appType: "main-screen",
      sessionId: "SESSION_001",
      connectedAt: "2025-10-15T10:00:35Z"
    },
    "socket_002": {
      appType: "tablet-feedback",
      sessionId: "SESSION_001",
      connectedAt: "2025-10-15T10:00:40Z"
    }
  }
}
```

---

## Flujo de Comunicación - Ejemplo Práctico

### Escenario: Iniciar Juego de Botones

```
1. App React (Buttons Game) envía código correcto:
   → Servidor: "buttons:code-entered"

2. Servidor valida el código y decide iniciar el juego:
   → Servidor obtiene IP: arduinos["buttons"].ip = "192.168.1.102"
   → Servidor hace: POST http://192.168.1.102:8080/control
      Payload: { "command": "start" }

3. Arduino (Buttons) recibe comando:
   → Arduino responde: { "status": "acknowledged", "command": "start" }
   → Arduino enciende LEDs y activa botones

4. Arduino detecta presión de botones:
   → Arduino envía: POST http://<servidor>/dispatch
      Payload: { "event": "buttons:state-changed", "data": {...} }

5. Servidor recibe el evento:
   → Distribuye a todas las apps React conectadas (via WebSocket)
   → App React (Buttons Game) recibe y renderiza

6. Servidor monitorea heartbeat cada 5 segundos:
   → Arduino envía: POST http://<servidor>/heartbeat
   → Servidor verifica que Arduino sigue vivo
```

---

## Stack del Servidor

- **Express.js** para rutas REST API (Arduinos)
- **Socket.io** para comunicación bidireccional (Apps React)
- **Axios** o **Node-Fetch** para hacer POST a Arduinos
- **SQLite** o JSON local para persistencia
- **Winston** o **Pino** para logging
- **Node.js EventEmitter** para broadcast de eventos
- **Multer** para subida de imágenes
- **Google Drive API** para backup de fotos

---

## Endpoints REST del Servidor (Resumen)

| Método | Endpoint | Origen | Propósito |
|--------|----------|--------|-----------|
| POST | `/connect` | Arduino | Arduino se registra con IP y puerto |
| POST | `/dispatch` | Arduino | Arduino envía eventos durante el juego |
| POST | `/heartbeat` | Arduino | Arduino confirma que está vivo |
| POST | `/control` | Servidor → Arduino | Servidor envía comando (start/stop/reset) |

---

## Manejo de Errores y Timeouts

### Si Arduino no responde a `/control`
- Reintenta hasta 3 veces con backoff exponencial
- Si sigue sin responder, marca como "error"
- Notifica a app React del error
- Genera log para debugging

### Si Arduino desaparece (sin heartbeat por 30s)
- Marca Arduino como "disconnected"
- Notifica a apps React
- Detiene envío de comandos a ese Arduino
- Genera alerta para iPad Admin

### Si app React recibe error de Arduino
- Pausa el juego
- Muestra mensaje de error al usuario
- Permite reintentar o resetear

---

# iPad de Administración (Opcional, Prioridad Baja)

## Funcionalidades
- Dashboard con estado de cada módulo
- Botones de START, STOP, RESET por módulo
- Log de errores en tiempo real
- Monitoreo de conexiones (Arduinos, Apps)
- Forzar transiciones (admin only)

## Comunicación
- WebSocket bidireccional con Servidor
- Eventos: `admin:command`, `admin:request-status`

---

# Resumen de Flujo de Datos

```
┌─────────────────────────────────────────────────────────────┐
│                   SERVIDOR CENTRAL                          │
│  (Orquestación mínima, logging, generación de contenido)    │
│                                                             │
│  • Mantiene estado global                                   │
│  • Recibe COMPLETION/ERROR de módulos                       │
│  • Envía START/STOP/RESET a módulos                         │
│  • Comunica con Arduinos vía HTTP                           │
└─────────────────────────────────────────────────────────────┘
      ↑ WebSocket ↑                    ↑ WebSocket ↑
      │           │                    │           │
      ↓           ↓                    ↓           ↓
┌──────────┐  ┌──────────┐      ┌──────────┐  ┌──────────┐
│Main      │  │Tablet    │      │Buttons   │  │Cables    │
│Screen    │  │Feedback  │      │Mesa      │  │Tablero   │
│(Receptor)│  │(Autónomo)│      │(Autónomo)│  │(Autónomo)│
└──────────┘  └──────────┘      └──────────┘  └──────────┘
                ↓ LocalStorage   ↓ LocalStorage ↓ Sensores
             [Fotos]         [Estado]      [Arduino]
             [Drive API]     [IndexedDB]

┌─────────────────────────────────────────────────────────┐
│  MÓDULO USB/TOTEM (PC Separada, Totalmente Aislada)     │
│  • Detecta USB localmente                               │
│  • Reproduce audio localmente                           │
│  • Imprime en impresora local                           │
│  • Reporta completion al Servidor (opcional)            │
└─────────────────────────────────────────────────────────┘
```

---

# Checklist de Implementación

## Fase 1: Fundamentos
- [ ] Servidor Express + Socket.io básico
- [ ] Conexión serial con Arduino Master
- [ ] Módulo Pantalla Principal (receptor básico)
- [ ] Módulo Tablet QR Scanner (autónomo)

## Fase 2: Juegos
- [ ] Módulo Botones Mesa
- [ ] Módulo Tablero Cables
- [ ] Módulo USB/Totem básico

## Fase 3: Integración
- [ ] Flujo de datos end-to-end
- [ ] Sincronización de pantallas
- [ ] Generación de imágenes con marcos

## Fase 4: Pulido
- [ ] iPad Admin (si se requiere)
- [ ] Logging y monitoreo avanzado
- [ ] Testing integral
- [ ] Documentación de APIs

---

# IPad de Control (Opcional)
