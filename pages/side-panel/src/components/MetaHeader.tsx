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
}

const MetaHeader: React.FC<MetaHeaderProps> = ({
  meta,
  isPlaying,
  speechSupported,
  onToggleSpeech,
  onOpenSource
}) => {
  return (
    <section className="px-4 md:px-6 lg:px-8">
      {meta.image && (
        <div className="rounded-philonet-lg overflow-hidden border border-philonet-border mb-5">
          <img 
            src={meta.image} 
            alt={meta.title || "cover"} 
            className="w-full object-cover h-[180px] md:h-[240px]"
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
        </div>
      )}

      {meta.title && (
        <div className="flex items-start gap-3 md:gap-4">
          <h2 className="flex-1 font-light tracking-philonet-wider text-philonet-text-primary text-2xl md:text-4xl lg:text-5xl leading-tight">
            {meta.title}
          </h2>
          <div className="flex items-center gap-2">
            <SourceButton onClick={onOpenSource} />
            <SpeechButton
              isPlaying={isPlaying}
              isSupported={speechSupported}
              onToggle={onToggleSpeech}
            />
          </div>
        </div>
      )}

      {meta.description && (
        <p className="mt-3 leading-7 text-philonet-text-tertiary font-light tracking-philonet-normal max-w-[70ch] text-sm md:text-base">
          {meta.description}
        </p>
      )}

      {/* Categories & Tags */}
      <div className="mt-4 space-y-3">
        {meta.categories && meta.categories.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-philonet-text-muted">
            <FolderOpen className="h-4 w-4 flex-shrink-0" />
            <div className="flex flex-wrap items-center gap-2">
              {meta.categories.map((c) => (
                <span 
                  key={`cat-${c}`} 
                  className="rounded-full border border-philonet-border-light font-light tracking-philonet-wider text-philonet-text-muted hover:text-philonet-blue-500 hover:border-philonet-blue-500 transition-colors px-3 py-1 text-xs md:px-4 md:py-2 md:text-sm"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        {meta.tags && meta.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-philonet-text-muted">
            <Tag className="h-4 w-4 flex-shrink-0" />
            <div className="flex flex-wrap items-center gap-2">
              {meta.tags.map((t) => (
                <span 
                  key={`tag-${t}`} 
                  className="rounded-full border border-philonet-border-light font-light tracking-philonet-wider text-philonet-text-muted hover:text-philonet-blue-500 hover:border-philonet-blue-500 transition-colors px-3 py-1 text-xs md:px-4 md:py-2 md:text-sm"
                >
                  #{String(t).replace(/^#/, '')}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default MetaHeader;
