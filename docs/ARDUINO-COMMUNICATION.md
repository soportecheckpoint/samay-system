# Comunicación Arduino - Servidor

## 🔧 Configuración del Servidor

- **URL Base**: `http://[IP_SERVIDOR]:3001`
- **Puerto por defecto**: `3001`
- **Timeout de heartbeat**: `30000ms` (30 segundos)

---

## 📡 Endpoints HTTP para Arduinos

### 1. POST /connect - Registro del Arduino

**Descripción**: El Arduino debe llamar este endpoint al iniciarse para registrarse en el sistema.

**URL**: `POST http://[IP_SERVIDOR]:3001/connect`

**Headers**:
```
Content-Type: application/json
```

**Body**:
```json
{
  "id": "buttons",
  "ip": "192.168.1.100",
  "port": 8080
}
```

**Campos**:
- `id` (string, requerido): Identificador único del Arduino. Valores comunes:
  - `"buttons"` - Arduino de botones
  - `"connections"` - Arduino de tablero de conexiones
  - `"nfc"` - Arduino de lector NFC/RFID
  - `"tablero-conexiones"` - Variante del tablero de conexiones
  - `"tablero-nfc"` - Variante del lector NFC
- `ip` (string, requerido): Dirección IP del Arduino
- `port` (number, opcional): Puerto donde el Arduino escucha comandos (default: 8080)

**Respuesta exitosa** (200):
```json
{
  "status": "registered",
  "arduinoId": "buttons",
  "message": "Arduino registrado exitosamente"
}
```

**Respuesta error** (400):
```json
{
  "error": "Missing id or ip"
}
```

---

### 2. POST /dispatch - Envío de Eventos

**Descripción**: El Arduino usa este endpoint para enviar eventos al servidor cuando ocurren cambios de estado.

**URL**: `POST http://[IP_SERVIDOR]:3001/dispatch`

**Headers**:
```
Content-Type: application/json
```

**Body**:
```json
{
  "arduinoId": "buttons",
  "event": "buttons:state-changed",
  "data": {
    "buttons": [
      { "id": 0, "pressed": false },
      { "id": 1, "pressed": true },
      { "id": 2, "pressed": false }
    ],
    "lastPressed": 1,
    "completed": false
  }
}
```

**Campos**:
- `arduinoId` (string, requerido): ID del Arduino que envía el evento
- `event` (string, requerido): Nombre del evento (ver sección de Eventos)
- `data` (object, requerido): Datos del evento

**Respuesta exitosa** (200):
```json
{
  "status": "received",
  "message": "Evento procesado"
}
```

**Respuesta error** (400):
```json
{
  "error": "Missing arduinoId or event"
}
```

---

### 3. POST /heartbeat - Señal de Vida

**Descripción**: El Arduino debe llamar este endpoint periódicamente (cada 10-15 segundos) para indicar que está activo.

**URL**: `POST http://[IP_SERVIDOR]:3001/heartbeat`

**Headers**:
```
Content-Type: application/json
```

**Body**:
```json
{
  "arduinoId": "buttons",
  "timestamp": "2025-10-22T10:30:00.000Z"
}
```

**Campos**:
- `arduinoId` (string, requerido): ID del Arduino
- `timestamp` (string, opcional): Timestamp ISO 8601

**Respuesta exitosa** (200):
```json
{
  "status": "alive",
  "timestamp": "2025-10-22T10:30:00.000Z"
}
```

**Respuesta error** (400):
```json
{
  "error": "Missing arduinoId"
}
```

**⚠️ Importante**: Si el Arduino no envía heartbeat por más de 30 segundos, el servidor lo marca como desconectado.

---

## 🎮 Eventos por Módulo

### Arduino de Botones (ID: "buttons")

**Evento**: `buttons:state-changed`

**Cuándo enviarlo**: Cada vez que se presiona un botón o cambia el estado del juego.

**Data**:
```json
{
  "buttons": [
    { "id": 0, "pressed": false },
    { "id": 1, "pressed": true },
    { "id": 2, "pressed": false },
    { "id": 3, "pressed": false },
    { "id": 4, "pressed": false },
    { "id": 5, "pressed": false },
    { "id": 6, "pressed": false },
    { "id": 7, "pressed": false }
  ],
  "lastPressed": 1,
  "completed": false
}
```

