import React, { useState, useRef, useEffect } from 'react';
import View from '../view-manager/View';
import { useGameStore } from '../store';
import useViewStore from '../view-manager/view-manager-store';
import { sendCodeToServer } from '../socket';

export const CodeView: React.FC = () => {
  const [digits, setDigits] = useState(['', '', '', '']);
  const { error, setError } = useGameStore();
  const currentView = useViewStore((state) => state.currentView);
  const codeResetCounter = useViewStore((state) => state.codeResetCounter);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-focus al primer input cuando la vista está activa
  useEffect(() => {
    if (currentView === 'code') {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [currentView]);

  // Force focus en cualquier input cuando se escriba
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Si la vista actual no es 'code', no hacer nada
      if (currentView !== 'code') return;

      // Si ya hay un input con foco, no hacer nada
      if (document.activeElement === inputRefs.current[0] ||
          document.activeElement === inputRefs.current[1] ||
          document.activeElement === inputRefs.current[2] ||
          document.activeElement === inputRefs.current[3]) {
        return;
      }

      // Si es un número, enfoca el primer input
      if (/^\d$/.test(e.key)) {
        inputRefs.current[0]?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentView]);

  // Auto-submit cuando se completen los 4 dígitos
  useEffect(() => {
    const code = digits.join('');
    if (code.length === 4) {
      setError('');
      // Enviar código al servidor para validación y envío de comando al Arduino
      sendCodeToServer(code);
    }
  }, [digits, setError]);

  // Limpiar cuando hay error
  useEffect(() => {
    if (error) {
      setDigits(['', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  }, [error]);

  // Limpiar cuando se solicita reset del código desde el store (socket o flow reset)
  useEffect(() => {
    // Si el contador cambia, limpiamos los dígitos y enfocamos el primer input
    setDigits(['', '', '', '']);
    inputRefs.current[0]?.focus();
  }, [codeResetCounter]);

  const handleChange = (index: number, value: string) => {
    // Solo permitir números
    if (value && !/^\d$/.test(value)) {
      return;
    }

    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);

    // Auto-focus al siguiente input si hay un valor
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Retroceder al input anterior al presionar backspace
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    const newDigits = pastedData.split('').concat(['', '', '', '']).slice(0, 4);
    setDigits(newDigits);
    
    // Focus al último input con valor o al primero vacío
    const nextEmptyIndex = newDigits.findIndex(d => !d);
    const focusIndex = nextEmptyIndex === -1 ? 3 : nextEmptyIndex;
    inputRefs.current[focusIndex]?.focus();
  };

  return (
    <View viewId="code">
      <div 
        className="w-full h-full flex items-center justify-center relative"
        style={{
          backgroundImage: 'url(/bttn_bg_code.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="w-full max-w-2xl px-8">
          {/* Inputs de código */}
          <div className="flex justify-center gap-8">
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                maxLength={1}
                autoFocus={index === 0}
                className="w-32 h-40 text-9xl font-mono text-center bg-white border-4 border-white/30 rounded-3xl text-black focus:outline-none focus:border-white/80 focus:ring-4 focus:ring-white/30"
                style={{
                  WebkitTextSecurity: 'disc',
                } as React.CSSProperties}
              />
            ))}
          </div>
        </div>

        {/* Mensaje de error - posición fija en la parte inferior */}
        {error && (
          <div className="absolute bottom-16 left-0 right-0 px-8">
            <div className="max-w-2xl mx-auto rounded-2xl border-4 border-red-500/60 bg-red-500/20 backdrop-blur-sm p-6">
              <p className="text-2xl font-semibold text-red-100 text-center">{error}</p>
            </div>
          </div>
        )}
      </div>
    </View>
  );
};
