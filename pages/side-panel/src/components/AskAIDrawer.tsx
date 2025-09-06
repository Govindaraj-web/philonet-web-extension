import React, { useState, useRef, useEffect } from 'react';
import { X, Bot, Send, Loader2, Copy, Check, ChevronDown } from 'lucide-react';
import { Button, Textarea } from './ui';
import { cn } from '@extension/ui';
import { ThoughtRoomsAPI } from '../services/thoughtRoomsApi';
import { createMathMarkdownRenderer } from '../utils/markdownRenderer';

interface AIConversation {
  id: string;
  question: string;
  answer: string;
  timestamp: Date;
  isLoading?: boolean;
}

interface AskAIDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuestion?: string;
  contextTitle?: string; // Optional context about what content AI is working with
  articleContent?: string; // Article content for AI context
  articleTitle?: string; // Article title for AI context
  articleUrl?: string; // Article URL for AI context
}

const AskAIDrawer: React.FC<AskAIDrawerProps> = ({
  isOpen,
  onClose,
  initialQuestion = '',
  contextTitle,
  articleContent = '',
  articleTitle = '',
  articleUrl = ''
}) => {
  const [question, setQuestion] = useState(initialQuestion);
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [shouldAutoSubmit, setShouldAutoSubmit] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamAbortController, setStreamAbortController] = useState<AbortController | null>(null);
  const [userHasScrolledUp, setUserHasScrolledUp] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const conversationsRef = useRef<HTMLDivElement>(null);
  const thoughtRoomsAPI = new ThoughtRoomsAPI();
  const markdownRenderer = createMathMarkdownRenderer();

  // Auto-focus input when drawer opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  // Set initial question when prop changes and auto-submit if provided
  useEffect(() => {
    if (initialQuestion && initialQuestion !== question) {
      setQuestion(initialQuestion);
      setShouldAutoSubmit(true);
    }
  }, [initialQuestion, question]);

  // Auto-submit when shouldAutoSubmit is true and conditions are met
  useEffect(() => {
    if (shouldAutoSubmit && isOpen && question.trim() && !isLoading) {
      setShouldAutoSubmit(false);
      const timer = setTimeout(() => {
        handleSubmit();
      }, 300);
      
      return () => clearTimeout(timer);
    }
    
    return undefined;
  }, [shouldAutoSubmit, isOpen, question, isLoading]);

  // Listen for auto-submit events from parent component
  useEffect(() => {
    const handleAutoSubmit = (event: CustomEvent) => {
      const { question: autoQuestion } = event.detail;
      if (autoQuestion && autoQuestion.trim() && isOpen && !isLoading) {
        setQuestion(autoQuestion);
        setShouldAutoSubmit(true);
      }
    };

    if (isOpen) {
      window.addEventListener('autoSubmitAIQuestion', handleAutoSubmit as EventListener);
      
      return () => {
        window.removeEventListener('autoSubmitAIQuestion', handleAutoSubmit as EventListener);
      };
    }
    
    return undefined;
  }, [isOpen, isLoading]);

  // Auto-scroll to bottom when new conversation is added (but not during streaming updates)
  useEffect(() => {
    if (conversationsRef.current && !isStreaming) {
      conversationsRef.current.scrollTop = conversationsRef.current.scrollHeight;
    }
  }, [conversations.length]); // Only trigger on new conversations, not content updates

  // Enhanced auto-scroll during streaming that respects user scroll position
  useEffect(() => {
    if (isStreaming && conversationsRef.current) {
      const scrollContainer = conversationsRef.current;
      let localUserHasScrolledUp = false;
      let lastScrollTop = scrollContainer.scrollTop;
      
      const scrollToBottom = () => {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: 'auto' // Use instant scroll during streaming for better performance
        });
      };
      
      // Monitor user scroll behavior
      const handleScroll = () => {
        const currentScrollTop = scrollContainer.scrollTop;
        const maxScrollTop = scrollContainer.scrollHeight - scrollContainer.clientHeight;
        const isAtBottom = currentScrollTop >= maxScrollTop - 5; // Very tight tolerance (5px)
        
        // If user scrolled up from previous position, mark that they want to read
        if (currentScrollTop < lastScrollTop) {
          localUserHasScrolledUp = true;
          setUserHasScrolledUp(true);
        }
        
        // If user scrolled back to bottom, resume auto-scrolling
        if (isAtBottom) {
          localUserHasScrolledUp = false;
          setUserHasScrolledUp(false);
        }
        
        lastScrollTop = currentScrollTop;
      };
      
      // Add scroll listener to detect user interactions
      scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
      
      // Auto-scroll only when user hasn't manually scrolled up
      const scrollInterval = setInterval(() => {
        if (!localUserHasScrolledUp) {
          const maxScrollTop = scrollContainer.scrollHeight - scrollContainer.clientHeight;
          const isAtBottom = scrollContainer.scrollTop >= maxScrollTop - 5;
          
          // Only auto-scroll if we're already at the bottom
          if (isAtBottom) {
            scrollToBottom();
          }
        }
      }, 100); // More frequent updates for smoother streaming
      
      // Initial scroll to bottom when streaming starts
      if (!localUserHasScrolledUp) {
        scrollToBottom();
      }
      
      return () => {
        clearInterval(scrollInterval);
        scrollContainer.removeEventListener('scroll', handleScroll);
      };
    }
    
    return undefined;
  }, [isStreaming]);

  // Reset scroll state when streaming stops
  useEffect(() => {
    if (!isStreaming) {
      setUserHasScrolledUp(false);
    }
  }, [isStreaming]);

  // Handle Escape key to close drawer
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const handleSubmit = async () => {
    if (!question.trim() || isLoading) return;

    const currentQuestion = question.trim();
    const conversationId = Date.now().toString();
    
    // Create abort controller for streaming
    const abortController = new AbortController();
    setStreamAbortController(abortController);
    
    // Add loading conversation
    const loadingConversation: AIConversation = {
      id: conversationId,
      question: currentQuestion,
      answer: '',
      timestamp: new Date(),
      isLoading: true
    };

    setConversations(prev => [...prev, loadingConversation]);
    setQuestion('');
    setIsLoading(true);
    setIsStreaming(true);

    try {
      console.log('🤖 Sending AI query with streaming:', currentQuestion);
      
      // Enhanced prompt with article context for better AI responses
      let enhancedPrompt = currentQuestion;
      
      if (articleContent || articleTitle || articleUrl) {
        enhancedPrompt = `Given the following article context:
${articleTitle ? `Title: ${articleTitle}` : ''}
${articleUrl ? `URL: ${articleUrl}` : ''}
${articleContent ? `Content: ${articleContent.substring(0, 2000)}...` : ''}

Return a well-structured multiparagraph answer with clear markdown formatting:
- Use proper markdown headers (## for main sections, ### for subsections)
- Include a descriptive title at the top with # heading
- Structure content with clear subheadings and bullet points
- Add a table at the end highlighting key facts and numbers
- Use **bold** for emphasis and *italics* for important terms
- Keep the response elaborate and well-organized

Query: ${currentQuestion}`;
      } else {
        enhancedPrompt = `Return a well-structured multiparagraph answer with clear markdown formatting:
- Use proper markdown headers (## for main sections, ### for subsections)  
- Include a descriptive title at the top with # heading
- Structure content with clear subheadings and bullet points
- Add a table at the end highlighting key facts and numbers
- Use **bold** for emphasis and *italics* for important terms
- Keep the response elaborate and well-organized

Query: ${currentQuestion}`;
      }
      
      // Use streaming API for real-time responses
      const response = await thoughtRoomsAPI.queryAI({ 
        text: enhancedPrompt, 
        fast: true,
        stream: true
      });

      // Handle streaming response
      if (response && 'getReader' in response) {
        // Streaming response - read chunks in real-time
        const reader = (response as ReadableStream).getReader();
        const decoder = new TextDecoder();
        let accumulatedAnswer = '';
        let updateTimeout: NodeJS.Timeout | null = null;

        // Function to update conversation with throttling
        const updateConversation = (newContent: string) => {
          if (updateTimeout) {
            clearTimeout(updateTimeout);
          }
          
          updateTimeout = setTimeout(() => {
            setConversations(prev => prev.map(conv => 
              conv.id === conversationId 
                ? { ...conv, answer: newContent, isLoading: false }
                : conv
            ));
          }, 50); // Throttle updates to every 50ms for smoother streaming
        };

        try {
          while (true) {
            // Check if streaming was aborted
            if (abortController.signal.aborted) {
              console.log('🛑 Streaming aborted by user');
              break;
            }

            const { done, value } = await reader.read();
            
            if (done) {
              console.log('✅ Streaming complete');
              break;
            }

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.trim() === '') continue;
              
              try {
                // Parse Server-Sent Events format
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  
                  if (data === '[DONE]') {
                    console.log('✅ Stream finished');
                    break;
                  }

                  const parsedData = JSON.parse(data);
                  console.log('📡 Received streaming data:', parsedData);
                  
                  if (parsedData.type === 'content') {
                    // Accumulate content chunks - handle both 'content' and 'text' fields
                    const contentChunk = parsedData.content || parsedData.text || '';
                    console.log('📝 Adding chunk:', contentChunk);
                    accumulatedAnswer += contentChunk;
                    
                    // Update conversation with throttled streaming content
                    updateConversation(accumulatedAnswer);
                  } else if (parsedData.type === 'error') {
                    console.error('❌ Streaming error:', parsedData.message);
                    throw new Error(parsedData.message);
                  } else if (parsedData.type === 'metadata') {
                    console.log('📊 Stream metadata:', parsedData);
                  }
                }
              } catch (parseError) {
                // Skip invalid JSON lines
                console.warn('⚠️ Could not parse streaming data:', line);
              }
            }
          }
        } finally {
          reader.releaseLock();
          // Final update to ensure all content is displayed
          if (updateTimeout) {
            clearTimeout(updateTimeout);
          }
          setConversations(prev => prev.map(conv => 
            conv.id === conversationId 
              ? { ...conv, answer: accumulatedAnswer, isLoading: false }
              : conv
          ));
        }

        console.log('✅ AI streaming response completed:', accumulatedAnswer.substring(0, 100) + '...');
      } else {
        // Fallback to non-streaming response
        console.log('📝 Using non-streaming response');
        const aiResponse = response as any;
        const summary = aiResponse?.summary || aiResponse || 'No response received';
        
        setConversations(prev => prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, answer: summary, isLoading: false }
            : conv
        ));

        console.log('✅ AI response received:', summary.substring(0, 100) + '...');
      }

    } catch (error) {
      if (abortController.signal.aborted) {
        console.log('🛑 AI query aborted by user');
        // Update with aborted message
        setConversations(prev => prev.map(conv => 
          conv.id === conversationId 
            ? { 
                ...conv, 
                answer: '🛑 Response generation was stopped.',
                isLoading: false 
              }
            : conv
        ));
      } else {
        console.error('❌ AI query failed:', error);
        
        // Update with error message
        setConversations(prev => prev.map(conv => 
          conv.id === conversationId 
            ? { 
                ...conv, 
                answer: '❌ Sorry, I encountered an error while processing your question. Please try again.',
                isLoading: false 
              }
            : conv
        ));
      }
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      setStreamAbortController(null);
    }
  };

  const handleStopStreaming = () => {
    if (streamAbortController) {
      streamAbortController.abort();
      console.log('🛑 User stopped streaming');
    }
  };

  const scrollToBottom = () => {
    if (conversationsRef.current) {
      conversationsRef.current.scrollTo({
        top: conversationsRef.current.scrollHeight,
        behavior: 'smooth'
      });
      setUserHasScrolledUp(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !isLoading) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const renderMarkdown = (content: string): { __html: string } => {
    try {
      // Handle empty or undefined content
      if (!content || content.trim() === '') {
        return { __html: '<p class="text-philonet-text-muted text-xs">Waiting for response...</p>' };
      }

      // Clean up content and ensure proper markdown formatting
      const cleanContent = content
        .trim()
        // Fix common markdown issues
        .replace(/\n{3,}/g, '\n\n') // Remove excessive line breaks
        .replace(/```(\w+)?\n/g, '```$1\n') // Ensure code blocks are properly formatted
        .replace(/`([^`]+)`/g, '`$1`') // Ensure inline code is properly wrapped
        // Enhance lists
        .replace(/^\*\s+/gm, '• ') // Convert * to bullet points
        .replace(/^-\s+/gm, '• ') // Convert - to bullet points
        // Better heading spacing
        .replace(/^(#{1,6})\s+(.+)$/gm, '$1 $2\n') // Ensure heading spacing
        .replace(/\n(#{1,6})/g, '\n\n$1'); // Add spacing before headings

      const rendered = markdownRenderer.render(cleanContent);
      
      // Post-process rendered HTML for better display and heading styles
      return { 
        __html: rendered
          // Ensure proper spacing around math expressions
          .replace(/<span class="katex-display">/g, '<div class="katex-display">')
          .replace(/<\/span>(\s*<p>)/g, '</div>$1')
          // Add better styling for inline code in paragraphs
          .replace(/<code>([^<]+)<\/code>/g, '<code class="inline-code">$1</code>')
          // Enhanced heading styles with proper spacing and visual hierarchy
          .replace(/<h1>/g, '<h1 class="text-xl font-bold text-white mb-3 mt-4 first:mt-0 border-b border-philonet-border/30 pb-2">')
          .replace(/<h2>/g, '<h2 class="text-lg font-semibold text-white mb-2 mt-4 first:mt-0">')
          .replace(/<h3>/g, '<h3 class="text-base font-medium text-blue-300 mb-2 mt-3 first:mt-0">')
          .replace(/<h4>/g, '<h4 class="text-sm font-medium text-gray-300 mb-1 mt-2 first:mt-0">')
          .replace(/<h5>/g, '<h5 class="text-sm font-medium text-gray-400 mb-1 mt-2 first:mt-0">')
          .replace(/<h6>/g, '<h6 class="text-xs font-medium text-gray-500 mb-1 mt-1 first:mt-0">')
          // Better table styling
          .replace(/<table>/g, '<table class="w-full border-collapse border border-philonet-border/30 mt-3 mb-3 text-sm">')
          .replace(/<th>/g, '<th class="border border-philonet-border/30 bg-philonet-card/30 px-3 py-2 text-left font-semibold text-white">')
          .replace(/<td>/g, '<td class="border border-philonet-border/30 px-3 py-2 text-philonet-text-secondary">')
          // Better list styling
          .replace(/<ul>/g, '<ul class="space-y-1 my-2">')
          .replace(/<ol>/g, '<ol class="space-y-1 my-2">')
          .replace(/<li>/g, '<li class="text-philonet-text-secondary leading-relaxed">')
          // Paragraph spacing
          .replace(/<p>/g, '<p class="text-philonet-text-secondary leading-relaxed mb-2 last:mb-0">')
      };
    } catch (error) {
      console.error('Markdown rendering error:', error);
      // Fallback with basic HTML formatting and heading styles
      return { 
        __html: (content || '')
          .replace(/\n/g, '<br>')
          .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold text-white mb-3 mt-4 first:mt-0 border-b border-philonet-border/30 pb-2">$1</h1>')
          .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold text-white mb-2 mt-4 first:mt-0">$1</h2>')
          .replace(/^### (.+)$/gm, '<h3 class="text-base font-medium text-blue-300 mb-2 mt-3 first:mt-0">$1</h3>')
          .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
          .replace(/\*(.*?)\*/g, '<em class="text-blue-200">$1</em>')
          .replace(/`(.*?)`/g, '<code class="inline-code">$1</code>')
      };
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[1px]" 
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
        <div 
          className="bg-philonet-panel border border-philonet-border rounded-t-xl shadow-2xl flex flex-col h-[60vh] w-full pointer-events-auto transform transition-transform duration-300 ease-out translate-y-0"
          onClick={(e) => e.stopPropagation()}
        >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-philonet-border bg-philonet-card/50 rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30">
              <Bot className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">AI Assistant</h2>
              <p className="text-xs text-philonet-text-muted">
                {contextTitle ? `Analyzing: ${contextTitle}` : 'Ask about the content'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-philonet-text-muted hover:text-white hover:bg-philonet-border/50 rounded-lg h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Conversations */}
        <div 
          ref={conversationsRef}
          className="flex-1 overflow-y-auto p-3 space-y-4 philonet-scrollbar min-h-0 relative"
        >
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="p-3 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 mb-3">
                <Bot className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Start asking questions
              </h3>
              <p className="text-philonet-text-muted text-sm max-w-xs">
                I can help explain concepts, summarize sections, or answer specific questions about the content.
              </p>
            </div>
          ) : (
            <>
              {conversations.map((conversation) => (
              <div key={conversation.id} className="space-y-3">
                {/* Question */}
                <div className="flex justify-end">
                  <div className="max-w-[85%] bg-gradient-to-r from-blue-600/20 to-blue-500/20 border border-blue-500/30 rounded-lg rounded-tr-sm p-3">
                    <p className="text-white text-sm whitespace-pre-wrap break-words">
                      {conversation.question}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-philonet-text-muted">
                      <span>You</span>
                      <span>•</span>
                      <span>{conversation.timestamp.toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>

                {/* Answer */}
                <div className="flex justify-start">
                  <div className="max-w-[85%] bg-philonet-card/60 border border-philonet-border rounded-lg rounded-tl-sm p-3 ai-response-container">
                    {conversation.isLoading ? (
                      <div className="flex items-center gap-3">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                        <span className="text-philonet-text-muted text-sm">
                          {isStreaming ? "AI is streaming response..." : "AI is thinking..."}
                        </span>
                      </div>
                    ) : (
                      <>
                        <div 
                          className="prose prose-invert prose-sm max-w-none text-white [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 text-sm leading-relaxed break-words overflow-wrap-anywhere"
                          style={{ 
                            wordBreak: 'break-word',
                            overflowWrap: 'anywhere',
                            hyphens: 'auto'
                          }}
                          dangerouslySetInnerHTML={renderMarkdown(conversation.answer || '')}
                        />
                        {isStreaming && conversation.answer && (
                          <div className="flex items-center gap-2 mt-2 text-xs text-blue-400">
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                            <span>Streaming...</span>
                          </div>
                        )}
                        {/* Debug info - remove in production */}
                        {!conversation.answer && !conversation.isLoading && (
                          <div className="text-red-400 text-xs mt-2">
                            Debug: Answer is undefined or empty
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-philonet-border/50">
                          <div className="flex items-center gap-2 text-xs text-philonet-text-muted">
                            <Bot className="h-3 w-3" />
                            <span>AI Assistant</span>
                            <span>•</span>
                            <span>{conversation.timestamp.toLocaleTimeString()}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(conversation.answer, conversation.id)}
                            className="h-6 px-2 text-xs text-philonet-text-muted hover:text-white hover:bg-philonet-border/30 rounded transition-colors"
                          >
                            {copiedId === conversation.id ? (
                              <>
                                <Check className="h-3 w-3 mr-1" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3 mr-1" />
                                <span>Copy</span>
                              </>
                            )}
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Scroll to bottom indicator - shown when user has scrolled up during streaming */}
            {isStreaming && userHasScrolledUp && (
              <div className="sticky bottom-0 left-0 right-0 flex justify-center pb-2">
                <Button
                  onClick={scrollToBottom}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 border-blue-500 text-white shadow-lg animate-bounce text-xs px-3 py-1 h-8"
                >
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Follow stream
                </Button>
              </div>
            )}
            </>
          )}
        </div>

        {/* Input */}
        <div className="p-3 border-t border-philonet-border bg-philonet-card/30">
          <div className="bg-philonet-card/60 border border-philonet-border rounded-lg p-3">
            <div className="mb-2 flex items-center gap-2 text-philonet-text-muted text-sm">
              <Bot className="h-4 w-4" />
              <span>Ask a question</span>
              {isLoading && (
                <span className="text-blue-400 ml-2">Processing...</span>
              )}
            </div>
            
            <div className="relative">
              <Textarea
                ref={textareaRef}
                placeholder={isLoading ? "AI is processing your question..." : "What would you like to know about this content?"}
                value={question}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={2}
                className={cn(
                  "bg-transparent border-0 p-0 resize-none text-white placeholder:text-philonet-text-muted focus:ring-0 text-sm",
                  isLoading && "opacity-70"
                )}
                disabled={isLoading}
              />
            </div>
            
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-philonet-text-muted">
                {isStreaming ? "AI is generating response..." : isLoading ? "AI is thinking..." : "Press Cmd/Ctrl+Enter to send"}
              </span>
              <div className="flex items-center gap-2">
                {isStreaming && (
                  <Button
                    onClick={handleStopStreaming}
                    variant="ghost"
                    size="sm"
                    className="h-8 px-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 text-sm transition-colors"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Stop
                  </Button>
                )}
                <Button
                  onClick={handleSubmit}
                  disabled={!question.trim() || isLoading}
                  className="h-8 px-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 border-blue-400 text-sm"
                >
                  {isLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-3 w-3 mr-1" />
                      Ask
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </>
  );
};

export default AskAIDrawer;
