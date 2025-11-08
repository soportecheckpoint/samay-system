import type { FC } from "react";

export interface RecognitionPreviewProps {
  message: string;
  photoSrc: string | null;
  recognitionSrc?: string | null;
}

export const RecognitionPreview: FC<RecognitionPreviewProps> = ({
  message,
  photoSrc,
  recognitionSrc,
}) => {
  const normalizedMessage = message?.trim().length ? message.trim() : "mensaje de reconocimiento";

  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-10 px-8 py-10"
      data-recognition-src={recognitionSrc ?? undefined}
    >
      <div className="w-full max-w-3xl rounded-[40px] bg-white/90 px-12 py-10 text-center shadow-2xl backdrop-blur">
        <p className="text-3xl font-semibold italic leading-relaxed text-black">
          {normalizedMessage}
        </p>
      </div>

      <div className="flex min-h-[420px] w-full max-w-3xl items-center justify-center overflow-hidden rounded-[40px] bg-white shadow-2xl">
        {photoSrc ? (
          <img
            src={import.meta.env.VITE_SERVER_URL + photoSrc}
            alt="Foto de reconocimiento"
            className="h-full w-full object-cover"
          />
        ) : (
          <p className="text-2xl font-semibold italic text-black opacity-80">
            foto grupal
          </p>
        )}
      </div>
    </div>
  );
};
