const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

export interface UploadRecognitionPayload {
  recognitionDataUrl: string;
  photoDataUrl?: string;
  message: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
  kind?: string;
}

export interface UploadRecognitionAsset {
  filePath: string;
  relativePath: string;
  publicPath: string;
  cloudinaryUrl: string | null;
}

export interface UploadRecognitionResponse {
  status: string;
  filePath: string;
  relativePath: string;
  publicPath: string;
  cloudinaryUrl: string | null;
  message: string | null;
  sessionId: string | null;
  metadata: Record<string, unknown> | null;
  assets: {
    recognition: UploadRecognitionAsset;
    photo: UploadRecognitionAsset | null;
  };
}

export const uploadRecognitionImage = async (
  payload: UploadRecognitionPayload
): Promise<UploadRecognitionResponse> => {
  const response = await fetch(`${SERVER_URL}/api/recognition/image`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to upload recognition image: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  return (await response.json()) as UploadRecognitionResponse;
};
