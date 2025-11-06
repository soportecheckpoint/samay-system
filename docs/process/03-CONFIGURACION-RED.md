# Configuración de Red - Scape Room Software

## Tabla de Contenidos
- [Introducción](#introducción)
- [Arquitectura de Red](#arquitectura-de-red)
- [Configuración del Router](#configuración-del-router)
- [Asignación de IPs](#asignación-de-ips)
- [Resolución de Problemas de Dominio](#resolución-de-problemas-de-dominio)
- [Guías por Marca de Router](#guías-por-marca-de-router)

---

## Introducción

Este documento detalla la configuración de red para el sistema Scape Room, con enfoque en **4 salas idénticas** conectadas a un Starlink como fuente principal de internet.

### Puntos Clave

- **4 salas aisladas**: Cada sala tiene su propia red local
- **Segmento idéntico**: Todas las salas usan `192.168.18.0/24`
- **IP del servidor fija**: `192.168.18.164` en todas las salas
- **Configuración basada en MAC**: IPs estáticas mediante reservas DHCP
- **Router por sala**: `192.168.18.1` como gateway

---

## Arquitectura de Red

### Topología Completa (4 Salas)

```
                         INTERNET
                            │
                    ┌───────▼────────┐
                    │   STARLINK     │
                    │  Router WAN    │
                    └───────┬────────┘
                            │
         ┌──────────────────┼──────────────────┐
         │                  │                  │
    ┌────▼─────┐       ┌───▼──────┐      ┌───▼──────┐
    │  Router  │       │  Router  │      │  Router  │
    │  Sala 1  │       │  Sala 2  │      │  Sala 3  │  ...
    │ .18.1    │       │ .18.1    │      │ .18.1    │
    └────┬─────┘       └────┬─────┘      └────┬─────┘
         │                  │                  │
         │                  │                  │
    192.168.18.0/24   192.168.18.0/24   192.168.18.0/24
```

### Segmento de Red por Sala

```
┌──────────────────────────────────────────────────────┐
│              Sala X - Red Local                      │
│                                                      │
│  Segmento:         192.168.18.0/24                   │
│  Gateway (Router): 192.168.18.1                      │
│  Máscara:          255.255.255.0                     │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │  Dispositivos con IP Fija (Reserva DHCP)       │  │
│  ├────────────────────────────────────────────────┤  │
│  │  Servidor:           192.168.18.164            │  │
│  │  Arduino Botones:    192.168.18.101            │  │
│  │  Arduino Conexiones: 192.168.18.102            │  │
│  │  Arduino NFC:        192.168.18.103            │  │
│  │  Arduino Pelotas:    192.168.18.104            │  │
│  │  Impresora:          192.168.18.105 (opcional) │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │  Dispositivos con DHCP Dinámico                │  │
│  ├────────────────────────────────────────────────┤  │
│  │  Admin iPad:         192.168.18.20-50          │  │
│  │  Tablet Feedback:    192.168.18.20-50          │  │
│  │  Main Screen:        192.168.18.20-50          │  │
│  │  Totem Táctil:       192.168.18.20-50          │  │
│  │  Buttons Game:       192.168.18.20-50          │  │
│  │  AI App:             192.168.18.20-50          │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

---

## Configuración del Router

### Parámetros Básicos

**IMPORTANTE**: Estos parámetros son iguales en todas las salas.

```
IP del Router (Gateway):  192.168.18.1
Máscara de Subred:        255.255.255.0
DHCP:                     Habilitado
Rango DHCP:               192.168.18.20 - 192.168.18.200
Dominio Local (opcional): sala.local
UPnP:                     Habilitado (recomendado)
```

### Tabla de Reservas DHCP

**CRÍTICO**: Estas reservas deben configurarse en el router basándose en las MAC addresses de los dispositivos.

| Dispositivo            | IP Reservada      | MAC Address         | Notas                          |
|------------------------|-------------------|---------------------|--------------------------------|
| Servidor               | 192.168.18.164    | aa:bb:cc:dd:ee:ff   | **OBLIGATORIO**                |
| Arduino Botones        | 192.168.18.101    | aa:bb:cc:dd:ee:a1   | **OBLIGATORIO**                |
| Arduino Conexiones     | 192.168.18.102    | aa:bb:cc:dd:ee:a2   | **OBLIGATORIO**                |
| Arduino NFC            | 192.168.18.103    | aa:bb:cc:dd:ee:a3   | **OBLIGATORIO**                |
| Impresora Epson PM-525 | 192.168.18.105    | aa:bb:cc:dd:ee:b1   | Opcional (recomendado)         |

**NOTA**: Las MAC addresses varían entre dispositivos. Debes obtenerlas antes de configurar las reservas.

---

## Asignación de IPs

### Esquema de IPs

```
192.168.18.0      - Dirección de red (no usar)
192.168.18.1      - Router/Gateway
192.168.18.20-50  - Rango DHCP para dispositivos cliente
192.168.18.100-110 - Dispositivos periféricos (impresoras, etc.)
192.168.18.164     - SERVIDOR (IP FIJA)
192.168.18.255     - Broadcast (no usar)
```

### IPs Clave (TODAS LAS SALAS)

| Dispositivo               | IP             | Tipo       |
|---------------------------|----------------|------------|
| Router (Gateway)          | 192.168.18.1   | Estática   |
| **SERVIDOR**              | **192.168.18.164** | **Estática por MAC** |
| Arduino Botones           | 192.168.18.101 | Estática por MAC |
| Arduino Conexiones        | 192.168.18.102 | Estática por MAC |
| Arduino NFC               | 192.168.18.103 | Estática por MAC |
| Arduino NFC               | 192.168.18.104 | Estática por MAC |
| Impresora                 | 192.168.18.105 | Estática por MAC (opcional) |

---

## Resolución de Problemas de Dominio

### Escenario: Dominio vs IP

El sistema puede usar dos métodos de conexión:

1. **Por Dominio**: `https://samay.checkappia.com:3443`
2. **Por IP**: `https://192.168.18.164:3443`

### Archivo hosts

Configura el archivo `hosts` en cada dispositivo cliente:

1. Abre **Bloc de notas como Administrador**
2. Archivo → Abrir → `C:\Windows\System32\drivers\etc\hosts`
3. Agregar al final:

```
192.168.18.164  samay.checkappia.com
```

4. Guardar

### Verificar Resolución de Dominio

#### Probar Resolución DNS

```bash
# Linux/Mac/Windows
nslookup samay.checkappia.com

# Deberías ver la IP pública del servidor
# Si configuraste hosts, verás 192.168.18.164

# Alternativa con ping
ping samay.checkappia.com
```

#### Probar Conexión al Servidor

```bash
# Por IP
curl -k https://192.168.18.164:3443

# Por dominio (si está configurado)
curl -k https://samay.checkappia.com:3443

# Ambos deberían responder
```

---

## Guías por Marca de Router

### TP-Link

#### Acceder al Router

```
URL: http://192.168.18.1
Usuario por defecto: admin
Contraseña por defecto: admin
```

#### Cambiar Segmento de Red

1. **Network** → **LAN**
2. **IP Address**: `192.168.18.1`
3. **Subnet Mask**: `255.255.255.0`
4. Save

#### Configurar DHCP

1. **DHCP** → **DHCP Settings**
2. **DHCP Server**: Enable
3. **Start IP Address**: `192.168.18.20`
4. **End IP Address**: `192.168.18.200`
5. **Default Gateway**: `192.168.18.1`
6. **Primary DNS**: `8.8.8.8`
7. **Secondary DNS**: `8.8.4.4`
8. Save

#### Reservas DHCP (Address Reservation)

1. **DHCP** → **Address Reservation**
2. **Add New**
3. **MAC Address**: aa:bb:cc:dd:ee:ff
4. **Reserved IP Address**: 192.168.18.164
5. **Status**: Enabled
6. Save

---

### Linksys

#### Acceder al Router

```
URL: http://192.168.18.1
Usuario por defecto: admin
Contraseña: (vacía o "admin")
```

#### Cambiar Segmento de Red

1. **Setup** → **Basic Setup**
2. **Router IP**: `192.168.18.1`
3. **Subnet Mask**: `255.255.255.0`
4. Save Settings

#### Configurar DHCP

1. **Setup** → **Basic Setup**
2. **DHCP Server**: Enable
3. **Starting IP Address**: `192.168.18.20`
4. **Maximum Number of Users**: 180
5. **Static DNS 1**: `8.8.8.8`
6. **Static DNS 2**: `8.8.4.4`
7. Save Settings

#### Reservas DHCP

1. **Setup** → **DHCP Reservation**
2. Selecciona el dispositivo de la lista o **Manually Add Client**
3. **Client Name**: Servidor
4. **MAC Address**: aa:bb:cc:dd:ee:ff
5. **Reserved IP**: 192.168.18.164
6. Add

---

### Netgear

#### Acceder al Router

```
URL: http://192.168.18.1 o http://routerlogin.net
Usuario por defecto: admin
Contraseña: password (o la que configuraste)
```

#### Cambiar Segmento de Red

1. **Advanced** → **Setup** → **LAN Setup**
2. **IP Address**: `192.168.18.1`
3. **IP Subnet Mask**: `255.255.255.0`
4. Apply

#### Configurar DHCP

1. **Advanced** → **Setup** → **LAN Setup**
2. **Use Router as DHCP Server**: Check
3. **Starting IP Address**: `192.168.18.20`
4. **Ending IP Address**: `192.168.18.200`
5. Apply

#### Reservas DHCP

1. **Advanced** → **Setup** → **LAN Setup**
2. **Address Reservation** → Add
3. **Device Name**: Servidor
4. **IP Address**: 192.168.18.164
5. **MAC Address**: aa:bb:cc:dd:ee:ff
6. Add

---

### ASUS

#### Acceder al Router

```
URL: http://192.168.18.1 o http://router.asus.com
Usuario por defecto: admin
Contraseña: admin
```

#### Cambiar Segmento de Red

1. **LAN** → **LAN IP**
2. **IP Address**: `192.168.18.1`
3. **Subnet Mask**: `255.255.255.0`
4. Apply

#### Configurar DHCP

1. **LAN** → **DHCP Server**
2. **Enable DHCP Server**: Yes
3. **IP Pool Starting Address**: `192.168.18.20`
4. **IP Pool Ending Address**: `192.168.18.200`
5. **DNS Server 1**: `8.8.8.8`
6. **DNS Server 2**: `8.8.4.4`
7. Apply

#### Reservas DHCP

1. **LAN** → **DHCP Server**
2. **Manually Assigned IP around the DHCP list**
3. **MAC Address**: aa:bb:cc:dd:ee:ff
4. **IP Address**: 192.168.18.164
5. **+** (Add)
6. Apply

---

### D-Link

#### Acceder al Router

```
URL: http://192.168.18.1
Usuario por defecto: admin
Contraseña: (vacía o "admin")
```

#### Cambiar Segmento de Red

1. **Settings** → **Network Settings**
2. **Router IP Address**: `192.168.18.1`
3. **Subnet Mask**: `255.255.255.0`
4. Save Settings

#### Configurar DHCP

1. **Settings** → **Network Settings**
2. **DHCP Server**: Enable
3. **DHCP IP Address Range**: `192.168.18.20` to `192.168.18.200`
4. **Primary DNS Server**: `8.8.8.8`
5. **Secondary DNS Server**: `8.8.4.4`
6. Save Settings

#### Reservas DHCP

1. **Settings** → **Network Settings** → **DHCP Reservation**
2. **Computer Name**: Servidor
3. **IP Address**: 192.168.18.164
4. **MAC Address**: aa:bb:cc:dd:ee:ff
5. Save

---

## Verificación de Configuración

### Checklist de Verificación

- [ ] Router accesible en `192.168.18.1`
- [ ] Segmento de red es `192.168.18.0/24`
- [ ] DHCP habilitado
- [ ] Rango DHCP: `192.168.18.20 - 192.168.18.200`
- [ ] Reserva DHCP para servidor: `192.168.18.164`
- [ ] Reservas DHCP para Arduinos: `.101`, `.102`, `.103`, `.104`
- [ ] Servidor obtiene IP correcta: `192.168.18.164`
- [ ] Arduinos obtienen IPs correctas
- [ ] Ping al router funciona
- [ ] Ping a internet funciona
- [ ] DNS resuelve dominios

### Comandos de Verificación

```bash
# Verificar IP del servidor
ip addr show  # Linux
ipconfig      # Windows

# Ping al router
ping 192.168.18.1

# Ping a internet
ping 8.8.8.8

# Listar dispositivos conectados (desde router)
# Depende del router, generalmente en:
# Status → LAN → DHCP Clients
```

---

## Troubleshooting de Red

### Servidor no obtiene IP correcta

**Síntoma**: Servidor obtiene IP diferente a `192.168.18.164`

**Solución:**

1. Verifica MAC address del servidor
2. Verifica reserva DHCP en router con MAC correcta
3. Reinicia interfaz de red del servidor:

```bash
# Linux
sudo systemctl restart NetworkManager

# Windows
ipconfig /release
ipconfig /renew
```

4. Reinicia el servidor si es necesario

### Arduino no obtiene IP fija

**Síntoma**: Arduino obtiene IP dinámica en lugar de la fija

**Solución:**

1. Verifica MAC address del Arduino (logs en Serial Monitor)
2. Configura reserva DHCP en router
3. Reinicia el Arduino
4. Verifica en logs que obtiene IP correcta

### Dispositivos no se comunican

**Síntoma**: Servidor y clientes no se conectan entre sí

**Solución:**

1. Verifica que todos estén en el mismo segmento: `192.168.18.0/24`
2. Ping entre dispositivos:

```bash
# Desde cliente, ping al servidor
ping 192.168.18.164

# Desde servidor, ping al cliente
ping 192.168.18.20
```

3. Verifica firewall del servidor

4. Verifica que router no tenga aislamiento de clientes (Client Isolation)

### Internet no funciona

**Síntoma**: Dispositivos no tienen acceso a internet

**Solución:**

1. Verifica conexión del router al Starlink
2. Reinicia router
3. Verifica DNS en dispositivos:

```bash
# Linux
cat /etc/resolv.conf
# Debería mostrar: nameserver 8.8.8.8

# Windows
ipconfig /all
# Busca: DNS Servers: 8.8.8.8
```

4. Ping a DNS de Google:

```bash
ping 8.8.8.8
```