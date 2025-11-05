# Eventos WebSocket - Comunicación Interna

## 🌐 Conexión WebSocket

**URL**: `ws://[IP_SERVIDOR]:3001`

**Protocolo**: Socket.io

**Transports**: `['websocket']`

---

## 📱 Apps React y sus IDs

| App | App Type | Session ID |
|-----|----------|-----------|
| Admin iPad | `admin-ipad` | `ADMIN_SESSION` |
| AI App (Laptop e Impresora) | `ai-app` | `AI_SESSION` |
| Buttons Game | `buttons-game` | `SESSION_001` |
| Main Screen | `main-screen` | `SESSION_001` |
| Tablet Feedback | `tablet-feedback` | `TABLET_SESSION` |
| Totem Táctil | `totem-tactil` | `TOTEM_SESSION` |

---

## 🔌 Registro de Cliente

Todas las apps React deben registrarse al conectarse:

**Event**: `register`

**Emit**:
```javascript
socket.emit('register', {
  appType: 'buttons-game',
  sessionId: 'SESSION_001'
});
```

---

## 📤 Eventos Emitidos por Apps React

### Buttons Game

#### buttons:code-entered
```javascript
socket.emit('buttons:code-entered', {
  code: '1606'
});
```

**Responde con**:
- `buttons:game-started` si el código es correcto
- `buttons:invalid-code` si el código es incorrecto

---

### Tablet Feedback

#### tablet:message-selected
```javascript
socket.emit('tablet:message-selected', {
  messageText: '¡Lo logramos!'
});
```

#### tablet:mirror
```javascript
socket.emit('tablet:mirror', {
  screen: 'feedback_form',
  step: 2,
  content: {
    feedbackText: 'Fue una gran experiencia...'
  }
});
```

**Screens posibles**:
- `message_select`
- `message_selected`
- `feedback_form`
- `camera`
- `frame_message`
- `preview`
- `final`

#### tablet:frame-message
```javascript
socket.emit('tablet:frame-message', {
  message: 'Nuestro equipo ganador',
  photoData: 'data:image/jpeg;base64,...'
});
```

#### tablet:step-change
```javascript
socket.emit('tablet:step-change', {
  step: 'message-select'
});
```

**Steps posibles**:
- `qr-scan`
- `message-select`
- `feedback-form`
- `photo-capture`
- `frame-message`
- `preview`
- `completion`

#### tablet:reset
```javascript
socket.emit('tablet:reset');
```

---

### Totem Táctil

#### totem:messages-ordered
```javascript
socket.emit('totem:messages-ordered', {
  messages: ['Mensaje 1', 'Mensaje 2', 'Mensaje 3']
});
```

#### totem:contract-accepted
```javascript
socket.emit('totem:contract-accepted');
```

**Efecto**: Detiene el timer y dispara `game:victory`

---

### Admin iPad

#### admin:get-state
```javascript
socket.emit('admin:get-state');
```

**Responde con**: `admin:state-update` y `admin:arduinos-list`

#### admin:command
```javascript
socket.emit('admin:command', {
  command: 'start-timer',
  data: { duration: 3600 }
});
```

**Comandos disponibles**:

**start-timer**
```javascript
{
  command: 'start-timer',
  data: { duration: 3600 } // segundos
}
```

**pause-timer**
```javascript
{
  command: 'pause-timer'
}
```

**resume-timer**
```javascript
{
  command: 'resume-timer'
}
```

**reset-timer**
```javascript
{
  command: 'reset-timer'
}
```

**reset-module**
```javascript
{
  command: 'reset-module',
  data: { module: 'buttons' } // 'buttons', 'tablet', 'totem'
}
```

**trigger-victory**
```javascript
{
  command: 'trigger-victory'
}
```

**reset-game**
```javascript
{
  command: 'reset-game'
}
```

#### admin:custom-event
```javascript
socket.emit('admin:custom-event', 
  {
    eventName: 'mi-evento-custom',
    payload: { data: 'cualquier cosa' }
  },
  (response) => {
    console.log(response); // { ok: true } o { ok: false, error: '...' }
  }
);
```

