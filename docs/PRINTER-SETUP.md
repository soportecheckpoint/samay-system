# Configuración de Impresora para AI App

Este documento explica cómo configurar la impresora Epson PM-525 (u otra impresora) para que el servidor pueda imprimir el PDF automáticamente cuando se complete el módulo de AI App.

## 📋 Requisitos

- **Impresora**: Epson PM-525 conectada por WiFi
- **Sistema Operativo**: Linux o Windows
- **Red**: La impresora y el servidor deben estar en la misma red

---

## 🐧 Configuración en Linux

### 1. Instalar CUPS (Sistema de Impresión)

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install cups cups-client

# Fedora/RHEL
sudo dnf install cups

# Arch Linux
sudo pacman -S cups
```

### 2. Iniciar el Servicio CUPS

```bash
sudo systemctl start cups
sudo systemctl enable cups
```

### 3. Acceder a la Interfaz Web de CUPS

1. Abre tu navegador web
2. Ve a: `http://localhost:631`
3. Navega a **Administration** > **Add Printer**
4. Inicia sesión con tu usuario y contraseña del sistema

### 4. Agregar la Impresora Epson PM-525

1. Selecciona tu impresora de la lista de impresoras detectadas en la red
2. Si no aparece, selecciona **Internet Printing Protocol (ipp)** o **LPD/LPR Host or Printer**
3. Para WiFi, usa la IP de tu impresora: `ipp://[IP_IMPRESORA]:631/ipp/print`
4. Sigue el asistente para completar la configuración
5. Asigna un nombre a la impresora (por ejemplo: `Epson-PM-525`)

### 5. Verificar que la Impresora Esté Configurada

```bash
# Listar impresoras disponibles
lpstat -p -d

# Imprimir un archivo de prueba
lp -d Epson-PM-525 /ruta/al/archivo.pdf
```

### 6. Configurar Variables de Entorno

Edita el archivo `.env` en `apps/server/`:

```bash
# Nombre de la impresora configurada en CUPS
PRINTER_NAME=Epson-PM-525

# Ruta al PDF (opcional, usa el valor por defecto si no se especifica)
PDF_PATH=
```

---

## 🪟 Configuración en Windows

### 1. Conectar la Impresora por WiFi

1. Abre **Configuración** > **Dispositivos** > **Impresoras y escáneres**
2. Haz clic en **Agregar impresora o escáner**
3. Windows buscará impresoras disponibles en la red
4. Selecciona tu **Epson PM-525** y sigue el asistente de instalación

### 2. Instalar Controladores

Si Windows no encuentra los controladores automáticamente:

1. Descarga los controladores desde el sitio web de Epson
2. Instala los controladores manualmente
3. Reinicia el sistema si es necesario

### 3. Establecer como Impresora Predeterminada (Opcional)

1. Ve a **Configuración** > **Dispositivos** > **Impresoras y escáneres**
2. Selecciona tu impresora **Epson PM-525**
3. Haz clic en **Administrar** > **Establecer como predeterminada**

### 4. Obtener el Nombre de la Impresora

```powershell
# Listar todas las impresoras instaladas
Get-Printer | Select-Object Name

# O usando CMD
wmic printer get name
```

El nombre será algo como: `EPSON PM-525` o `EPSON PM-525 Series`

### 5. Probar Impresión

```powershell
# PowerShell - Imprimir un PDF de prueba
Start-Process -FilePath "C:\ruta\al\archivo.pdf" -Verb Print -WindowStyle Hidden
```

### 6. Configurar Variables de Entorno

Edita el archivo `.env` en `apps/server/`:

```bash
# Nombre exacto de la impresora (tal como aparece en Windows)
PRINTER_NAME=EPSON PM-525

# Ruta al PDF (opcional)
PDF_PATH=
```

---

## 🔧 Configuración del Servidor

### Variables de Entorno

Crea o edita el archivo `.env` en `apps/server/`:

