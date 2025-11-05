import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { SERVER_URL } from '../socket';
import { formatRelativeTime } from '../utils/time';

interface SimulatedDevice {
  id: string;
  ip: string;
  port: number;
  status: 'connected' | 'disconnected' | 'error';
  lastHeartbeat?: string;
  lastResponse?: string;
}

type FeedbackKind = 'success' | 'error' | 'info';

interface FeedbackItem {
  id: string;
  kind: FeedbackKind;
  title: string;
  description: string;
  timestamp: string;
}

const API_BASE = SERVER_URL.replace(/\/$/, '');
const DEFAULT_EVENT_BODY = '{\n  "status": "active",\n  "completed": false\n}';
const DEFAULT_IP = '127.0.0.1';

async function postJson<T>(path: string, payload: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let data: unknown = null;
  if (text.length > 0) {
    try {
      data = JSON.parse(text);
    } catch (error) {
      throw new Error('La respuesta del servidor no es JSON válido');
    }
  }

  if (!response.ok) {
    const errorMessage =
      typeof data === 'object' && data !== null && 'error' in data
        ? String((data as Record<string, unknown>).error)
        : `Error ${response.status}`;
    throw new Error(errorMessage);
  }

  return data as T;
}

function createFeedback(kind: FeedbackKind, title: string, description: string): FeedbackItem {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind,
    title,
    description,
    timestamp: new Date().toISOString(),
  };
}

