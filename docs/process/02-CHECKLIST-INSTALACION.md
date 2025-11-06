# Checklist de Instalación - Scape Room Software

## Instrucciones de Uso

Este checklist debe completarse para **CADA SALA** durante la instalación. Imprime 4 copias (una por sala) y marca cada ítem a medida que lo completas.

**Sala #**: ______

**Fecha**: ____ / ____ / ____

**Técnico**: ________________________

---

## Pre-Instalación

### Hardware Recibido

#### Servidor
- [ ] Mini PC del servidor funciona correctamente
- [ ] Tiene Node.js 18+ instalado (`node --version`)
- [ ] Tiene pnpm 9+ instalado (`pnpm --version`)
- [ ] Tarjeta de red funciona
- [ ] Cable Ethernet disponible

#### Arduinos
- [ ] Arduino Botones recibido y funciona
- [ ] Arduino Conexiones recibido y funciona
- [ ] Arduino NFC recibido y funciona
- [ ] Arduino Pelotas funciona
- [ ] Módulos Ethernet Funcionando
- [ ] Cables USB para programar Arduinos

#### Dispositivos Cliente
- [ ] iPad para Admin
- [ ] Tablet para Feedback
- [ ] Mini PC para Buttons Game
- [ ] Totem Táctil con SO Windows incluido
- [ ] Laptop para AI App
- [ ] Monitor/Proyector para Main Screen

#### Red
- [ ] Router recibido y funciona
- [ ] Starlink está conectado y funciona

#### Periféricos
- [ ] Impresora Epson PM-525 recibida
- [ ] Impresora se conecta al WiFi
- [ ] Papel y tinta disponibles

---

## Fase 1: Preparación de Hardware

### 1.1. Obtener MAC Addresses

#### Servidor
- [ ] MAC Address obtenida
- [ ] **MAC del Servidor**: ________________________

#### Arduinos
- [ ] Arduino Botones - MAC: ________________________
- [ ] Arduino Conexiones - MAC: ________________________
- [ ] Arduino NFC - MAC: ________________________

#### Impresora (opcional)
- [ ] Impresora - MAC: ________________________

### 1.2. Verificar Hardware

- [ ] Servidor enciende correctamente
- [ ] Todos los Arduinos encienden
- [ ] Impresora enciende y conecta al WiFi
- [ ] Todos los dispositivos cliente encienden
- [ ] Router enciende y tiene luz de internet

---

## Fase 2: Configuración de Red

### 2.1. Configurar Router

- [ ] Accedido al panel del router (`http://192.168.18.1`)
- [ ] Gateway configurado como: **192.168.18.1**
- [ ] Máscara de subred: **255.255.255.0**
- [ ] DHCP habilitado
- [ ] Rango DHCP: **192.168.18.20 - 192.168.18.200**

### 2.2. Reservas DHCP por MAC

- [ ] Servidor: `192.168.18.164` → MAC: ________________
- [ ] Arduino Botones: `192.168.18.101` → MAC: ________________
- [ ] Arduino Conexiones: `192.168.18.102` → MAC: ________________
- [ ] Arduino NFC: `192.168.18.103` → MAC: ________________
- [ ] Arduino NFC: `192.168.18.104` → MAC: ________________
- [ ] Impresora: `192.168.18.105` → MAC: ________________ (opcional)

### 2.4. Verificar Conectividad del Servidor

- [ ] Servidor conectado al router vía Ethernet
- [ ] Servidor obtiene IP: **192.168.18.164**
  - [ ] Verificado con `ip addr` (Linux) o `ipconfig` (Windows)
- [ ] Ping al router exitoso: `ping 192.168.18.1`
- [ ] Ping a internet exitoso: `ping 8.8.8.8`
- [ ] Ping a dominio: `ping samay.checkappai.com`

---

## Fase 3: Instalación de Software

### 3.2. Instalar Dependencias

- [ ] Dependencias instaladas: `pnpm install`
- [ ] Sin errores durante la instalación

### 3.3. Verificar Certificados SSL

- [ ] Carpeta `/cert` existe
- [ ] Archivo `privkey1.pem` existe
- [ ] Archivo `cert1.pem` existe
- [ ] Archivo `chain1.pem` existe
- [ ] Archivo `fullchain1.pem` existe

### 3.4. Configurar .env del Servidor

