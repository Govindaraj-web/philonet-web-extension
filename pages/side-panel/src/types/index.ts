// Type definitions for the SidePanel and its components
export interface Comment {
  id: number;
  author: string;
  text: string;
  ts: string;
  tag?: { text: string } | null;
}

export interface AIAnswer {
  id: number;
  q: string;
  a: string;
}

export interface HistoryItem {
  id: number;
  title: string;
  url: string;
  timestamp: Date;
}

export interface MarkdownMeta {
  title: string | null;
  image: string | null;
  description: string | null;
  categories: string[];
  tags: string[];
  body: string;
}

export interface ContentSections {
  introduction?: string;
  details?: string;
  conclusion?: string;
  rest: string;
}

export interface SpeechState {
  isPlaying: boolean;
  speechUtterance: SpeechSynthesisUtterance | null;
  speechSupported: boolean;
  availableVoices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
}

export interface SidePanelState {
  comment: string;
  commentRows: number;
  comments: Comment[];
  composerTab: 'comments' | 'ai';
  aiQuestion: string;
  aiBusy: boolean;
  aiAnswers: AIAnswer[];
  hiLiteText: string;
  dockFilterText: string;
  dockOpen: boolean;
  dockActiveIndex: number;
  dockMinimized: boolean;
  currentSourceUrl: string;
  historyItems: HistoryItem[];
  showHistoryMenu: boolean;
  showMoreMenu: boolean;
  footerH: number;
}

export interface SidePanelProps {
  // Future props for API integration
  user?: {
    id: string;
    name: string;
    avatar?: string;
  };
  onAuth?: () => void;
  onLogout?: () => void;
  apiConfig?: {
    baseUrl: string;
    apiKey?: string;
  };
}
