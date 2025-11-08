# Main Screen Refactor Notes

## Overview
The main-screen app has been completely refactored to remove socket dependencies and simplify the state management, preparing it for integration with the new `@samay/scape-sdk`.

## Changes Made

### 1. Removed Socket.io Dependencies
- ❌ Deleted `src/socket.ts` - all socket logic removed
- ❌ Removed `socket.io-client` from `package.json`
- ❌ Removed socket hooks from `App.tsx`

### 2. Simplified Store (`src/store.ts`)

#### Timer Store
```typescript
interface TimerState {
  totalMs: number;      // Total duration in milliseconds
  remainingMs: number;  // Remaining time in milliseconds
  phase: "idle" | "running" | "paused" | "won"; // Matches server StatusManager
  update: (snapshot) => void;
}
```

#### Previous Message Store
```typescript
interface PreviousMessageState {
  message: string;
  teamName: string;
  update: (message, teamName?) => void;
}
```

#### View Store
```typescript
interface ViewState {
  currentView: ViewType;  // Tablet view or image view
  imageSrc: string | null; // For show-image views
  setView: (view, imageSrc?) => void;
}
```

### 3. View Types

#### Tablet View Types (Mirror tablet-feedback views)
- `camera-preview` → Image: `ipad_selecting.png`
- `message-select` → Image: `ipad_message.png`
- `message-display` → Image: `ipad_message_completed.png`
- `feedback-input` → Component: `FeedbackInputView` (from @samay/tablet-shared-ui)
- `feedback-confirm` → Image: `ipad_feedback_completed.png`
- `photo-capture` → Image: `ipad_taking_photo.png`
- `photo-message` → Component: `PhotoMessageView` (from @samay/tablet-shared-ui)
- `photo-preview` → Image: `ipad_feedback.png`
- `final-message` → Image: `ipad_selecting.png`
- `help-view` → Image: `ipad_help.png`
- `final-view` → Image: `ipad_final.png`

#### Image View Types (Special notifications)
- `notification` → Image: `totten-before-start.png`
- `accept` → Image: `win_message.png`

### 4. View Content Mapping (`viewMapping.ts`)

Created a comprehensive mapping system that associates each view with its content:
- **Images**: Static iPad illustrations and notification screens
- **Components**: Interactive shared UI components for feedback and photo messages

The `ViewRenderer` component automatically renders the correct content based on `currentView`.

### 5. Updated Components

#### App.tsx
- Removed socket hook
- Uses `ViewRenderer` component to automatically display correct content
- ViewRenderer handles both images and interactive components

#### Timer.tsx
- Uses `remainingMs` (milliseconds) instead of `remaining` (seconds)
- Removed connection indicator
- Simplified to only display time

#### PreviousMessage.tsx
- Uses `usePreviousMessageStore` instead of `useMessageStore`
- Updated to use `message` instead of `previousMessage`

#### VictoryScreen.tsx
- Uses `phase === "won"` from timer store instead of separate victory state
- Removed overlay variant logic
- Simplified to single win screen

### 6. Removed Components
- ❌ `FeedbackMessage.tsx` - not needed in simplified flow
- ❌ `TabletMirror.tsx` - replaced by ViewRenderer system
- ❌ `TabletStateImage.tsx` - replaced by ViewRenderer
- ❌ `GuidancePanel.tsx` - unused

### 7. New Components & Files
- ✨ `ImageView.tsx` - Reusable image display component
- ✨ `ViewRenderer.tsx` - Smart component that renders images or interactive components based on view type
- ✨ `viewMapping.ts` - Centralized view-to-content mapping configuration

## Integration with SDK

The app is now ready to integrate with `@samay/scape-sdk`:

### Timer Updates
```typescript
// Listen to storage updates for timer state
scapeClient.storage.subscribe(['timer'], (state) => {
  useTimerStore.getState().update({
    totalMs: state.timer?.totalMs,
    remainingMs: state.timer?.remainingMs,
    phase: state.timer?.phase
  });
});
```

### Previous Message Updates
```typescript
// Listen to storage updates for previous message
scapeClient.storage.subscribe(['previousMessage'], (state) => {
  usePreviousMessageStore.getState().update(
    state.previousMessage?.message,
    state.previousMessage?.teamName
  );
});
```

### View Changes
```typescript
// Listen to storage updates for main-screen view
// Server should set mainScreenView to one of the ViewType values
scapeClient.storage.subscribe(['mainScreenView'], (state) => {
  const view = state.mainScreenView as ViewType;
  if (view) {
    useViewStore.getState().setView(view);
  }
});
```

## Benefits

1. **Cleaner Architecture**: No direct socket handling in the app
2. **Type Safety**: All views are strongly typed
3. **Simplified State**: Removed unnecessary stores and state
4. **SDK Ready**: Structure aligns perfectly with SDK's storage system
5. **Maintainable**: Fewer components, clearer responsibilities
6. **Flexible Views**: Can display both tablet mirrors and custom images

## Next Steps

1. Install `@samay/scape-sdk` as dependency
2. Create SDK client instance in `src/client.ts`
3. Add storage subscriptions in `App.tsx` or custom hook
4. Map server storage keys to store updates
5. Test with real server connection