- [ ] Archivo `apps/server/.env` creado
- [ ] `HTTP_PORT=3001`
- [ ] `HTTPS_PORT=3443`
- [ ] `HOST=0.0.0.0`
- [ ] `ARDUINO_TIMEOUT=30000`
- [ ] `PRINTER_NAME=` configurado (ejemplo: `Epson-PM-525`)

### 3.5. Configurar .env de Clientes

- [ ] `apps/admin-ipad/.env` creado
  - [ ] `VITE_SERVER_URL=https://192.168.18.164:3443`
- [ ] `apps/ai-app/.env` creado
  - [ ] `VITE_SERVER_URL=https://192.168.18.164:3443`
- [ ] `apps/buttons-game/.env` creado
  - [ ] `VITE_SERVER_URL=https://192.168.18.164:3443`
- [ ] `apps/main-screen/.env` creado
  - [ ] `VITE_SERVER_URL=https://192.168.18.164:3443`
- [ ] `apps/tablet-feedback/.env` creado
  - [ ] `VITE_SERVER_URL=https://samay.checkappia.com:3443`
- [ ] `apps/totem-tactil/.env` creado
  - [ ] `VITE_SERVER_URL=https://192.168.18.164:3443`

### 3.6. Compilar Proyecto

- [ ] Compilación exitosa: `pnpm run dev`
- [ ] Sin errores de compilación

---

## Fase 4: Configuración de Arduinos

### 4.1. Arduino Botones

- [ ] Código cargado en Arduino
- [ ] IP del servidor configurada: `192.168.18.164`
- [ ] Puerto del servidor: `3001`
- [ ] Arduino ID configurado: `"buttons"`
- [ ] Arduino obtiene IP: **192.168.18.101**
- [ ] Arduino se registra en el servidor
- [ ] Heartbeat funciona (logs cada 5 segundos)

### 4.2. Arduino Conexiones

- [ ] Código cargado en Arduino
- [ ] IP del servidor configurada: `192.168.18.164`
- [ ] Puerto del servidor: `3001`
- [ ] Arduino ID configurado: `"connections"`
- [ ] Arduino obtiene IP: **192.168.18.102**
- [ ] Arduino se registra en el servidor
- [ ] Heartbeat funciona

### 4.3. Arduino NFC

- [ ] Código cargado en Arduino
- [ ] IP del servidor configurada: `192.168.18.164`
- [ ] Puerto del servidor: `3001`
- [ ] Arduino ID configurado: `"nfc"`
- [ ] Arduino obtiene IP: **192.168.18.103**
- [ ] Arduino se registra en el servidor
- [ ] Heartbeat funciona

---

## Fase 5: Configuración de Impresora

### Windows

- [ ] Impresora agregada en **Configuración → Impresoras**
- [ ] Controladores instalados
- [ ] Nombre de impresora: ________________________
- [ ] Prueba de impresión exitosa

---

## Fase 6: Iniciar Servidor

### 6.1. Arranque del Servidor

- [ ] Servidor iniciado: `pnpm dev`
- [ ] Logs muestran:
  - [ ] `🚀 HTTP Server running on 0.0.0.0:3001`
  - [ ] `🔒 HTTPS Server running on 0.0.0.0:3443`
  - [ ] `📡 WebSocket server ready`
  - [ ] `🎮 Escape Room Server initialized`

### 6.2. Verificar Conexión de Arduinos

- [ ] Arduino Botones registrado (ver logs)
  - [ ] Log: `Arduino buttons registrado: 192.168.18.101:8080`
- [ ] Arduino Conexiones registrado
  - [ ] Log: `Arduino connections registrado: 192.168.18.102:8080`
- [ ] Arduino NFC registrado
  - [ ] Log: `Arduino nfc registrado: 192.168.18.103:8080`

---

## Fase 7: Configurar Dispositivos Cliente

### 7.1. Admin iPad

- [ ] Navegador abierto (Safari/Chrome)
- [ ] URL accedida: `https://192.168.18.164:5177`
- [ ] Certificado SSL aceptado
- [ ] App carga correctamente
- [ ] WebSocket conectado (ver consola del navegador)
- [ ] Agregado a pantalla de inicio

### 7.2. Tablet Feedback

- [ ] URL accedida: `https://192.168.18.164:5175`
- [ ] Certificado SSL aceptado
- [ ] App carga correctamente
- [ ] WebSocket conectado
- [ ] Agregado a pantalla de inicio

### 7.3. Main Screen (Proyector)

- [ ] Conectado al proyector/monitor
- [ ] URL accedida: `https://192.168.18.164:5173`
- [ ] Certificado SSL aceptado
- [ ] App carga correctamente
- [ ] Modo pantalla completa (F11)
- [ ] WebSocket conectado

