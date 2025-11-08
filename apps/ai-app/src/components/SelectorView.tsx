import { useState, useCallback } from 'react';
import View from '../view-manager/View';
import useViewStore from '../view-manager/view-manager-store';
import { useAiStore } from '../store';

const OPTIONS = [
  'No es cliente del banco, le explicas que se ha confundido',
  'Le imprimes una tarjeta nueva y generas acceso a banca digital',
  'Le abres una cuenta nueva',
  'Le vendes un seguro de vida',
  'Le dices que llame a banca por teléfono',
];

export function SelectorView() {
  const setView = useViewStore((state) => state.setView);
  const currentView = useViewStore((state) => state.currentView);
  const { setSelectedOption, setSelectorError, isSelectorCorrect, selectedOption } = useAiStore();
  const [showError, setShowError] = useState(false);

  const handleOptionClick = useCallback((index: number) => {
    // Solo procesar si esta vista está activa
    if (currentView !== 'selector') return;
    
    setSelectedOption(index);
    
    if (isSelectorCorrect()) {
      setSelectorError('');
      setTimeout(() => {
        setView('final');
      }, 500);
    } else {
      setSelectorError('Opción incorrecta');
      setShowError(true);
      setTimeout(() => {
        setShowError(false);
      }, 2000);
    }
  }, [setSelectedOption, setSelectorError, setView, isSelectorCorrect, currentView]);

  return (
    <View viewId="selector">
      <div
        className="w-full h-full bg-cover bg-center bg-no-repeat flex items-center justify-center px-8 py-12 relative"
        style={{ backgroundImage: 'url(/ai_selector.png)' }}
      >
  {/* Bloque centrado con contenido alineado a la izquierda */}
  <div className="w-full max-w-5xl bg-transparent relative">
          {/* Icono y Título (alineados a la izquierda dentro del bloque) */}
          <div className="flex items-center gap-4 mb-8">
            <img src="/mano.png" alt="Mano" className="w-20 h-20" />
            <h1 className="text-5xl font-bold text-white" style={{ fontStyle: 'italic' }}>
              MARCA UNA OPCIÓN:
            </h1>
          </div>

          {/* Opciones con radio buttons (alineadas al inicio dentro del bloque) */}
          <div className="w-full space-y-5">
          {OPTIONS.map((option, index) => (
            <label
              key={index}
              className="flex items-start gap-4 cursor-pointer group"
              onClick={() => handleOptionClick(index)}
            >
              {/* Radio button personalizado */}
              <div className="relative mt-1 shrink-0">
                <div className="w-8 h-8 rounded-full border-4 border-white bg-transparent group-hover:bg-white/10 transition-colors" />
                {/* Círculo blanco en el centro cuando está seleccionado */}
                {selectedOption === index && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-4 h-4 rounded-full bg-white" />
                  </div>
                )}
              </div>
              
              {/* Texto de la opción en Demi Italic */}
              <span 
                className="text-white text-3xl leading-tight font-semibold"
                style={{ fontFamily: 'Flexo', fontStyle: 'italic' }}
              >
                {option}
              </span>
            </label>
          ))}
        </div>

          {/* Mensaje de error sutil (moved outside inner block so it can sit at bottom) */}
        </div>
        {/* Error overlay at the bottom of the screen (subtle, doesn't move layout) */}
        {showError && (
          <div className="absolute bottom-6 left-4 right-4 flex justify-center pointer-events-none">
            <div className="px-6 py-2 bg-white/10 text-white text-lg font-medium rounded-full backdrop-blur-sm shadow-sm opacity-95">
              Opción incorrecta, intenta nuevamente
            </div>
          </div>
        )}
      </div>
    </View>
  );
}
