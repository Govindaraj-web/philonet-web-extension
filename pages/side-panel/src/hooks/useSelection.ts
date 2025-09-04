import { useEffect, useCallback } from 'react';

// Simple error toast function
const showErrorToast = (message: string) => {
  console.error('🚨 Selection Error:', message);
  // Create a temporary toast element
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #ef4444;
    color: white;
    padding: 12px 16px;
    border-radius: 6px;
    z-index: 10000;
    font-size: 14px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  `;
  document.body.appendChild(toast);
  
  // Remove after 3 seconds
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 3000);
};

// Enhanced highlight function to visually highlight selected text
const addSelectionHighlight = (selection: Selection) => {
  // Remove any existing highlights first
  removeSelectionHighlight();
  
  if (!selection.rangeCount) return;
  
  const range = selection.getRangeAt(0);
  const span = document.createElement('span');
  span.className = 'philonet-text-highlight';
  span.style.cssText = `
    background: rgba(203, 163, 57, 0.2);
    border-radius: 4px;
    padding: 2px 4px;
    margin: -2px -4px;
    box-shadow: 0 0 0 1px rgba(203, 163, 57, 0.5);
    transition: all 0.3s ease;
    color: #CBA339 !important;
  `;
  
  // Add styles if they don't exist (remove old ones first)
  const existingStyle = document.querySelector('#philonet-highlight-styles');
  if (existingStyle) {
    existingStyle.remove();
  }
  
  const style = document.createElement('style');
  style.id = 'philonet-highlight-styles';
  style.textContent = `
    .philonet-text-highlight {
      background: rgba(203, 163, 57, 0.2) !important;
      color: #CBA339 !important;
      border-radius: 4px !important;
      padding: 2px 4px !important;
      margin: -2px -4px !important;
      box-shadow: 0 0 0 1px rgba(203, 163, 57, 0.5) !important;
      transition: all 0.3s ease !important;
      animation: none !important;
    }
    .philonet-text-highlight:hover {
      background: rgba(203, 163, 57, 0.3) !important;
      box-shadow: 0 0 0 2px rgba(203, 163, 57, 0.6) !important;
      color: #CBA339 !important;
    }
    .philonet-text-highlight * {
      color: #CBA339 !important;
    }
    /* Override any existing animations */
    @keyframes philonet-highlight-glow {
      0%, 100% { 
        background: rgba(203, 163, 57, 0.2) !important;
        color: #CBA339 !important;
        box-shadow: 0 0 0 1px rgba(203, 163, 57, 0.5) !important;
      }
    }
  `;
  document.head.appendChild(style);
  
  try {
    range.surroundContents(span);
  } catch (e) {
    // If surroundContents fails (e.g., range spans multiple elements), 
    // fall back to extracting and wrapping the contents
    try {
      const contents = range.extractContents();
      span.appendChild(contents);
      range.insertNode(span);
    } catch (err) {
      console.log('Could not highlight selection:', err);
    }
  }
};

// Remove existing highlights
const removeSelectionHighlight = () => {
  const highlights = document.querySelectorAll('.philonet-text-highlight');
  highlights.forEach(highlight => {
    const parent = highlight.parentNode;
    if (parent) {
      // Move all child nodes to parent and remove the highlight span
      while (highlight.firstChild) {
        parent.insertBefore(highlight.firstChild, highlight);
      }
      parent.removeChild(highlight);
      // Normalize text nodes
      parent.normalize();
    }
  });
};

// Export function to clear highlights (used when clearing selection)
export const clearSelectionHighlight = removeSelectionHighlight;

export function useSelection(contentRef: React.RefObject<HTMLElement>, onSelectionChange: (text: string) => void) {
  const handleSelection = useCallback(() => {
    const sel = window.getSelection();
    if (!sel) return;
    
    // Get the raw selected text without trimming initially to preserve multi-line selections
    const rawText = sel.toString() || "";
    const text = rawText.trim();
    
    console.log('🔍 useSelection hook - Raw selection:', {
      rawText: rawText,
      trimmedText: text,
      rawLength: rawText.length,
      trimmedLength: text.length,
      hasNewlines: rawText.includes('\n'),
      lineCount: rawText.split('\n').length
    });
    
    if (!text) { 
      onSelectionChange(""); 
      return; 
    }
    
    if (!contentRef.current) {
      console.log('⚠️ useSelection hook - contentRef.current is null');
      return;
    }
    
    const anchorNode = sel.anchorNode && sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentElement : sel.anchorNode;
    const focusNode = sel.focusNode && sel.focusNode.nodeType === 3 ? sel.focusNode.parentElement : sel.focusNode;
    
    console.log('🔍 useSelection hook - Node containment check:', {
      anchorContained: anchorNode && contentRef.current.contains(anchorNode),
      focusContained: focusNode && contentRef.current.contains(focusNode),
      anchorNode: anchorNode,
      focusNode: focusNode
    });
    
    if ((anchorNode && contentRef.current.contains(anchorNode)) || 
        (focusNode && contentRef.current.contains(focusNode))) {
      // No character limit - accept any non-empty selection
      if (text.length >= 1) {
        console.log('✅ useSelection hook - Valid selection, calling onSelectionChange');
        
        // Add visual highlight to the selected text
        addSelectionHighlight(sel);
        
        onSelectionChange(text);
      } else {
        console.log('⚠️ useSelection hook - Empty selection');
        // Show error toast for empty selection
        showErrorToast('Selection is empty');
      }
    } else {
      console.log('⚠️ useSelection hook - Selection not within content ref');
      // Show error toast for invalid selection area
      showErrorToast('Please select text within the article content');
    }
  }, [contentRef, onSelectionChange]);

  useEffect(() => {
    document.addEventListener("mouseup", handleSelection);
    document.addEventListener("keyup", handleSelection); // Also listen for keyboard selections
    return () => {
      document.removeEventListener("mouseup", handleSelection);
      document.removeEventListener("keyup", handleSelection);
    };
  }, [handleSelection]);
}
