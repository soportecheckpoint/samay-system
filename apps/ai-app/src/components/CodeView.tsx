import { useCallback, useEffect } from 'react';
import View from '../view-manager/View';
import useViewStore from '../view-manager/view-manager-store';
import { CodeInput } from './CodeInput';
import { useAiStore } from '../store';
import { notifyCodeCorrect } from '../socket';

export function CodeView() {
  const setView = useViewStore((state) => state.setView);
  const currentView = useViewStore((state) => state.currentView);
  const { codeError, setCode, setCodeError, isCodeCorrect } = useAiStore();

  const handleCodeComplete = useCallback((code: string) => {
    setCode(code);
    
    if (isCodeCorrect()) {
      setCodeError('');
      notifyCodeCorrect();
      
      // Solo crear el timer si esta vista está activa
      if (currentView === 'code') {
        setTimeout(() => {
          setView('dates');
        }, 500);
      }
    } else {
      setCodeError('Código incorrecto');
    }
  }, [setCode, setCodeError, setView, isCodeCorrect, currentView]);

  return (
    <View viewId="code">
      <div
        className="w-full h-full bg-cover bg-center bg-no-repeat flex items-center justify-center"
        style={{ backgroundImage: 'url(/ai_code.png)' }}
      >
        <CodeInput
          length={8}
          onComplete={handleCodeComplete}
          error={codeError}
        />
      </div>
    </View>
  );
}
