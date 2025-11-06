# Agent Guidelines for Scape Room Software

## Build Commands
- `pnpm run build` - Build all apps/packages
- `pnpm run dev` - Start all development servers
- `pnpm run lint` - Lint all code (max warnings: 0)
- `pnpm run check-types` - Type check all TypeScript
- `pnpm run format` - Format with Prettier
- Single app: `pnpm --filter <app-name> <command>` (e.g., `pnpm --filter admin-ipad dev`)

## Code Style Guidelines
- **TypeScript**: Strict mode enabled, ES2022 target, React JSX
- **Imports**: Use `.js` extensions for ES modules in server code, no extensions for client
- **Components**: Functional components with hooks, export named functions
- **State**: Use Zustand for client state, simple objects for server state
- **Styling**: Tailwind CSS classes, avoid inline styles except for dynamic backgrounds
- **Error Handling**: Use try/catch with logging, no console.error in production
- **Naming**: PascalCase for components, camelCase for functions/variables
- **Sockets**: Centralize socket logic in custom hooks, use type-safe events
- **No tests**: This codebase currently has no test framework configured

## Architecture
- Monorepo with pnpm workspaces and Turbo
- React/Vite apps in apps/, shared code in packages/
- Express/Socket.io server with HTTP + HTTPS
- View manager pattern for multi-screen apps
