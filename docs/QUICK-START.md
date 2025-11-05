# Resumen de Integración - Guía Rápida para Electrónicos

## 🎯 Lo Esencial

Cada Arduino debe:
1. ✅ Conectarse a Ethernet
2. ✅ Registrarse en el servidor (POST /connect)
3. ✅ Enviar heartbeat cada 15 segundos (POST /heartbeat)
4. ✅ Exponer servidor HTTP en puerto 8080 para recibir comandos
5. ✅ Enviar eventos cuando cambia el estado (POST /dispatch)

---

## 📡 URLs y Configuración

**Servidor**: `http://192.168.1.10:3001`

---

## 🔌 3 Endpoints HTTP que el Arduino LLAMA

### 1. Registro (una sola vez al iniciar)
```
POST http://192.168.1.10:3001/connect
Content-Type: application/json

{
  "id": "buttons",
  "ip": "192.168.1.101",
  "port": 8080
}
```

### 2. Heartbeat (cada 15 segundos)
```
POST http://192.168.1.10:3001/heartbeat
Content-Type: application/json

{
  "arduinoId": "buttons",
  "timestamp": "2025-10-22T10:30:00.000Z"
}
```

### 3. Eventos (cuando ocurre algo)
```
POST http://192.168.1.10:3001/dispatch
Content-Type: application/json

{
  "arduinoId": "buttons",
  "event": "buttons:state-changed",
  "data": {
    "buttons": [...],
    "lastPressed": 1,
    "completed": false
  }
}
```

---

## 🎛️ 1 Endpoint HTTP que el Arduino EXPONE

El Arduino debe tener un servidor HTTP escuchando en puerto 8080.

```
POST http://192.168.1.101:8080/control
Content-Type: application/json

{
  "command": "start"  // o "stop" o "reset"
}
```

**Respuesta esperada**:
```json
{
  "status": "ok",
  "command": "start"
}
```

---

## 🎮 Datos por Módulo

### Arduino de Botones (ID: "buttons")

**Evento**: `buttons:state-changed`

**JSON al completar**:
```json
{
  "arduinoId": "buttons",
  "event": "buttons:state-changed",
  "data": {
    "buttons": [
      { "id": 0, "pressed": false },
      { "id": 1, "pressed": false },
      ...
      { "id": 7, "pressed": false }
    ],
    "lastPressed": 7,
    "completed": true,
    "code": "1234"
  }
}
```

**⚠️ Importante**: Incluir campo `code` cuando `completed: true`

---

### Arduino de Conexiones (ID: "connections")

**Evento**: `connections:state-changed` o `tablero-conexiones:state-changed`

**JSON al completar**:
```json
{
  "arduinoId": "connections",
  "event": "connections:state-changed",
  "data": {
    "connections": [
      { "from": 1, "to": 3, "connected": true },
      { "from": 2, "to": 5, "connected": true },
      ...
    ],
    "totalConnections": 6,
    "correctConnections": 6,
    "completed": true,
    "code": "7482"
  }
}
```

**⚠️ Importante**: El código debe ser `"7482"` (para el totem)

---

### Arduino de NFC/RFID (ID: "nfc")

**Evento**: `nfc:state-changed`, `rfid:state-changed` o `tablero-nfc:state-changed`

**JSON al completar**:
```json
{
  "arduinoId": "nfc",
  "event": "nfc:state-changed",
  "data": {
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
}

---

## ✅ Checklist de Implementación

### Paso 1: Hardware
- [ ] Arduino conectado y funcionando
- [ ] Sensores/botones/lectores conectados correctamente
- [ ] LEDs indicadores (opcional)
- [ ] Alimentación estable

### Paso 2: Software
- [ ] Código Arduino cargado
- [ ] IP del servidor configurada
- [ ] Arduino ID configurado
- [ ] Librería ArduinoJson instalada
- [ ] Librería HTTPClient disponible
- [ ] Librería WebServer disponible

### Paso 3: Conectividad
- [ ] Arduino se registra en servidor (POST /connect exitoso)
- [ ] Heartbeat se envía cada 15 segundos
- [ ] Servidor HTTP del Arduino responde en puerto 8080

### Paso 4: Funcionalidad
- [ ] Eventos se envían correctamente al servidor
- [ ] Arduino responde a comandos start/stop/reset
- [ ] Lógica del juego funciona (botones/conexiones/NFC)
- [ ] Evento de completación incluye código correcto
- [ ] No hay errores en Serial Monitor

### Paso 5: Integración
- [ ] Eventos aparecen en Admin iPad
- [ ] Comandos desde Admin iPad funcionan
- [ ] Apps React reciben eventos correctamente
- [ ] Todo el flujo end-to-end funciona

