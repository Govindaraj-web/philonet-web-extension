import React from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { History } from 'lucide-react';
import { HistoryItem } from '../types';

interface HistoryMenuProps {
  isOpen: boolean;
  onToggle: () => void;
  historyItems: HistoryItem[];
  onItemClick: (url: string) => void;
  isMobile?: boolean;
}

const HistoryMenu: React.FC<HistoryMenuProps> = ({ 
  isOpen, 
  onToggle, 
  historyItems, 
  onItemClick,
  isMobile = false 
}) => {
  return (
    <>
      <button
        onClick={onToggle}
        className="w-full text-left p-3 rounded-lg border border-transparent hover:border-philonet-border-light hover:bg-philonet-panel/60 transition-colors group flex items-center gap-3"
      >
        <History className="h-4 w-4 text-philonet-text-muted group-hover:text-philonet-blue-500" />
        <span className="text-sm text-philonet-text-primary group-hover:text-white">
          Reading History
        </span>
      </button>
      
      {/* History submenu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className={`mt-2 ml-4 space-y-1 border-l border-philonet-border-light pl-3 ${
              isMobile ? 'max-h-[200px] overflow-y-auto' : ''
            }`}
          >
            {historyItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onItemClick(item.url)}
                className="w-full text-left p-2 rounded-lg hover:bg-philonet-panel/60 transition-colors group"
              >
                <div className="text-xs text-philonet-text-primary group-hover:text-white truncate">
                  {item.title}
                </div>
                <div className="text-[10px] text-philonet-text-subtle mt-0.5">
                  {item.timestamp.toLocaleDateString()}
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default HistoryMenu;
