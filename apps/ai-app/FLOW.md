# Flujo de la Aplicación AI

## Diagrama de Flujo

```
┌─────────────────────┐
│   HOME VIEW         │  → Click en pantalla
│   (ai_home.png)     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   AUDIO VIEW        │  → Auto-avanza en 5 segundos
│   (ai_audio.png)    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   CODE VIEW         │  → Input de 8 dígitos
│   (ai_code.png)     │  → Valida código correcto
│   [CodeInput]       │
└──────────┬──────────┘
           │ ✓ Código correcto
           ▼
┌─────────────────────┐
│   DATES VIEW        │  → Auto-avanza en 5 segundos
│   (ai_dates.png)    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   SELECTOR VIEW     │  → Selecciona opción
│   (ai_selector.png) │  → Valida opción correcta
│   [5 opciones]      │  → Muestra error si falla
└──────────┬──────────┘
           │ ✓ Opción correcta
           ▼
┌─────────────────────┐
│   FINAL VIEW        │  → Envía evento de impresión
│   (ai_final.png)    │  → Completa el módulo
└─────────────────────┘
```

## Eventos del Flujo

### Vista CODE
- **Input**: 8 caracteres numéricos
- **Validación**: Compara con `VITE_AI_CODE` (default: "12345678")
- **Éxito**: Emite `ai:code-correct` y avanza a DATES
- **Fallo**: Muestra error y limpia el input

### Vista SELECTOR
- **Input**: Click en una de 5 opciones
- **Validación**: Opción #2 es la correcta
- **Éxito**: Emite `ai:selector-correct` y avanza a FINAL
- **Fallo**: Muestra mensaje de error sutil por 2 segundos

### Vista FINAL
- **Automático**: 
  - Emite `ai:print-pdf` para iniciar impresión
  - Emite `module:completed` con moduleId: 'ai'

## Sistema de Reset

La aplicación responde a dos tipos de reset:

1. **Reset de Módulo**: `module:reset` con data.module === 'ai'
2. **Reset General**: `game:reset`

Ambos ejecutan:
- `useAiStore.reset()` - Limpia código, selección y errores
- `useViewStore.resetFlow('home')` - Vuelve a la vista inicial

## Opciones del Selector

1. ❌ No es cliente del banco, le explicas que se ha confundido
2. ✅ **Le imprimes una tarjeta nueva y generas acceso a banca digital** (CORRECTA)
3. ❌ Le abres una cuenta nueva
4. ❌ Le vendes un seguro de vida
5. ❌ Le dices que llame a banca por teléfono