### 7.4. Totem Táctil

- [ ] URL accedida: `https://samay.checkappia.com:5176`
- [ ] Certificado SSL aceptado
- [ ] App carga correctamente
- [ ] Modo pantalla completa
- [ ] WebSocket conectado

### 7.5. Buttons Game (Mini PC)

- [ ] Mini PC encendida y conectada a la red
- [ ] URL accedida: `https://192.168.18.164:5174`
- [ ] Certificado SSL aceptado
- [ ] App carga correctamente
- [ ] WebSocket conectado
- [ ] Modo pantalla completa activado (F11)

### 7.6. AI App (Laptop)

- [ ] Laptop encendida y conectada a la red
- [ ] URL accedida: `https://192.168.18.164:5178`
- [ ] Certificado SSL aceptado
- [ ] App carga correctamente
- [ ] WebSocket conectado
- [ ] Maximizada o en pantalla completa

---

## Fase 8: Pruebas de Sistema

### 8.1. Prueba de Admin iPad

- [ ] Admin iPad muestra estado de todos los módulos
- [ ] Puede crear nueva sesión
- [ ] Puede iniciar temporizador
- [ ] Main Screen muestra tiempo actualizado

### 8.2. Prueba de Botones

- [ ] Admin inicia módulo de botones
- [ ] Presionar botón físico actualiza app Buttons Game
- [ ] Estado se actualiza en tiempo real
- [ ] Completar secuencia muestra código
- [ ] Main Screen muestra estado del módulo

### 8.3. Prueba de Conexiones → Totem

- [ ] Conectar cable actualiza Totem Táctil
- [ ] Totem activa fase de Match

### 8.4. Prueba de NFC → Totem

- [ ] Colocar insignia NFC actualiza Totem
- [ ] Completar 5 insignias muestra 6ta insignia virtual
- [ ] Se completa el scaperoom

### 8.5. Prueba de Tablet → Main Screen

- [ ] Navegar en Tablet Feedback actualiza Main Screen
- [ ] Proyección en tiempo real funciona
- [ ] Escribir texto se refleja en Main Screen
- [ ] Sin lag visible

### 8.6. Prueba de Impresora

- [ ] AI App completa el flujo
- [ ] Servidor envía PDF a impresora
- [ ] Impresora imprime documento
- [ ] Logs muestran: `[PRINTER] PDF enviado exitosamente`

### 8.8. Prueba de Heartbeat

- [ ] Desconectar un Arduino
- [ ] Esperar 40 segundos
- [ ] Servidor marca Arduino como desconectado
- [ ] Admin iPad muestra Arduino desconectado
- [ ] Reconectar Arduino
- [ ] Servidor marca Arduino como conectado

---

## Fase 10: Verificación Final

### 10.1. Checklist de Funcionamiento

- [ ] **Servidor**: Funciona y acepta conexiones
- [ ] **Arduinos**: Todos conectados y funcionando
- [ ] **Impresora**: Configurada y imprime
- [ ] **Admin iPad**: Funciona y controla el sistema
- [ ] **Tablet Feedback**: Funciona y proyecta en Main Screen
- [ ] **Main Screen**: Proyecta correctamente
- [ ] **Totem Táctil**: Funciona y recibe eventos
- [ ] **Buttons Game**: Funciona y recibe eventos
- [ ] **AI App**: Funciona y envía a imprimir (opcional)
- [ ] **Red**: Estable y sin problemas
- [ ] **Internet**: Starlink funciona correctamente

### 10.2. Prueba de Flujo Completo

- [ ] Crear sesión desde Admin iPad
- [ ] Iniciar temporizador
- [ ] Completar módulo de botones
- [ ] Completar módulo de conexiones
- [ ] Completar módulo de NFC
- [ ] Completar feedback en tablet
- [ ] Imprimir
- [ ] Finalizar sesión

---

### Comentarios y Observaciones

_____________________________________________________________

_____________________________________________________________

_____________________________________________________________

_____________________________________________________________

_____________________________________________________________

---

## Notas Importantes

1. **Guarda este checklist** en un lugar seguro para futuras referencias
2. **Repite este proceso** para cada una de las 4 salas
3. **Verifica que las MACs sean únicas** entre salas
4. **Documenta cualquier cambio** a la configuración estándar
5. **Consulta el documento de solución de problemas** si encuentras errores

