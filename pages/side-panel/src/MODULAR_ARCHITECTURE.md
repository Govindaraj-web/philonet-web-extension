# Philonet Side Panel - Modular Architecture

This document describes the refactored, modular architecture of the Philonet side panel component. The new structure is designed to be easily extensible for API integration, authentication, and additional features.

## 📁 Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── ui.tsx           # Basic UI components (Button, Textarea, etc.)
│   ├── TopActionBar.tsx # Top navigation and user controls
│   ├── ContentRenderer.tsx # Content display container
│   ├── MetaHeader.tsx   # Document metadata display
│   ├── ContentSections.tsx # Main content sections
│   ├── ComposerFooter.tsx # Comment/AI input area
│   ├── CommentsDock.tsx # Floating comments dock
│   ├── SpeechButton.tsx # Text-to-speech control
│   ├── SourceButton.tsx # Source page link
│   ├── HistoryMenu.tsx  # Reading history dropdown
│   └── index.ts         # Component exports
├── hooks/               # Custom React hooks
│   ├── useSpeech.ts     # Text-to-speech functionality
│   ├── useMarkdown.ts   # Markdown parsing and rendering
│   ├── useSidePanelState.ts # State management
│   ├── useSelection.ts  # Text selection handling
│   ├── useClickOutside.ts # Outside click detection
│   └── index.ts         # Hook exports
├── services/            # API service layer
│   ├── ApiService.ts    # Base API client
│   ├── AuthService.ts   # Authentication API
│   ├── ContentService.ts # Content management API
│   └── index.ts         # Service exports
├── context/             # React context providers
│   ├── AppContext.tsx   # Global app state
│   └── index.ts         # Context exports
├── types/               # TypeScript type definitions
│   └── index.ts         # Type exports
├── data/                # Sample data and constants
│   └── sampleContent.ts # Demo markdown content
├── utils/               # Utility functions
│   └── index.ts         # Helper functions
├── SidePanel.tsx        # Original monolithic component
├── SidePanelRefactored.tsx # New modular component
└── README.md            # This documentation
```

## 🧩 Component Architecture

### Core Components

#### `TopActionBar`
- User information display
- Share, save, and more options
- Reading history menu
- Responsive mobile/desktop layouts

#### `ContentRenderer`
- Main content scrollable area
- Integrates MetaHeader and ContentSections
- Handles content ref for text selection

#### `MetaHeader`
- Document title, image, description
- Categories and tags display
- Speech and source buttons

#### `ContentSections`
- Markdown content rendering
- Section-based display (intro, details, conclusion)
- Recent comments preview

#### `ComposerFooter`
- Tab-based interface (Comments/AI)
- Text input with emoji support
- AI query interface

#### `CommentsDock`
- Floating comments overlay
- Navigation between comments
- Minimize/expand functionality

### Specialized Components

#### `SpeechButton` & `SourceButton`
- Self-contained action buttons
- Consistent styling and behavior
- Accessibility support

#### `HistoryMenu`
- Dropdown with reading history
- Mobile-optimized layout
- Click handling

## 🎣 Custom Hooks

### `useSpeech`
- Speech synthesis management
- Voice selection and optimization
- Text enhancement for better pronunciation
- Play/pause/stop controls

### `useMarkdown`
- Markdown parsing with MarkdownIt
- Metadata extraction
- Section parsing
- Text highlighting
- Speech text generation

### `useSidePanelState`
- Centralized state management
- Comment and AI functionality
- Dock management
- Menu state handling

### `useSelection` & `useClickOutside`
- Text selection detection
- Outside click handling for menus
- Event cleanup

## 🔌 Service Layer

### `ApiService`
- Base HTTP client
- Request/response handling
- Error management
- Authentication headers
- Timeout handling

### `AuthService`
- User authentication
- Token management
- Extension storage integration
- User preferences

### `ContentService`
- Comment CRUD operations
- AI query handling
- Reading history
- Content analysis
- Search functionality

## 🌐 Context & State Management

### `AppContext`
- Global application state
- Service initialization
- User authentication state
- Error handling

## 📝 Type Definitions

Comprehensive TypeScript interfaces for:
- Component props
- API requests/responses
- User data
- Content structures
- State objects

## 🛠 Utility Functions

- Array manipulation (`wrap`)
- Text processing (`truncateText`, `extractDomain`)
- Time formatting (`formatTimeAgo`)
- Storage operations (extension/localStorage)
- Debounce/throttle
- Validation helpers
- Error handling
- Content utilities

## 🚀 Usage Examples

### Basic Integration

```tsx
import React from 'react';
import { AppProvider } from './context';
import SidePanelRefactored from './SidePanelRefactored';

