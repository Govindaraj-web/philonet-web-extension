import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  MoreHorizontal,
  Share2,
  Bookmark,
  MessageSquare,
  Sparkles,
  PanelRightOpen,
  PanelRightClose,
  Tag,
  FolderOpen,
  UserRound,
  Bot,
  CornerDownLeft,
  Loader2,
  Smile,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
} from "lucide-react";
import MarkdownIt from "markdown-it";

// Inline utility functions and components since we can't import from @extension/ui in content scripts
const cn = (...classes: (string | undefined | null | boolean)[]) => {
  return classes.filter(Boolean).join(' ');
};

// Philonet UI Components
const Button = ({ className = "", children, ...props }: any) => (
  <button
    {...props}
    className={cn(
      "inline-flex items-center justify-center select-none outline-none transition-colors",
      "rounded-2xl border border-gray-600 bg-transparent text-white font-light tracking-wide",
      "hover:text-yellow-300 hover:border-yellow-300 focus-visible:ring-0",
      className
    )}
  >
    {children}
  </button>
);

const Textarea = React.forwardRef<HTMLTextAreaElement, any>(({ className = "", rows = 1, ...props }, ref) => (
  <textarea
    ref={ref}
    rows={rows}
    {...props}
    className={cn(
      "w-full bg-transparent text-white resize-none",
      "placeholder:text-gray-400 font-light tracking-tight leading-6 focus:outline-none",
      className
    )}
  />
));

const ScrollArea = React.forwardRef<HTMLDivElement, any>(({ className = "", children, ...props }, ref) => (
  <div ref={ref} {...props} className={cn("overflow-y-auto", className)}>
    {children}
  </div>
));

// Utility functions
function wrap(i: number, n: number) { 
  return (i % n + n) % n; 
}

