import React, { useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { History, Clock } from 'lucide-react';
import { HistoryItem } from '../types';

interface HistoryMenuProps {
  isOpen: boolean;
  onToggle: () => void;
  historyItems: HistoryItem[];
  onItemClick: (url: string) => void;
  isMobile?: boolean;
  loading?: boolean;
  error?: string | null;
  onLoadMore?: () => void;
  hasMoreData?: boolean;
}

// Helper function to group items by time periods
const groupItemsByTimePeriod = (items: HistoryItem[]) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(today);
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  const groups = {
    today: [] as HistoryItem[],
    yesterday: [] as HistoryItem[],
    thisWeek: [] as HistoryItem[],
    thisMonth: [] as HistoryItem[],
    older: [] as HistoryItem[]
  };

  items.forEach(item => {
    const itemDate = new Date(item.timestamp);
    if (itemDate >= today) {
      groups.today.push(item);
    } else if (itemDate >= yesterday) {
      groups.yesterday.push(item);
    } else if (itemDate >= weekAgo) {
      groups.thisWeek.push(item);
    } else if (itemDate >= monthAgo) {
      groups.thisMonth.push(item);
    } else {
      groups.older.push(item);
    }
  });

  return groups;
};

const HistoryMenu: React.FC<HistoryMenuProps> = ({ 
  isOpen, 
  onToggle, 
  historyItems, 
  onItemClick,
  isMobile = false,
  loading = false,
  error = null,
  onLoadMore,
  hasMoreData = true
}) => {
  const groupedItems = useMemo(() => groupItemsByTimePeriod(historyItems), [historyItems]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Handle scroll to load more content
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer || !isOpen) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const scrolledToBottom = scrollTop + clientHeight >= scrollHeight - 10; // 10px threshold

      if (scrolledToBottom && !loading && hasMoreData && onLoadMore) {
        onLoadMore();
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [isOpen, loading, hasMoreData, onLoadMore]);

  const renderHistoryGroup = (title: string, items: HistoryItem[]) => {
    if (items.length === 0) return null;

    return (
      <div key={title} className="mb-4">
        <h4 className="text-[10px] font-medium text-philonet-text-subtle uppercase tracking-wider mb-2 px-1">
          {title}
        </h4>
        <div className="space-y-1">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => onItemClick(item.url)}
              className="w-full text-left p-2.5 rounded-lg hover:bg-philonet-panel/60 transition-colors group"
            >
              <div className="flex items-start gap-2.5">
                <div className="relative flex-shrink-0">
                  {item.thumbnail_url && (
                    <img 
                      src={item.thumbnail_url} 
                      alt="" 
                      className="w-10 h-10 rounded object-cover"
                    />
                  )}
                  {item.comment_count !== undefined && item.comment_count !== null && item.comment_count > 0 && (
                    <div className="absolute -top-1 -right-1 bg-black text-white text-[8px] font-medium rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                      {item.comment_count > 99 ? '99+' : item.comment_count}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 pr-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-xs text-philonet-text-primary group-hover:text-white font-medium leading-relaxed flex-1 min-w-0">
                      <div className="line-clamp-2">
                        {item.title}
                      </div>
                    </div>
                    {item.interaction_summary && (
                      <div className="flex items-center gap-1 text-[9px] text-philonet-text-subtle flex-shrink-0 mt-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {item.interaction_summary.time_ago}
                      </div>
                    )}
                  </div>
                  {item.summary && (
                    <div className="text-[10px] text-philonet-text-subtle mt-0.5 line-clamp-2">
                      {item.summary}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };
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
            ref={scrollContainerRef}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className={`mt-2 ml-4 space-y-1 border-l border-philonet-border-light pl-3 ${
              isMobile ? 'max-h-[450px] overflow-y-auto scrollbar-hide' : 'max-h-[600px] overflow-y-auto scrollbar-hide'
            }`}
          >
            {loading && historyItems.length === 0 ? (
              <div className="flex items-center gap-2 p-2 text-xs text-philonet-text-subtle">
                <div className="animate-spin w-3 h-3 border border-philonet-border-light border-t-philonet-blue-500 rounded-full"></div>
                Loading history...
              </div>
            ) : error ? (
              <div className="p-2 text-xs text-red-400">
                {error}
              </div>
            ) : historyItems.length === 0 ? (
              <div className="p-2 text-xs text-philonet-text-subtle">
                No reading history yet
              </div>
            ) : (
              <>
                {renderHistoryGroup('Today', groupedItems.today)}
                {renderHistoryGroup('Yesterday', groupedItems.yesterday)}
                {renderHistoryGroup('This Week', groupedItems.thisWeek)}
                {renderHistoryGroup('This Month', groupedItems.thisMonth)}
                {renderHistoryGroup('Older', groupedItems.older)}
                
                {/* Loading and end-of-data indicators */}
                {loading && (
                  <div className="flex items-center justify-center gap-2 p-3 text-xs text-philonet-text-subtle">
                    <div className="animate-spin w-3 h-3 border border-philonet-border-light border-t-philonet-blue-500 rounded-full"></div>
                    Loading more history...
                  </div>
                )}
                
                {!hasMoreData && !loading && historyItems.length > 0 && (
                  <div className="p-3 text-center">
                    <div className="text-[10px] text-philonet-text-subtle">
                      — End of history —
                    </div>
                  </div>
                )}
                
                {/* Manual load more button (fallback) */}
                {hasMoreData && !loading && historyItems.length >= 20 && onLoadMore && (
                  <button
                    onClick={onLoadMore}
                    className="w-full text-left p-2 rounded-lg hover:bg-philonet-panel/60 transition-colors mt-4"
                  >
                    <div className="text-xs text-philonet-blue-400 hover:text-philonet-blue-300 text-center">
                      Load more...
                    </div>
                  </button>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default HistoryMenu;