export function ArduinoSimulator() {
  const [devices, setDevices] = useState<SimulatedDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [registerForm, setRegisterForm] = useState({
    id: '',
    ip: DEFAULT_IP,
    port: '8080',
  });
  const [eventForm, setEventForm] = useState({
    eventName: '',
    body: DEFAULT_EVENT_BODY,
  });
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);

  const disableActions = useMemo(() => busyAction !== null, [busyAction]);
  const selectedDevice = useMemo(
    () => devices.find((device) => device.id === selectedDeviceId) ?? null,
    [devices, selectedDeviceId]
  );

  const pushFeedback = (item: FeedbackItem) => {
    setFeedback((current) => [item, ...current].slice(0, 8));
  };

  const updateDevice = (id: string, data: Partial<SimulatedDevice>) => {
    setDevices((current) => {
      const existingIndex = current.findIndex((device) => device.id === id);
      if (existingIndex >= 0) {
        const next = [...current];
        next[existingIndex] = {
          ...next[existingIndex],
          ...data,
        };
        return next;
      }
      return current;
    });
  };

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedId = registerForm.id.trim();
    if (!trimmedId) {
      pushFeedback(createFeedback('error', 'Registro incompleto', 'Debes ingresar un identificador.'));
      return;
    }

    const portNumber = Number(registerForm.port) || 8080;

    setBusyAction('register');
    try {
      await postJson('/connect', {
        id: trimmedId,
        ip: registerForm.ip.trim() || DEFAULT_IP,
        port: portNumber,
      });

      setDevices((current) => {
        const next: SimulatedDevice[] = current.some((device) => device.id === trimmedId)
          ? current.map((device) =>
              device.id === trimmedId
                ? {
                    ...device,
                    ip: registerForm.ip.trim() || DEFAULT_IP,
                    port: portNumber,
                    status: 'connected',
                    lastResponse: new Date().toISOString(),
                  }
                : device
            )
          : [
              {
                id: trimmedId,
                ip: registerForm.ip.trim() || DEFAULT_IP,
                port: portNumber,
                status: 'connected',
                lastHeartbeat: new Date().toISOString(),
                lastResponse: new Date().toISOString(),
              },
              ...current,
            ];
        return next.slice(0, 12);
      });

      if (!selectedDeviceId) {
        setSelectedDeviceId(trimmedId);
      }

      pushFeedback(
        createFeedback(
          'success',
          'Arduino simulado listo',
          `Se registró el dispositivo ${trimmedId} (puerto ${portNumber}).`
        )
      );
    } catch (error) {
      pushFeedback(
        createFeedback(
          'error',
          'No se pudo registrar',
          error instanceof Error ? error.message : 'Error desconocido'
        )
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleDispatch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedEvent = eventForm.eventName.trim();
    if (!selectedDevice) {
      pushFeedback(createFeedback('error', 'Sin dispositivo', 'Selecciona un Arduino para enviar eventos.'));
      return;
    }
    if (!trimmedEvent) {
      pushFeedback(createFeedback('error', 'Evento sin nombre', 'Define un nombre para el evento.'));
      return;
    }

    let parsedBody: unknown = {};
    const rawBody = eventForm.body.trim();
    if (rawBody.length > 0) {
      try {
        parsedBody = JSON.parse(rawBody);
      } catch (error) {
        pushFeedback(createFeedback('error', 'JSON inválido', 'El cuerpo del evento debe ser JSON válido.'));
        return;
      }
    }

    setBusyAction('dispatch');
    try {
      await postJson('/dispatch', {
        arduinoId: selectedDevice.id,
        event: trimmedEvent,
        data: parsedBody,
      });

      updateDevice(selectedDevice.id, {
        lastResponse: new Date().toISOString(),
      });

      pushFeedback(
        createFeedback(
          'success',
          'Evento enviado',
          `Evento ${trimmedEvent} enviado a ${selectedDevice.id}.`
        )
      );
    } catch (error) {
      pushFeedback(
        createFeedback(
          'error',
          'Error al enviar',
          error instanceof Error ? error.message : 'Error desconocido'
        )
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleHeartbeat = async () => {
    if (!selectedDevice) {
      pushFeedback(createFeedback('error', 'Sin dispositivo', 'Selecciona un Arduino para enviar heartbeats.'));
      return;
    }

    setBusyAction('heartbeat');
    try {
      await postJson('/heartbeat', {
        arduinoId: selectedDevice.id,
        timestamp: new Date().toISOString(),
      });

      updateDevice(selectedDevice.id, {
        status: 'connected',
        lastHeartbeat: new Date().toISOString(),
        lastResponse: new Date().toISOString(),
      });

      pushFeedback(
        createFeedback(
          'info',
          'Heartbeat enviado',
          `Se notificó actividad de ${selectedDevice.id}.`
        )
      );
    } catch (error) {
      pushFeedback(
        createFeedback(
          'error',
          'Error en heartbeat',
          error instanceof Error ? error.message : 'Error desconocido'
        )
      );
    } finally {
      setBusyAction(null);
    }
  };

  const resetForms = () => {
    setRegisterForm({ id: '', ip: DEFAULT_IP, port: '8080' });
    setEventForm({ eventName: '', body: DEFAULT_EVENT_BODY });
  };

  return (
    <section className="rounded-3xl border border-white/10 bg-black/30 p-6 backdrop-blur">
      <header className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-white">Simulador de Arduinos</h2>
        <p className="text-sm text-slate-400">
          Registra dispositivos virtuales y envía eventos o heartbeats al servidor para validar los flujos.
        </p>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <form className="space-y-4 rounded-2xl border border-white/5 bg-white/[0.02] p-5" onSubmit={handleRegister}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Registrar dispositivo</h3>
            <button
              type="button"
              className="text-xs font-medium text-slate-400 transition hover:text-slate-200"
              onClick={resetForms}
              disabled={disableActions}
            >
              Limpiar formularios
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-xs font-medium uppercase tracking-wide text-slate-400">
              Identificador
              <input
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/10"
                value={registerForm.id}
                onChange={(event) => setRegisterForm((current) => ({ ...current, id: event.target.value }))}
                placeholder="buttons"
                disabled={disableActions}
              />
            </label>
            <label className="space-y-1 text-xs font-medium uppercase tracking-wide text-slate-400">
              IP
              <input
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/10"
                value={registerForm.ip}
                onChange={(event) => setRegisterForm((current) => ({ ...current, ip: event.target.value }))}
                placeholder={DEFAULT_IP}
                disabled={disableActions}
              />
            </label>
            <label className="space-y-1 text-xs font-medium uppercase tracking-wide text-slate-400">
              Puerto
              <input
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/10"
                value={registerForm.port}
                onChange={(event) => setRegisterForm((current) => ({ ...current, port: event.target.value }))}
                placeholder="8080"
                disabled={disableActions}
              />
            </label>
          </div>
          <button
            type="submit"
            className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold transition ${
              busyAction === 'register'
                ? 'cursor-not-allowed bg-slate-700 text-slate-400'
                : 'bg-emerald-400 text-slate-900 hover:bg-emerald-300'
            }`}
            disabled={disableActions}
          >
            Registrar Arduino
          </button>
        </form>

        <form className="space-y-4 rounded-2xl border border-white/5 bg-white/[0.02] p-5" onSubmit={handleDispatch}>
          <h3 className="text-sm font-semibold text-white">Enviar evento</h3>
          <div className="space-y-2">
            <label className="space-y-1 text-xs font-medium uppercase tracking-wide text-slate-400">
              Dispositivo
              <select
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/10"
                value={selectedDeviceId}
                onChange={(event) => setSelectedDeviceId(event.target.value)}
                disabled={disableActions || devices.length === 0}
              >
                <option value="">Selecciona un Arduino</option>
                {devices.map((device) => (
                  <option key={device.id} value={device.id}>
                    {device.id} ({device.ip})
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs font-medium uppercase tracking-wide text-slate-400">
              Evento
              <input
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/10"
                value={eventForm.eventName}
                onChange={(event) => setEventForm((current) => ({ ...current, eventName: event.target.value }))}
                placeholder="buttons:state-changed"
                disabled={disableActions || devices.length === 0}
              />
            </label>
            <label className="space-y-1 text-xs font-medium uppercase tracking-wide text-slate-400">
              Cuerpo (JSON)
              <textarea
                className="mt-1 h-36 w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/10"
                value={eventForm.body}
                onChange={(event) => setEventForm((current) => ({ ...current, body: event.target.value }))}
                spellCheck={false}
                disabled={disableActions || devices.length === 0}
              />
            </label>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="submit"
              className={`flex-1 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                busyAction === 'dispatch'
                  ? 'cursor-not-allowed bg-slate-700 text-slate-400'
                  : 'bg-white/90 text-slate-900 hover:bg-white'
              }`}
              disabled={disableActions || devices.length === 0}
            >
              Enviar evento
            </button>
            <button
              type="button"
              className={`flex-1 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                busyAction === 'heartbeat'
                  ? 'cursor-not-allowed bg-slate-700 text-slate-400'
                  : 'border border-white/10 bg-black/40 text-slate-100 hover:border-white/30 hover:bg-white/10'
              }`}
              onClick={handleHeartbeat}
              disabled={disableActions || devices.length === 0}
            >
              Enviar heartbeat
            </button>
          </div>
        </form>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-white">Dispositivos simulados</h3>
          {devices.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-sm text-slate-400">
              Registra un Arduino para verlo aquí.
            </p>
          ) : (
            <div className="space-y-3">
              {devices.map((device) => (
                <article
                  key={device.id}
                  className={`rounded-2xl border px-4 py-3 text-sm transition ${
                    selectedDeviceId === device.id
                      ? 'border-emerald-400/40 bg-emerald-500/10'
                      : 'border-white/10 bg-white/[0.02] hover:border-white/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white">{device.id}</p>
                      <p className="text-xs text-slate-400">
                        {device.ip}:{device.port}
                      </p>
                    </div>
                    <button
                      type="button"
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        device.status === 'connected'
                          ? 'bg-emerald-500/10 text-emerald-200'
                          : device.status === 'error'
                            ? 'bg-rose-500/10 text-rose-200'
                            : 'bg-slate-500/10 text-slate-300'
                      }`}
                      onClick={() => setSelectedDeviceId(device.id)}
                    >
                      {device.status}
                    </button>
                  </div>
                  <div className="mt-3 grid gap-1 text-xs text-slate-300 sm:grid-cols-2">
                    <span>Heartbeat: {formatRelativeTime(device.lastHeartbeat)}</span>
                    <span>Última respuesta: {formatRelativeTime(device.lastResponse)}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-white">Actividad reciente</h3>
          {feedback.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-xs text-slate-400">
              Cada acción que ejecutes aparecerá aquí.
            </p>
          ) : (
            <ul className="space-y-2 text-xs">
              {feedback.map((item) => (
                <li
                  key={item.id}
                  className={`rounded-2xl border px-3 py-2 ${
                    item.kind === 'success'
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
                      : item.kind === 'error'
                        ? 'border-rose-500/40 bg-rose-500/10 text-rose-100'
                        : 'border-white/10 bg-white/[0.02] text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{item.title}</span>
                    <span className="text-[10px] uppercase tracking-wide text-slate-400">
                      {formatRelativeTime(item.timestamp)}
                    </span>
                  </div>
                  <p className="mt-1 text-slate-200">{item.description}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
