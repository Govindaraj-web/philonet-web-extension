# Quick Setup Guide: Google Authentication

## 🚀 Quick Start

### 1. Install Dependencies
The authentication system uses existing dependencies in your project:
- `framer-motion` for animations
- `lucide-react` for icons
- React Context for state management

### 2. Environment Configuration
Add your Google OAuth credentials to your environment:

```bash
# .env.local
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
REACT_APP_API_URL=https://api.philonet.app
```

### 3. Chrome Extension Manifest
Update your `manifest.json` to include the necessary permissions:

```json
{
  "permissions": [
    "identity",
    "storage"
  ],
  "oauth2": {
    "client_id": "your-google-client-id.apps.googleusercontent.com",
    "scopes": ["openid", "email", "profile"]
  }
}
```

### 4. Use the Side Panel
The authentication is automatically integrated:

```tsx
import React from 'react';
import { SidePanel } from './path/to/side-panel';

function App() {
  return <SidePanel />;
}
```

### 5. Access User State (Optional)
If you need to access user information in other parts of your application:

```tsx
import { useApp } from './path/to/side-panel/context';

function MyComponent() {
  const { user, isAuthenticated, logout } = useApp();
  
  if (isAuthenticated) {
    return (
      <div>
        <p>Welcome, {user.name}!</p>
        <button onClick={logout}>Sign Out</button>
      </div>
    );
  }
  
  return <p>Please sign in using the side panel</p>;
}
```

## 🎯 Key Features

### ✅ Ready to Use
- **Zero Additional Setup**: Works out of the box with existing side panel
- **Philonet Design**: Matches the existing design system perfectly
- **Smooth Animations**: Native feeling slide-in/out animations

### ✅ Google OAuth Integration
- **Chrome Identity API**: Secure OAuth flow
- **Token Management**: Automatic token storage and refresh
- **Error Handling**: Graceful error handling with user-friendly messages

### ✅ User Experience
- **One-Click Sign In**: Single button to authenticate with Google
- **Profile Display**: Shows user avatar and name in top bar
- **Easy Sign Out**: Simple sign out from profile modal

## 🔧 Customization

### Custom Authentication Modal
If you need a custom authentication experience:

```tsx
import { GoogleAuth } from './path/to/side-panel/components';

function CustomAuthFlow() {
  const [showAuth, setShowAuth] = useState(false);
  
  return (
    <GoogleAuth
      isOpen={showAuth}
      onClose={() => setShowAuth(false)}
      mode="signin" // or "signup"
    />
  );
}
```

### Backend Integration
Your backend should handle these endpoints:

```typescript
// POST /auth/google
interface GoogleAuthRequest {
  authorizationCode: string;
  redirectUri: string;
}

interface AuthResponse {
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  token: string;
  refreshToken: string;
}
```

## 🐛 Troubleshooting

### Common Issues
1. **Popup Blocked**: Ensure popup blockers allow the Chrome extension
2. **Invalid Client ID**: Verify your Google OAuth client ID is correct
3. **Permissions Error**: Check Chrome extension manifest permissions

### Debug Mode
Enable debug logging:
```javascript
localStorage.setItem('philonet:debug', 'true');
```

## 📚 Documentation
For complete documentation, see [GOOGLE_AUTH_INTEGRATION.md](./GOOGLE_AUTH_INTEGRATION.md).

---

That's it! Your Philonet side panel now has Google authentication integrated. Users can sign in by clicking on the profile area in the top action bar.