```bash
# HTTP Server (for Arduino communication)
HTTP_PORT=3001

# HTTPS Server (for web clients)
HTTPS_PORT=3443

# Host binding
HOST=0.0.0.0

NODE_ENV=development
ARDUINO_TIMEOUT=30000

# Printer Configuration
# Leave PRINTER_NAME empty to use system default printer
# For Linux: use printer name from 'lpstat -p' (e.g., "Epson-PM-525")
# For Windows: use printer name from Control Panel (e.g., "EPSON PM-525")
PRINTER_NAME=Epson-PM-525

# Path to PDF file to print (relative to server directory)
# Default: to-print/to-print.pdf
PDF_PATH=
```

### Ubicación del PDF

Por defecto, el servidor buscará el PDF en:

```
apps/server/to-print/to-print.pdf
```

Si quieres usar una ubicación diferente, especifica la ruta completa en `PDF_PATH`:

```bash
# Linux
PDF_PATH=/home/usuario/documentos/certificado.pdf

# Windows
PDF_PATH=C:\Users\Usuario\Documents\certificado.pdf
```

---

## 🧪 Pruebas

### Probar la Impresión desde el Servidor

1. Inicia el servidor:

   ```bash
   pnpm --filter @scape-room/server dev
   ```

2. Conecta la app `ai-app`:

   ```bash
   pnpm --filter ai-app dev
   ```

3. Completa el flujo de la app hasta llegar a la vista **FINAL**

4. El PDF se imprimirá automáticamente

### Verificar Logs del Servidor

El servidor registrará los siguientes mensajes:

```
[AI-APP] Solicitando impresión de PDF
[PRINTER] Plataforma detectada: linux
[PRINTER] Imprimiendo PDF: /ruta/al/pdf
[PRINTER] Usando impresora: Epson-PM-525
[PRINTER] PDF enviado a la impresora exitosamente
```

Si hay un error:

```
[PRINTER] Error al imprimir: [mensaje de error]
```

---

## 🐛 Solución de Problemas

### Linux

**Problema**: `lp: The printer or class does not exist`

**Solución**:

```bash
# Verificar que la impresora esté configurada
lpstat -p

# Verificar impresora predeterminada
lpstat -d

# Reiniciar CUPS
sudo systemctl restart cups
```

**Problema**: Permisos insuficientes

**Solución**:

```bash
# Agregar tu usuario al grupo 'lp'
sudo usermod -a -G lp $USER

# Cerrar sesión y volver a iniciar
```

**Problema**: No se puede conectar a la impresora WiFi

**Solución**:

1. Verifica que la impresora esté encendida y conectada a la red
2. Obtén la IP de la impresora desde su panel de control
3. Haz ping a la impresora: `ping [IP_IMPRESORA]`
4. Agrega la impresora manualmente usando su IP en CUPS

### Windows

**Problema**: PowerShell no puede abrir el archivo PDF

**Solución**:

1. Asegúrate de tener un lector de PDF instalado (Adobe Reader, etc.)
2. Verifica que el PDF esté asociado con una aplicación predeterminada
3. Haz clic derecho en un PDF > **Abrir con** > Selecciona tu lector

**Problema**: No se encuentra la impresora

**Solución**:

```powershell
# Verificar que la impresora esté instalada
Get-Printer

# Reiniciar el servicio de impresión
Restart-Service Spooler
```

**Problema**: La impresora no imprime

**Solución**:

1. Ve a **Dispositivos** > **Impresoras y escáneres**
2. Selecciona tu impresora > **Administrar** > **Imprimir página de prueba**
3. Verifica la cola de impresión: puede haber trabajos pendientes
4. Reinicia el servicio **Cola de impresión**

---

## 📝 Notas Adicionales

- **Seguridad**: Asegúrate de que el servidor tenga permisos para imprimir
- **Red**: La impresora debe estar en la misma red que el servidor
- **Formato**: El archivo debe ser un PDF válido
- **Pruebas**: Realiza pruebas antes del evento real

---

## 🔗 Referencias

### Linux

- [CUPS Documentation](https://www.cups.org/documentation.html)
- [Ubuntu Printing Guide](https://help.ubuntu.com/community/NetworkPrintingWithUbuntu)

### Windows

- [Windows Printing](https://support.microsoft.com/en-us/windows/printer-problems-in-windows-10-8-and-7-a6c06e0a-6c7f-6ff4-3e6e-9e4d8f8b8e2f)
- [PowerShell Printing](https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.management/start-process)

### Epson PM-525

- [Epson Support](https://epson.com/Support)
