import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { Share2, Copy, Check, ExternalLink } from 'lucide-react';
import { Button } from './ui';

interface ShareDropdownProps {
  shareUrl: string;
  articleTitle?: string;
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}

const ShareDropdown: React.FC<ShareDropdownProps> = ({
  shareUrl,
  articleTitle = "Current Page",
  isOpen,
  onToggle,
  className = ""
}) => {
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        if (isOpen) {
          onToggle();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onToggle]);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  const handleOpenInNewTab = () => {
    window.open(shareUrl, '_blank');
    onToggle(); // Close dropdown after opening
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <Button 
        className="h-9 px-4 text-sm"
        onClick={onToggle}
        title="Share article"
      >
        <Share2 className="h-4 w-4" />
        <span className="ml-2">Share</span>
      </Button>
      
      {/* Share dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute top-full right-0 mt-2 w-[320px] rounded-philonet-lg border border-philonet-border bg-philonet-card/95 backdrop-blur shadow-xl z-50"
          >
            <div className="p-4">
              {/* Header */}
              <div className="flex items-center gap-2 mb-3">
                <Share2 className="h-4 w-4 text-philonet-blue-400" />
                <span className="text-sm font-medium text-white">Share Article</span>
              </div>
              
              {/* Article title */}
              <div className="mb-3">
                <p className="text-xs text-philonet-text-muted truncate" title={articleTitle}>
                  {articleTitle}
                </p>
              </div>
              
              {/* Share URL input */}
              <div className="mb-3 relative">
                <div className="flex items-center gap-2 p-2 bg-philonet-panel/50 border border-philonet-border/50 rounded-lg">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 bg-transparent text-sm text-philonet-text-secondary outline-none select-all"
                    onClick={(e) => e.currentTarget.select()}
                  />
                </div>
                
                {/* Floating feedback message - positioned at top right of input */}
                <AnimatePresence>
                  {copied && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full shadow-lg z-20 flex items-center gap-1"
                    >
                      <Check className="h-3 w-3" />
                      Copied!
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleCopyUrl}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-philonet-blue-600 hover:bg-philonet-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy Link
                    </>
                  )}
                </button>
                
                <button
                  onClick={handleOpenInNewTab}
                  className="px-3 py-2 bg-philonet-border hover:bg-philonet-border-light text-philonet-text hover:text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                  title="Open in new tab"
                >
                  <ExternalLink className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ShareDropdown;
