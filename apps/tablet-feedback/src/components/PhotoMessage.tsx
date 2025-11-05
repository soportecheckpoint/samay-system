import { useEffect, useState } from 'react';
import View from '../view-manager/View';
import useViewStore from '../view-manager/view-manager-store';
import { PhotoMessageView } from '@samay/tablet-shared-ui';
import { useTabletStore } from '../store';
import { emitFrameMessage, emitMirror } from '../socket';

export function PhotoMessage() {
  const setView = useViewStore((state) => state.setView);
  const setPhotoMessage = useTabletStore((state) => state.setPhotoMessage);
  const photoData = useTabletStore((state) => state.photoData);
  const storedPhotoMessage = useTabletStore((state) => state.photoMessage);
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
    emitFrameMessage(sanitized, photoData ?? undefined);
    emitMirror('frame_message', 7, { frameMessage: sanitized, photoData });
    setView('photo-preview');
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
