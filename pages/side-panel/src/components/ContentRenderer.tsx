import React from 'react';
import { ScrollArea } from './ui';
import MetaHeader from './MetaHeader';
import ContentSections from './ContentSections';
import { MarkdownMeta, ContentSections as ContentSectionsType, Comment } from '../types';

interface ContentRendererProps {
  meta: MarkdownMeta;
  sections: ContentSectionsType;
  comments: Comment[];
  isPlaying: boolean;
  speechSupported: boolean;
  renderHighlighted: (text: string) => { __html: string };
  onToggleSpeech: () => void;
  onOpenSource: () => void;
  contentRef: React.RefObject<HTMLDivElement>;
  bodyContentRef: React.RefObject<HTMLDivElement>;
  footerH: number;
  sourceUrl?: string;
  joinedRoomName?: string | null;
}

const ContentRenderer: React.FC<ContentRendererProps> = ({
  meta,
  sections,
  comments,
  isPlaying,
  speechSupported,
  renderHighlighted,
  onToggleSpeech,
  onOpenSource,
  contentRef,
  bodyContentRef,
  footerH,
  sourceUrl,
  joinedRoomName
}) => {
  return (
    <div className="absolute left-0 right-0" style={{ top: 68, bottom: footerH }}>
      <ScrollArea ref={contentRef} className="h-full pr-1">
        <MetaHeader
          meta={meta}
          isPlaying={isPlaying}
          speechSupported={speechSupported}
          onToggleSpeech={onToggleSpeech}
          onOpenSource={onOpenSource}
          sourceUrl={sourceUrl}
          joinedRoomName={joinedRoomName}
        />
        
        <ContentSections
          sections={sections}
          comments={comments}
          renderHighlighted={renderHighlighted}
          bodyContentRef={bodyContentRef}
        />
      </ScrollArea>
    </div>
  );
};

export default ContentRenderer;
