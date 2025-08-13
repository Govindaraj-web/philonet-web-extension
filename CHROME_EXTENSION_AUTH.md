# Google Authentication Setup for Chrome Extension

## Overview

The Philonet web extension includes Google OAuth authentication that works **exclusively within the Chrome extension environment**. This authentication system uses Chrome's Identity API which provides secure OAuth flows for browser extensions.

## Prerequisites

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Choose "Chrome App" as the application type
6. Note your Client ID (format: `xxx.apps.googleusercontent.com`)

### 2. Chrome Extension Permissions

The extension manifest already includes the required permissions:
```json
{
  "permissions": ["identity", "storage"],
  "oauth2": {
    "client_id": "your-google-client-id.apps.googleusercontent.com",
    "scopes": ["openid", "email", "profile"]
  }
}
```

### 3. Environment Configuration

Create a `.env` file in the project root:
```bash
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
REACT_APP_API_URL=https://api.philonet.app
```

## How It Works

### Chrome Extension Context
When running as a Chrome extension:
- ✅ Google authentication is fully functional
- ✅ Uses Chrome Identity API (`chrome.identity.launchWebAuthFlow`)
- ✅ Secure OAuth flow with proper redirect handling
- ✅ Automatic token storage in Chrome extension storage

### Non-Extension Context
When running outside Chrome extension:
- ❌ Google authentication is disabled
- ❌ Shows error: "Google authentication is only available in the Chrome extension"
- ⚠️ Alternative authentication methods should be provided

## Code Implementation

The authentication check happens in `GoogleAuth.tsx`:

```tsx
// Check if we're in a Chrome extension context
if (typeof chrome !== 'undefined' && chrome.identity) {
  // Use Chrome Identity API for OAuth
  const authUrl = getGoogleAuthUrl();
  const redirectUrl = await new Promise<string>((resolve, reject) => {
    chrome.identity.launchWebAuthFlow({
      url: authUrl,
      interactive: true
    }, (responseUrl) => {
      // Handle OAuth response
    });
  });
} else {
  // Fallback for non-extension environments
  throw new Error('Google authentication is only available in the Chrome extension');
}
```

## Testing

### In Chrome Extension
1. Load the extension in Chrome
2. Open the side panel
3. Click on profile/authentication area
4. Test Google sign-in flow

### In Development/Web Context
1. Google authentication will show an appropriate error message
2. Consider implementing alternative authentication methods for web development

## Alternative Authentication

For non-extension environments, consider:
- Traditional username/password authentication
- Other OAuth providers that work in web contexts
- JWT-based authentication systems

## Security Notes

- The Chrome Identity API provides additional security compared to web-based OAuth
- Tokens are stored securely in Chrome extension storage
- No need to handle redirect URLs manually
- Automatic token refresh handling

## Troubleshooting

1. **"Google authentication is only available in the Chrome extension"**
   - This is expected behavior outside Chrome extension context
   - Implement alternative authentication for web environments

2. **OAuth errors in Chrome extension**
   - Check Google Cloud Console configuration
   - Verify Client ID in environment variables
   - Ensure extension has proper permissions

3. **Authentication modal doesn't appear**
   - Check that the extension is properly loaded
   - Verify side panel is accessible
   - Check console for JavaScript errors

## Migration Notes

If you need the same authentication to work in both extension and web contexts:
1. Implement separate OAuth flows for each environment
2. Use conditional logic to detect Chrome extension context
3. Provide fallback authentication methods for web users
