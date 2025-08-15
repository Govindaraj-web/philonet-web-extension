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
          "backdrop-blur-sm border border-philonet-border-light/40",
          isPlaying 
            ? "bg-philonet-blue-500/20 border-philonet-blue-500/60 text-philonet-blue-400 shadow-lg shadow-philonet-blue-500/10" 
            : "bg-philonet-card/60 text-philonet-text-muted hover:bg-philonet-card/80 hover:text-philonet-blue-400 hover:border-philonet-blue-500/40"
        )}>
          {isPlaying ? (
            <Pause className="w-4 h-4 md:w-5 md:h-5" />
          ) : (
            <Volume2 className="w-4 h-4 md:w-5 md:h-5" />
          )}
        </div>
        {isPlaying && (
          <div className="absolute -inset-1 rounded-full border border-philonet-blue-500/30" />
        )}
      </div>
      <div className="mt-1 text-[10px] md:text-[11px] text-philonet-text-subtle font-light tracking-philonet-wide text-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {isPlaying ? "Stop" : "Listen"}
      </div>
    </button>
  );
};

export default SpeechButton;
