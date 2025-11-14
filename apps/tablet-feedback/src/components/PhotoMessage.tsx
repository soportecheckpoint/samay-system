import { useEffect, useState } from 'react';
import View from '../view-manager/View';
import useViewStore from '../view-manager/view-manager-store';
import { PhotoMessageView } from '@samay/tablet-shared-ui';
import { useTabletStore } from '../store';
import { createRecognitionImage } from '../utils/createRecognitionImage';
import { emitTabletActivity, emitTabletInput } from '../socket';
import { uploadRecognitionImage } from '../api/recognition';

export function PhotoMessage() {
  const setView = useViewStore((state) => state.setView);
  const setPhotoMessage = useTabletStore((state) => state.setPhotoMessage);
  const photoData = useTabletStore((state) => state.photoData);
  const storedPhotoMessage = useTabletStore((state) => state.photoMessage);
  const setComposedImage = useTabletStore((state) => state.setComposedImage);
  const sessionId = useTabletStore((state) => state.sessionId);
  const [localText, setLocalText] = useState(storedPhotoMessage);

  useEffect(() => {
    setLocalText(storedPhotoMessage);
  }, [storedPhotoMessage]);

  const handleChange = (text: string) => {
    setLocalText(text);
    emitTabletInput(text);
  };

  const handleSubmit = () => {
    const sanitized = localText.trim();
    setPhotoMessage(sanitized);
    const resolvedPhoto = (() => {
      if (photoData) return photoData;
      if (typeof window === 'undefined') return null;
      return sessionStorage.getItem('tablet-feedback:last-photo');
    })();

    if (!resolvedPhoto) {
      console.warn('[TABLET] No photo data available for frame message generation');
    }

    setView('photo-preview');

    const generate = async () => {
      if (!resolvedPhoto) {
        setComposedImage(null);
        return;
      }

      try {
        const composed = await createRecognitionImage({
          message: sanitized,
          photoData: resolvedPhoto,
        });
        setComposedImage(composed);

        try {
          const response = await uploadRecognitionImage({
            recognitionDataUrl: composed,
            photoDataUrl: resolvedPhoto ?? undefined,
            message: sanitized,
            sessionId,
            metadata: { source: 'tablet-feedback', step: 'photo-message' },
            kind: 'recognition'
          });

          const recognitionAsset = response.assets?.recognition ?? null;
          const photoAsset = response.assets?.photo ?? null;
          const photoPublicPath = response.photoPublicPath ?? 
            (photoAsset && 'publicPath' in photoAsset ? photoAsset.publicPath : null);

          setComposedImage(composed, {
            path: recognitionAsset && 'publicPath' in recognitionAsset ? recognitionAsset.publicPath : response.publicPath ?? null,
            url: recognitionAsset && 'cloudinaryUrl' in recognitionAsset ? recognitionAsset.cloudinaryUrl : response.cloudinaryUrl ?? null,
            photoPath: photoPublicPath,
          });

          emitTabletActivity({
            currentView: 'photo-preview',
            input: sanitized,
            photoPath: photoPublicPath,
            recognitionPath: recognitionAsset && 'publicPath' in recognitionAsset ? recognitionAsset.publicPath : response.publicPath ?? null,
          });
        } catch (uploadError) {
          console.warn('[TABLET] Unable to upload recognition image', uploadError);
        }
      } catch (error) {
        console.warn('[TABLET] Unable to compose recognition image', error);
        setComposedImage(null);
      }
    };

    void generate();
  };

  return (
    <View viewId="photo-message">
      <PhotoMessageView
        value={localText}
        onChange={handleChange}
        onSubmit={handleSubmit}
        submitDisabled={localText.trim().length < 5}
      />
    </View>
  );
}
