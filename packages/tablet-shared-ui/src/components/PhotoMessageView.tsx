import type { ChangeEvent } from "react";

export type PhotoMessageViewProps = {
  value: string;
  onChange?: (next: string) => void;
  onSubmit?: () => void;
  submitDisabled?: boolean;
  readOnly?: boolean;
};

export function PhotoMessageView({
  value,
  onChange,
  onSubmit,
  submitDisabled = false,
  readOnly = false,
}: PhotoMessageViewProps) {
  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    if (readOnly || !onChange) {
      return;
    }
    onChange(event.target.value);
  };

  const handleSubmit = () => {
    if (readOnly || !onSubmit || submitDisabled) {
      return;
    }
    onSubmit();
  };

  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center bg-cover bg-center px-8"
      style={{ backgroundImage: "url(/images/fb_bg4.png)" }}
    >
      <div className="mb-10 text-center">
        <p className="text-3xl font-semibold italic leading-tight text-white">
          Escriban
          <br />
          su mensaje
        </p>
      </div>

      <div className="w-full max-w-2xl">
        <textarea
          value={value}
          onChange={handleChange}
          readOnly={readOnly || !onChange}
          placeholder=""
          className="h-72 w-full resize-none rounded-[50px] border-none bg-white px-10 py-8 text-xl text-black outline-none placeholder-gray-400"
          maxLength={500}
        />
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={readOnly || submitDisabled || !onSubmit}
            className="rounded-full bg-[#00BCD4] px-16 py-5 text-xl font-medium italic text-white shadow-lg transition hover:bg-[#00ACC1] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}
