import React from 'react';
import { usePreviousMessageStore } from '../store';

export const PreviousMessage: React.FC = () => {
  const { message } = usePreviousMessageStore();
  const hasMessage = Boolean(message?.trim());
  const messageText = hasMessage ? message.trim() : 'Mensaje del equipo anterior';

  return (
    <div className="flex flex-col gap-8 mt-16">
      <h2 className="text-center text-3xl font-medium text-white font-semibold italic">
        El grupo anterior les <br />comparte este aprendizaje:
      </h2>
      <section className="flex min-h-[220px] flex-col items-center justify-center rounded-[44px] bg-white px-10 py-14 text-center text-[#1b1b1b]">
        <p className={`text-[32px] font-bold italic leading-relaxed ${hasMessage ? 'text-[#121212]' : 'text-[#5b5b5b]'}`}>
          {hasMessage ? `${messageText}` : messageText}
        </p>
      </section>
    </div>
  );
};