**Campos**:
- `buttons`: Array con estado de todos los botones
  - `id`: Número del botón (0-7)
  - `pressed`: Boolean indicando si está presionado
- `lastPressed`: ID del último botón presionado
- `completed`: Boolean, `true` cuando se completa el juego

**Ejemplo completado**:
```json
{
  "arduinoId": "buttons",
  "event": "buttons:state-changed",
  "data": {
    "buttons": [...],
    "lastPressed": 7,
    "completed": true,
    "code": "1234"
  }
}
```

Cuando `completed: true`, incluir campo `code` con el código para el siguiente reto.

---

### Arduino de Conexiones (ID: "connections" o "tablero-conexiones")

**Evento**: `connections:state-changed` o `tablero-conexiones:state-changed`

**Cuándo enviarlo**: Cada vez que se conecta/desconecta un cable o se completa el tablero.

**Data**:
```json
{
  "connections": [
    { "from": 1, "to": 3, "connected": true },
    { "from": 2, "to": 5, "connected": true },
    { "from": 4, "to": 7, "connected": false }
  ],
  "totalConnections": 6,
  "correctConnections": 2,
  "completed": false
}
```

**Campos**:
- `connections`: Array de conexiones detectadas
  - `from`: Pin/Puerto de origen
  - `to`: Pin/Puerto de destino
  - `connected`: Boolean, si la conexión está activa
- `totalConnections`: Número total de conexiones requeridas
- `correctConnections`: Número de conexiones correctas actuales
- `completed`: Boolean, `true` cuando todas las conexiones son correctas

**Ejemplo completado**:
```json
{
  "arduinoId": "connections",
  "event": "connections:state-changed",
  "data": {
    "connections": [...],
    "totalConnections": 6,
    "correctConnections": 6,
    "completed": true,
    "code": "7482"
  }
}
```

Cuando `completed: true`, incluir campo `code` con el código del totem táctil.

---

### Arduino de NFC/RFID (ID: "nfc", "rfid" o "tablero-nfc")

**Evento**: `nfc:state-changed`, `rfid:state-changed` o `tablero-nfc:state-changed`

**Cuándo enviarlo**: Cada vez que se detecta una insignia NFC o cuando se completan las 5 insignias.

**Data (insignia individual)**:
```json
{
  "badgeId": "badge_001",
  "badgeName": "Comunicación",
  "slot": 1,
  "detected": true,
  "completed": false
}
```

**Data (completado)**:
```json
{
  "badges": [
    { "id": "badge_001", "name": "Comunicación", "slot": 1, "detected": true },
    { "id": "badge_002", "name": "Trabajo en equipo", "slot": 2, "detected": true },
    { "id": "badge_003", "name": "Liderazgo", "slot": 3, "detected": true },
    { "id": "badge_004", "name": "Creatividad", "slot": 4, "detected": true },
    { "id": "badge_005", "name": "Resolución", "slot": 5, "detected": true }
  ],
  "totalBadges": 5,
  "detectedBadges": 5,
  "completed": true
}
```

**Campos**:
- `badges`: Array con todas las insignias
  - `id`: ID único de la insignia
  - `name`: Nombre de la insignia
  - `slot`: Posición/slot donde va la insignia (1-5)
  - `detected`: Boolean, si está detectada
- `totalBadges`: Número total de insignias requeridas (siempre 5)
- `detectedBadges`: Número de insignias actualmente detectadas
- `completed`: Boolean, `true` cuando se detectan las 5 insignias correctas

---

## 🔄 Recepción de Comandos desde el Servidor

El Arduino debe exponer un endpoint HTTP para recibir comandos del servidor.

**URL**: `POST http://[IP_ARDUINO]:[PUERTO]/control`

**Puerto por defecto**: `8080` (configurable al registrarse)

**Headers**:
```
Content-Type: application/json
```

**Body**:
```json
{
  "command": "start"
}
```

