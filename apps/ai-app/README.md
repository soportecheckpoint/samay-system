# AI App - Escape Room Module

Módulo interactivo de la sala de escape que simula una experiencia bancaria guiada por IA.

## 🎯 Flujo de Vistas

1. **Home** (`ai_home.png`) - Vista inicial, avanza con click
2. **Audio** (`ai_audio.png`) - Se muestra 5 segundos y avanza automáticamente
3. **Code** (`ai_code.png`) - Input de 8 caracteres para código
4. **Dates** (`ai_dates.png`) - Se muestra 5 segundos y avanza automáticamente
5. **Selector** (`ai_selector.png`) - Selección múltiple con validación
6. **Final** (`ai_final.png`) - Vista final que envía evento de impresión

## 🔐 Códigos y Respuestas Correctas

### Código de 8 caracteres
Por defecto: `12345678`

Se puede configurar con la variable de entorno:
```bash
VITE_AI_CODE=12345678
```

### Opción correcta del selector
Opción #2: "Le imprimes una tarjeta nueva y generas acceso a banca digital"

## 🎨 Imágenes Requeridas

Todas las imágenes deben estar en la carpeta `/public/`:
- `ai_home.png` - Pantalla de inicio
- `ai_audio.png` - Pantalla de audio/instrucciones
- `ai_code.png` - Fondo para input de código
- `ai_dates.png` - Pantalla de fechas
- `ai_selector.png` - Fondo para selector de opciones
- `ai_final.png` - Pantalla final

## 🔌 Eventos Socket.IO

### Eventos enviados al servidor

- `ai:print-pdf` - Solicita impresión de PDF en la vista final
- `ai:code-correct` - Notifica cuando el código es correcto
- `ai:selector-correct` - Notifica cuando se selecciona la opción correcta
- `module:completed` - Notifica finalización del módulo

### Eventos recibidos del servidor

- `module:reset` - Reset específico del módulo (data.module === 'ai')
- `game:reset` - Reset general del juego

## 🚀 Desarrollo

```bash
# Instalar dependencias (desde la raíz del monorepo)
pnpm install

# Iniciar servidor de desarrollo
cd apps/ai-app
pnpm dev
```

La aplicación estará disponible en `http://localhost:5173`

## 🔧 Configuración

### Variables de entorno

Crear un archivo `.env` en la raíz de la aplicación:

```env
VITE_SERVER_URL=http://localhost:3001
VITE_AI_CODE=12345678
```

### Conexión con el servidor

La app se conecta automáticamente al servidor WebSocket y se registra como `ai-app`.

## 📝 Notas de Implementación

- Las imágenes de fondo ocupan toda la pantalla (`bg-cover bg-center`)
- El código de 8 caracteres usa inputs individuales enmascarados
- El selector valida la opción correcta y muestra error sutil por 2 segundos
- Los resets (módulo y general) reinician tanto el store como el flujo de vistas
- La impresión de PDF se activa automáticamente al llegar a la vista final

## 🏗️ Estructura de Componentes

```
src/
├── components/
│   ├── CodeInput.tsx       # Input de 8 caracteres
│   ├── HomeView.tsx        # Vista inicial
│   ├── AudioView.tsx       # Vista de audio
│   ├── CodeView.tsx        # Vista de código
│   ├── DatesView.tsx       # Vista de fechas
│   ├── SelectorView.tsx    # Vista de selector
│   └── FinalView.tsx       # Vista final
├── view-manager/
│   ├── View.tsx            # Componente de vista con animaciones
│   └── view-manager-store.ts  # Store de navegación
├── socket.ts               # Lógica de Socket.IO
├── store.ts                # Store de estado de la app
└── App.tsx                 # Componente principal
```

## 🎮 Compatibilidad con Admin iPad

La aplicación escucha los mismos eventos de reset que las demás apps del sistema:
- Reset de módulo específico
- Reset general del juego

Ambos reinician completamente el estado y regresan a la vista inicial.
