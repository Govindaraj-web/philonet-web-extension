import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Highlighter } from 'lucide-react';

interface ContentOverlayProps {
  isVisible: boolean;
  taggedText: string;
  onClose: () => void;
}

const ContentOverlay: React.FC<ContentOverlayProps> = ({ 
  isVisible, 
  taggedText, 
  onClose 
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close overlay on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isVisible, onClose]);

  // Highlight the tagged text in the content
  useEffect(() => {
    if (!isVisible || !taggedText) return;

    const highlightTaggedText = () => {
      // Find all text nodes that contain the tagged text
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            const text = node.textContent?.toLowerCase() || '';
            const searchText = taggedText.toLowerCase();
            return text.includes(searchText) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
          }
        }
      );

      const matchingNodes: Text[] = [];
      let node;
      
      while (node = walker.nextNode() as Text) {
        matchingNodes.push(node);
      }

      // Clear any existing highlights
      document.querySelectorAll('.philonet-overlay-highlight').forEach(el => {
        const parent = el.parentNode;
        if (parent) {
          parent.replaceChild(document.createTextNode(el.textContent || ''), el);
          parent.normalize();
        }
      });

      // Add highlights to matching text
      matchingNodes.forEach(textNode => {
        const text = textNode.textContent || '';
        const searchText = taggedText.toLowerCase();
        const lowerText = text.toLowerCase();
        
        const index = lowerText.indexOf(searchText);
        if (index !== -1) {
          const parent = textNode.parentNode;
          if (parent) {
            const beforeText = text.substring(0, index);
            const matchText = text.substring(index, index + taggedText.length);
            const afterText = text.substring(index + taggedText.length);

            const fragment = document.createDocumentFragment();
            
            if (beforeText) {
              fragment.appendChild(document.createTextNode(beforeText));
            }
            
            const highlightSpan = document.createElement('span');
            highlightSpan.className = 'philonet-overlay-highlight';
            highlightSpan.style.cssText = `
              background-color: rgba(203, 163, 57, 0.2);
              border: 1px solid rgba(203, 163, 57, 0.6);
              border-radius: 3px;
              padding: 1px 3px;
              box-shadow: 0 0 0 1px rgba(203, 163, 57, 0.3);
              color: #CBA339;
              font-weight: 500;
            `;
            highlightSpan.textContent = matchText;
            fragment.appendChild(highlightSpan);
            
            if (afterText) {
              fragment.appendChild(document.createTextNode(afterText));
            }

            parent.replaceChild(fragment, textNode);
          }
        }
      });

      // Scroll to the first highlight
      const firstHighlight = document.querySelector('.philonet-overlay-highlight');
      if (firstHighlight) {
        firstHighlight.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'nearest'
        });
      }
    };

    // Add CSS styles for highlight
    if (!document.getElementById('philonet-overlay-styles')) {
      // Remove any existing animation styles first
      const existingStyle = document.getElementById('philonet-overlay-styles');
      if (existingStyle) {
        existingStyle.remove();
      }
      
      const style = document.createElement('style');
      style.id = 'philonet-overlay-styles';
      style.textContent = `
        .philonet-overlay-highlight {
          background-color: rgba(203, 163, 57, 0.2) !important;
          color: #CBA339 !important;
          border: 1px solid rgba(203, 163, 57, 0.6) !important;
          border-radius: 3px !important;
          padding: 1px 3px !important;
          box-shadow: 0 0 0 1px rgba(203, 163, 57, 0.3) !important;
          font-weight: 500 !important;
          animation: none !important;
        }
      `;
      document.head.appendChild(style);
    }

    const timeoutId = setTimeout(highlightTaggedText, 100);
    return () => clearTimeout(timeoutId);
  }, [isVisible, taggedText]);

  // Clean up highlights when overlay is closed
  useEffect(() => {
    if (!isVisible) {
      document.querySelectorAll('.philonet-overlay-highlight').forEach(el => {
        const parent = el.parentNode;
        if (parent) {
          parent.replaceChild(document.createTextNode(el.textContent || ''), el);
          parent.normalize();
        }
      });
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={overlayRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[9999] pointer-events-none"
        style={{
          background: 'transparent'
        }}
      >
        {/* Content area overlay - makes main content interactive but dimmed */}
        <div className="absolute inset-0 pointer-events-auto" onClick={onClose}>
          {/* Close button */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed top-4 right-4 pointer-events-auto"
          >
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-lg border border-white/20 hover:border-white/30 transition-all duration-200 shadow-lg"
            >
              <X className="h-4 w-4" />
              <span className="text-sm font-medium">Close Highlight</span>
            </button>
          </motion.div>

          {/* Tagged text info panel */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 transform -translate-x-1/2 pointer-events-auto"
          >
            <div className="flex items-center gap-3 px-4 py-3 bg-philonet-card/95 backdrop-blur-md rounded-lg border border-philonet-border shadow-xl">
              <div className="p-2 rounded-full bg-philonet-blue-500/20 border border-philonet-blue-500/30">
                <Highlighter className="h-4 w-4 text-philonet-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Highlighting Tagged Content</p>
                <p className="text-xs text-philonet-text-muted truncate max-w-[300px]">
                  "{taggedText}"
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ContentOverlay;
