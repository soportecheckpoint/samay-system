import type { ViewType } from './store';

/**
 * View content mapping for main-screen
 * Maps each view type to either an image path or a component type
 */

export type ViewContent = 
  | { type: 'image'; src: string }
  | { type: 'component'; name: 'FeedbackInputView' | 'PhotoMessageView' | 'RecognitionPreview' };

export const VIEW_CONTENT_MAP: Record<ViewType, ViewContent | null> = {
  // Default/empty view
  '': null,
  
  // Tablet mirror views - Images
  'camera-preview': null,
  'message-select': { type: 'image', src: '/images/ipad_selecting.png' },
  'message-display': { type: 'image', src: '/images/ipad_selecting.png' },
  'feedback-confirm': { type: 'image', src: '/images/ipad_feedback_completed.png' },
  'photo-capture': { type: 'image', src: '/images/ipad_taking_photo.png' },
  'photo-preview': { type: 'component', name: 'RecognitionPreview' },
  'final-message': { type: 'image', src: '/images/ipad_message_completed.png' },
  'help-view': { type: 'image', src: '/images/ipad_help.png' },
  'final-view': { type: 'image', src: '/images/ipad_final.png' },
  
  // Tablet mirror views - Components
  'feedback-input': { type: 'component', name: 'FeedbackInputView' },
  'photo-message': { type: 'component', name: 'PhotoMessageView' },
  
  // Special notification/acceptance views
  'notification': { type: 'image', src: '/images/totten-before-start.png' },
  'accept': { type: 'image', src: '/images/win_message.png' },
};

export const isViewType = (value: unknown): value is ViewType =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(VIEW_CONTENT_MAP, value);
