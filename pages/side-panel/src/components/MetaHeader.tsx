import React from 'react';
import { FolderOpen, Tag } from 'lucide-react';
import SpeechButton from './SpeechButton';
import SourceButton from './SourceButton';
import { MarkdownMeta } from '../types';

interface MetaHeaderProps {
  meta: MarkdownMeta;
  isPlaying: boolean;
  speechSupported: boolean;
  onToggleSpeech: () => void;
  onOpenSource: () => void;
  sourceUrl?: string;
  joinedRoomName?: string | null;
}

const MetaHeader: React.FC<MetaHeaderProps> = ({
  meta,
  isPlaying,
  speechSupported,
  onToggleSpeech,
  onOpenSource,
  sourceUrl,
  joinedRoomName
}) => {
  return (
    <section className="px-6 md:px-8 lg:px-10 xl:px-12">
      {meta.image && (
        <div className="relative group mb-12 md:mb-16">
          {/* Premium elevated thumbnail container */}
          <div className="relative rounded-3xl overflow-hidden border border-philonet-border/20 shadow-xl hover:shadow-2xl transition-all duration-500 bg-gradient-to-br from-philonet-panel/8 to-philonet-card/12 backdrop-blur-md">
            <img 
              src={meta.image} 
              alt={meta.title || "cover"} 
              className="w-full object-cover h-[200px] md:h-[280px] lg:h-[320px] transition-all duration-500 group-hover:scale-[1.01]"
              onError={(e) => {
                console.log('📸 External image failed to load, using fallback');
                const target = e.currentTarget as HTMLImageElement;
                if (typeof chrome !== 'undefined' && chrome.runtime) {
                  target.src = chrome.runtime.getURL('philonet.png');
                } else {
                  const container = target.parentElement;
                  if (container) {
                    container.style.display = 'none';
                  }
                }
              }}
              onLoad={() => {
                console.log('📸 Image loaded successfully:', meta.image);
              }}
            />
            
            {/* Premium room name badge overlay with enhanced design */}
            {joinedRoomName && (
              <div className="absolute top-4 left-4 z-10">
                <div className="group relative">
                  {/* Main badge container with premium styling */}
                  <div className="flex items-center gap-3 px-5 py-3 
                                bg-gradient-to-r from-philonet-blue-600/95 via-philonet-blue-500/90 to-philonet-blue-600/95 
                                backdrop-blur-xl border border-philonet-blue-400/40 
                                rounded-2xl shadow-2xl hover:shadow-philonet-blue-500/25 
                                transition-all duration-500 hover:scale-[1.02] hover:-translate-y-0.5
                                before:absolute before:inset-0 before:rounded-2xl 
                                before:bg-gradient-to-r before:from-white/10 before:via-transparent before:to-white/5 
                                before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300">
                    
                    {/* Sophisticated room icon with micro-animations */}
                    <div className="relative">
                      <div className="w-3 h-3 bg-gradient-to-br from-philonet-blue-200 to-white 
                                    rounded-full shadow-sm animate-pulse">
                        <div className="absolute inset-0 rounded-full bg-white/30 
                                      animate-ping group-hover:animate-none"></div>
                      </div>
                    </div>
                    
                    {/* Premium typography for room name */}
                    <span className="text-white text-sm font-semibold tracking-wide 
                                   truncate max-w-[180px] 
                                   drop-shadow-sm group-hover:drop-shadow-md 
                                   transition-all duration-300">
                      {joinedRoomName}
                    </span>
                  </div>
                  
                  {/* Subtle glow effect */}
                  <div className="absolute inset-0 rounded-2xl bg-philonet-blue-500/20 
                                blur-md -z-10 opacity-0 group-hover:opacity-100 
                                transition-opacity duration-500"></div>
                </div>
              </div>
            )}
            
            {/* Sophisticated overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-philonet-black/15 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            {/* Subtle inner shadow for depth */}
            <div className="absolute inset-0 rounded-3xl shadow-inner pointer-events-none"></div>
          </div>
        </div>
      )}

      {/* Premium title section with perfect Medium-style typography */}
      {meta.title && (
        <div className="mb-12 md:mb-16">
          {/* Premium room name badge for no-image layout */}
          {!meta.image && joinedRoomName && (
            <div className="flex justify-start mb-8">
              <div className="group relative">
                {/* Enhanced badge design matching the overlay version */}
                <div className="flex items-center gap-3 px-6 py-4 
                              bg-gradient-to-r from-philonet-blue-600/95 via-philonet-blue-500/90 to-philonet-blue-600/95 
                              backdrop-blur-xl border border-philonet-blue-400/40 
                              rounded-2xl shadow-2xl hover:shadow-philonet-blue-500/25 
                              transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1
                              before:absolute before:inset-0 before:rounded-2xl 
                              before:bg-gradient-to-r before:from-white/10 before:via-transparent before:to-white/5 
                              before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300">
                  
                  {/* Premium room icon with enhanced animations */}
                  <div className="relative">
                    <FolderOpen className="w-4 h-4 text-philonet-blue-200 
                                        drop-shadow-sm group-hover:drop-shadow-md 
                                        transition-all duration-300 group-hover:scale-110" />
                    <div className="absolute -inset-2 rounded-full bg-white/10 
                                  opacity-0 group-hover:opacity-100 
                                  animate-ping group-hover:animate-none 
                                  transition-opacity duration-300"></div>
                  </div>
                  
                  {/* Enhanced typography with better spacing */}
                  <span className="text-white text-base font-semibold tracking-wide 
                                 truncate max-w-[220px] 
                                 drop-shadow-sm group-hover:drop-shadow-md 
                                 transition-all duration-300">
                    {joinedRoomName}
                  </span>
                </div>
                
                {/* Premium glow effect */}
                <div className="absolute inset-0 rounded-2xl bg-philonet-blue-500/20 
                              blur-xl -z-10 opacity-0 group-hover:opacity-100 
                              transition-opacity duration-500 scale-110"></div>
              </div>
            </div>
          )}
          
          <div className="flex items-start gap-4 md:gap-6">
            <div className="flex-1">
              {/* Perfect Medium-style title */}
              <h1 className="font-medium text-philonet-text-primary text-3xl md:text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl 
                           leading-[1.1] md:leading-[1.08] tracking-[-0.025em] md:tracking-[-0.03em] 
                           mb-2 md:mb-3 text-balance max-w-[20ch] 
                           selection:bg-philonet-blue-500/20 selection:text-philonet-text-primary">
                {meta.title}
                {meta.categories && meta.categories.length > 0 && (
                  <span className="text-philonet-text-muted/80 font-normal text-xl md:text-2xl lg:text-3xl xl:text-4xl 2xl:text-5xl">
                    {' '}in {meta.categories.join(', ')}
                  </span>
                )}
              </h1>
            </div>
            <div className="flex items-center gap-3 mt-2 md:mt-4">
              <SourceButton onClick={onOpenSource} sourceUrl={sourceUrl} />
              <SpeechButton
                isPlaying={isPlaying}
                isSupported={speechSupported}
                onToggle={onToggleSpeech}
              />
            </div>
          </div>
        </div>
      )}

      {/* Premium description with exceptional Medium-inspired reading experience */}
      {meta.description && (
        <div className="relative mb-12 md:mb-16">
          {/* Luxurious content card */}
          <div className="relative rounded-3xl bg-gradient-to-br from-philonet-panel/20 via-philonet-card/10 to-philonet-panel/15 
                           backdrop-blur-sm border border-philonet-border/10 
                           px-8 md:px-10 lg:px-12 py-8 md:py-10 lg:py-12 
                           shadow-sm hover:shadow-lg transition-all duration-400">
            
            {/* Perfect Medium reading typography - simplified for visibility */}
            <p data-summary-content="true"
               className="text-philonet-text-tertiary font-normal 
                       leading-[1.7] md:leading-[1.75] lg:leading-[1.8] 
                       tracking-[-0.004em] md:tracking-[-0.006em] 
                       text-lg md:text-xl lg:text-2xl xl:text-3xl
                       mb-0 max-w-none
                       selection:bg-philonet-blue-500/15 selection:text-philonet-text-primary
                       first-letter:text-4xl md:first-letter:text-5xl lg:first-letter:text-6xl 
                       first-letter:font-semibold first-letter:text-philonet-text-primary 
                       first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:leading-[0.8]
                       cursor-text select-text">
              {meta.description}
            </p>
            
            {/* Elegant accent elements */}
            <div className="absolute left-0 top-8 bottom-8 w-1.5 bg-gradient-to-b from-philonet-blue-500/30 via-philonet-blue-400/20 to-philonet-blue-300/10 rounded-r-full"></div>
            
            {/* Subtle corner accent */}
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-philonet-blue-500/5 to-transparent rounded-tr-3xl"></div>
          </div>
        </div>
      )}
    </section>
  );
};

export default MetaHeader;
