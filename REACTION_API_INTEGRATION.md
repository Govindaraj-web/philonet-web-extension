# Reaction API Integration

## Overview
The reaction functionality has been integrated with the backend API. Users can now react to messages in conversations, and the reactions are persisted via the `/react` endpoint.

## Changes Made

### 1. API Service (`thoughtRoomsApi.ts`)
- Added `ReactToCommentParams` and `ReactToCommentResponse` interfaces
- Added `/react` endpoint to API_ENDPOINTS
- Implemented `reactToComment()` method for toggling reactions
- Added proper error handling and authentication

### 2. Component Updates (`ConversationRoom.tsx`)
- Added `reactToComment` import from API service
- Extended `Message` interface with API-related fields:
  - `comment_id?: number` - The actual comment ID from the API
  - `articleId?: number` - The article ID for API calls  
  - `parentCommentId?: number` - The parent comment ID for API calls
- Extended `ConversationRoomProps` with:
  - `articleId?: number` - Article ID for API calls
  - `parentCommentId?: number` - Parent comment ID for API calls
- Added emoji to reaction type mapping function
- Updated `handleAddReaction()` to call the API
- Added error handling with user feedback

### 3. Emoji to Reaction Type Mapping
```typescript
const emojiToReactionMap = {
  '❤️': 'love',
  '💙': 'heart', 
  '👍': 'celebrate',
  '😂': 'laugh',
  '😮': 'surprised',
  '😢': 'sad',
  '😡': 'angry',
  '⭐': 'star',
  '🔥': 'like'
};
```

## Recent Fixes (Latest Update)

### 4. Enhanced Error Handling & Debugging
- **Fixed message lookup**: Now searches in current `messages` state instead of `externalMessages`
- **Added comment_id fallback**: If `comment_id` is missing, tries to parse message `id` as numeric
- **Enhanced debugging**: Added comprehensive logging to track missing `comment_id` fields
- **Optimistic updates**: UI updates immediately, then syncs with API response
- **Error recovery**: Reverts optimistic changes if API fails

### 5. Optimistic UI Updates
```typescript
// Updates UI immediately for better UX
updateReactionLocally(messageId, emoji, !isCurrentlyReacted);

// Then calls API and updates with actual response
const result = await reactToComment(params);
updateReactionFromAPI(messageId, emoji, result);
```

## Usage Example

```tsx
<ConversationRoom
  thoughtStarters={thoughtStarters}
  selectedThoughtId={selectedThoughtId}
  currentUser={currentUser}
  messages={messages} // Messages should include comment_id field
  articleId={articleId} // Required for API calls
  parentCommentId={parentCommentId} // Required for API calls  
  onThoughtSelect={handleThoughtSelect}
  onSendMessage={handleSendMessage}
  onAskAI={handleAskAI}
/>
```

## Message Data Structure
Messages passed to the component should include the following API-related fields:

```typescript
interface Message {
  id: string;
  text: string;
  author: string;
  // ... other existing fields
  comment_id?: number; // REQUIRED for reactions to work
  articleId?: number; // Optional, can use component prop
  parentCommentId?: number; // Optional, can use component prop
}
```

## API Integration Flow

1. User clicks on reaction emoji
2. `handleAddReaction()` is called with messageId and emoji
3. Function finds the message and extracts `comment_id`
4. Emoji is mapped to API reaction type
5. `reactToComment()` API call is made with:
   ```typescript
   {
     target_type: 'comment',
     target_id: message.comment_id,
     reaction_type: mappedReactionType
   }
   ```
6. Local state is updated based on API response
7. UI reflects the new reaction state

## Error Handling
- API errors are caught and displayed to the user
- Error messages auto-dismiss after 3 seconds
- Console logging for debugging
- Graceful fallback if message data is missing

## Toggle Behavior
The API automatically handles toggle behavior:
- If user hasn't reacted: adds reaction and increments count
- If user has reacted: removes reaction and decrements count
- Response includes `user_reacted` boolean and `reaction_count`

## Requirements for Parent Components
When using this component, ensure:

1. Pass `articleId` and `parentCommentId` props for API context
2. Messages include `comment_id` field from the API response
3. Handle authentication token in `philonetAuthStorage`
4. Messages are properly transformed from API response using `transformSubCommentToMessage()`

## Testing
To test the reaction functionality:

1. Ensure you have valid authentication token
2. Load a conversation with real message data including `comment_id`
3. Click on reaction emojis or existing reactions
4. Check browser console for API call logs
5. Verify reactions persist after page refresh
