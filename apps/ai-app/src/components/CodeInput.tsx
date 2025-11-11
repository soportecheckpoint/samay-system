import { useState, useRef, useEffect } from "react";

interface CodeInputProps {
  length?: number;
  onComplete: (code: string) => void;
  error?: string;
}

export function CodeInput({ length = 8, onComplete, error }: CodeInputProps) {
  const [digits, setDigits] = useState<string[]>(Array(length).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-focus al primer input al montar
  useEffect(() => {
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 100);
  }, []);

  // Limpiar cuando hay error
  useEffect(() => {
    if (error) {
      setDigits(Array(length).fill(""));
      inputRefs.current[0]?.focus();
    }
  }, [error, length]);

  // Auto-submit cuando se completen todos los dígitos
  useEffect(() => {
    const code = digits.join("");
    if (code.length === length) {
      onComplete(code);
    }
  }, [digits, length, onComplete]);

  const handleChange = (index: number, value: string) => {
    // Solo permitir números
    if (value && !/^\d$/.test(value)) {
      return;
    }

    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);

    // Auto-focus al siguiente input si hay un valor
    if (value && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    // Retroceder al input anterior al presionar backspace
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, length);
    const newDigits = pastedData
      .split("")
      .concat(Array(length).fill(""))
      .slice(0, length);
    setDigits(newDigits);

    // Focus al último input con valor o al primero vacío
    const nextEmptyIndex = newDigits.findIndex((d) => !d);
    const focusIndex = nextEmptyIndex === -1 ? length - 1 : nextEmptyIndex;
    inputRefs.current[focusIndex]?.focus();
  };

  return (
    <div className="flex flex-col items-center gap-8 relative">
      {/* Inputs de código */}
      <div className="flex justify-center gap-3">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            value={digit ? "*" : ""}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            maxLength={1}
            autoFocus={index === 0}
            className="w-32 mt-32 h-[243px] text-6xl font-mono text-center bg-white border-4 border-white/30 rounded-2xl text-black focus:outline-none focus:border-white/80 focus:ring-4 focus:ring-white/30 transition-all"
          />
        ))}
      </div>

      {/* Mensaje de error fijo abajo, sin desplazar inputs */}
      {error && (
        <div className="absolute left-1/2 -translate-x-1/2 mt-4 -bottom-40 px-8 py-4 bg-red-500/90 text-white text-xl font-semibold rounded-2xl max-w-md text-center pointer-events-none">
          {error}
        </div>
      )}
    </div>
  );
}