---

## 📥 Eventos Recibidos por Apps React

### Eventos Globales (todas las apps)

#### state:update
```javascript
socket.on('state:update', (data) => {
  console.log(data);
  // {
  //   session: { status, elapsed, remaining, total },
  //   tablet: { currentStep, selectedMessage, ... }
  // }
});
```

#### module:completed
```javascript
socket.on('module:completed', (data) => {
  console.log(data);
  // {
  //   moduleId: 'MODULE_BUTTONS',
  //   code: '1234',
  //   status: 'completed'
  // }
});
```

#### module:error
```javascript
socket.on('module:error', (data) => {
  console.log(data);
  // {
  //   moduleId: 'MODULE_BUTTONS',
  //   errorMessage: 'Sensor desconectado',
  //   data: {...}
  // }
});
```

#### game:reset
```javascript
socket.on('game:reset', () => {
  // Resetear todo el estado local
});
```

#### game:victory
```javascript
socket.on('game:victory', (data) => {
  console.log(data);
  // {
  //   message: '¡GANARON!',
  //   finalTime: 1234
  // }
});
```

---

### Eventos del Timer

#### timer:update
```javascript
socket.on('timer:update', (data) => {
  console.log(data);
  // {
  //   status: 'active',
  //   elapsed: 120,
  //   remaining: 3480,
  //   total: 3600
  // }
});
```

#### timer:stop
```javascript
socket.on('timer:stop', (data) => {
  console.log(data);
  // {
  //   reason: 'completed' | 'forced' | 'timeout',
  //   finalTime: 1234
  // }
});
```

#### timer:reset
```javascript
socket.on('timer:reset', (snapshot) => {
  console.log(snapshot);
  // {
  //   status: 'waiting',
  //   elapsed: 0,
  //   remaining: 0,
  //   total: 0
  // }
});
```

---

### Eventos de Botones

#### buttons:game-started
```javascript
socket.on('buttons:game-started', (data) => {
  console.log(data);
  // { status: 'active' }
});
```

#### buttons:invalid-code
```javascript
socket.on('buttons:invalid-code', (data) => {
  console.log(data);
  // { message: 'Código incorrecto' }
});
```

#### buttons:state-changed
```javascript
socket.on('buttons:state-changed', (data) => {
  console.log(data);
  // {
  //   buttons: [{ id: 0, pressed: false }, ...],
  //   lastPressed: 1,
  //   completed: false
  // }
});
```

#### buttons:completed
```javascript
socket.on('buttons:completed', (data) => {
  console.log(data);
  // { code: '1234' }
});
```

#### buttons:reset
```javascript
socket.on('buttons:reset', () => {
  // Resetear estado del módulo de botones
});
```

---

### Eventos de Tablet

#### tablet:state
```javascript
socket.on('tablet:state', (data) => {
  console.log(data);
  // {
  //   currentStep: 'message-select',
  //   sessionId: 'TABLET_SESSION',
  //   selectedMessage: '¡Lo logramos!',
  //   feedbackText: 'Fue genial...',
  //   photoData: 'data:image/...',
  //   frameMessage: 'Nuestro equipo',
  //   mirror: { screen: '...', step: 2, content: {...} }
  // }
});
```

#### tablet:mirror
```javascript
socket.on('tablet:mirror', (data) => {
  console.log(data);
  // {
  //   screen: 'feedback_form',
  //   step: 2,
  //   content: { feedbackText: '...' }
  // }
});
```

#### tablet:message-selected
```javascript
socket.on('tablet:message-selected', (data) => {
  console.log(data);
  // { messageText: '¡Lo logramos!' }
});
```

#### tablet:step-change
```javascript
socket.on('tablet:step-change', (data) => {
  console.log(data);
  // { step: 'feedback-form' }
});
```

#### tablet:frame-message
```javascript
socket.on('tablet:frame-message', (data) => {
  console.log(data);
  // {
  //   message: 'Nuestro equipo ganador',
  //   photoData: 'data:image/...'
  // }
});
```

#### tablet:reset
```javascript
socket.on('tablet:reset', () => {
  // Resetear estado de la tablet
});
```

