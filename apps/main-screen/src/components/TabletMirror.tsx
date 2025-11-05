import React from 'react';
import { useTabletMirrorStore, useTabletSyncStore } from '../store';

const SCREEN_LABELS: Record<string, string> = {
  qr_scan: 'Sincronizando sesión',
  message_selected: 'Mensaje seleccionado',
  message_preview: 'Confirmación de mensaje',
  feedback_form: 'Feedback en vivo',
  photo_prep: 'Preparación de selfie',
  taking_photo: 'Captura fotográfica',
  frame_message: 'Mensaje para la foto',
  processing_transition: 'Procesando mensaje',
  help_prompt: 'Ayuda',
  final_code_ready: 'Código final',
};

const STEP_LABELS: Record<string, string> = {
  'qr-scan': 'Escanear QR',
  'message-select': 'Seleccionar mensaje',
  'message-preview': 'Confirmar mensaje',
  feedback: 'Escribir feedback',
  'photo-prep': 'Prepararse para la selfie',
  photo: 'Tomar foto',
  'frame-message': 'Mensaje del marco',
  processing: 'Procesando',
  'help-message': 'Ayuda',
  'final-code': 'Código final',
};

const STEP_TO_SCREEN: Record<string, string> = {
  'qr-scan': 'qr_scan',
  'message-select': 'message_selected',
  'message-preview': 'message_preview',
  feedback: 'feedback_form',
  'photo-prep': 'photo_prep',
  photo: 'taking_photo',
  'frame-message': 'frame_message',
  processing: 'processing_transition',
  'help-message': 'help_prompt',
  'final-code': 'final_code_ready',
};

const STEP_ORDER: Record<string, number> = {
  'qr-scan': 1,
  'message-select': 2,
  'message-preview': 3,
  feedback: 4,
  'photo-prep': 5,
  photo: 6,
  'frame-message': 7,
  processing: 8,
  'help-message': 9,
  'final-code': 10,
};

