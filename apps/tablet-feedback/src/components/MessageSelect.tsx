import View from "../view-manager/View";
import useViewStore from "../view-manager/view-manager-store";
import { useTabletStore } from "../store";
import { emitMessageSelected } from "../socket";

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
            Para<br /> 
            <span className="font-bold italic">Emprender y Aprender</span>,<br />
            compartimos aprendizajes<br />
            de lo que sale bien y de lo que no,<br /> 
            ¿qué aprendizaje quieren compartir<br />
            con el siguiente grupo?
          </p>
        </div>

        <div className="w-full max-w-xl space-y-4">
          {AVAILABLE_MESSAGES.map((message, index) => (
            <button
              key={index}
              onClick={() => handleMessageSelect(index)}
              className="w-full h-[84px] px-8 py-0 text-center font-semibold text-2xl text-white transition-all relative overflow-visible"
              style={{ 
                fontStyle: "italic",
                minHeight: "61px"
              }}
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
              <span className="relative z-10">{message}</span>
            </button>
          ))}
        </div>
      </div>
    </View>
  );
}
