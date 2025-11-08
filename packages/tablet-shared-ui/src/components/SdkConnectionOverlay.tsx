import { useMemo, type ReactNode } from "react";

export type ConnectionStatus = "connecting" | "connected" | "error";

export type ConnectionOverlayState = {
  status: ConnectionStatus;
  attempt?: number;
  lastError?: string | null;
  disconnectReason?: string | null;
};

export type ConnectionOverlayCopy = {
  connectingTitle: string;
  connectingDescription?: string;
  errorTitle: string;
  errorDescription?: string;
  retryLabel: string;
};

const FALLBACK_STATE: ConnectionOverlayState = {
  status: "connecting",
  attempt: 0,
  lastError: null,
  disconnectReason: null,
};

export type SdkConnectionOverlayProps = {
  state?: ConnectionOverlayState;
  children: ReactNode;
  className?: string;
  copy?: Partial<ConnectionOverlayCopy>;
  onRetry?: () => void;
};

const DEFAULT_COPY: ConnectionOverlayCopy = {
  connectingTitle: "Conectando...",
  connectingDescription: "Estamos intentando enlazar con el servidor.",
  errorTitle: "Sin conexion",
  errorDescription: "Revisa la red o intentalo nuevamente.",
  retryLabel: "Reintentar",
};

export function SdkConnectionOverlay({
  state,
  children,
  className,
  copy,
  onRetry,
}: SdkConnectionOverlayProps) {
  const messages = useMemo(() => ({ ...DEFAULT_COPY, ...copy }), [copy]);

  const resolvedState = state ?? FALLBACK_STATE;
  const rootClassName = [className].filter(Boolean).join(" ") || undefined;

  const showOverlay = resolvedState.status !== "connected";

  return (
    <div className={rootClassName}>
      {children}
      {showOverlay ? (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-slate-950/80 px-8 py-10 text-center text-slate-100 backdrop-blur-lg">
          <div className="flex flex-col items-center gap-4">
            {resolvedState.status === "connecting" ? (
              <div className="flex h-16 w-16 items-center justify-center">
                <div className="h-14 w-14 animate-spin rounded-full border-4 border-white/20 border-t-white/90" aria-hidden="true" />
              </div>
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-red-400/60 bg-red-500/10">
                <span className="text-3xl" aria-hidden="true">!</span>
              </div>
            )}

            <div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                {resolvedState.status === "error" ? messages.errorTitle : messages.connectingTitle}
              </h1>
              <p className="mt-2 max-w-xl text-base text-slate-200/80 sm:text-lg">
                {resolvedState.status === "error" ? messages.errorDescription : messages.connectingDescription}
              </p>
            </div>
          </div>

          {resolvedState.status === "connecting" && (resolvedState.attempt ?? 0) > 0 ? (
            <p className="text-sm text-slate-200/70">Reintentando conexion (intento {(resolvedState.attempt ?? 0) + 1})...</p>
          ) : null}

          {resolvedState.status === "connecting" && resolvedState.disconnectReason ? (
            <p className="text-xs text-slate-200/60">Ultimo motivo: {resolvedState.disconnectReason}</p>
          ) : null}

          {resolvedState.status === "error" && resolvedState.lastError ? (
            <p className="max-w-xl text-sm text-red-200/80">Detalle: {resolvedState.lastError}</p>
          ) : null}

          {resolvedState.status === "error" ? (
            <button
              type="button"
              onClick={onRetry}
              className="rounded-full bg-red-500/90 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow-lg shadow-red-500/20 transition hover:bg-red-400"
            >
              {messages.retryLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