---

### Eventos de Totem

#### totem:messages-ordered
```javascript
socket.on('totem:messages-ordered', (data) => {
  console.log(data);
  // { messages: ['Mensaje 1', 'Mensaje 2', 'Mensaje 3'] }
});
```

#### totem:contract-accepted
```javascript
socket.on('totem:contract-accepted', () => {
  // Contrato aceptado, juego completado
});
```

#### totem:show-sixth-badge
```javascript
socket.on('totem:show-sixth-badge', () => {
  // Mostrar la sexta insignia virtual
});
```

#### totem:reset
```javascript
socket.on('totem:reset', () => {
  // Resetear estado del totem
});
```

---

### Eventos de Arduino (propagados por el servidor)

Estos eventos son enviados por Arduinos vía HTTP POST /dispatch y el servidor los reemite por WebSocket a todas las apps.

#### connections:state-changed
```javascript
socket.on('connections:state-changed', (data) => {
  console.log(data);
  // {
  //   connections: [{ from: 1, to: 3, connected: true }, ...],
  //   totalConnections: 6,
  //   correctConnections: 2,
  //   completed: false,
  //   code: '7482' // solo si completed: true
  // }
});
```

#### tablero-conexiones:state-changed
```javascript
socket.on('tablero-conexiones:state-changed', (data) => {
  // Mismo formato que connections:state-changed
});
```

#### nfc:state-changed
```javascript
socket.on('nfc:state-changed', (data) => {
  console.log(data);
  // {
  //   badges: [{ id: 'badge_001', name: 'Comunicación', slot: 1, detected: true }, ...],
  //   totalBadges: 5,
  //   detectedBadges: 5,
  //   completed: true
  // }
});
```

#### rfid:state-changed
```javascript
socket.on('rfid:state-changed', (data) => {
  // Mismo formato que nfc:state-changed
});
```

#### tablero-nfc:state-changed
```javascript
socket.on('tablero-nfc:state-changed', (data) => {
  // Mismo formato que nfc:state-changed
});
```

#### arduino:error
```javascript
socket.on('arduino:error', (data) => {
  console.log(data);
  // {
  //   arduinoId: 'buttons',
  //   error: 'Connection timeout'
  // }
});
```

#### arduino:disconnected
```javascript
socket.on('arduino:disconnected', (data) => {
  console.log(data);
  // {
  //   arduinoId: 'buttons',
  //   message: 'Arduino buttons disconnected (no heartbeat)'
  // }
});
```

#### arduinos:reset
```javascript
socket.on('arduinos:reset', (data) => {
  console.log(data);
  // { deviceIds: ['buttons', 'connections', 'nfc'] }
});
```

---

### Eventos del Admin

#### admin:state-update
```javascript
socket.on('admin:state-update', (data) => {
  console.log(data);
  // {
  //   timer: {
  //     status: 'active',
  //     isRunning: true,
  //     elapsedTime: 120,
  //     remainingTime: 3480,
  //     totalTime: 3600
  //   },
  //   modules: {
  //     buttons: { status: 'active', lastEventTime: '...', progress: 50, data: {...} },
  //     tablet: { status: 'completed', ... },
  //     totem: { status: 'waiting', ... }
  //   },
  //   arduinos: [...]
  // }
});
```

#### admin:arduinos-list
```javascript
socket.on('admin:arduinos-list', (data) => {
  console.log(data);
  // [
  //   {
  //     deviceId: 'buttons',
  //     status: 'connected',
  //     lastHeartbeat: '2025-10-22T10:30:00.000Z',
  //     lastCommand: 'start',
  //     lastCommandTime: '2025-10-22T10:25:00.000Z',
  //     ip: '192.168.1.100'
  //   },
  //   ...
  // ]
});
```

---

### Eventos de Feedback

#### feedback:message
```javascript
socket.on('feedback:message', (data) => {
  console.log(data);
  // {
  //   message: '¡Van por buen camino!',
  //   type: 'success' | 'info' | 'warning' | 'error'
  // }
});
```

---

## 🔄 Flujo Típico de Comunicación

