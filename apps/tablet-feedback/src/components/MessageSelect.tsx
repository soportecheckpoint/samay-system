import View from "../view-manager/View";
import useViewStore from "../view-manager/view-manager-store";
import { useTabletStore } from "../store";
import { emitMessageSelected, emitMirror } from "../socket";

const AVAILABLE_MESSAGES = [
  "Enfocarse en un reto por vez.",
  "Por lo general la primera pista es la que más demora, no se rindan.",
  "Todo lo que encuentren sirve, pero en su debido momento.",
  "Solo hay una forma de hacerlo SAMAY",
  "Las claves son para los candados.",
  "El número de Whatsapp se utiliza en 2 retos.",
];

export function MessageSelect() {
  const setView = useViewStore((state) => state.setView);
  const setSelectedMessage = useTabletStore(
    (state) => state.setSelectedMessage
  );

  const handleMessageSelect = (index: number) => {
    const message = AVAILABLE_MESSAGES[index];
    setSelectedMessage(message);
    emitMessageSelected(message);
    emitMirror("message_selected", 2, { messageText: message });
    setView("message-display");
  };

  return (
    <View viewId="message-select">
      <div
        className="w-full h-full bg-cover bg-center flex flex-col items-center justify-center px-8"
        style={{ backgroundImage: "url(/images/fb_bg2.png)" }}
      >
        <div className="text-center mb-10">
          <p className="text-white text-3xl font-semibold italic leading-tight max-w-2xl">
            Para Emprender y Aprender,<br /> 
            compartimos aprendizajes de<br />
            lo que sale bien y de lo que no,<br /> 
            ¿qué aprendizaje quieren compartir<br />
            con el siguiente grupo?
          </p>
        </div>

        <div className="w-full max-w-xl space-y-4">
          {AVAILABLE_MESSAGES.map((message, index) => (
            <button
              key={index}
              onClick={() => handleMessageSelect(index)}
              className="w-full px-8 py-4 rounded-full text-center font-medium text-lg text-white bg-[#00BCD4] hover:bg-[#00ACC1] transition-all shadow-lg"
              style={{ fontStyle: "italic" }}
            >
              {message}
            </button>
          ))}
        </div>
      </div>
    </View>
  );
}
