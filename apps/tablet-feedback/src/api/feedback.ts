const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

export interface SubmitFeedbackPayload {
  message: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

export const submitFeedback = async (payload: SubmitFeedbackPayload): Promise<{ status: string }> => {
  const response = await fetch(`${SERVER_URL}/api/feedback`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to submit feedback: ${response.status} ${response.statusText} - ${errorText}`,
    );
  }

  return response.json();
};