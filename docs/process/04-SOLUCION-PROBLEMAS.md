# Solución de Problemas Comunes - Scape Room Software

## Tabla de Contenidos
- [Problemas de Red](#problemas-de-red)
- [Problemas del Servidor](#problemas-del-servidor)
- [Problemas de Arduinos](#problemas-de-arduinos)
- [Problemas de Clientes (Apps Web)](#problemas-de-clientes-apps-web)
- [Problemas de Impresora](#problemas-de-impresora)
- [Problemas de Certificados SSL](#problemas-de-certificados-ssl)
- [Problemas de WebSocket](#problemas-de-websocket)
- [Problemas de Rendimiento](#problemas-de-rendimiento)
- [Diagnóstico Avanzado](#diagnóstico-avanzado)

---

## Problemas de Red

### ❌ Servidor no obtiene IP 192.168.18.164

**Síntoma:**
- Servidor obtiene IP diferente (ej: 192.168.18.50)
- Apps cliente no pueden conectarse

**Causas Posibles:**
1. MAC address no está en reservas DHCP del router
2. Reserva DHCP configurada con MAC incorrecta
3. Interfaz de red incorrecta

**Solución:**

**Paso 1**: Verificar MAC address del servidor

```bash
# Linux - obtener MAC
ip link show
# O más específico
ip link show eth0 | grep link/ether

# Windows
ipconfig /all
# Busca "Dirección física" o "Physical Address"
```

**Paso 2**: Verificar reserva DHCP en router

1. Accede al router: `http://192.168.18.1`
2. Ve a **DHCP** → **Address Reservation**
3. Busca la entrada para `192.168.18.164`
4. Verifica que la MAC coincida

**Paso 3**: Corregir reserva si es necesaria

1. Elimina la reserva incorrecta
2. Agrega nueva reserva:
   - MAC: (la correcta del servidor)
   - IP: 192.168.18.164
3. Guarda y reinicia router

**Paso 4**: Renovar IP del servidor

```bash
# Linux
sudo systemctl restart NetworkManager
# O
sudo dhclient -r && sudo dhclient

# Windows
ipconfig /release
ipconfig /renew
```

**Paso 5**: Verificar IP asignada

```bash
# Linux
ip addr show | grep "inet 192.168.18"

# Windows
ipconfig | findstr "192.168.18"
```

**Si aún no funciona:**
- Reinicia el servidor completamente
- Verifica que el cable Ethernet esté bien conectado
- Prueba con otro puerto del router/switch

---

### ❌ Segmento de red incorrecto (no es 192.168.18.x)

**Síntoma:**
- Dispositivos obtienen IPs de otro segmento (ej: 192.168.1.x)
- Sistema no funciona

**Causas Posibles:**
1. Router no está configurado correctamente
2. Conectado al router equivocado

**Solución:**

**Paso 1**: Verificar configuración del router

1. Accede al router: `http://192.168.18.1`
   - Si no responde, intenta `http://192.168.1.1` o `http://192.168.0.1`
2. Ve a **LAN Settings** o **Network Settings**
3. Verifica:
   - **Router IP**: `192.168.18.1`
   - **Subnet Mask**: `255.255.255.0`

**Paso 2**: Cambiar segmento de red del router

1. **Router IP**: `192.168.18.1`
2. **Subnet Mask**: `255.255.255.0`
3. Guarda y reinicia router

**Paso 3**: Reconfigurar dispositivos

- Todos los dispositivos obtendrán nueva IP automáticamente
- Espera 2-3 minutos después de reiniciar router
- Reconecta cada dispositivo si es necesario

---

### ❌ Dispositivos no se comunican entre sí

**Síntoma:**
- Servidor y clientes no se conectan
- Apps muestran error de conexión
- Arduinos no envían eventos

**Causas Posibles:**
1. Firewall del servidor bloqueando conexiones
2. Router tiene aislamiento de clientes habilitado
3. Dispositivos en redes diferentes

**Solución:**

**Paso 1**: Verificar conectividad básica

```bash
# Desde cliente, ping al servidor
ping 192.168.18.164

# Desde servidor, ping al cliente (usa la IP del cliente)
ping 192.168.18.20
```

**Si ping falla:**

**Paso 2**: Verificar que estén en la misma red

```bash
# Obtener IP y verificar que todos tengan 192.168.18.x
# Linux
ip addr show

# Windows
ipconfig
```

**Paso 3**: Desactivar firewall temporalmente (para prueba)

```bash
# Linux
sudo ufw disable

# Windows
# Panel de Control → Firewall → Desactivar (temporalmente)
```

**Si funciona con firewall desactivado:**

**Paso 4**: Configurar firewall correctamente

```bash
# Linux - permitir puertos necesarios
sudo ufw allow 3001/tcp   # HTTP para Arduinos
sudo ufw allow 3443/tcp   # HTTPS para clientes
sudo ufw enable

# Windows
# Configuración → Actualización y seguridad → Firewall de Windows Defender
# → Reglas de entrada → Nueva regla
# Tipo: Puerto
# Protocolo: TCP
# Puertos: 3001, 3443
# Acción: Permitir
```

**Paso 5**: Verificar aislamiento de clientes en router

1. Accede al router: `http://192.168.18.1`
2. Busca **Wireless Settings** o **Advanced**
3. Busca opción **AP Isolation** o **Client Isolation**
4. **Desactívala** si está habilitada
5. Guarda y reinicia router

---

### ❌ Internet no funciona

**Síntoma:**
- Dispositivos no tienen acceso a internet
- No se pueden descargar dependencias
- DNS no resuelve dominios

**Causas Posibles:**
1. Starlink desconectado
2. Router no tiene gateway configurado
3. DNS incorrecto

**Solución:**

**Paso 1**: Verificar conexión del Starlink

1. Revisa luces del Starlink (debe tener luz blanca sólida)
2. Reinicia Starlink si es necesario
3. Espera 2-3 minutos para reconexión

**Paso 2**: Verificar gateway del router

1. Accede al router: `http://192.168.18.1`
2. Ve a **WAN Settings** o **Internet Settings**
3. Verifica que esté conectado al Starlink
4. Si no, reconecta cable WAN del Starlink al puerto WAN del router

**Paso 3**: Verificar DNS

```bash
# Linux
cat /etc/resolv.conf
# Debería mostrar:
# nameserver 8.8.8.8
# nameserver 8.8.4.4

# Windows
ipconfig /all
# Busca: Servidores DNS
```

**Si DNS está incorrecto:**

1. Configura DNS en router:
   - **Primary DNS**: `8.8.8.8`
   - **Secondary DNS**: `8.8.4.4`
2. Guarda y reinicia router
3. Renueva IP en dispositivos:

```bash
# Linux
sudo systemctl restart NetworkManager

# Windows
ipconfig /release
ipconfig /renew
```

**Paso 4**: Prueba de conectividad

```bash
# Ping a DNS de Google
ping 8.8.8.8

# Prueba de DNS
nslookup google.com

# Ping a dominio
ping google.com
```

---

## Problemas del Servidor

### ❌ Servidor no inicia

**Síntoma:**
- Al ejecutar `pnpm dev` sale error
- Servidor se cierra inmediatamente

**Causas Posibles:**
1. Puertos 3001 o 3443 ya están en uso
2. Certificados SSL no encontrados
3. Dependencias no instaladas
4. Error de permisos

**Solución:**

**Paso 1**: Verificar puertos en uso

```bash
# Linux
sudo lsof -i :3001
sudo lsof -i :3443

# Windows
netstat -ano | findstr :3001
netstat -ano | findstr :3443
```

**Si hay procesos usando los puertos:**

```bash
# Linux - matar proceso
sudo kill -9 <PID>

# Windows - matar proceso
taskkill /PID <PID> /F
```

**Paso 2**: Verificar certificados SSL

```bash
cd ~/scape-room-software
ls -la cert/

# Deberías ver:
# privkey1.pem
# cert1.pem
# chain1.pem
# fullchain1.pem
```

**Si faltan certificados:**
- Contacta al administrador para obtenerlos
- Cópialos a la carpeta `/cert`

**Paso 3**: Reinstalar dependencias

```bash
cd ~/scape-room-software
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install
```

**Paso 4**: Verificar permisos

```bash
# Linux - dar permisos
chmod -R 755 ~/scape-room-software

# Verificar propietario
ls -la ~/scape-room-software
# Debería ser tu usuario
```

**Paso 5**: Intentar iniciar de nuevo

```bash
pnpm --filter @scape-room/server dev
```

**Revisar logs:**

```bash
# Logs del servidor
cat apps/server/logs/combined.log
cat apps/server/logs/error.log
```

---

### ❌ Servidor se cierra inesperadamente

**Síntoma:**
- Servidor funciona por un tiempo y luego se cierra
- Apps pierden conexión

**Causas Posibles:**
1. Error no manejado en el código
2. Memoria insuficiente
3. Problema con Node.js

**Solución:**

**Paso 1**: Revisar logs de error

```bash
cd ~/scape-room-software/apps/server
cat logs/error.log | tail -n 50
```

**Paso 2**: Verificar memoria disponible

```bash
# Linux
free -h

# Windows
# Administrador de tareas → Rendimiento → Memoria
```

**Si memoria es insuficiente:**
- Cierra otras aplicaciones
- Reinicia el servidor
- Considera aumentar RAM

**Paso 3**: Ejecutar con más información de debug

```bash
# Ejecutar con logs detallados
NODE_ENV=development pnpm --filter @scape-room/server dev
```

**Paso 4**: Configurar reinicio automático (systemd en Linux)

```bash
sudo nano /etc/systemd/system/scape-room-server.service
```

Agregar línea:
```ini
Restart=always
RestartSec=10
```

```bash
sudo systemctl daemon-reload
sudo systemctl restart scape-room-server
```

---

### ❌ Error: "Cannot find module"

**Síntoma:**
- Error al iniciar servidor: `Cannot find module 'socket.io'`

**Causa:**
- Dependencias no instaladas

**Solución:**

```bash
cd ~/scape-room-software
pnpm install

# Si persiste
cd apps/server
pnpm install
```

---

## Problemas de Arduinos

### ❌ Arduino no aparece como conectado en Admin iPad

**Síntoma:**
- Arduino no aparece en lista de dispositivos
- Estado muestra "Desconectado"

**Causas Posibles:**
1. Arduino no se conectó a la red
2. Arduino no envió POST /connect
3. IP del servidor incorrecta en código Arduino
4. Firewall bloqueando puerto 3001

**Solución:**

**Paso 1**: Verificar logs del Serial Monitor del Arduino

**Si red no conecta:**
- Verifica SSID y password en código Arduino
- Verifica que router esté encendido
- Acércate al router (problemas de señal)

**Si no puede conectar al servidor:**
- Verifica IP del servidor en código: `192.168.18.164`
- Verifica puerto: `3001`
- Ping desde otro dispositivo: `ping 192.168.18.164`

**Paso 2**: Verificar logs del servidor

```bash
# Deberías ver algo como:
[INFO] POST /connect
[INFO] Arduino buttons registrado: 192.168.18.101:8080
```

**Si no aparece el log:**

**Paso 3**: Verificar firewall del servidor

```bash
# Linux - permitir puerto 3001
sudo ufw allow 3001/tcp

# Windows - agregar regla en firewall
```

**Paso 4**: Reiniciar Arduino

- Presiona botón reset en Arduino
- Espera 30 segundos
- Verifica logs

---

### ❌ Arduino se desconecta constantemente

**Síntoma:**
- Arduino aparece como conectado pero luego se desconecta
- Admin iPad muestra "Desconectado" después de un tiempo

**Causas Posibles:**
1. Heartbeat no se envía correctamente
2. Problemas de red
3. Timeout muy corto

**Solución:**

**Paso 1**: Verificar heartbeat en logs del Arduino

```
Enviando heartbeat...
Heartbeat enviado: 200 OK
```

**Si heartbeat no se envía:**
- Verifica que el código Arduino tenga loop de heartbeat cada 10-15 segundos
- Recompila y sube código

**Paso 2**: Verificar logs del servidor

```bash
# Deberías ver cada 15 segundos:
[INFO] POST /heartbeat - Arduino: buttons
```

**Paso 3**: Aumentar timeout (si es necesario)

Edita `apps/server/.env`:

```bash
# Aumentar de 30s a 60s
ARDUINO_TIMEOUT=60000
```

Reinicia servidor.

**Paso 4**: Verificar señal red

- Acerca el Arduino al router
- Usa antena externa si es posible
- Reduce interferencias (microondas, otros red)

---

### ❌ Arduino envía eventos pero apps no los reciben

**Síntoma:**
- Serial Monitor muestra "Evento enviado: 200 OK"
- Apps cliente no actualizan

**Causas Posibles:**
1. Nombre del evento incorrecto
2. WebSocket no está distribuyendo eventos
3. Apps no están escuchando el evento correcto

**Solución:**

**Paso 1**: Verificar nombre del evento en Arduino

```cpp
// Debe coincidir exactamente
event: "buttons:state-changed"  // ✅ Correcto
event: "buttons:stateChanged"   // ❌ Incorrecto
```

**Eventos válidos:**
- `buttons:state-changed`
- `connections:state-changed`
- `nfc:state-changed`

**Paso 2**: Verificar logs del servidor

```bash
# Deberías ver:
[INFO] POST /dispatch
[INFO] Evento recibido: buttons:state-changed
[INFO] Broadcasting evento a X clientes
```

**Paso 3**: Verificar consola del navegador en apps cliente

Abre consola (F12) y busca:

```
Socket event received: buttons:state-changed
Data: {...}
```

**Si no aparece:**
- App no está escuchando el evento
- Revisa código de la app
- Verifica que WebSocket esté conectado

---

## Problemas de Clientes (Apps Web)

### ❌ App muestra "Error de conexión" o "Desconectado"

**Síntoma:**
- App carga pero muestra error de conexión
- WebSocket no conecta

**Causas Posibles:**
1. Servidor no está ejecutándose
2. URL incorrecta en `.env`
3. Certificado SSL no aceptado
4. Firewall bloqueando puerto 3443

**Solución:**

**Paso 1**: Verificar que servidor esté corriendo

```bash
# En el servidor
ps aux | grep node

# Debería mostrar proceso del servidor
```

**Si no está corriendo:**
```bash
cd ~/scape-room-software
pnpm --filter @scape-room/server dev
```

**Paso 2**: Verificar URL en .env de la app

```bash
cd ~/scape-room-software/apps/[nombre-app]
cat .env

# Debería mostrar:
VITE_SERVER_URL=https://192.168.18.164:3443
```

**Si es incorrecta:**
- Edita el archivo `.env`
- Guarda
- Recompila: `pnpm run build`
- Recarga la app en navegador (Ctrl+F5)

**Paso 3**: Verificar certificado SSL

1. Abre la URL en navegador: `https://192.168.18.164:3443`
2. Si aparece advertencia de certificado:
   - Click en **Avanzado**
   - Click en **Visitar este sitio web** o **Proceed to...** 
3. Acepta el certificado
4. Recarga la app

**Paso 4**: Verificar firewall

```bash
# Linux
sudo ufw allow 3443/tcp

# Windows
# Agregar regla en Firewall de Windows
```

**Paso 5**: Verificar consola del navegador (F12)

Busca errores:
```
WebSocket connection failed
ERR_CONNECTION_REFUSED
ERR_CERT_AUTHORITY_INVALID
```

---

### ❌ App carga pero no muestra datos

**Síntoma:**
- App carga correctamente
- WebSocket conectado
- No se muestran datos del juego

**Causas Posibles:**
1. WebSocket no está recibiendo eventos
2. Estado del servidor está vacío
3. Error en código de la app

**Solución:**

**Paso 1**: Verificar conexión WebSocket en consola (F12)

```
Socket connected
Registered as: [app-type]
State received: {...}
```

**Paso 2**: Verificar que datos se estén recibiendo

En consola:
```javascript
// Ejecutar en consola del navegador
console.log('Socket connected:', socket.connected);
```

**Paso 3**: Forzar actualización de estado

En Admin iPad:
1. Abre consola (F12)
2. Click en "Actualizar" o "Refresh State"
3. Verifica logs en consola

**Paso 4**: Reiniciar app

- Recarga página (Ctrl+F5)
- Borra caché del navegador
- Cierra y abre navegador

---

### ❌ App muestra advertencia de certificado SSL cada vez

**Síntoma:**
- Cada vez que abres la app, pide aceptar certificado
- En iPad/tablet, aparece advertencia constantemente

**Causa:**
- Certificado SSL es autofirmado o para otro dominio

**Solución Temporal:**

**En navegador de escritorio:**
- Acepta certificado y marca "Recordar" si está disponible

**En Safari (iPad):**
1. Settings → General → About → Certificate Trust Settings
2. Habilita certificado del servidor
3. Recarga app

**En Chrome (Android):**
- Acepta certificado
- Chrome debería recordarlo

**Solución Permanente:**

Instala certificado válido:
1. Obtén certificado de Let's Encrypt o autoridad certificadora
2. Reemplaza archivos en `/cert`
3. Reinicia servidor

---

## Problemas de Impresora

### ❌ PDF no se imprime

**Síntoma:**
- AI App completa flujo
- Logs muestran "Imprimiendo PDF"
- Impresora no imprime nada

**Causas Posibles:**
1. Impresora no está configurada
2. Nombre de impresora incorrecto en `.env`
3. Impresora offline o sin papel
4. CUPS no instalado (Linux)

**Solución:**

**Paso 1**: Verificar logs del servidor

```bash
cat apps/server/logs/combined.log | grep PRINTER

# Deberías ver:
[PRINTER] Plataforma detectada: linux
[PRINTER] Imprimiendo PDF: /ruta/al/pdf
[PRINTER] Usando impresora: Epson-PM-525
[PRINTER] PDF enviado a la impresora exitosamente
```

**Si hay error:**
```
[PRINTER] Error al imprimir: [mensaje de error]
```

**Paso 2**: Verificar nombre de impresora

```bash
# Linux
lpstat -p
# Copia el nombre exacto de la impresora

# Windows
Get-Printer | Select-Object Name
```

**Paso 3**: Actualizar .env del servidor

```bash
nano apps/server/.env

# Actualizar con nombre exacto:
PRINTER_NAME=Epson-PM-525
```

Reinicia servidor.

**Paso 4**: Verificar que impresora esté online

```bash
# Linux
lpstat -p Epson-PM-525
# Debería mostrar: printer Epson-PM-525 is idle

# Si está pausada:
cupsenable Epson-PM-525

# Windows
# Configuración → Impresoras → Verificar estado
```

**Paso 5**: Prueba manual de impresión

```bash
# Linux
lp -d Epson-PM-525 apps/server/to-print/to-print.pdf

# Windows
# Click derecho en PDF → Imprimir
```

**Si prueba manual funciona pero app no:**
- Revisa permisos del archivo PDF
- Verifica ruta del PDF en `.env`
- Verifica que servidor tenga permisos para imprimir

---

### ❌ Impresora imprime pero con errores

**Síntoma:**
- Impresora imprime pero contenido es ilegible
- Páginas en blanco
- Formato incorrecto

**Causas Posibles:**
1. PDF corrupto
2. Controladores de impresora incorrectos
3. Configuración de impresión incorrecta

**Solución:**

**Paso 1**: Verificar PDF manualmente

```bash
# Abre el PDF y verifica que se vea bien
xdg-open apps/server/to-print/to-print.pdf  # Linux
start apps/server/to-print/to-print.pdf      # Windows
```

**Paso 2**: Reinstalar controladores de impresora

- Descarga controladores actualizados de Epson
- Desinstala controladores viejos
- Instala nuevos controladores
- Reinicia sistema

**Paso 3**: Configurar opciones de impresión

```bash
# Linux - opciones por defecto
lpoptions -d Epson-PM-525 -l
# Ajusta opciones si es necesario
```

---

## Problemas de Certificados SSL

### ❌ Error: "Certificate has expired"

**Síntoma:**
- Navegadores muestran error de certificado expirado
- Apps no pueden conectar

**Causa:**
- Certificado SSL ha expirado

**Solución:**

**Paso 1**: Verificar fecha de expiración

```bash
openssl x509 -in cert/cert1.pem -noout -dates

# Salida:
# notBefore=... 
# notAfter=Nov 15 2025 12:00:00 GMT
```

**Paso 2**: Renovar certificado

Si el certificado ha expirado:
1. Contacta al administrador del dominio
2. Solicita certificado renovado
3. Reemplaza archivos en `/cert`
4. Reinicia servidor

**Paso 3**: Verificación

```bash
# Reinicia servidor
pnpm --filter @scape-room/server dev

# Verifica en navegador
# https://192.168.18.164:3443
```

---

### ❌ Error: "NET::ERR_CERT_AUTHORITY_INVALID"

**Síntoma:**
- Navegador no confía en el certificado
- Advertencia de seguridad

**Causa:**
- Certificado es autofirmado o no es de autoridad confiable

**Solución:**

**Temporal** (para desarrollo/testing):
- Acepta el certificado manualmente en cada dispositivo

**Permanente**:
1. Obtén certificado de Let's Encrypt u otra autoridad
2. Reemplaza certificados en `/cert`
3. Reinicia servidor

---

## Problemas de WebSocket

### ❌ WebSocket desconecta constantemente

**Síntoma:**
- App se desconecta y reconecta repetidamente
- Logs muestran: "Socket disconnected" → "Socket connected"

**Causas Posibles:**
1. Problemas de red inestable
2. Timeout muy corto
3. Servidor sobrecargado

**Solución:**

**Paso 1**: Verificar estabilidad de red

```bash
# Ping continuo al servidor
ping 192.168.18.164 -c 100

# Verificar que no haya pérdida de paquetes
# 0% packet loss es ideal
```

**Paso 2**: Aumentar timeouts en servidor

Edita `apps/server/src/index.ts`:

```typescript
const io = new Server({
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,  // Aumentar a 60s
  pingInterval: 25000  // Aumentar a 25s
});
```

Reinicia servidor.

**Paso 3**: Reducir carga del servidor

- Cierra apps innecesarias
- Verifica uso de CPU y memoria
- Considera hardware más potente

---

### ❌ WebSocket no envía eventos a todos los clientes

**Síntoma:**
- Algunos clientes reciben eventos, otros no
- Comportamiento inconsistente

**Causas Posibles:**
1. Cliente no está registrado correctamente
2. Cliente está en otra sesión
3. Error en código del servidor

**Solución:**

**Paso 1**: Verificar que todos los clientes estén registrados

En logs del servidor:
```
[INFO] Client registered: admin-ipad
[INFO] Client registered: tablet-feedback
[INFO] Client registered: main-screen
...
```

**Paso 2**: Verificar número de clientes conectados

En Admin iPad:
- Debería mostrar lista de todos los dispositivos conectados

**Paso 3**: Reiniciar clientes que no reciben eventos

- Recarga página (Ctrl+F5)
- Verifica consola del navegador
- Confirma que veas logs de registro

---

## Problemas de Rendimiento

### ❌ Sistema está lento o con lag

**Síntoma:**
- Apps responden lentamente
- Delay entre acciones y actualizaciones
- Proyección en Main Screen tiene lag

**Causas Posibles:**
1. Servidor con recursos insuficientes
2. Red congestionada
3. Demasiados clientes conectados

**Solución:**

**Paso 1**: Verificar recursos del servidor

```bash
# Linux
top
htop  # si está instalado

# Busca proceso node
# Verifica CPU % y MEM %

# Windows
# Administrador de tareas → Rendimiento
```

**Paso 2**: Optimizar servidor

```bash
# Cerrar apps innecesarias
# Reiniciar servidor
pnpm --filter @scape-room/server dev

# Considerar aumentar RAM o CPU
```

**Paso 3**: Reducir broadcast innecesario

Si tienes acceso al código:
- Revisa que eventos solo se envíen cuando haya cambios
- Evita broadcasts cada segundo
- Usa throttling/debouncing

**Paso 4**: Verificar ancho de banda

```bash
# Instalar iperf3
sudo apt-get install iperf3

# En servidor
iperf3 -s

# En cliente
iperf3 -c 192.168.18.164

# Verifica velocidad de red
```

---

## Diagnóstico Avanzado

### Herramientas de Diagnóstico

#### Verificar Estado Completo del Sistema

```bash
# En el servidor
cd ~/scape-room-software

# Revisar logs
cat apps/server/logs/combined.log | tail -n 100
cat apps/server/logs/error.log

# Verificar procesos
ps aux | grep node

# Verificar puertos
sudo lsof -i :3001
sudo lsof -i :3443

# Verificar conexiones activas
sudo netstat -tnp | grep :3443
```

#### Logs en Tiempo Real

```bash
# Linux
tail -f apps/server/logs/combined.log

# Con colores (si tienes grc)
tail -f apps/server/logs/combined.log | grc cat
```

#### Test de Conectividad Completo

```bash
#!/bin/bash
# test-connectivity.sh

echo "=== Test de Conectividad ==="

echo "1. Ping al router:"
ping -c 3 192.168.18.1

echo "2. Ping al servidor:"
ping -c 3 192.168.18.164

echo "3. Ping a Arduinos:"
ping -c 3 192.168.18.101
ping -c 3 192.168.18.102
ping -c 3 192.168.18.103

echo "4. Test de puertos del servidor:"
nc -zv 192.168.18.164 3001
nc -zv 192.168.18.164 3443

echo "5. Test de DNS:"
nslookup google.com

echo "=== Fin del Test ==="
```

```bash
chmod +x test-connectivity.sh
./test-connectivity.sh
```