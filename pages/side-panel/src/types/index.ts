// Type definitions for the SidePanel and its components
export interface Comment {
  id: number;
  author: string;
  text: string;
  ts: string;
  tag?: { 
    text: string;
    startIndex: number;
    endIndex: number;
  } | null;
  profilePic?: string;
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

export interface Highlight {
  id: string;
  userid: string;
  highlighted_text: string;
  start_index: number;
  end_index: number;
  message: string;
  is_private: boolean;
  created_at: string;
  user_name: string;
  user_phone?: string | null;
  user_profile_pic?: string;
  is_contact: boolean;
  like_count: string;
  is_liked: boolean;
  is_read: boolean;
  read_at?: string | null;
  priority_order: number;
}

export interface HighlightsResponse {
  success: boolean;
  content_hash: string;
  article_id: string;
  spark_id: string | null;
  context: string;
  authorized_users_count: number;
  highlights: Highlight[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_highlights: number;
    unread_highlights: number;
    has_next_page: boolean;
    has_prev_page: boolean;
    page_size: number;
  };
  statistics: {
    total_users: number;
    own_highlights: number;
    friend_highlights: number;
    other_highlights: number;
    public_highlights: number;
    private_highlights_visible: number;
    total_likes: number;
    priority_breakdown: {
      friends_unread: number;
      others_unread: number;
      friends_read: number;
      others_read: number;
      total_unread: number;
      total_read: number;
    };
    user_statistics: Array<{
      user_id: string;
      name: string;
      display_pic: string;
      is_contact: boolean;
      total_reads: number;
    }>;
    total_reads: number;
  };
  reading_insights: {
    reading_completion_percentage: number;
    friends_priority_remaining: number;
    others_priority_remaining: number;
    estimated_reading_time_minutes: number;
    next_priority_type: string;
  };
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
  highlights: Highlight[];
  highlightsLoading: boolean;
  currentArticleId?: string;
  highlightsResponse?: HighlightsResponse;
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
