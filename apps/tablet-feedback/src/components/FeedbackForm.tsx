import { useEffect, useState } from "react";
import { FeedbackInputView } from "@samay/tablet-shared-ui";
import View from "../view-manager/View";
import useViewStore from "../view-manager/view-manager-store";
import { useTabletStore } from "../store";
import { emitTabletInput } from "../socket";
import { submitFeedback } from "../api/feedback";

export function FeedbackInput() {
  const setView = useViewStore((state) => state.setView);
  const setFeedbackText = useTabletStore((state) => state.setFeedbackText);
  const feedbackText = useTabletStore((state) => state.feedbackText);
  const [localText, setLocalText] = useState(feedbackText);
  const sessionId = useTabletStore((state) => state.sessionId);

  useEffect(() => {
    setLocalText(feedbackText);
  }, [feedbackText]);

  const handleChange = (text: string) => {
    setLocalText(text);
    setFeedbackText(text);
    emitTabletInput(text);
  };

  const handleSubmit = async () => {
    const sanitized = localText.trim();
    if (sanitized.length === 0) {
      return;
    }

    setFeedbackText(sanitized);
    setView("feedback-confirm");

    void submitFeedback({
      message: sanitized,
      sessionId: sessionId || undefined,
      metadata: {
        view: "feedback-input",
        length: sanitized.length,
      },
    }).catch((error: Error) => {
      console.warn("Failed to persist feedback", error);
    });
  };

  return (
    <View viewId="feedback-input">
      <FeedbackInputView
        value={localText}
        onChange={handleChange}
        onSubmit={handleSubmit}
        submitDisabled={localText.trim().length < 5}
        Message={() => (
          <p className="text-3xl font-semibold italic leading-tight text-white">
            Escriban
            <br />
            su mensaje
          </p>
        )}
      />
    </View>
  );
}
