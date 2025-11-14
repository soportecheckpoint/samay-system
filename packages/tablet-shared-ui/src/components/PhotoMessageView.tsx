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
          maxLength={100}
        />
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={readOnly || submitDisabled || !onSubmit}
            className="relative px-16 text-xl font-medium italic text-white transition disabled:cursor-not-allowed disabled:opacity-50"
            style={{ minHeight: "52px", minWidth: "200px" }}
          >
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 407 61"
              preserveAspectRatio="none"
            >
              <path
                d="M403.601 19.2112C403.218 18.714 399.494 13.9214 394.653 9.81346C390.17 5.83591 384.506 2.43706 382.705 1.59754C380.464 0.489043 378.345 0.0407536 376.397 0H37.6038C34.5313 0 31.8907 0.978086 29.9021 1.85836C24.5313 4.14056 8.47593 14.6142 2.35533 24.3706C-3.24368 33.3038 2.82802 40.7943 3.34147 41.5116C3.34147 41.5116 7.43274 46.8259 12.2983 50.9012C16.7644 54.8788 21.6951 57.8049 24.2216 59.1171C26.0717 60.1115 28.1091 60.7636 30.383 60.8532L369.315 60.8614C371.637 60.8695 374.196 60.2908 377.033 58.8889C381.923 56.5008 398.467 46.1004 404.588 36.3766C410.366 27.2315 404.017 19.7818 403.601 19.2112Z"
                fill="#01B5D9"
                className="transition-all"
              />
            </svg>
            <span className="relative z-10">Enviar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
