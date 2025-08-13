import React from 'react';
import { cn } from '@extension/ui';
import { ExternalLink } from 'lucide-react';

interface SourceButtonProps {
  onClick: () => void;
  className?: string;
}

const SourceButton: React.FC<SourceButtonProps> = ({ onClick, className = "" }) => {
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
          "w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all duration-300 ease-out",
          "backdrop-blur-sm border border-philonet-border-light/40",
          "bg-philonet-card/60 text-philonet-text-muted hover:bg-philonet-card/80 hover:text-philonet-blue-400 hover:border-philonet-blue-500/40"
        )}>
          <ExternalLink className="w-4 h-4 md:w-5 md:h-5" />
        </div>
      </div>
      <div className="mt-1 text-[10px] md:text-[11px] text-philonet-text-subtle font-light tracking-philonet-wide text-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        Source
      </div>
    </button>
  );
};

export default SourceButton;
