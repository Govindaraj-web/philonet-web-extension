import React from 'react';
import { MessageCircle } from 'lucide-react';
import { ContentSections, Comment } from '../types';

interface ContentSectionsProps {
  sections: ContentSections;
  comments: Comment[];
  renderHighlighted: (text: string) => { __html: string };
  bodyContentRef: React.RefObject<HTMLDivElement>;
}

const ContentSectionsComponent: React.FC<ContentSectionsProps> = ({
  sections,
  comments,
  renderHighlighted,
  bodyContentRef
}) => {
  return (
    <section className="px-4 md:px-6 lg:px-8 pb-6 mt-6 space-y-8">
      <div 
        ref={bodyContentRef}
        data-article-body="true"
        className="prose prose-invert prose-hr:hidden prose-headings:font-light prose-headings:tracking-philonet-wide prose-h1:text-white prose-h2:text-blue-400 prose-h3:text-blue-300 prose-h4:text-[#CBA339] prose-h5:text-green-400 prose-h6:text-purple-400 prose-p:font-light prose-p:tracking-philonet-tight prose-p:text-philonet-text-secondary prose-strong:text-white prose-a:text-philonet-text-muted hover:prose-a:text-philonet-blue-500 prose-li:marker:text-philonet-border-light prose-blockquote:border-l-philonet-border prose-table:rounded-philonet-lg prose-table:border prose-table:border-philonet-border prose-th:bg-philonet-card prose-th:px-4 prose-th:py-3 prose-td:bg-philonet-panel prose-td:px-4 prose-td:py-3 prose-td:border-t prose-td:border-philonet-border prose-th:border-b prose-th:border-philonet-border max-w-none prose-base md:prose-lg lg:prose-xl
        cursor-text"
        style={{
          '--tw-prose-selection-bg': 'rgba(203, 163, 57, 0.2)',
          '--tw-prose-selection-color': '#CBA339'
        } as React.CSSProperties}
      >
        <div className="overflow-x-auto">
        
        {/* Introduction */}
        {sections.introduction && (
          <div>
            <h3 className="font-light tracking-philonet-wide text-blue-300 text-xl md:text-2xl lg:text-3xl">Introduction</h3>
            <div className="mt-3" dangerouslySetInnerHTML={renderHighlighted(sections.introduction)} />
          </div>
        )}

        {/* Details */}
        {sections.details && (
          <div className="mt-8">
            <h3 className="font-light tracking-philonet-wide text-blue-300 text-xl md:text-2xl lg:text-3xl">Details</h3>
            <div className="mt-3" dangerouslySetInnerHTML={renderHighlighted(sections.details)} />
          </div>
        )}

        {/* Conclusion */}
        {sections.conclusion && (
          <div className="mt-8">
            <h3 className="font-light tracking-philonet-wide text-blue-300 text-xl md:text-2xl lg:text-3xl">Conclusion</h3>
            <div className="mt-3" dangerouslySetInnerHTML={renderHighlighted(sections.conclusion)} />
          </div>
        )}

        {/* Remaining content */}
        {sections.rest && (
          <div className="mt-10" dangerouslySetInnerHTML={renderHighlighted(sections.rest)} />
        )}

        {/* Recent thoughts preview */}
        {comments && comments.length > 0 && (
          <div className="mt-12 pt-6 border-t border-philonet-border">
            <div className="flex items-baseline justify-between mb-4">
              <div className="flex items-baseline gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-[#CBA339] to-amber-400 rounded-full flex items-center justify-center shadow-lg flex-shrink-0">
                  <MessageCircle className="w-4 h-4 text-black" />
                </div>
                <h4 className="text-lg md:text-xl font-semibold tracking-philonet-wider bg-gradient-to-r from-[#CBA339] to-amber-300 bg-clip-text text-transparent">Recent Thoughts</h4>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-philonet-text-muted tracking-philonet-wide">
                  {comments.length} {comments.length === 1 ? 'thought' : 'thoughts'}
                </span>
                <div className="w-2 h-2 bg-[#CBA339] rounded-full animate-pulse"></div>
              </div>
            </div>
            <div className="space-y-4">
              {comments.slice(0, 5).map((c) => (
                <div key={c.id} className="group rounded-philonet border border-philonet-border bg-philonet-card/60 p-4 hover:border-philonet-border-light transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full border border-philonet-border-light bg-philonet-card grid place-items-center text-philonet-text-muted text-sm flex-shrink-0">
                      {c.author[0] || 'U'}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm text-philonet-text-subtle tracking-philonet-wide">
                        {c.author} • {c.ts}
                      </div>
                      {c.tag && (
                        <div className="mt-1 text-xs text-philonet-blue-400">
                          Tagged excerpt: "{c.tag.text}"
                        </div>
                      )}
                      <div className="text-base text-philonet-text-tertiary leading-relaxed mt-2">
                        {c.text}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        </div>
      </div>
    </section>
  );
};

export default ContentSectionsComponent;
