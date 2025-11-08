import type { ViewType } from './store';

/**
 * View content mapping for main-screen
 * Maps each view type to either an image path or a component type
 * Audio is optional and will be played when the view is displayed
 */

export type ViewContent = 
  | { type: 'image'; src: string; audio?: string }
  | { type: 'component'; name: 'FeedbackInputView' | 'PhotoMessageView' | 'RecognitionPreview'; audio?: string };

export const VIEW_CONTENT_MAP: Record<ViewType, ViewContent | null> = {
  // Default/empty view
  '': null,
  
  // Tablet mirror views - Images
  'camera-preview': null,
  'message-select': { type: 'image', src: '/images/ipad_selecting.png', audio: '/audios/SAMAY 6.mp3' },
  'message-display': { type: 'image', src: '/images/ipad_selecting.png', audio: '/audios/SAMAY 7.mp3' },
  'feedback-confirm': { type: 'image', src: '/images/ipad_feedback_completed.png', audio: '/audios/SAMAY 9.mp3' },
  'photo-capture': { type: 'image', src: '/images/ipad_taking_photo.png' },
  'photo-preview': { type: 'component', name: 'RecognitionPreview' },
  'final-message': { type: 'image', src: '/images/ipad_message_completed.png', audio: '/audios/SAMAY 10.mp3' },
  'help-view': { type: 'image', src: '/images/ipad_help.png'},
  'final-view': { type: 'image', src: '/images/ipad_final.png', audio: '/audios/SAMAY 11.mp3' },
  
  // Tablet mirror views - Components
  'feedback-input': { type: 'component', name: 'FeedbackInputView', audio: '/audios/SAMAY 8.mp3'},
  'photo-message': { type: 'component', name: 'PhotoMessageView' },
  
  // Special notification/acceptance views
  'notification': { type: 'image', src: '/images/totten-before-start.png', audio: '/audios/SAMAY 12.mp3'   },
  'accept': { type: 'image', src: '/images/win_message.png', audio: '/audios/SAMAY 13.mp3'  },
};

export const isViewType = (value: unknown): value is ViewType =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(VIEW_CONTENT_MAP, value);
