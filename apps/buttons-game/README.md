# Buttons Game

Juego de escape room que utiliza un sistema de botones físicos conectados mediante Arduino.

## Flujo del Juego

El juego consta de 5 vistas principales que se muestran en secuencia:

### 1. CodeView (`code`)
- Vista inicial donde el usuario ingresa un código de 4 dígitos
- Background: `bttn_bg_code.png`
- Al ingresar el código correcto, el servidor valida y activa la vista de la mesa

### 2. MesaView (`mesa`)
- Vista principal del juego con la mesa y los botones
- Background: `bttn_bg_mesa.png` con la imagen `mesa.png` superpuesta
- Muestra 10 círculos (5 arriba, 5 abajo) que representan los botones físicos
- Los círculos se encienden en rojo cuando el botón correspondiente está activo/presionado
- Cuando se completa la secuencia correcta, avanza automáticamente a la siguiente vista

### 3. MessageView (`message`)
- Vista de transición con mensaje
- Background: `bttn_bg_message.png`
- Se muestra durante 8 segundos automáticamente
- Luego avanza a la vista de confirmación

### 4. ConfirmView (`confirm`)
- Vista de confirmación
- Background: `bttn_bg_confirm.png`
- Espera que el usuario haga click en cualquier lugar de la pantalla
- Al hacer click, avanza a la vista final

### 5. FinalView (`final`)
- Vista final del juego
- Background: `bttn_bg_final.png`
- Indica que el módulo ha sido completado

## Arquitectura

El proyecto utiliza:
- **View Manager**: Sistema de vistas con transiciones animadas (similar a totem-tactil)
- **Zustand**: Para el manejo de estado global
- **Socket.io**: Comunicación en tiempo real con el servidor
- **Framer Motion**: Animaciones de transición entre vistas

## Eventos de Socket

- `buttons:code-entered`: Envía el código ingresado al servidor
- `buttons:game-started`: Servidor indica que el código es válido y activa la vista de la mesa
- `buttons:state-changed`: Actualiza el estado de los botones físicos
- `buttons:completed`: Indica que se completó la secuencia correcta
- `buttons:reset` / `game:reset`: Reinicia el juego a la vista inicial

## Desarrollo

```bash
pnpm dev
```

## Variables de Entorno

```env
VITE_SERVER_URL=http://localhost:3001
```
