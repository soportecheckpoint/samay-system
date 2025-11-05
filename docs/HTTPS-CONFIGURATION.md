# Configuración HTTPS

Este proyecto está configurado para trabajar con HTTPS usando el certificado del dominio `samay.checkappia.com`.

## Arquitectura

El sistema soporta dos protocolos simultáneamente:

- **HTTPS (Puerto 3443)**: Para todos los clientes web (React apps)
- **HTTP (Puerto 3001)**: Para comunicación con Arduinos

## Certificados

Los certificados SSL se encuentran en la carpeta `/cert`:
- `privkey1.pem` - Clave privada
- `cert1.pem` - Certificado
- `chain1.pem` - Cadena de certificados
- `fullchain1.pem` - Certificado completo con cadena

## Configuración del Servidor

El servidor central (`apps/server`) escucha en dos puertos:

```
HTTP_PORT=3001   # Para Arduinos
HTTPS_PORT=3443  # Para clientes web
HOST=0.0.0.0
```

El servidor Socket.io está adjunto a ambos servidores HTTP y HTTPS, permitiendo conexiones WebSocket sobre ambos protocolos.

## Configuración de Clientes

Todos los proyectos cliente (Vite + React) están configurados para:

1. **Servidor de desarrollo**: Usa HTTPS con los certificados en `/cert`
2. **Conexión Socket.io**: Apunta a `https://samay.checkappia.com:3443`

### Aplicaciones Cliente

- `admin-ipad`
- `ai-app`
- `buttons-game`
- `main-screen`
- `tablet-feedback`
- `totem-tactil`

Cada aplicación tiene su archivo `.env` configurado con:

```
VITE_SERVER_URL=https://samay.checkappia.com:3443
```

## Variables de Entorno

### Servidor (`apps/server/.env`)
```env
HTTP_PORT=3001
HTTPS_PORT=3443
HOST=0.0.0.0
NODE_ENV=development
ARDUINO_TIMEOUT=30000
```

### Clientes (todos los `apps/*/. env`)
```env
VITE_SERVER_URL=https://samay.checkappia.com:3443
```

## Desarrollo Local

Para desarrollo local, puedes cambiar `VITE_SERVER_URL` a:
```
VITE_SERVER_URL=https://localhost:3443
```

**Nota**: Los navegadores mostrarán una advertencia de certificado porque el certificado es para `samay.checkappia.com`, no para `localhost`. Necesitarás aceptar el certificado manualmente en el navegador.

## Comunicación con Arduinos

Los Arduinos deben comunicarse usando HTTP:
```
http://samay.checkappia.com:3001
```
o usando la IP del servidor:
```
http://[IP_DEL_SERVIDOR]:3001
```

## Ejecución

### Servidor
```bash
cd apps/server
pnpm install
pnpm dev
```

El servidor iniciará en:
- HTTP: `http://0.0.0.0:3001` (Arduinos)
- HTTPS: `https://0.0.0.0:3443` (Web clients)

### Clientes
```bash
cd apps/[nombre-del-cliente]
pnpm install
pnpm dev
```

Cada cliente se ejecutará en HTTPS usando los certificados configurados.

## Troubleshooting

### Error: Cannot find module 'fs'
Si obtienes este error en Vite, asegúrate de que el archivo `vite.config.ts` esté correctamente configurado con las importaciones:
```typescript
import fs from 'fs'
import path from 'path'
```

### Certificado no válido
Si el certificado ha expirado o no es válido, necesitarás renovarlo y actualizar los archivos en `/cert`.

### Puerto en uso
Si los puertos 3001 o 3443 están en uso:
```bash
# Linux/Mac
lsof -i :3001
lsof -i :3443

# Matar el proceso
kill -9 [PID]
```

### WebSocket no conecta
Verifica que:
1. El servidor esté ejecutándose
2. El `VITE_SERVER_URL` en el cliente apunte al servidor correcto
3. No hay firewalls bloqueando los puertos 3001 o 3443