**Comandos posibles**:
- `"start"`: Iniciar el juego/módulo
- `"stop"`: Detener/pausar el juego
- `"reset"`: Resetear a estado inicial

**Respuesta esperada**:
```json
{
  "status": "ok",
  "command": "start",
  "timestamp": "2025-10-22T10:30:00.000Z"
}
```

---

## 📋 Secuencia de Inicialización

1. **Arduino se conecta a la red**
2. **Arduino llama a POST /connect**
   ```json
   {
     "id": "buttons",
     "ip": "192.168.1.100",
     "port": 8080
   }
   ```
3. **Arduino inicia loop de heartbeat** (cada 10-15 segundos)
   ```json
   POST /heartbeat
   {
     "arduinoId": "buttons",
     "timestamp": "..."
   }
   ```
4. **Arduino espera eventos o comandos**
5. **Cuando ocurre un evento, Arduino llama a POST /dispatch**
   ```json
   {
     "arduinoId": "buttons",
     "event": "buttons:state-changed",
     "data": {...}
   }
   ```

---

## ⚡ Flujo de Ejemplo Completo - Botones

```
1. Arduino inicia
   POST /connect
   Body: { "id": "buttons", "ip": "192.168.1.100", "port": 8080 }
   
2. Servidor responde
   Response: { "status": "registered", "arduinoId": "buttons" }
   
3. Arduino inicia heartbeat loop (cada 15 segundos)
   POST /heartbeat
   Body: { "arduinoId": "buttons", "timestamp": "..." }
   
4. Usuario ingresa código correcto en la app
   Servidor envía comando al Arduino:
   POST http://192.168.1.100:8080/control
   Body: { "command": "start" }
   
5. Arduino inicia juego y envía estado inicial
   POST /dispatch
   Body: {
     "arduinoId": "buttons",
     "event": "buttons:state-changed",
     "data": {
       "buttons": [todos en false],
       "lastPressed": null,
       "completed": false
     }
   }
   
6. Usuario presiona botón 1
   POST /dispatch
   Body: {
     "arduinoId": "buttons",
     "event": "buttons:state-changed",
     "data": {
       "buttons": [botón 1 en true],
       "lastPressed": 1,
       "completed": false
     }
   }
   
7. Usuario completa secuencia correcta
   POST /dispatch
   Body: {
     "arduinoId": "buttons",
     "event": "buttons:state-changed",
     "data": {
       "buttons": [...],
       "lastPressed": 7,
       "completed": true,
       "code": "1234"
     }
   }
   
8. Servidor distribuye evento a todas las apps React
   WebSocket emit: "buttons:state-changed" con data
```

---

## 🔧 Configuración de Red

### Variables de Entorno del Servidor

Archivo: `apps/server/.env`

```bash
PORT=3001
NODE_ENV=production
ARDUINO_TIMEOUT=30000
```

### IPs Recomendadas

**Servidor**: `192.168.1.10:3001` (IP fija)

**Arduinos**:
- Botones: `192.168.1.101:8080`
- Conexiones: `192.168.1.102:8080`
- NFC/RFID: `192.168.1.103:8080`

---

## 🐛 Troubleshooting

### Arduino no aparece como conectado
- Verificar que se llamó a POST /connect
- Verificar que el heartbeat se envía periódicamente
- Revisar logs del servidor: `apps/server/logs/combined.log`

### Eventos no se reciben en las apps
- Verificar que `event` tiene el nombre correcto
- Verificar que `arduinoId` coincide con el ID registrado
- Revisar que `data` está correctamente formateado

### Servidor marca Arduino como desconectado
- Asegurar que el heartbeat se envía cada 10-15 segundos
- El timeout es de 30 segundos por defecto
- Verificar conectividad de red

---

## 📚 Nombres de Eventos Válidos

| Arduino | Eventos Aceptados |
|---------|-------------------|
| buttons | `buttons:state-changed` |
| connections | `connections:state-changed`, `tablero-conexiones:state-changed` |
| nfc/rfid | `nfc:state-changed`, `rfid:state-changed`, `tablero-nfc:state-changed` |

**⚠️ Los eventos deben escribirse exactamente como aparecen en la tabla.**
