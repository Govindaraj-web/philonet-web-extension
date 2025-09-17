import React from 'react';
import { cn } from '@extension/ui';
import { Volume2, Pause } from 'lucide-react';

interface SpeechButtonProps {
  isPlaying: boolean;
  isSupported: boolean;
  onToggle: () => void;
  className?: string;
}

const SpeechButton: React.FC<SpeechButtonProps> = ({ 
  isPlaying, 
  isSupported, 
  onToggle,
  className = ""
}) => {
  if (!isSupported) return null;

  return (
    <button
      onClick={onToggle}
      className={cn(
        "flex-shrink-0 group mt-1 transition-all duration-200 ease-out hover:scale-105 focus:outline-none focus:scale-105",
        className
      )}
      title={isPlaying ? "Stop listening" : "Listen to article"}
      aria-label={isPlaying ? "Stop reading article aloud" : "Read article aloud"}
    >
      <div className="relative">
        <div className={cn(
          "w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all duration-300 ease-out",
          "backdrop-blur-md border shadow-md",
          isPlaying 
            ? "bg-gradient-to-br from-philonet-blue-500/30 to-philonet-blue-600/20 border-philonet-blue-400/60 text-philonet-blue-300 shadow-lg shadow-philonet-blue-500/20" 
            : "bg-gradient-to-br from-philonet-card/80 to-philonet-panel/60 border-philonet-border-light/50 text-philonet-text-muted hover:from-philonet-card/90 hover:to-philonet-panel/80 hover:text-philonet-blue-400 hover:border-philonet-blue-400/50 hover:shadow-lg hover:shadow-philonet-blue-500/12"
        )}>
          {isPlaying ? (
            <Pause className="w-4 h-4 md:w-5 md:h-5" />
          ) : (
            <Volume2 className="w-4 h-4 md:w-5 md:h-5" />
          )}
        </div>
        {isPlaying && (
          <div className="absolute -inset-1 rounded-full border border-philonet-blue-400/35 animate-pulse bg-gradient-to-br from-philonet-blue-500/12 to-transparent" />
        )}
      </div>
      <div className="mt-1 text-[10px] md:text-[11px] text-philonet-text-subtle font-medium tracking-philonet-wide text-center opacity-0 group-hover:opacity-90 transition-all duration-300 transform group-hover:translate-y-0.5">
        {isPlaying ? "Stop" : "Listen"}
      </div>
    </button>
  );
};

export default SpeechButton;