### Ejemplo: Juego de Botones Completo

```
1. Buttons App conecta
   → socket.connect()
   ← connect
   → emit('register', { appType: 'buttons-game', sessionId: 'SESSION_001' })
   
2. Usuario ingresa código en Buttons App
   → emit('buttons:code-entered', { code: '1606' })
   
3. Servidor valida código y envía comando a Arduino
   Servidor → POST http://192.168.1.100:8080/control
   Body: { command: 'start' }
   
4. Servidor confirma inicio del juego
   ← on('buttons:game-started', { status: 'active' })
   
5. Arduino detecta botón presionado
   Arduino → POST http://servidor:3001/dispatch
   Body: {
     arduinoId: 'buttons',
     event: 'buttons:state-changed',
     data: { buttons: [...], lastPressed: 1, completed: false }
   }
   
6. Servidor reemite evento a todas las apps
   ← on('buttons:state-changed', { buttons: [...], lastPressed: 1, completed: false })
   
7. Usuario completa secuencia
   Arduino → POST /dispatch
   Body: {
     arduinoId: 'buttons',
     event: 'buttons:state-changed',
     data: { buttons: [...], completed: true, code: '1234' }
   }
   
8. Servidor reemite completación
   ← on('buttons:state-changed', { completed: true, code: '1234' })
   ← on('module:completed', { moduleId: 'MODULE_BUTTONS', code: '1234' })
```

---

## 🎯 Resumen de Eventos por App

### Buttons Game
**Emite**: `buttons:code-entered`

**Escucha**: 
- `buttons:game-started`
- `buttons:invalid-code`
- `buttons:state-changed`
- `buttons:completed`
- `module:completed`
- `buttons:reset`
- `game:reset`

### Tablet Feedback
**Emite**:
- `tablet:message-selected`
- `tablet:mirror`
- `tablet:frame-message`
- `tablet:step-change`
- `tablet:reset`

**Escucha**:
- `state:update`
- `tablet:state`
- `tablet:reset`

### Totem Táctil
**Emite**:
- `totem:messages-ordered`
- `totem:contract-accepted`

**Escucha**:
- `connections:state-changed` / `tablero-conexiones:state-changed`
- `nfc:state-changed` / `rfid:state-changed` / `tablero-nfc:state-changed`
- `module:completed`
- `totem:reset`
- `game:reset`
- `totem:show-sixth-badge`

### Main Screen
**Emite**: Ninguno (solo recibe)

**Escucha**:
- `state:update`
- `timer:update`
- `timer:stop`
- `timer:reset`
- `tablet:state`
- `tablet:mirror`
- `tablet:message-selected`
- `tablet:step-change`
- `tablet:reset`
- `feedback:message`
- `game:victory`

### Admin iPad
**Emite**:
- `admin:get-state`
- `admin:command`
- `admin:custom-event`

**Escucha**:
- `admin:state-update`
- `admin:arduinos-list`
- `buttons:game-started`
- `module:completed`
- `module:error`
- `game:reset`
- `buttons:reset`
- `tablet:reset`
- `totem:reset`
- `game:victory`
- `timer:reset`

---

## 🔧 Configuración de Eventos del Totem

El Totem Táctil permite configurar qué eventos escucha mediante variables de entorno:

**Archivo**: `apps/totem-tactil/.env`

```bash
# Eventos que activan la fase de match (mostrar código)
VITE_TOTEM_MATCH_EVENTS=connections:state-changed,tablero-conexiones:state-changed

# IDs de módulos que activan la fase de match
VITE_TOTEM_MATCH_MODULES=MODULE_CONNECTIONS

# Eventos que activan la fase de NFC (mostrar 6ta insignia)
VITE_TOTEM_NFC_EVENTS=nfc:state-changed,rfid:state-changed,tablero-nfc:state-changed

# IDs de módulos que activan la fase de NFC
VITE_TOTEM_NFC_MODULES=MODULE_RFID,MODULE_NFC

# Código del match (opcional, override)
VITE_TOTEM_MATCH_CODE=7482
```

Por defecto, el Totem escucha todos los eventos mencionados arriba.
