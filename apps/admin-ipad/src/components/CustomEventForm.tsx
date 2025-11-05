import { useCallback, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { sendCustomEvent } from '../socket';

type FormStatus = 'idle' | 'pending' | 'success' | 'error';

const DEFAULT_BODY = '{\n  "mensaje": "Evento manual desde admin"\n}';

export function CustomEventForm() {

  const [eventName, setEventName] = useState('');
  const [body, setBody] = useState(DEFAULT_BODY);
  const [status, setStatus] = useState<FormStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const isSubmitting = status === 'pending';

  const helperText = useMemo(() => {
    if (status === 'success') {
      return 'Evento enviado correctamente.';
    }
    if (status === 'error' && error) {
      return error;
    }
    return 'Envía eventos puntuales a cualquier cliente conectado.';
  }, [error, status]);

  const submitEvent = useCallback(
    (payload: { event: string; body: Record<string, unknown> | null }) => {
      setStatus('pending');
      setError(null);

      sendCustomEvent(payload.event, payload.body ?? {}, (response = { ok: true }) => {
        if (response.ok) {
          setStatus('success');
          setTimeout(() => setStatus('idle'), 3000);
        } else {
          setStatus('error');
          setError(response.error ?? 'No se pudo enviar el evento');
        }
      });
    },
    []
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = eventName.trim();
    if (!trimmedName) {
      setError('El nombre del evento es obligatorio.');
      setStatus('error');
      return;
    }

    if (trimmedName.includes(' ')) {
      setError('Usa nombres de evento sin espacios, por ejemplo game:notify.');
      setStatus('error');
      return;
    }

    const rawBody = body.trim();
    let parsedBody: Record<string, unknown> | null = null;

    if (rawBody.length > 0) {
      try {
        parsedBody = JSON.parse(rawBody);
      } catch (parseError) {
        setError('El cuerpo debe ser JSON válido.');
        setStatus('error');
        return;
      }
    }

    submitEvent({ event: trimmedName, body: parsedBody });
  };

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
      <header className="mb-6 space-y-1">
        <h2 className="text-lg font-semibold text-white">Evento personalizado</h2>
        <p
          className={`text-sm ${
            status === 'error'
              ? 'text-rose-400'
              : status === 'success'
                ? 'text-emerald-300'
                : 'text-slate-400'
          }`}
        >
          {helperText}
        </p>
      </header>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label
            className="text-sm font-medium text-slate-200"
            htmlFor="custom-event-name"
          >
            Nombre del evento
          </label>
          <input
            id="custom-event-name"
            type="text"
            value={eventName}
            onChange={(event) => setEventName(event.target.value)}
            placeholder="game:victory"
            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/10"
            autoComplete="off"
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              className="text-sm font-medium text-slate-200"
              htmlFor="custom-event-body"
            >
              Cuerpo (JSON)
            </label>
            <button
              type="button"
              onClick={() => setBody(DEFAULT_BODY)}
              className="text-xs font-medium text-slate-400 transition hover:text-slate-200"
              disabled={isSubmitting}
            >
              Restaurar ejemplo
            </button>
          </div>
          <textarea
            id="custom-event-body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            className="h-40 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/10"
            spellCheck={false}
            disabled={isSubmitting}
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <button
            type="submit"
            className={`inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition-colors ${
              isSubmitting
                ? 'cursor-not-allowed bg-slate-700 text-slate-300'
                : 'bg-white/90 text-slate-900 hover:bg-white'
            }`}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Enviando...' : 'Enviar evento'}
          </button>
          <button
            type="button"
            onClick={() => {
              setEventName('');
              setBody('');
              setStatus('idle');
              setError(null);
            }}
            className="text-xs font-medium text-slate-400 transition hover:text-slate-100"
            disabled={isSubmitting}
          >
            Limpiar
          </button>
        </div>
      </form>
    </section>
  );
}