export const TabletMirror: React.FC = () => {
  const { screen, step, content } = useTabletMirrorStore();
  const {
    currentStep,
    feedbackText,
    frameMessage,
    selectedMessage,
    photoData,
  } = useTabletSyncStore();

  const mirror = (content ?? {}) as Record<string, unknown>;
  const status = typeof mirror.status === 'string' ? mirror.status : '';
  const mirrorMessage = typeof mirror.messageText === 'string' ? (mirror.messageText as string) : '';
  const mirrorFeedback = typeof mirror.feedbackText === 'string' ? (mirror.feedbackText as string) : '';
  const mirrorFrame = typeof mirror.frameMessage === 'string' ? (mirror.frameMessage as string) : '';
  const mirrorCode = typeof mirror.code === 'string' ? (mirror.code as string) : '';
  const mirrorPhoto = typeof mirror.photoData === 'string' ? (mirror.photoData as string) : '';

  const resolvedStepKey = currentStep || '';
  const resolvedScreen = screen || STEP_TO_SCREEN[resolvedStepKey] || '';
  const resolvedStepNumber = step || STEP_ORDER[resolvedStepKey] || 0;

  const title =
    SCREEN_LABELS[resolvedScreen] || (resolvedStepKey ? STEP_LABELS[resolvedStepKey] : 'Tablet en vivo');
  const subtitle = resolvedStepKey ? STEP_LABELS[resolvedStepKey] : '';

  const displayMessage = mirrorMessage || selectedMessage;
  const displayFeedback = mirrorFeedback || feedbackText;
  const displayFrameMessage = mirrorFrame || frameMessage;
  const displayPhoto = mirrorPhoto || photoData || '';
  const displayCode = mirrorCode || '----';

  const renderTablet = () => {
    switch (resolvedScreen) {
      case 'qr_scan':
        return (
          <div className="space-y-5">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Bienvenido</p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-100">Sincroniza la tablet con tu sesión</h2>
              <p className="mt-2 text-sm text-slate-400">
                Escanea el código QR del equipo para iniciar la experiencia.
              </p>
            </div>
            <div className="relative overflow-hidden rounded-3xl border border-slate-800/70 bg-slate-900/50">
              <div className="aspect-square" />
              <div className="absolute inset-0 m-auto h-12 w-12 animate-pulse rounded-full border-2 border-emerald-500/60" />
            </div>
            <p className="text-center text-xs uppercase tracking-[0.3em] text-emerald-200/70">
              Cámara lista, acerca el código
            </p>
          </div>
        );

      case 'message_selected':
      case 'message_preview':
        return (
          <div className="flex h-full flex-col items-center justify-center gap-8 text-center">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Mensaje seleccionado</p>
              <p className="mt-5 rounded-3xl border border-slate-800 bg-slate-900/70 px-8 py-10 text-2xl font-semibold leading-tight text-slate-100 shadow-2xl shadow-slate-950/30">
                “{displayMessage || 'Seleccionando…'}”
              </p>
            </div>
            <div className="w-full max-w-xs rounded-full border border-emerald-500/40 bg-emerald-500/10 px-8 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-100">
              Toca para continuar
            </div>
          </div>
        );

      case 'feedback_form':
        return (
          <div className="space-y-6">
            <header className="text-center">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Feedback del equipo</p>
              <h2 className="mt-3 text-3xl font-semibold text-slate-100">¿Qué momento recuerdan con más cariño?</h2>
              <p className="mt-2 text-sm text-slate-400">
                Este mensaje aparecerá en pantalla mientras reviven la experiencia.
              </p>
            </header>
            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="h-48 whitespace-pre-line rounded-2xl border border-slate-800/80 bg-slate-950/50 p-5 text-left text-base leading-relaxed text-slate-100">
                {displayFeedback || 'Escribiendo…'}
              </div>
              <div className="mt-4 flex justify-between text-[10px] uppercase tracking-[0.3em] text-slate-500">
                <span>{displayFeedback.length} caracteres</span>
                <span>Restan {Math.max(0, 500 - displayFeedback.length)}</span>
              </div>
            </div>
            <div className="w-full rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-6 py-3 text-center text-xs font-semibold uppercase tracking-[0.3em] text-emerald-100">
              Continuar
            </div>
          </div>
        );

      case 'photo_prep':
        return (
          <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Preparación</p>
            <h2 className="text-3xl font-semibold text-slate-100">
              Prepárense para la selfie del equipo
            </h2>
            <p className="max-w-sm text-sm text-slate-300">
              Busquen su mejor ángulo y asegúrense de que nadie se quede fuera. Cuando estén listos, toquen para continuar.
            </p>
            <div className="w-full max-w-xs rounded-full border border-emerald-500/40 bg-emerald-500/10 px-8 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-100">
              Toca para continuar
            </div>
          </div>
        );

      case 'taking_photo':
        return (
          <div className="flex h-full flex-col items-center justify-center gap-6">
            <div className="w-full overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-900/50">
              {displayPhoto ? (
                <img src={displayPhoto} alt="Foto del equipo" className="h-full w-full object-cover" />
              ) : (
                <div className="flex aspect-video items-center justify-center text-sm text-slate-400">
                  {status === 'photo_captured' ? 'Foto capturada' : 'Activando cámara...'}
                </div>
              )}
            </div>
            <p className="text-sm text-slate-300">
              {status === 'photo_captured'
                ? 'Foto capturada, confirmando desde la tablet.'
                : status === 'camera_error'
                  ? 'No pudimos activar la cámara.'
                  : 'Preparando cámara frontal...'}
            </p>
            <div className="flex w-full max-w-sm flex-col gap-3 text-xs uppercase tracking-[0.3em] text-slate-200">
              <div className="rounded-2xl border border-slate-700/80 px-6 py-3 text-center">Tomar fotografía</div>
              <div className="rounded-2xl border border-slate-700/80 px-6 py-3 text-center">Confirmar</div>
            </div>
          </div>
        );

      case 'frame_message':
        return (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-4">
              {displayPhoto ? (
                <img src={displayPhoto} alt="Foto del equipo" className="w-full rounded-2xl border border-slate-800/70 object-cover" />
              ) : (
                <div className="flex h-full min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-slate-800/70 bg-slate-900/40 text-sm text-slate-500">
                  Aún no hay foto
                </div>
              )}
            </div>
            <div className="space-y-5">
              <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5">
                <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Mensaje</p>
                <p className="mt-4 rounded-2xl border border-slate-800/70 bg-slate-950/50 p-4 text-lg text-slate-100">
                  {displayFrameMessage || 'Escribiendo…'}
                </p>
                <p className="mt-3 text-[10px] uppercase tracking-[0.3em] text-slate-500">
                  {displayFrameMessage.length}/50 caracteres
                </p>
              </div>
              <div className="w-full rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-6 py-3 text-center text-xs font-semibold uppercase tracking-[0.3em] text-emerald-100">
                Continuar
              </div>
            </div>
          </div>
        );

      case 'processing_transition':
        if (status === 'loading') {
          return (
            <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
              <div className="h-20 w-20 animate-spin rounded-full border-4 border-emerald-500/20 border-t-emerald-400" />
              <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Procesando…</p>
            </div>
          );
        }
        return (
          <div className="flex h-full flex-col items-center justify-center gap-8 text-center">
            <h2 className="text-2xl font-semibold text-slate-100">
              Pedir y ofrecer feedback es tan importante como saber pedir ayuda. ¿Piden ayuda para potenciar sus mejores versiones?
            </h2>
            <div className="w-full max-w-xs rounded-full border border-emerald-500/40 bg-emerald-500/10 px-8 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-100">
              Toca para continuar
            </div>
          </div>
        );

      case 'help_prompt':
        return (
          <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
            <h2 className="text-3xl font-semibold text-slate-100">Ayuda</h2>
            <p className="text-sm text-slate-300">Toca para ver el código.</p>
            <div className="w-full max-w-xs rounded-full border border-emerald-500/40 bg-emerald-500/10 px-8 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-100">
              Mostrar código
            </div>
          </div>
        );

      case 'final_code_ready':
        return (
          <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
            <p className="text-xs uppercase tracking-[0.35em] text-emerald-300/70">Código de ayuda</p>
            <h2 className="text-4xl font-semibold text-emerald-100">Comparte este código</h2>
            <div className="rounded-3xl border border-emerald-500/40 bg-emerald-500/10 px-10 py-8 shadow-[0_0_35px_-15px_rgba(16,185,129,0.65)]">
              <span className="font-mono text-6xl font-semibold text-emerald-100">{displayCode}</span>
            </div>
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-200/80">Úsenlo solo cuando lo necesiten</p>
          </div>
        );

      default:
        return (
          <div className="flex h-full items-center justify-center text-slate-400">
            Esperando actividad de la tablet…
          </div>
        );
    }
  };

  return (
    <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-900/30 p-8 shadow-2xl shadow-slate-950/40">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Tablet en vivo</p>
          <h3 className="mt-2 text-2xl font-semibold text-slate-100">{title}</h3>
          {subtitle && <p className="mt-1 text-xs uppercase tracking-[0.3em] text-slate-500">{subtitle}</p>}
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-700/80 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-300">
          Paso {resolvedStepNumber}
        </span>
      </header>

      <div className="pointer-events-none mx-auto mt-8 flex w-full justify-center">
        <div className="w-full max-w-xl rounded-[2.7rem] border border-slate-800/80 bg-slate-950/90 p-6 shadow-[0_35px_70px_-45px_rgba(15,23,42,0.9)]">
          <div className="rounded-[2rem] border border-slate-800/70 bg-slate-950/80 p-6">
            {renderTablet()}
          </div>
        </div>
      </div>
    </div>
  );
};
