import { FeedbackInputView, PhotoMessageView } from '@samay/tablet-shared-ui';
import { ImageView } from './ImageView';
import { RecognitionPreview } from './RecognitionPreview';
import { VIEW_CONTENT_MAP } from '../viewMapping';
import { useViewStore } from '../store';

interface ViewRendererProps {
  className?: string;
}

export const ViewRenderer = ({ className = '' }: ViewRendererProps) => {
  const { currentView, currentInput, photoPath, recognitionPath } = useViewStore();
  const content = VIEW_CONTENT_MAP[currentView];
  const containerClass = ['w-full', 'h-full', className].filter(Boolean).join(' ');

  if (!content) {
    return (
      <div className={`flex items-center justify-center text-2xl opacity-50 ${containerClass}`}>
        {currentView}
      </div>
    );
  }

  // Render image view
  if (content.type === 'image') {
    return (
      <ImageView src={content.src} alt={currentView} className={containerClass} />
    );
  }

  // Render component view
  if (content.type === 'component') {
    switch (content.name) {
      case 'FeedbackInputView':
        return (
          <div className={containerClass}>
            <FeedbackInputView value={currentInput} readOnly />
          </div>
        );
      
      case 'PhotoMessageView':
        return (
          <div className={containerClass}>
            <PhotoMessageView value={currentInput} readOnly />
          </div>
        );

      case 'RecognitionPreview':
        return (
          <div className={containerClass}>
            <RecognitionPreview
              message={currentInput}
              photoSrc={photoPath}
              recognitionSrc={recognitionPath}
            />
          </div>
        );
      
      default:
        return (
          <div className={`flex items-center justify-center text-2xl opacity-50 ${containerClass}`}>
            {currentView}
          </div>
        );
    }
  }

  return null;
};
