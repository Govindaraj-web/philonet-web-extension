import React from 'react';
import { cn } from '@extension/ui';
import { ExternalLink } from 'lucide-react';

interface SourceButtonProps {
  onClick: () => void;
  className?: string;
  sourceUrl?: string;
}

const SourceButton: React.FC<SourceButtonProps> = ({ onClick, className = "", sourceUrl }) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-shrink-0 group mt-1 transition-all duration-200 ease-out hover:scale-105 focus:outline-none focus:scale-105",
        className
      )}
      title="Open source webpage"
      aria-label="Open original source webpage"
    >
      <div className="relative">
        <div className={cn(
          "px-3 py-2 md:px-4 md:py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 ease-out",
          "backdrop-blur-sm border border-philonet-border-light/40",
          "bg-philonet-card/60 text-philonet-text-muted hover:bg-philonet-card/80 hover:text-philonet-blue-400 hover:border-philonet-blue-500/40"
        )}>
          {sourceUrl && (
            <img 
              src={`https://www.google.com/s2/favicons?sz=32&domain_url=${encodeURIComponent(sourceUrl)}`}
              alt="Source favicon"
              className="w-4 h-4 md:w-5 md:h-5 rounded-sm opacity-90 flex-shrink-0"
              onError={(e) => {
                const target = e.currentTarget as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          )}
          <ExternalLink className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
        </div>
      </div>
      <div className="mt-1 text-[10px] md:text-[11px] text-philonet-text-subtle font-light tracking-philonet-wide text-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 max-w-[120px] md:max-w-[150px] truncate">
        {sourceUrl ? new URL(sourceUrl).hostname : 'Source'}
      </div>
    </button>
  );
};

export default SourceButton;
