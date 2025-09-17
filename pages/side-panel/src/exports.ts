// Main exports for the modular Philonet Side Panel

// Components
export { default as SidePanel } from './SidePanel';
export { default as SidePanelRefactored } from './SidePanelRefactored';

// Context
export { AppProvider, useApp } from './context';

// Components (for custom usage)
export {
  TopActionBar,
  ContentRenderer,
  ComposerFooter,
  CommentsDock,
  SpeechButton,
  SourceButton,
  HistoryMenu,
  MetaHeader,
  ContentSections,
  Button,
  Textarea,
  ScrollArea,
  LoaderRing
} from './components';

// Hooks (for custom logic)
export {
  useSpeech,
  useMarkdown,
  useSidePanelState,
  useSelection,
  useClickOutside
} from './hooks';

// Services (for API integration)
export {
  ApiService,
  AuthService,
  ContentService
} from './services';

// Types (for TypeScript)
export type {
  Comment,
  AIAnswer,
  HistoryItem,
  MarkdownMeta,
  ContentSections as ContentSectionsType,
  SpeechState,
  SidePanelState,
  SidePanelProps
} from './types';

export type {
  ApiConfig,
  ApiResponse,
  ApiError,
  User,
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  CreateCommentRequest,
  AIQueryRequest,
  SavePageRequest
} from './services';

// Utilities
export * from './utils';

// Default export for backward compatibility
export { default } from './SidePanel';
