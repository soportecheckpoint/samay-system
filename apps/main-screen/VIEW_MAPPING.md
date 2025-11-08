# Main Screen View Mapping

## Overview
The main-screen displays different content based on `currentView` from the store. Content can be either static images or interactive components.

## View Type Categories

### 1. Tablet Mirror Views (11 views)
These views mirror what appears on the tablet-feedback app:

| View ID | Content Type | Content | Description |
|---------|--------------|---------|-------------|
| `camera-preview` | Image | `ipad_selecting.png` | Tablet showing camera/QR selection |
| `message-select` | Image | `ipad_message.png` | Tablet showing message selection screen |
| `message-display` | Image | `ipad_message_completed.png` | Tablet showing selected message |
| `feedback-input` | **Component** | `FeedbackInputView` | Interactive feedback input form |
| `feedback-confirm` | Image | `ipad_feedback_completed.png` | Tablet showing feedback confirmation |
| `photo-capture` | Image | `ipad_taking_photo.png` | Tablet showing photo capture |
| `photo-message` | **Component** | `PhotoMessageView` | Interactive photo message input |
| `photo-preview` | Image | `ipad_feedback.png` | Tablet showing photo preview |
| `final-message` | Image | `ipad_selecting.png` | Tablet showing final message selection |
| `help-view` | Image | `ipad_help.png` | Tablet showing help screen |
| `final-view` | Image | `ipad_final.png` | Tablet showing final code/completion |

### 2. Special Notification Views (2 views)
Custom views for system notifications:

| View ID | Content Type | Content | Description |
|---------|--------------|---------|-------------|
| `notification` | Image | `totten-before-start.png` | Totem notification before game starts |
| `accept` | Image | `win_message.png` | Acceptance/win message screen |

## Component Details

### Interactive Components
Components from `@samay/tablet-shared-ui` are rendered in read-only mode:

#### FeedbackInputView
- Used for: `feedback-input` view
- Props: `value=""`, `readOnly={true}`
- Shows feedback input form with background and submit button

#### PhotoMessageView
- Used for: `photo-message` view
- Props: `value=""`, `readOnly={true}`
- Shows photo message input form

### Image Component
All image-based views use the `ImageView` component:
- Props: `src`, `alt`, `className`
- Responsive with `object-contain`
- Centered display

## Usage

### Setting a View
```typescript
import { useViewStore } from './store';

// Set to tablet mirror view
useViewStore.getState().setView('message-select');

// Set to notification view
useViewStore.getState().setView('notification');

// Set to component view
useViewStore.getState().setView('feedback-input');
```

### Server Integration
Server should update storage with view type:
```typescript
// Server-side (via SDK)
storageManager.patch({
  mainScreenView: 'photo-message' // ViewType
});
```

## File Structure
```
src/
├── store.ts                      # ViewType definitions and useViewStore
├── viewMapping.ts                # VIEW_CONTENT_MAP configuration
└── components/
    ├── ImageView.tsx             # Image display component
    └── ViewRenderer.tsx          # Smart view renderer
```

## Adding New Views

To add a new view:

1. Add the view type to `store.ts`:
```typescript
export type TabletViewType = 
  | "camera-preview"
  | "new-view-name" // Add here
  | ...
```

2. Add mapping in `viewMapping.ts`:
```typescript
export const VIEW_CONTENT_MAP: Record<ViewType, ViewContent> = {
  'new-view-name': { type: 'image', src: '/images/new-image.png' },
  // or
  'new-view-name': { type: 'component', name: 'NewComponent' },
  ...
}
```

3. If using a component, add it to `ViewRenderer.tsx`:
```typescript
case 'NewComponent':
  return <NewComponent {...componentProps} />;
```

## Image Assets Location
All images are in: `/apps/main-screen/public/images/`

Current images:
- `ipad_*.png` - Tablet illustrations (8 files)
- `final_win.png` - Victory screen
- `totten-before-start.png` - Pre-game notification
- `win_message.png` - Win acceptance message
