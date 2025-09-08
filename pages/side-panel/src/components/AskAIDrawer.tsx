import React, { useState, useRef, useEffect } from 'react';
import { X, Bot, Send, Loader2, Copy, Check, ChevronDown } from 'lucide-react';
import { Button, Textarea } from './ui';
import { cn } from '@extension/ui';
import { ThoughtRoomsAPI } from '../services/thoughtRoomsApi';

// Define AIQueryResponse interface locally since it's not exported from the API
interface AIQueryResponse {
  summary: string;
  summarymini?: string;
}
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
  fontSize?: 'small' | 'medium' | 'large'; // Font size setting
}

const AskAIDrawer: React.FC<AskAIDrawerProps> = ({
  isOpen,
  onClose,
  initialQuestion = '',
  contextTitle,
  articleContent = '',
  articleTitle = '',
  articleUrl = '',
  fontSize = 'medium' // Default to medium
}) => {
  const [question, setQuestion] = useState(initialQuestion);
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pendingAutoSubmit, setPendingAutoSubmit] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamAbortController, setStreamAbortController] = useState<AbortController | null>(null);
  const [userHasScrolledUp, setUserHasScrolledUp] = useState(false);
  const [contextResetMessage, setContextResetMessage] = useState<string>('');
  const [lastSubmittedQuestion, setLastSubmittedQuestion] = useState<string>('');
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const conversationsRef = useRef<HTMLDivElement>(null);
  const thoughtRoomsAPI = new ThoughtRoomsAPI();
  const markdownRenderer = createMathMarkdownRenderer();

  // Track the current context to detect tab changes
  const [currentContext, setCurrentContext] = useState<{
    url: string;
    title: string;
    content: string;
  }>({
    url: articleUrl,
    title: contextTitle || '',
    content: articleContent
  });

  // Font size utility function
  const getFontSizeClass = () => {
    switch (fontSize) {
      case 'small': return 'text-sm';
      case 'large': return 'text-lg';
      default: return 'text-base';
    }
  };

  const getDrawerHeightClass = () => {
    // Increase drawer height for better visibility, especially on smaller screens
    return 'h-[75vh]'; // Increased from 60vh to 75vh
  };

  // Auto-focus input when drawer opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  // Set initial question when prop changes and auto-submit if provided
  useEffect(() => {
    if (initialQuestion && initialQuestion.trim() && initialQuestion !== question && question === '' && isOpen) {
      console.log('📝 Setting initial question from prop:', initialQuestion);
      setQuestion(initialQuestion);
      // Auto-submit immediately after setting question
      setTimeout(() => {
        console.log('🚀 Auto-submitting initial question:', initialQuestion.trim());
        if (!isLoading && !isStreaming) {
          handleSubmit();
        }
      }, 150); // Single timeout for setting question and submitting
    }
  }, [initialQuestion, question, isOpen, isLoading, isStreaming]);

  // Simple auto-submit when pendingAutoSubmit flag is set (from custom events)  
  useEffect(() => {
    if (pendingAutoSubmit && isOpen && !isLoading && !isStreaming && question.trim()) {
      console.log('🚀 Auto-submitting from event:', question.trim());
      setPendingAutoSubmit(false);
      // Immediate submission without additional delays
      handleSubmit();
    } else if (pendingAutoSubmit) {
      // Clear the flag if conditions aren't met
      console.warn('⚠️ Auto-submit cancelled - conditions not met:', { 
        hasQuestion: !!question.trim(), 
        isOpen, 
        isLoading, 
        isStreaming 
      });
      setPendingAutoSubmit(false);
    }
  }, [pendingAutoSubmit, isOpen, isLoading, isStreaming, question]);

  // Listen for auto-submit events from parent component
  useEffect(() => {
    const handleAutoSubmit = (event: CustomEvent) => {
      const { question: autoQuestion } = event.detail;
      console.log('🎯 Received autoSubmitAIQuestion event:', { autoQuestion, isOpen, isLoading, isStreaming });
      
      if (autoQuestion && autoQuestion.trim() && isOpen && !isLoading && !isStreaming) {
        console.log('🔥 Directly submitting from custom event:', autoQuestion.trim());
        setQuestion(autoQuestion);
        // Use the pendingAutoSubmit flag for cleaner state management
        setPendingAutoSubmit(true);
      } else {
        console.warn('⚠️ Auto-submit event ignored:', { 
          hasQuestion: !!autoQuestion?.trim(), 
          isOpen, 
          isLoading,
          isStreaming
        });
      }
    };

    if (isOpen) {
      window.addEventListener('autoSubmitAIQuestion', handleAutoSubmit as EventListener);
      
      return () => {
        window.removeEventListener('autoSubmitAIQuestion', handleAutoSubmit as EventListener);
      };
    }
    
    return undefined;
  }, [isOpen, isLoading, isStreaming]);

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

  // Reset conversations when drawer closes to ensure fresh start
  useEffect(() => {
    if (!isOpen) {
      // Clear any pending auto-submit
      setPendingAutoSubmit(false);
      
      // Reset conversations on close to ensure fresh start when reopening
      // This complements the tab-switching reset behavior
      if (conversations.length > 0) {
        setConversations([]);
        console.log('🚪 Ask AI drawer closed - cleared', conversations.length, 'conversations for fresh start');
      }
      
      setQuestion('');
      setIsLoading(false);
      setIsStreaming(false);
      setCopiedId(null);
      setUserHasScrolledUp(false);
      setLastSubmittedQuestion('');

      // Abort any ongoing streaming
      if (streamAbortController) {
        streamAbortController.abort();
        setStreamAbortController(null);
      }
    }
  }, [isOpen, conversations.length, streamAbortController]);

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

  // Reset conversations when tab/context changes
  useEffect(() => {
    const newContext = {
      url: articleUrl || '',
      title: contextTitle || '',
      content: articleContent || ''
    };

    // Check if any of the context properties have changed significantly
    const urlChanged = newContext.url !== currentContext.url && newContext.url !== '';
    const titleChanged = newContext.title !== currentContext.title && Math.abs(newContext.title.length - currentContext.title.length) > 5;
    const contentChanged = newContext.content !== currentContext.content && Math.abs(newContext.content.length - currentContext.content.length) > 100;

    // Only reset if there are significant changes (not just minor updates)
    const shouldReset = urlChanged || (titleChanged && newContext.title.length > 5) || (contentChanged && newContext.content.length > 50);

    if (shouldReset && conversations.length > 0) {
      console.log('🔄 Tab/context changed significantly, resetting Ask AI conversations:', {
        urlChanged,
        titleChanged,
        contentChanged,
        oldContext: currentContext,
        newContext,
        conversationsCount: conversations.length
      });

      // Reset all conversation state
      setConversations([]);
      setQuestion('');
      setIsLoading(false);
      setIsStreaming(false);
      setCopiedId(null);
      setPendingAutoSubmit(false);
      setUserHasScrolledUp(false);
      setLastSubmittedQuestion('');

      // Show brief reset message
      setContextResetMessage('Switched to new content - previous conversations cleared');
      setTimeout(() => setContextResetMessage(''), 3000);

      // Abort any ongoing streaming
      if (streamAbortController) {
        streamAbortController.abort();
        setStreamAbortController(null);
      }
    }

    // Always update the tracked context to avoid repeated checks
    setCurrentContext(newContext);
  }, [articleUrl, contextTitle, articleContent, conversations.length, currentContext, streamAbortController]);

  const handleSubmit = async () => {
    if (!question.trim() || isLoading || isStreaming) {
      console.log('⏸️ handleSubmit blocked:', { 
        hasQuestion: !!question.trim(), 
        isLoading,
        isStreaming,
        question: question.substring(0, 50) + (question.length > 50 ? '...' : '')
      });
      return;
    }

    console.log('✅ handleSubmit proceeding with question:', question.trim());
    
    const currentQuestion = question.trim();
    
    // Prevent duplicate submissions of the same question
    if (currentQuestion === lastSubmittedQuestion) {
      console.warn('⚠️ Duplicate question submission prevented:', currentQuestion);
      return;
    }
    
    // Additional safeguard: Check if we already have a conversation with this exact question
    const hasExistingConversation = conversations.some(conv => 
      conv.question.trim() === currentQuestion && 
      (conv.isLoading || conv.answer.trim() !== '')
    );
    
    if (hasExistingConversation) {
      console.warn('⚠️ Existing conversation found, skipping submission:', currentQuestion);
      return;
    }
    
    // Track this question as submitted
    setLastSubmittedQuestion(currentQuestion);
    const conversationId = Date.now().toString();
    
    // Create abort controller for streaming
    const abortController = new AbortController();
    setStreamAbortController(abortController);
    
    // Add loading conversation
    const loadingConversation: AIConversation = {
      id: conversationId,
      question: currentQuestion,
      answer: '', // Will be populated during streaming
      timestamp: new Date(),
      isLoading: true
    };

    setConversations(prev => [...prev, loadingConversation]);
    setQuestion('');
    // Clear the last submitted question after successful start of conversation
    setTimeout(() => setLastSubmittedQuestion(''), 2000);
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

      console.log('🔍 Response type:', typeof response, 'Response:', response);

      // Handle streaming response
      if (response && typeof response === 'object' && 'getReader' in response) {
        console.log('📡 Detected streaming response, initializing reader...');
        // Streaming response - read chunks in real-time
        const reader = (response as ReadableStream).getReader();
        const decoder = new TextDecoder();
        let accumulatedAnswer = '';
        let updateTimeout: NodeJS.Timeout | null = null;

        // Function to update conversation with throttling
        const updateConversation = (newContent: string, hasFinished: boolean = false) => {
          if (updateTimeout) {
            clearTimeout(updateTimeout);
          }
          
          // Add safety check for very long content to prevent memory issues
          const maxContentLength = 50000; // 50KB limit for UI performance
          const safeContent = newContent.length > maxContentLength 
            ? newContent.substring(0, maxContentLength) + '\n\n⚠️ *Response truncated due to length. Full content preserved.*'
            : newContent;
          
          updateTimeout = setTimeout(() => {
            setConversations(prev => prev.map(conv => 
              conv.id === conversationId 
                ? { 
                    ...conv, 
                    answer: safeContent, 
                    isLoading: hasFinished ? false : (safeContent.trim() === '' ? true : false)
                  }
                : conv
            ));
          }, 50); // Throttle updates to every 50ms for smoother streaming
        };

        // Buffer to accumulate partial chunks that might be split across reads
        let partialChunk = '';

        try {
          let streamFinished = false;
          
          // Set up a timeout for streaming to prevent hanging
          const streamTimeout = setTimeout(() => {
            console.log('⏱️ Streaming timeout reached, but continuing with accumulated content...');
            // Don't abort abruptly, just mark as finished to preserve accumulated content
            streamFinished = true;
          }, 60000); // Increased to 60 seconds
          let lengthWarningShown = false;
          
          while (true && !streamFinished) {
            // Check if streaming was aborted
            if (abortController.signal.aborted) {
              console.log('🛑 Streaming aborted by user or timeout');
              // If we have accumulated content, preserve it
              if (accumulatedAnswer.trim()) {
                console.log('💾 Preserving ' + accumulatedAnswer.length + ' characters of accumulated content');
                accumulatedAnswer += '\n\n*Note: Response was interrupted but partial content is shown above.*';
                updateConversation(accumulatedAnswer, false);
              }
              break;
            }
            
            // Warn about long responses
            if (!lengthWarningShown && accumulatedAnswer.length > 20000) {
              console.log('⚠️ Response is getting quite long (' + accumulatedAnswer.length + ' chars)');
              lengthWarningShown = true;
            }

            const { done, value } = await reader.read();
            
            if (done) {
              console.log('✅ Stream reader finished. StreamFinished flag:', streamFinished, 'Content length:', accumulatedAnswer.length);
              // Check if we got a proper [DONE] or if stream ended unexpectedly
              if (!streamFinished && accumulatedAnswer.trim()) {
                console.warn('⚠️ Stream ended without [DONE] signal, but we have', accumulatedAnswer.length, 'characters of content');
                // Don't add warning message if content looks substantial
                if (accumulatedAnswer.length < 100) {
                  accumulatedAnswer += '\n\n*Note: Stream ended unexpectedly - response may be incomplete.*';
                } else {
                  console.log('ℹ️ Content appears substantial, treating as complete');
                }
                updateConversation(accumulatedAnswer, false);
              } else if (!streamFinished && !accumulatedAnswer.trim()) {
                console.warn('❌ Stream ended with no content and no [DONE] signal');
              } else if (streamFinished) {
                console.log('✅ Stream completed normally with [DONE] signal');
              }
              break;
            }

            const chunk = decoder.decode(value);
            
            // Combine with any partial chunk from previous read
            const fullChunk = partialChunk + chunk;
            const lines = fullChunk.split('\n');
            
            // Keep the last line as partial if it doesn't end with newline
            partialChunk = chunk.endsWith('\n') ? '' : lines.pop() || '';
            
            console.log('📦 Received chunk with', lines.length, 'lines (+ partial:', partialChunk.length, 'chars):', chunk.substring(0, 200));

            for (const line of lines) {
              if (line.trim() === '') continue;
              
              try {
                // Parse Server-Sent Events format
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  
                  if (data === '[DONE]') {
                    console.log('✅ Stream finished with [DONE] signal. Total content:', accumulatedAnswer.length, 'characters');
                    streamFinished = true;
                    break;
                  }

                  const parsedData = JSON.parse(data);
                  console.log('📡 Received streaming data:', parsedData);
                  
                  if (parsedData.type === 'content') {
                    // Accumulate content chunks - handle both 'content' and 'text' fields
                    const contentChunk = parsedData.content || parsedData.text || '';
                    console.log('📝 Adding chunk (length:', contentChunk.length, '), total will be:', accumulatedAnswer.length + contentChunk.length, 'chars. Chunk preview:', contentChunk.substring(0, 100));
                    
                    // Safety check to prevent excessive memory usage
                    if (accumulatedAnswer.length < 100000) { // 100KB limit
                      accumulatedAnswer += contentChunk;
                      
                      // Update conversation with throttled streaming content
                      updateConversation(accumulatedAnswer, false);
                    } else if (accumulatedAnswer.length < 150000) { // Soft limit - continue but warn
                      accumulatedAnswer += contentChunk;
                      console.warn('⚠️ Response is getting very long (' + accumulatedAnswer.length + ' chars), but continuing...');
                      updateConversation(accumulatedAnswer, false);
                    } else {
                      // Hard limit - add warning and continue to look for [DONE]
                      if (!accumulatedAnswer.includes('⚠️ *Response truncated due to length limit.*')) {
                        accumulatedAnswer += '\n\n⚠️ *Response truncated due to length limit. Waiting for stream to complete...*';
                        updateConversation(accumulatedAnswer, false);
                      }
                      console.warn('⚠️ Hard length limit reached, ignoring further content but waiting for [DONE]');
                    }
                  } else if (parsedData.type === 'error') {
                    console.error('❌ Streaming error:', parsedData.message);
                    throw new Error(parsedData.message);
                  } else if (parsedData.type === 'metadata') {
                    console.log('📊 Stream metadata:', parsedData);
                  } else {
                    // Handle direct content without type wrapper (some APIs send raw content)
                    if (typeof parsedData === 'string' && parsedData.trim()) {
                      console.log('📝 Adding raw string content:', parsedData.substring(0, 50));
                      if (accumulatedAnswer.length < 100000) { // 100KB limit
                        accumulatedAnswer += parsedData;
                        updateConversation(accumulatedAnswer, false);
                      } else if (accumulatedAnswer.length < 150000) { // Soft limit
                        accumulatedAnswer += parsedData;
                        console.warn('⚠️ Response is getting very long (' + accumulatedAnswer.length + ' chars), but continuing...');
                        updateConversation(accumulatedAnswer, false);
                      } else {
                        // Hard limit - add warning and continue to look for [DONE]
                        if (!accumulatedAnswer.includes('⚠️ *Response truncated due to length limit.*')) {
                          accumulatedAnswer += '\n\n⚠️ *Response truncated due to length limit. Waiting for stream to complete...*';
                          updateConversation(accumulatedAnswer, false);
                        }
                        console.warn('⚠️ Hard length limit reached, ignoring further content but waiting for [DONE]');
                      }
                    } else if (parsedData.content || parsedData.text || parsedData.summary) {
                      // Handle different response formats
                      const contentChunk = parsedData.content || parsedData.text || parsedData.summary || '';
                      if (contentChunk) {
                        console.log('📝 Adding alternate format content:', contentChunk.substring(0, 50));
                        if (accumulatedAnswer.length < 100000) { // 100KB limit
                          accumulatedAnswer += contentChunk;
                          updateConversation(accumulatedAnswer, false);
                        } else if (accumulatedAnswer.length < 150000) { // Soft limit
                          accumulatedAnswer += contentChunk;
                          console.warn('⚠️ Response is getting very long (' + accumulatedAnswer.length + ' chars), but continuing...');
                          updateConversation(accumulatedAnswer, false);
                        } else {
                          // Hard limit - add warning and continue to look for [DONE]
                          if (!accumulatedAnswer.includes('⚠️ *Response truncated due to length limit.*')) {
                            accumulatedAnswer += '\n\n⚠️ *Response truncated due to length limit. Waiting for stream to complete...*';
                            updateConversation(accumulatedAnswer, false);
                          }
                          console.warn('⚠️ Hard length limit reached, ignoring further content but waiting for [DONE]');
                        }
                      }
                    } else {
                      console.log('⚠️ Unknown streaming data format:', parsedData);
                    }
                  }
                }
              } catch (parseError) {
                // Skip invalid JSON lines but check for raw text content
                console.warn('⚠️ Could not parse streaming data as JSON:', line.substring(0, 100));
                
                // Try to handle as raw text if it looks like content
                if (line.startsWith('data: ') && !line.includes('[DONE]') && line.length > 6) {
                  const rawText = line.slice(6);
                  if (rawText && rawText.trim()) {
                    if (accumulatedAnswer.length < 150000) {
                      console.log('📝 Adding raw text fallback:', rawText.substring(0, 50));
                      accumulatedAnswer += rawText;
                      updateConversation(accumulatedAnswer, false);
                    } else {
                      console.warn('⚠️ Raw text fallback ignored due to length limit');
                    }
                  }
                } else if (line.trim() && !line.startsWith('data:') && !line.includes('[DONE]') && line.length > 3) {
                  // Handle completely raw content lines (some servers send content without SSE format)
                  if (accumulatedAnswer.length < 150000) {
                    console.log('📝 Adding completely raw content:', line.substring(0, 50));
                    accumulatedAnswer += line + '\n';
                    updateConversation(accumulatedAnswer, false);
                  }
                }
              }
            }
          }
          
          // Process any remaining partial chunk
          if (partialChunk.trim() && !partialChunk.includes('[DONE]')) {
            console.log('📝 Processing final partial chunk:', partialChunk.substring(0, 100));
            try {
              if (partialChunk.startsWith('data: ')) {
                const data = partialChunk.slice(6);
                const parsedData = JSON.parse(data);
                if (parsedData.type === 'content' && (parsedData.content || parsedData.text)) {
                  const contentChunk = parsedData.content || parsedData.text || '';
                  if (contentChunk && accumulatedAnswer.length < 150000) {
                    accumulatedAnswer += contentChunk;
                    updateConversation(accumulatedAnswer, false);
                    console.log('✅ Added final partial content chunk');
                  }
                }
              } else if (accumulatedAnswer.length < 150000) {
                // Raw content
                accumulatedAnswer += partialChunk;
                updateConversation(accumulatedAnswer, false);
                console.log('✅ Added final raw partial chunk');
              }
            } catch (error) {
              console.warn('⚠️ Could not parse final partial chunk:', partialChunk);
            }
          }
          
          // Clear the stream timeout when loop ends
          clearTimeout(streamTimeout);
        } finally {
          reader.releaseLock();
          
          // Wait for any pending throttled updates to complete
          if (updateTimeout) {
            clearTimeout(updateTimeout);
          }
          
          // Final update to ensure all content is displayed with proper state
          const finalAnswer = accumulatedAnswer.trim() || '⚠️ No response received from AI. Please try again.';
          
          console.log('🏁 Final answer summary:', {
            length: finalAnswer.length,
            wordCount: finalAnswer.split(/\s+/).length,
            preview: finalAnswer.substring(0, 200) + (finalAnswer.length > 200 ? '...' : '')
          });
          
          setConversations(prev => prev.map(conv => 
            conv.id === conversationId 
              ? { ...conv, answer: finalAnswer, isLoading: false }
              : conv
          ));
          
          // Reset streaming states after final update
          setIsLoading(false);
          setIsStreaming(false);
        }

        console.log('✅ AI streaming response completed:', accumulatedAnswer ? accumulatedAnswer.substring(0, 100) + '...' : 'No content received');
        
        // Don't reset loading states here - let the finally block handle it
        // to avoid race conditions with throttled updates
        
        // If streaming failed to get any content, try fallback non-streaming request
        if (!accumulatedAnswer.trim()) {
          console.log('⚠️ Streaming produced no content, trying fallback non-streaming request...');
          // Set loading back to true only for the fallback request
          setIsLoading(true);
          try {
            const fallbackResponse = await thoughtRoomsAPI.queryAI({ 
              text: enhancedPrompt, 
              fast: true,
              stream: false // Explicitly disable streaming for fallback
            }) as AIQueryResponse;
            
            if (fallbackResponse?.summary) {
              setConversations(prev => prev.map(conv => 
                conv.id === conversationId 
                  ? { ...conv, answer: fallbackResponse.summary, isLoading: false }
                  : conv
              ));
              // Reset loading states after fallback completes
              setIsLoading(false);
              setIsStreaming(false);
              console.log('✅ Fallback request successful');
              return;
            }
          } catch (fallbackError) {
            console.error('❌ Fallback request also failed:', fallbackError);
            // Reset loading states even if fallback fails
            setIsLoading(false);
            setIsStreaming(false);
          }
        }
      } else {
        // Fallback to non-streaming response
        console.log('📝 Using non-streaming response');
        const aiResponse = response as any;
        
        // More robust response extraction
        let summary = '';
        if (typeof aiResponse === 'string') {
          summary = aiResponse;
        } else if (aiResponse?.summary && typeof aiResponse.summary === 'string') {
          summary = aiResponse.summary;
        } else if (aiResponse?.text && typeof aiResponse.text === 'string') {
          summary = aiResponse.text;
        } else if (aiResponse?.content && typeof aiResponse.content === 'string') {
          summary = aiResponse.content;
        } else {
          console.warn('⚠️ Unexpected response format:', aiResponse);
          summary = '⚠️ Received an unexpected response format. Please try again.';
        }
        
        // Ensure we have meaningful content
        if (!summary || summary.trim() === '') {
          summary = '⚠️ No response content received from AI. Please try again.';
        }
        
        setConversations(prev => prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, answer: summary, isLoading: false }
            : conv
        ));

        console.log('✅ AI response received:', summary.substring(0, 100) + '...');
        
        // Reset loading states after non-streaming response
        setIsLoading(false);
        setIsStreaming(false);
      }

    } catch (error) {
      if (abortController.signal.aborted) {
        console.log('🛑 AI query aborted by user or timeout');
        // Check if this was a user abort or a timeout
        const wasTimeout = error instanceof Error && error.name === 'AbortError';
        const abortMessage = wasTimeout 
          ? '⏱️ Request timed out. The AI service is taking too long to respond. Please try again.'
          : '🛑 Response generation was stopped.';
          
        // Update with aborted message
        setConversations(prev => prev.map(conv => 
          conv.id === conversationId 
            ? { 
                ...conv, 
                answer: abortMessage,
                isLoading: false 
              }
            : conv
        ));
      } else {
        console.error('❌ AI query failed:', error);
        
        // Provide more specific error messages based on error type
        let errorMessage = '❌ Sorry, I encountered an error while processing your question. Please try again.';
        
        if (error instanceof Error) {
          if (error.message.includes('Authentication failed')) {
            errorMessage = '🔐 Authentication error. Please log in again and try.';
          } else if (error.message.includes('Failed to fetch') || error.message.includes('network')) {
            errorMessage = '🌐 Network error. Please check your connection and try again.';
          } else if (error.message.includes('Invalid response format')) {
            errorMessage = '⚠️ Received invalid response from AI service. Please try again.';
          } else if (error.message.includes('No response body')) {
            errorMessage = '📭 No response received from AI service. Please try again.';
          }
        }
        
        // Update with error message
        setConversations(prev => prev.map(conv => 
          conv.id === conversationId 
            ? { 
                ...conv, 
                answer: errorMessage,
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
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !isLoading && !isStreaming && question.trim()) {
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

      // Safety check for content length to prevent markdown renderer issues
      if (content.length > 50000) {
        console.warn('⚠️ Content is very long (' + content.length + ' chars), truncating for display');
        content = content.substring(0, 47000) + '\n\n⚠️ *Content truncated for display performance.*';
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
      
      // Minimal post-processing - let CSS handle the styling
      return { 
        __html: rendered
          // Ensure proper spacing around math expressions
          .replace(/<span class="katex-display">/g, '<div class="katex-display">')
          .replace(/<\/span>(\s*<p>)/g, '</div>$1')
          // Add inline-code class for better styling
          .replace(/<code>([^<]+)<\/code>/g, '<code class="inline-code">$1</code>')
      };
    } catch (error) {
      console.error('Markdown rendering error:', error);
      // Fallback with basic HTML formatting
      return { 
        __html: (content || '')
          .replace(/\n/g, '<br>')
          .replace(/^# (.+)$/gm, '<h1>$1</h1>')
          .replace(/^## (.+)$/gm, '<h2>$1</h2>')
          .replace(/^### (.+)$/gm, '<h3>$1</h3>')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
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
      <div className={`fixed bottom-0 left-0 right-0 z-40 pointer-events-none ${getFontSizeClass()}`}>
        <div 
          className={`bg-philonet-panel border border-philonet-border rounded-t-xl shadow-2xl flex flex-col ${getDrawerHeightClass()} w-full pointer-events-auto transform transition-transform duration-300 ease-out translate-y-0`}
          onClick={(e) => e.stopPropagation()}
        >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-philonet-border bg-philonet-card/50 rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30">
              <Bot className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <h2 className={`font-semibold text-white ${fontSize === 'large' ? 'text-lg' : fontSize === 'small' ? 'text-sm' : 'text-base'}`}>AI Assistant</h2>
              <p className={`text-philonet-text-muted ${fontSize === 'large' ? 'text-sm' : 'text-xs'}`}>
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
              <h3 className={`font-semibold text-white mb-2 ${fontSize === 'large' ? 'text-xl' : fontSize === 'small' ? 'text-base' : 'text-lg'}`}>
                Start asking questions
              </h3>
              <p className={`text-philonet-text-muted max-w-xs text-center ${fontSize === 'large' ? 'text-base' : 'text-sm'}`}>
                I can help explain concepts, summarize sections, or answer specific questions about this content.
              </p>
              {contextTitle && (
                <p className={`text-blue-400/70 max-w-xs text-center mt-2 ${fontSize === 'large' ? 'text-sm' : 'text-xs'}`}>
                  📄 Currently analyzing: {contextTitle}
                </p>
              )}
              {contextResetMessage && (
                <p className={`text-amber-400/80 max-w-xs text-center mt-2 p-2 bg-amber-400/10 border border-amber-400/20 rounded ${fontSize === 'large' ? 'text-sm' : 'text-xs'}`}>
                  🔄 {contextResetMessage}
                </p>
              )}
            </div>
          ) : (
            <>
              {conversations.map((conversation) => (
              <div key={conversation.id} className="space-y-3">
                {/* Question */}
                <div className="flex justify-end">
                  <div className="max-w-[85%] bg-gradient-to-r from-blue-600/20 to-blue-500/20 border border-blue-500/30 rounded-lg rounded-tr-sm p-3">
                    <p className={`text-white whitespace-pre-wrap break-words ${fontSize === 'large' ? 'text-base' : 'text-sm'}`}>
                      {conversation.question}
                    </p>
                    <div className={`flex items-center gap-2 mt-2 text-philonet-text-muted ${fontSize === 'large' ? 'text-sm' : 'text-xs'}`}>
                      <span>You</span>
                      <span>•</span>
                      <span>{conversation.timestamp.toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>

                {/* Answer */}
                <div className="flex justify-start">
                  <div className="max-w-[85%] bg-philonet-card/60 border border-philonet-border rounded-lg rounded-tl-sm p-3 ai-response-container">
                    {/* Show loading spinner only if no content yet */}
                    {conversation.isLoading && (!conversation.answer || conversation.answer.trim() === '') ? (
                      <div className="flex items-center gap-3">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                        <span className={`text-philonet-text-muted ${fontSize === 'large' ? 'text-base' : 'text-sm'}`}>
                          {isStreaming ? "AI is streaming response..." : "AI is thinking..."}
                        </span>
                      </div>
                    ) : (
                      <>
                        {/* Show content if we have any, even while loading/streaming */}
                        {conversation.answer && conversation.answer.trim() !== '' && (
                          <div 
                            className={`prose prose-invert max-w-none ${
                              fontSize === 'large' ? 'prose-lg' : 
                              fontSize === 'small' ? 'prose-sm' : 
                              'prose-sm'
                            }`}
                            dangerouslySetInnerHTML={renderMarkdown(conversation.answer)}
                          />
                        )}
                        
                        {/* Show streaming indicator when actively streaming and we have content */}
                        {isStreaming && conversation.answer && conversation.answer.trim() !== '' && (
                          <div className={`flex items-center gap-2 mt-2 text-blue-400 ${fontSize === 'large' ? 'text-sm' : 'text-xs'}`}>
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                            <span>Streaming...</span>
                          </div>
                        )}
                        
                        {/* Show message if no answer and not loading */}
                        {(!conversation.answer || conversation.answer.trim() === '') && !conversation.isLoading && (
                          <div className="text-amber-400 text-xs mt-2 italic bg-amber-400/10 border border-amber-400/20 rounded p-2">
                            ⚠️ No response received from AI service. Please try asking your question again.
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-philonet-border/50">
                          <div className={`flex items-center gap-2 text-philonet-text-muted ${fontSize === 'large' ? 'text-sm' : 'text-xs'}`}>
                            <Bot className="h-3 w-3" />
                            <span>AI Assistant</span>
                            <span>•</span>
                            <span>{conversation.timestamp.toLocaleTimeString()}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(conversation.answer, conversation.id)}
                            className={`h-6 px-2 text-philonet-text-muted hover:text-white hover:bg-philonet-border/30 rounded transition-colors ${fontSize === 'large' ? 'text-sm' : 'text-xs'}`}
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
                  className={`bg-blue-600 hover:bg-blue-700 border-blue-500 text-white shadow-lg animate-bounce px-3 py-1 h-8 ${fontSize === 'large' ? 'text-sm' : 'text-xs'}`}
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
            <div className={`mb-2 flex items-center gap-2 text-philonet-text-muted ${fontSize === 'large' ? 'text-base' : 'text-sm'}`}>
              <Bot className="h-4 w-4" />
              <span>Ask a question</span>
              {(isLoading || isStreaming) && (
                <span className="text-amber-400 ml-2">
                  {isStreaming ? "🔄 Streaming..." : "🤔 Processing..."} 
                  <span className="text-xs ml-1">(Type next question or wait)</span>
                </span>
              )}
            </div>
            
            <div className="relative">
              <Textarea
                ref={textareaRef}
                placeholder={isLoading ? "Type your next question while AI processes..." : "What would you like to know about this content?"}
                value={question}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={2}
                className={cn(
                  `bg-transparent border-0 p-0 resize-none text-white placeholder:text-philonet-text-muted focus:ring-0 ${fontSize === 'large' ? 'text-base' : 'text-sm'}`
                )}
                disabled={false} // Always allow typing
              />
            </div>
            
            <div className="flex items-center justify-between mt-2">
              <span className={`text-philonet-text-muted ${fontSize === 'large' ? 'text-sm' : 'text-xs'}`}>
                {isStreaming ? "Wait for response to finish or stop it..." : isLoading ? "Wait for AI to finish or stop it..." : "Press Cmd/Ctrl+Enter to send"}
              </span>
              <div className="flex items-center gap-2">
                {isStreaming && (
                  <Button
                    onClick={handleStopStreaming}
                    variant="ghost"
                    size="sm"
                    className={`h-8 px-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 transition-colors ${fontSize === 'large' ? 'text-base' : 'text-sm'}`}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Stop
                  </Button>
                )}
                <Button
                  onClick={handleSubmit}
                  disabled={!question.trim() || isLoading || isStreaming}
                  className={cn(
                    `h-8 px-3 transition-all duration-200 ${fontSize === 'large' ? 'text-base' : 'text-sm'}`,
                    (isLoading || isStreaming) 
                      ? "bg-gray-600 cursor-not-allowed opacity-50 border-gray-500" 
                      : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 border-blue-400"
                  )}
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
