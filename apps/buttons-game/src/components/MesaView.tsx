import React from 'react';
import View from '../view-manager/View';
import { useGameStore } from '../store';

export const MesaView: React.FC = () => {
  const { buttons } = useGameStore();

  // Configuración de los botones en forma de cuadrado (según la imagen)
  // Posiciones en porcentaje relativo a la imagen de la mesa
  const buttonPositions = [
    { id: 1, top: '23%', left: '22%', label: 'Banca Corporativa' },
    { id: 2, top: '23%', left: '41%', label: 'BEX' },
    { id: 3, top: '23%', left: '59%', label: 'Innovación' },
    { id: 4, top: '23%', left: '78%', label: 'Legal' },
    { id: 5, top: '46%', left: '22%', label: 'Tecnología' },
    { id: 6, top: '46%', left: '78%', label: 'Exp. Cliente' },
    { id: 7, top: '70%', left: '22%', label: 'Finanzas' },
    { id: 8, top: '70%', left: '41%', label: 'Canales' },
    { id: 9, top: '70%', left: '59%', label: 'Riesgos' },
    { id: 10, top: '70%', left: '78%', label: 'Banca de Inversión' }
  ];

  return (
    <View viewId="mesa">
      <div 
        className="w-full h-full flex items-center justify-center"
        style={{
          backgroundImage: 'url(/bttn_bg_mesa.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Contenedor proporcional a la imagen de la mesa */}
          <div className="relative" style={{ width: '80vmin', height: '80vmin' }}>
            {/* Imagen de la mesa */}
            <img 
              src="/mesa.png" 
              alt="Mesa" 
              className="absolute w-full h-full"
              style={{
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)'
              }}
            />
            
            {/* Botones posicionados absolutamente */}
            {buttonPositions.map((position) => {
              const button = buttons.find(b => b.id === position.id);
              if (!button) return null;
              
              return (
                <div
                  key={button.id}
                  className="absolute rounded-full border-4 border-white/40 transition-all duration-300"
                  style={{
                    top: position.top,
                    left: position.left,
                    transform: 'translate(-50%, -50%)',
                    width: '6vmin',
                    height: '6vmin',
                    backgroundColor: button.pressed ? '#ef4444' : '#000000',
                    boxShadow: button.pressed 
                      ? '0 0 30px rgba(239, 68, 68, 0.8), 0 0 60px rgba(239, 68, 68, 0.4)' 
                      : '0 0 10px rgba(0, 0, 0, 0.5)'
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>
    </View>
  );
};