// Loading ring component
function LoaderRing({ value, total, size = 36, stroke = 2, color = "#3b82f6" }: any) {
  const radius = (size - stroke) / 2;
  const center = size / 2;
  const pct = total > 0 ? Math.max(0, Math.min(1, value / total)) : 0;
  
  return (
    <div className="relative select-none" style={{ width: size, height: size }} aria-label={`Progress ${value}/${total}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0" aria-hidden="true">
        <circle cx={center} cy={center} r={radius} fill="none" stroke="#262626" strokeWidth={stroke} />
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          initial={false}
          animate={{ pathLength: pct, rotate: -90, opacity: 1 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          style={{ transformBox: 'fill-box', transformOrigin: '50% 50%' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-[10px] tabular-nums text-blue-400 font-medium">
        {value}/{total}
      </div>
    </div>
  );
}

// Sample markdown content for the current page
const getCurrentPageContent = () => {
  const title = document.title || "Current Page";
  const url = window.location.href;
  const description = document.querySelector('meta[name="description"]')?.getAttribute('content') || 
                     document.querySelector('meta[property="og:description"]')?.getAttribute('content') || 
                     "No description available";
  
  // Extract some text content from the page
  const textContent = Array.from(document.querySelectorAll('h1, h2, h3, p'))
    .slice(0, 10)
    .map(el => el.textContent?.trim())
    .filter(text => text && text.length > 10)
    .join('\n\n');

  return {
    name: title,
    md: `# ${title}

${description}

**Categories:** Web Content, Analysis
**Tags:** webpage, philonet, content-analysis

## Page Overview
This is the content from the current webpage you're viewing.

**URL:** ${url}

## Content Sample
${textContent || 'No readable content found on this page.'}

## Philonet Analysis
You can use Philonet to analyze, think about, and interact with any webpage content. Select text to create highlights and add contextual thoughts.
`,
  };
};

interface SidePanelOverlayProps {
  onClose: () => void;
}

const SidePanelOverlay: React.FC<SidePanelOverlayProps> = ({ onClose }) => {
  console.log('🔧 SidePanelOverlay component initializing...');
  
  const [expanded, setExpanded] = useState(false); // Start compact for overlay
  const [comment, setComment] = useState("");
  const [commentRows, setCommentRows] = useState(1);
  const [comments, setComments] = useState<Array<{
    id: number;
    author: string;
    text: string;
    ts: string;
    tag?: { text: string } | null;
  }>>([
    { 
      id: 1, 
      author: "You", 
      text: "Analyzing this webpage with Philonet.", 
      ts: new Date().toLocaleTimeString(), 
      tag: null
    },
  ]);
  const [composerTab, setComposerTab] = useState("thoughts");
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiAnswers, setAiAnswers] = useState<Array<{ id: number; q: string; a: string }>>([]);

  const contentRef = useRef<HTMLDivElement>(null);
  const commentRef = useRef<HTMLTextAreaElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);

  const [footerH, setFooterH] = useState(172);
  const [hiLiteText, setHiLiteText] = useState("");
  const [dockFilterText, setDockFilterText] = useState("");
  const [dockOpen, setDockOpen] = useState(true);
  const [dockActiveIndex, setDockActiveIndex] = useState(0);
  const [dockMinimized, setDockMinimized] = useState(false);

  const currentPageContent = getCurrentPageContent();
  const markdownContent = currentPageContent.md;

  // Markdown processor - create once rather than using useMemo
  const md = new MarkdownIt({ html: false, linkify: true, breaks: false });
  const renderMD = (text: string) => md.render(text || "");
  const render = (text: string) => ({ __html: renderMD(text) });

  // Render with highlighting
  function renderHighlighted(text: string) {
    const html = renderMD(text);
    if (!hiLiteText) return { __html: html };
    try {
      const safe = hiLiteText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(safe, "i");
      const marked = html.replace(
        re,
        (m: string) => `<mark data-philo-mark="1" class="bg-yellow-300/15 text-yellow-200 rounded px-0.5">${m}</mark>`
      );
      return { __html: marked };
    } catch {
      return { __html: html };
    }
  }

  // Extract metadata from markdown
  function extractMeta(mdText: string) {
    const lines = mdText.split(/\r?\n/);
    let title = null, image = null, description = null, categories: string[] = [], tags: string[] = [];
    let i = 0;

    if (lines[i]?.startsWith('# ')) { 
      title = lines[i].replace(/^#\s+/, '').trim(); 
      i++; 
    }
    if (lines[i]?.trim() === '') i++;

    const imgMatch = lines[i]?.match(/^!\[[^\]]*\]\(([^\)]+)\)/);
    if (imgMatch) { 
      image = imgMatch[1]; 
      i++; 
      if (lines[i]?.trim() === '') i++; 
    }

    if (lines[i] && !/^\*\*Categories:/.test(lines[i]) && !/^\*\*Tags:/.test(lines[i])) {
      description = lines[i].trim(); 
      i++; 
      if (lines[i]?.trim() === '') i++;
    }

    const catMatch = lines[i]?.match(/^\*\*Categories:\*\*\s*(.+)$/i);
    if (catMatch) { 
      categories = catMatch[1].split(/,\s*/).map(s => s.trim()).filter(Boolean); 
      i++; 
    }
    
    const tagMatch = lines[i]?.match(/^\*\*Tags:\*\*\s*(.+)$/i);
    if (tagMatch) { 
      tags = tagMatch[1].split(/,\s*/).map(s => s.trim()).filter(Boolean); 
      i++; 
    }

    while (lines[i]?.match(/^---+$/)) i++;

    const body = lines.slice(i).join("\n");
    return { title, image, description, categories, tags, body };
  }

  const meta = extractMeta(markdownContent);

  // Parse sections
  function parseSections(body: string) {
    const introRe = /^##{1,2}\s+(Page Overview|Introduction)[\r\n]+([\s\S]*?)(?=^##{1,2}\s+|\Z)/m;
    const detailsRe = /^##{1,2}\s+(Content Sample|Details)[\r\n]+([\s\S]*?)(?=^##{1,2}\s+|\Z)/m;
    const conclRe = /^##{1,2}\s+(Philonet Analysis|Conclusion)[\r\n]+([\s\S]*?)(?=^##{1,2}\s+|\Z)/m;

    const intro = body.match(introRe);
    const details = body.match(detailsRe);
    const concl = body.match(conclRe);

    const rest = body
      .replace(introRe, '')
      .replace(detailsRe, '')
      .replace(conclRe, '')
      .trim();

    return {
      introduction: intro ? intro[2].trim() : undefined,
      details: details ? details[2].trim() : undefined,
      conclusion: concl ? concl[2].trim() : undefined,
      rest,
    };
  }

  const sections = parseSections(meta.body);

  // Comment actions
  function submitComment() {
    const text = comment.trim();
    if (!text) return;
    const next = { 
      id: Date.now(), 
      author: "You", 
      text, 
      ts: new Date().toLocaleTimeString(), 
      tag: hiLiteText ? { text: hiLiteText } : null 
    };
    setComments((c) => [next, ...c]);
    setComment("");
    setCommentRows(1);
    if (commentRef.current) commentRef.current.focus();
  }

  function adjustCommentRows(value: string) {
    const lines = value.split(/\n/).length;
    const approx = Math.ceil((value.length || 0) / 60);
    const target = Math.min(6, Math.max(1, lines + approx - 1));
    setCommentRows(target);
  }

  // AI assistant
  function synthesizeAiAnswer(q: string) {
    const title = meta.title || "Current Page";
    const url = window.location.href;
    const cats = meta.categories?.join(", ") || "Web Content";
    const tags = meta.tags?.join(", ") || "webpage";
    
    return `**Analysis of Current Page**

You're asking: _${q}_.

**Context from ${title}**
- URL: ${url}
- Categories: ${cats}
- Tags: ${tags}
- Page Content: This is a live webpage analysis

I can help you analyze the content, structure, and context of this webpage. What specific aspect would you like me to focus on?`;
  }

  function askAi() {
    const q = aiQuestion.trim();
    if (!q) return;
    setAiBusy(true);
    const ans = synthesizeAiAnswer(q);
    setAiAnswers((arr) => [{ id: Date.now(), q, a: ans }, ...arr]);
    setAiQuestion("");
    setAiBusy(false);
  }

  // Measure footer height
  useEffect(() => {
    if (!footerRef.current) return;
    const ro = new ResizeObserver(() => {
      const h = footerRef.current?.getBoundingClientRect().height || 172;
      setFooterH(Math.round(h));
    });
    ro.observe(footerRef.current);
    return () => ro.disconnect();
  }, []);

  // Selection handling for page content
  useEffect(() => {
    function handleUp() {
      const sel = window.getSelection();
      if (!sel) return;
      const text = String(sel.toString() || "").trim();
      if (!text) { 
        setHiLiteText(""); 
        return; 
      }
      
      // Check if selection is from the main page (not our overlay)
      const anchorNode = sel.anchorNode && sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentElement : sel.anchorNode;
      const focusNode = sel.focusNode && sel.focusNode.nodeType === 3 ? sel.focusNode.parentElement : sel.focusNode;
      
      // Only capture selections from the main page content, not our overlay
      const isFromOverlay = (node: Node | null) => {
        if (!node) return false;
        let current = node as Element;
        while (current && current !== document.body) {
          if (current.id && current.id.includes('CEB-extension')) return true;
          current = current.parentElement as Element;
        }
        return false;
      };
      
      if (!isFromOverlay(anchorNode) && !isFromOverlay(focusNode)) {
        if (text.length >= 3 && text.length <= 160) {
          // Immediate state update for instant feedback
          setHiLiteText(text);
          setDockFilterText(text);
          
          // Force immediate DOM update by using flushSync if available
          try {
            const { flushSync } = require('react-dom');
            flushSync(() => {
              setHiLiteText(text);
              setDockFilterText(text);
            });
          } catch {
            // flushSync not available, continue with normal update
          }
        }
      }
    }
    
    document.addEventListener("mouseup", handleUp);
    return () => document.removeEventListener("mouseup", handleUp);
  }, [hiLiteText]);

  // Dock list computation
  const dockList = (dockFilterText
    ? comments.filter((c: any) => (c.tag?.text || "").toLowerCase() === dockFilterText.toLowerCase())
    : comments);

  useEffect(() => {
    if (dockList.length === 0) { 
      setDockActiveIndex(0); 
      return; 
    }
    setDockActiveIndex((i) => Math.min(Math.max(0, i), dockList.length - 1));
  }, [dockFilterText, comments]);

  function gotoDockIndex(nextIndex: number) {
    if (dockList.length === 0) return;
    const i = Math.min(Math.max(0, nextIndex), dockList.length - 1);
    setDockActiveIndex(i);
  }

  // Handle escape key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[999998] pointer-events-none font-sans">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 pointer-events-auto"
        onClick={onClose}
      />
      
      {/* Main Panel */}
      <motion.aside
        initial={{ x: "100%" }}
        animate={{ x: expanded ? "0%" : "calc(100% - 420px)" }}
        exit={{ x: "100%" }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="absolute top-0 right-0 h-full bg-gray-900 text-white shadow-2xl overflow-visible pointer-events-auto border-l border-gray-700"
        style={{ width: expanded ? "100%" : "420px" }}
        aria-label="Philonet side panel overlay"
      >
        {/* Top Action Bar */}
        <div className="absolute top-0 left-0 right-0 h-[68px] border-b border-gray-700 flex items-center justify-between px-4 bg-gray-900/95 backdrop-blur-sm">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
              <div className="h-8 w-8 rounded-full border border-gray-600 bg-gray-800 grid place-items-center text-gray-400 p-1">
                <img 
                  src={chrome.runtime.getURL('philonet.png')} 
                  alt="Philonet" 
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-sm font-light tracking-wide truncate max-w-[140px]">Philonet User</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button className="h-9 px-3">
                <Share2 className="mr-2 h-4 w-4" />
                <span className="hidden md:inline">Share</span>
              </Button>
              <Button className="h-9 px-3">
                <Bookmark className="mr-2 h-4 w-4" />
                <span className="hidden md:inline">Save</span>
              </Button>
              <Button className="h-9 px-3" onClick={onClose}>
                <X className="mr-2 h-4 w-4" />
                <span className="hidden md:inline">Close</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Content zone */}
        <div className="absolute left-0 right-0" style={{ top: 68, bottom: footerH }}>
          <ScrollArea ref={contentRef} className="h-full pr-1">
            {/* Meta header */}
            <section className="px-5 pt-6">
              {meta.title && (
                <h2 className="text-3xl md:text-4xl font-light tracking-wider text-white">
                  {meta.title}
                </h2>
              )}

              {meta.description && (
                <p className="mt-3 text-[15px] leading-7 text-gray-300 font-light tracking-normal max-w-[70ch]">
                  {meta.description}
                </p>
              )}

              {/* Categories & Tags */}
              <div className="mt-4 flex flex-wrap items-start gap-2">
                {meta.categories && meta.categories.length > 0 && (
                  <div className="flex flex-wrap items-start gap-2 text-gray-400">
                    <FolderOpen className="h-4 w-4 mt-1" />
                    {meta.categories.map((c) => (
                      <span 
                        key={`cat-${c}`} 
                        className="rounded-full border border-gray-600 px-3 py-1 text-xs font-light tracking-wider text-gray-400 hover:text-blue-500 hover:border-blue-500 transition-colors"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                )}

                {meta.tags && meta.tags.length > 0 && (
                  <div className="flex flex-wrap items-start gap-2 text-gray-400">
                    <Tag className="h-4 w-4 mt-1" />
                    {meta.tags.map((t) => (
                      <span 
                        key={`tag-${t}`} 
                        className="rounded-full border border-gray-600 px-3 py-1 text-xs font-light tracking-wider text-gray-400 hover:text-blue-500 hover:border-blue-500 transition-colors"
                      >
                        #{String(t).replace(/^#/, '')}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Content sections */}
            <section className="px-5 pb-6 mt-6 space-y-8">
              <div className="prose prose-invert max-w-[80ch] prose-hr:hidden prose-headings:font-light prose-headings:tracking-wide prose-h1:text-white prose-h2:text-blue-400 prose-h3:text-blue-300 prose-h4:text-yellow-400 prose-h5:text-green-400 prose-h6:text-purple-400 prose-p:font-light prose-p:tracking-tight prose-p:text-gray-300 prose-strong:text-white prose-a:text-gray-400 hover:prose-a:text-blue-500 prose-li:marker:text-gray-600 prose-blockquote:border-l-gray-600 prose-table:rounded-lg prose-table:overflow-hidden prose-table:border prose-table:border-gray-600 prose-th:bg-gray-800 prose-td:bg-gray-900">
                
                {/* Introduction */}
                {sections.introduction && (
                  <div>
                    <h3 className="text-xl font-light tracking-wide text-blue-300">Page Overview</h3>
                    <div className="mt-3" dangerouslySetInnerHTML={renderHighlighted(sections.introduction)} />
                  </div>
                )}

                {/* Details */}
                {sections.details && (
                  <div className="mt-8">
                    <h3 className="text-xl font-light tracking-wide text-blue-300">Content Sample</h3>
                    <div className="mt-3" dangerouslySetInnerHTML={renderHighlighted(sections.details)} />
                  </div>
                )}

                {/* Conclusion */}
                {sections.conclusion && (
                  <div className="mt-8">
                    <h3 className="text-xl font-light tracking-wide text-blue-300">Philonet Analysis</h3>
                    <div className="mt-3" dangerouslySetInnerHTML={renderHighlighted(sections.conclusion)} />
                  </div>
                )}

                {/* Remaining content */}
                {sections.rest && (
                  <div className="mt-10" dangerouslySetInnerHTML={renderHighlighted(sections.rest)} />
                )}

                {/* Recent comments preview */}
                {comments && comments.length > 0 && (
                  <div className="mt-12 pt-6 border-t border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-light tracking-wider text-gray-300">Recent Thoughts</h4>
                      <span className="text-xs text-gray-400 tracking-wide">
                        {comments.length} {comments.length === 1 ? 'thought' : 'thoughts'}
                      </span>
                    </div>
                    <div className="space-y-4">
                      {comments.slice(0, 5).map((c) => (
                        <div key={c.id} className="group rounded-lg border border-gray-700 bg-gray-800/60 p-4 hover:border-gray-600 transition-colors">
                          <div className="flex items-start gap-3">
                            <div className="h-8 w-8 rounded-full border border-gray-600 bg-gray-800 grid place-items-center text-gray-400 text-xs flex-shrink-0">
                              {c.author[0] || 'U'}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs text-gray-500 tracking-wide">
                                {c.author} • {c.ts}
                              </div>
                              {c.tag && (
                                <div className="mt-1 text-[11px] text-blue-400">
                                  Tagged excerpt: "{c.tag.text}"
                                </div>
                              )}
                              <div className="text-sm text-gray-300 leading-relaxed">
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
            </section>
          </ScrollArea>
        </div>

        {/* Composer footer */}
        <div ref={footerRef} className="absolute bottom-0 left-0 right-0 border-t border-gray-700 px-4 py-3 bg-gray-900/95 backdrop-blur-sm">
          {/* Tabs */}
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => setComposerTab("thoughts")}
              className={cn(
                'h-8 px-3 rounded-full border text-xs tracking-wider',
                composerTab === 'thoughts' 
                  ? 'text-yellow-300 border-yellow-300' 
                  : 'text-gray-400 border-gray-600'
              )}
            >
              <MessageCircle className="inline h-3.5 w-3.5 mr-2" /> Thoughts
            </button>
            <button
              onClick={() => setComposerTab("ai")}
              className={cn(
                'h-8 px-3 rounded-full border text-xs tracking-wider',
                composerTab === 'ai' 
                  ? 'text-yellow-300 border-yellow-300' 
                  : 'text-gray-400 border-gray-600'
              )}
            >
              <Bot className="inline h-3.5 w-3.5 mr-2" /> Ask AI
            </button>
          </div>

          {/* Selection tag */}
          {hiLiteText && (
            <div className="mb-2 flex items-center gap-2 text-[11px]">
              <span className="px-2 py-1 rounded-full border border-yellow-400/50 text-yellow-300 bg-yellow-400/8 truncate max-w-[70%]" title={hiLiteText}>
                Tagged: "{hiLiteText}"
              </span>
              <button onClick={() => setHiLiteText("")} className="text-gray-400 hover:text-yellow-300">
                Clear
              </button>
            </div>
          )}

          {/* Content */}
          {composerTab === 'thoughts' ? (
            <div>
              <div className="flex items-start gap-3">
                <div className="self-center h-10 w-10 rounded-full border border-gray-600 bg-gray-800 grid place-items-center text-gray-400 flex-shrink-0 p-1">
                  <img 
                    src={chrome.runtime.getURL('philonet.png')} 
                    alt="Philonet" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="rounded-full border border-gray-600 bg-gray-800 focus-within:border-yellow-300 flex items-center px-4 py-2">
                    <Textarea
                      ref={commentRef}
                      placeholder="Add a thought about this page…"
                      value={comment}
                      rows={commentRows}
                      className="flex-1"
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => { 
                        setComment(e.target.value); 
                        adjustCommentRows(e.target.value); 
                      }}
                      onFocus={() => adjustCommentRows(comment || ' ')}
                      onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => { 
                        if (e.key === 'Enter' && !e.shiftKey) { 
                          e.preventDefault(); 
                          submitComment(); 
                        } 
                      }}
                    />
                    <button
                      type="button"
                      title="Insert emoji"
                      className="ml-2 h-8 w-8 rounded-full grid place-items-center text-gray-500 hover:text-yellow-300"
                      onClick={() => {
                        const ta = commentRef.current;
                        const start = (ta?.selectionStart ?? comment.length);
                        const end = (ta?.selectionEnd ?? comment.length);
                        const next = comment.slice(0, start) + '😊' + comment.slice(end);
                        setComment(next);
                        requestAnimationFrame(() => {
                          if (ta) { 
                            const pos = start + 2; 
                            ta.setSelectionRange(pos, pos); 
                            ta.focus(); 
                          }
                        });
                      }}
                    >
                      <Smile className="h-5 w-5" />
                    </button>
                    <Button disabled={!comment.trim()} onClick={submitComment} className="ml-1 h-9 px-3">
                      <CornerDownLeft className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="mt-1 flex justify-end text-[11px] text-gray-500">
                    <span>{Math.max(0, 280 - comment.length)} characters left</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-blue-500/40 bg-gray-800/60 p-3 shadow-[0_0_0_1px_rgba(59,130,246,0.25)_inset]">
              <div className="mb-2 flex items-center gap-2 text-gray-400 text-xs tracking-wider">
                <Bot className="h-3.5 w-3.5" />
                <span>ASK AI</span>
              </div>
              <Textarea
                placeholder="Ask a question about this webpage…"
                value={aiQuestion}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAiQuestion(e.target.value)}
                rows={4}
                className="bg-transparent"
                onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => { 
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { 
                    e.preventDefault(); 
                    askAi(); 
                  } 
                }}
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[11px] text-gray-400">Press Cmd/Ctrl+Enter to ask</span>
                <Button disabled={!aiQuestion.trim() || aiBusy} onClick={askAi} className="h-9 px-3">
                  {aiBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4 mr-2" />} Ask
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Expand/collapse handle */}
        <button
          aria-label={expanded ? "Compact view" : "Expand to full width"}
          aria-pressed={expanded}
          onClick={() => setExpanded((v) => !v)}
          className="group absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 z-50 h-12 w-12 rounded-full bg-gray-900 border border-gray-600 transition-colors shadow-2xl backdrop-blur-sm flex items-center justify-center text-gray-400 hover:text-yellow-300 hover:border-yellow-300 focus:outline-none"
          title={expanded ? "Compact view" : "Expand to full width"}
        >
          {expanded ? (
            <PanelRightClose className="h-5 w-5" />
          ) : (
            <PanelRightOpen className="h-5 w-5" />
          )}
        </button>
      </motion.aside>
    </div>
  );
};

export default SidePanelOverlay;
