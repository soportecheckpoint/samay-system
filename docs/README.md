# Índice de Documentación - Escape Room

## 📖 Guías de Integración

### 1. [QUICK-START.md](./QUICK-START.md) - ⭐ EMPEZAR AQUÍ
**Resumen ejecutivo para electrónicos**
- Lo esencial en 5 minutos
- URLs y configuración básica
- Código Arduino completo y funcional
- Checklist de implementación
- Troubleshooting rápido

**👉 Recomendado para**: Empezar la integración rápidamente

---

### 2. [ARDUINO-COMMUNICATION.md](./ARDUINO-COMMUNICATION.md)
**Especificación completa de comunicación HTTP Arduino ↔ Servidor**
- Detalles de cada endpoint HTTP
- Formato exacto de requests y responses
- Eventos por módulo con ejemplos completos
- Secuencia de inicialización
- Flujos de ejemplo completos
- Configuración de red

**👉 Recomendado para**: Implementar la comunicación HTTP correctamente

---

### 3. [ARDUINO-HARDWARE-SPECS.md](./ARDUINO-HARDWARE-SPECS.md)
**Especificaciones de hardware y código**
- Componentes necesarios por módulo
- Configuración de pines
- Lógica de cada módulo
- Código base completo con comentarios
- Librerías requeridas
- Esquemas de conexión

**👉 Recomendado para**: Armar el hardware y programar los Arduinos

---

### 4. [WEBSOCKET-EVENTS.md](./WEBSOCKET-EVENTS.md)
**Comunicación interna WebSocket (Apps React ↔ Servidor)**
- Todos los eventos WebSocket
- Eventos por app React
- Formato de datos completo
- Flujos de comunicación
- Configuración del Totem

**👉 Recomendado para**: Entender el sistema completo y debug

---

### 5. [ARCHITECTURE-DIAGRAM.md](./ARCHITECTURE-DIAGRAM.md)
**Vista general del sistema**
- Diagrama de arquitectura
- Flujos de comunicación visuales
- Tabla de protocolos
- Configuración de red completa
- IDs y nombres clave

**👉 Recomendado para**: Entender cómo se integra todo

---

## 🎯 Guía de Lectura por Rol

### Para Electrónicos que implementan Arduinos:
1. **Empezar con**: [QUICK-START.md](./QUICK-START.md)
2. **Luego leer**: [ARDUINO-COMMUNICATION.md](./ARDUINO-COMMUNICATION.md)
3. **Finalmente**: [ARDUINO-HARDWARE-SPECS.md](./ARDUINO-HARDWARE-SPECS.md)
4. **Opcional**: [ARCHITECTURE-DIAGRAM.md](./ARCHITECTURE-DIAGRAM.md) para el big picture

### Para Desarrolladores de Software:
1. **Empezar con**: [ARCHITECTURE-DIAGRAM.md](./ARCHITECTURE-DIAGRAM.md)
2. **Luego leer**: [WEBSOCKET-EVENTS.md](./WEBSOCKET-EVENTS.md)
3. **Para integrar con Arduino**: [ARDUINO-COMMUNICATION.md](./ARDUINO-COMMUNICATION.md)

### Para Testing e Integración:
1. **Empezar con**: [ARCHITECTURE-DIAGRAM.md](./ARCHITECTURE-DIAGRAM.md)
2. **Referencia rápida**: [QUICK-START.md](./QUICK-START.md)
3. **Debug de comunicación**: [ARDUINO-COMMUNICATION.md](./ARDUINO-COMMUNICATION.md) + [WEBSOCKET-EVENTS.md](./WEBSOCKET-EVENTS.md)

---

## 🔑 Información Clave de Referencia Rápida

### URLs y Puertos
```
Servidor: http://192.168.1.10:3001
Arduinos: http://192.168.1.10X:8080
```

### Endpoints HTTP (Arduino → Servidor)
- `POST /connect` - Registro
- `POST /heartbeat` - Señal de vida (cada 15s)
- `POST /dispatch` - Enviar eventos

### Endpoint HTTP (Servidor → Arduino)
- `POST :8080/control` - Recibir comandos

### Arduino IDs
- `buttons` - Botones
- `connections` o `tablero-conexiones` - Conexiones
- `nfc`, `rfid` o `tablero-nfc` - NFC/RFID

### Eventos Principales
- `buttons:state-changed` - Estado de botones
- `connections:state-changed` - Estado de conexiones
- `nfc:state-changed` - Estado de NFC

### Códigos Importantes
- Botones: Código variable (4 dígitos)
- Conexiones: `"7482"` (obligatorio para Totem)
- NFC: No requiere código

---

## 📋 Checklist General

### Antes de Empezar
- [ ] Servidor Node.js corriendo en puerto 3001
- [ ] Red configurada y activa
- [ ] IPs asignadas o reservadas en DHCP

### Para cada Arduino
- [ ] Hardware conectado y probado
- [ ] Código Arduino cargado con configuración correcta
- [ ] POST /connect exitoso
- [ ] Heartbeat funcionando
- [ ] Servidor HTTP :8080 respondiendo
- [ ] Eventos se envían correctamente
- [ ] Comandos se reciben correctamente
- [ ] Completación incluye código correcto

### Integración Final
- [ ] Admin iPad ve todos los Arduinos conectados
- [ ] Comandos desde Admin funcionan
- [ ] Apps React reciben eventos
- [ ] Flujo completo funciona end-to-end

---

## 🛠️ Herramientas de Debug

### Admin iPad
- Ver estado de todos los Arduinos
- Enviar comandos manualmente
- Simular eventos
- Ver logs en tiempo real

### Logs del Servidor
```bash
tail -f apps/server/logs/combined.log
```

### Serial Monitor Arduino
```bash
# En Arduino IDE
Tools → Serial Monitor (115200 baud)
```

### Test de Conectividad
```bash
# Ping al servidor
ping 192.168.1.10

# Test endpoint connect
curl -X POST http://192.168.1.10:3001/connect \
  -H "Content-Type: application/json" \
  -d '{"id":"test","ip":"192.168.1.1","port":8080}'

# Test endpoint control del Arduino
curl -X POST http://192.168.1.101:8080/control \
  -H "Content-Type: application/json" \
  -d '{"command":"start"}'
```

---

## 🚨 Problemas Comunes

### Arduino no aparece en Admin iPad
→ Ver [QUICK-START.md](./QUICK-START.md) sección Troubleshooting
→ Verificar registro (POST /connect)
→ Verificar heartbeat

### Eventos no llegan a las apps
→ Ver [ARDUINO-COMMUNICATION.md](./ARDUINO-COMMUNICATION.md) sección Troubleshooting
→ Verificar nombre del evento
→ Verificar formato JSON

### Arduino se desconecta constantemente
→ Heartbeat no está funcionando
→ Timeout del servidor es 30s
→ Verificar que loop no está bloqueado

---