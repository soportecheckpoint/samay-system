import { useEffect, useState } from 'react';
import View from '../view-manager/View';
import useViewStore from '../view-manager/view-manager-store';
import { PhotoMessageView } from '@samay/tablet-shared-ui';
import { useTabletStore } from '../store';
import { emitFrameMessage, emitMirror } from '../socket';
import { createRecognitionImage } from '../utils/createRecognitionImage';

export function PhotoMessage() {
  const setView = useViewStore((state) => state.setView);
  const setPhotoMessage = useTabletStore((state) => state.setPhotoMessage);
  const photoData = useTabletStore((state) => state.photoData);
  const storedPhotoMessage = useTabletStore((state) => state.photoMessage);
  const setComposedImage = useTabletStore((state) => state.setComposedImage);
  const [localText, setLocalText] = useState(storedPhotoMessage);

  useEffect(() => {
    setLocalText(storedPhotoMessage);
  }, [storedPhotoMessage]);

  const handleChange = (text: string) => {
    setLocalText(text);
    emitMirror('frame_message', 7, { frameMessage: text, photoData });
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

    emitFrameMessage(sanitized, resolvedPhoto ?? undefined);
    setView('photo-preview');

    // Ensure observers get an immediate snapshot even before composition completes.
    emitMirror('frame_message', 7, {
      frameMessage: sanitized,
      photoData: resolvedPhoto ?? undefined,
    });

    const generate = async () => {
      if (!resolvedPhoto) {
        setComposedImage(null);
        emitFrameMessage(sanitized, undefined, null);
        return;
      }

      try {
        const composed = await createRecognitionImage({
          message: sanitized,
          photoData: resolvedPhoto,
        });
        setComposedImage(composed);
        emitFrameMessage(sanitized, resolvedPhoto, composed);
        emitMirror('frame_message', 7, {
          frameMessage: sanitized,
          photoData: resolvedPhoto,
          composedImage: composed,
        });
      } catch (error) {
        console.warn('[TABLET] Unable to compose recognition image', error);
        setComposedImage(null);
        emitFrameMessage(sanitized, resolvedPhoto, null);
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
