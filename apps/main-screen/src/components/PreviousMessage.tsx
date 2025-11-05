import React from 'react';
import { useMessageStore } from '../store';

export const PreviousMessage: React.FC = () => {
  const { previousMessage } = useMessageStore();
  const hasMessage = Boolean(previousMessage?.trim());
  const messageText = hasMessage ? previousMessage.trim() : 'Mensaje del equipo anterior';

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-center text-xl font-medium text-white">
        El grupo anterior les comparte este aprendizaje:
      </h2>
      <section className="flex min-h-[220px] flex-col items-center justify-center rounded-[44px] bg-white px-10 py-14 text-center text-[#1b1b1b]">
        <p className={`text-2xl font-medium leading-relaxed ${hasMessage ? 'italic text-[#121212]' : 'text-[#5b5b5b]'}`}>
          {hasMessage ? `"${messageText}"` : messageText}
        </p>
      </section>
    </div>
  );
};