const App = () => {
  const apiConfig = {
    baseUrl: 'https://api.philonet.app',
    apiKey: 'your-api-key'
  };

  return (
    <AppProvider defaultApiConfig={apiConfig}>
      <SidePanelRefactored />
    </AppProvider>
  );
};
```

### With User Authentication

```tsx
const App = () => {
  const { user, login, logout } = useApp();

  return (
    <SidePanelRefactored
      user={user}
      onAuth={() => login('user@example.com', 'password')}
      onLogout={logout}
    />
  );
};
```

### Custom API Configuration

```tsx
const customApiConfig = {
  baseUrl: process.env.REACT_APP_API_URL,
  apiKey: process.env.REACT_APP_API_KEY,
  timeout: 15000
};

<AppProvider defaultApiConfig={customApiConfig}>
  <SidePanelRefactored />
</AppProvider>
```

## 🔄 Migration Guide

### From Original SidePanel

1. **Replace imports:**
   ```tsx
   // Old
   import SidePanel from './SidePanel';
   
   // New
   import { AppProvider } from './context';
   import SidePanelRefactored from './SidePanelRefactored';
   ```

2. **Wrap with provider:**
   ```tsx
   <AppProvider>
     <SidePanelRefactored />
   </AppProvider>
   ```

3. **Add API configuration:**
   ```tsx
   const apiConfig = { baseUrl: 'your-api-url' };
   <AppProvider defaultApiConfig={apiConfig}>
   ```

## 🔮 Future Enhancements

### Planned Features

1. **Real API Integration**
   - Replace mock data with actual API calls
   - Implement authentication flow
   - Add error handling and loading states

2. **Enhanced AI Features**
   - Real-time AI responses
   - Context-aware suggestions
   - Multi-language support

3. **Advanced User Features**
   - User profiles and preferences
   - Collaborative commenting
   - Advanced search and filtering

4. **Performance Optimizations**
   - Component lazy loading
   - Virtual scrolling for large lists
   - Caching strategies

### Extension Points

- **New Components:** Add to `components/` directory
- **New Hooks:** Add to `hooks/` directory
- **New Services:** Extend service layer
- **New Context:** Add additional providers
- **Custom Themes:** Extend utility functions

## 🧪 Testing Strategy

### Component Testing
- Unit tests for individual components
- Integration tests for component interactions
- Accessibility testing

### Hook Testing
- Custom hook testing with React Testing Library
- State management testing
- Side effect testing

### Service Testing
- API service mocking
- Error handling validation
- Authentication flow testing

## 📚 Dependencies

### Core Dependencies
- React 18+
- Framer Motion (animations)
- Lucide React (icons)
- MarkdownIt (markdown parsing)

### Development Dependencies
- TypeScript
- ESLint
- Prettier
- React Testing Library

## 🤝 Contributing

1. Follow the established component structure
2. Add TypeScript types for new features
3. Create corresponding tests
4. Update documentation
5. Follow existing naming conventions

---

This modular architecture provides a solid foundation for future development while maintaining the existing functionality and user experience of the Philonet side panel.
