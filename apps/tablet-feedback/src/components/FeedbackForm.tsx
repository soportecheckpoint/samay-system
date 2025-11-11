import { useEffect, useState } from "react";
import { FeedbackInputView } from "@samay/tablet-shared-ui";
import View from "../view-manager/View";
import useViewStore from "../view-manager/view-manager-store";
import { useTabletStore } from "../store";
import { emitTabletInput } from "../socket";

export function FeedbackInput() {
  const setView = useViewStore((state) => state.setView);
  const setFeedbackText = useTabletStore((state) => state.setFeedbackText);
  const feedbackText = useTabletStore((state) => state.feedbackText);
  const [localText, setLocalText] = useState(feedbackText);

  useEffect(() => {
    setLocalText(feedbackText);
  }, [feedbackText]);

  const handleChange = (text: string) => {
    setLocalText(text);
    setFeedbackText(text);
    emitTabletInput(text);
  };

  const handleSubmit = () => {
    const sanitized = localText.trim();
    setFeedbackText(sanitized);
    setView("feedback-confirm");
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
