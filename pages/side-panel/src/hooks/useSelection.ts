import { useEffect, useCallback } from 'react';

export function useSelection(contentRef: React.RefObject<HTMLElement>, onSelectionChange: (text: string) => void) {
  const handleSelection = useCallback(() => {
    const sel = window.getSelection();
    if (!sel) return;
    
    const text = String(sel.toString() || "").trim();
    if (!text) { 
      onSelectionChange(""); 
      return; 
    }
    
    if (!contentRef.current) return;
    
    const anchorNode = sel.anchorNode && sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentElement : sel.anchorNode;
    const focusNode = sel.focusNode && sel.focusNode.nodeType === 3 ? sel.focusNode.parentElement : sel.focusNode;
    
    if ((anchorNode && contentRef.current.contains(anchorNode)) || 
        (focusNode && contentRef.current.contains(focusNode))) {
      if (text.length >= 3 && text.length <= 160) {
        onSelectionChange(text);
      }
    }
  }, [contentRef, onSelectionChange]);

  useEffect(() => {
    document.addEventListener("mouseup", handleSelection);
    return () => document.removeEventListener("mouseup", handleSelection);
  }, [handleSelection]);
}
