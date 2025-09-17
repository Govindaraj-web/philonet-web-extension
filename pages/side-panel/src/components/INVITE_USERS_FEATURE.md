# 👥 Invite Users to Room Feature

## Overview

A new invite users feature has been added to the ConversationRoom component that allows users to invite others to join the conversation room. The feature includes:

- **Invite Button**: Located in the conversation header next to other action buttons
- **User Search**: Search functionality to find users to invite
- **Friend Suggestions**: Shows top friends for easy inviting
- **Real-time Invitations**: Send invitations via the `/v1/room/inviteuser` API
- **Visual Feedback**: Toast notifications and loading states

## 🎯 User Flow

1. **Open Conversation**: User opens a conversation room with an active article
2. **Click Invite Button**: User clicks the "Invite users" button (UserPlus icon) in the header
3. **Search & Select**: User searches for users or selects from friend suggestions
4. **Send Invitations**: User clicks "Invite" button for each person they want to invite
5. **Get Feedback**: User receives toast notifications confirming invitations sent

## 🔧 Technical Implementation

### Components

#### `InviteUsersModal.tsx`
- **Purpose**: Modal popup for searching and inviting users
- **Features**: 
  - Search with debounce functionality
  - Friend suggestions from top friends API
  - Individual invite buttons with loading states
  - Toast notifications for success/error feedback

#### `ConversationRoom.tsx` Updates
- Added invite button to header action bar
- Added state management for modal visibility
- Conditional rendering based on articleId availability

### API Integration

#### `thoughtRoomsApi.ts` Updates
```typescript
// New endpoint
INVITE_USER: '/room/inviteuser'

// New interfaces
interface InviteUserParams {
  articleId: number;
  userId: string;
  commentid?: number;
}

interface InviteUserResponse {
  success: boolean;
  message: string;
  articleId?: number;
  articleTitle?: string;
  error?: string;
}

// New method
async inviteUser(params: InviteUserParams): Promise<InviteUserResponse>
```

#### API Request Format
```json
POST /v1/room/inviteuser
{
  "articleId": 123,
  "userId": "user456", 
  "commentid": 789
}
```

#### API Response Examples

**Success:**
```json
{
  "success": true,
  "message": "Soft invitation sent successfully",
  "articleId": 123,
  "articleTitle": "Article Title Here"
}
```

**Error:**
```json
{
  "success": false,
  "error": "User is already a member of this room"
}
```

## 🎨 UI/UX Features

### Header Integration
- **Location**: Right side of conversation header
- **Icon**: UserPlus from Lucide React
- **Style**: Circular button matching other header buttons
- **Visibility**: Only shown when articleId is available

### Modal Design
- **Style**: Consistent with Philonet design system
- **Layout**: Header, search, user list, footer
- **Animations**: Framer Motion animations for smooth interactions
- **Responsive**: Works on desktop and mobile

### User List Display
- **Avatar**: User profile pictures or generated initials
- **Info**: Name and interaction count
- **Status**: Online indicators
- **Actions**: Individual invite buttons with loading states

### Feedback System
- **Toast Notifications**: Success/error messages
- **Loading States**: Spinner indicators during API calls
- **Button States**: Disabled states for already invited users
- **Visual Cues**: Color changes and icons for different states

## 🚀 Usage Example

```tsx
// The invite functionality is automatically available
// when using ConversationRoom with an articleId
<ConversationRoom
  selectedThoughtId={selectedThoughtId}
  currentUser={currentUser}
  articleId={123}  // Required for invite functionality
  parentCommentId={456}
  articleTitle="My Article Title"
  onThoughtSelect={handleThoughtSelect}
  onSendMessage={handleSendMessage}
  onAskAI={handleAskAI}
/>
```

## 🔍 Error Handling

The feature handles various error scenarios:
- **No Authentication**: Token validation and error messaging
- **User Already Invited**: Prevents duplicate invitations
- **Network Errors**: Graceful error display with retry options
- **API Failures**: User-friendly error messages

## 🎯 Benefits

- **Social Engagement**: Users can easily invite friends to join discussions
- **Growth**: Helps grow conversation participation
- **User Experience**: Seamless integration with existing chat interface
- **Accessibility**: Following existing design patterns and accessibility standards

## 📱 Mobile Support

- Fully responsive design
- Touch-friendly button sizes
- Mobile-optimized modal layout
- Proper viewport handling

## 🔐 Security & Privacy

- **Authentication Required**: All API calls include bearer token
- **User Validation**: Backend validates user permissions
- **Rate Limiting**: Prevents spam invitations
- **Privacy Respect**: Respects user privacy settings

The invite feature enhances the social aspect of the conversation rooms while maintaining the existing design consistency and user experience standards.
