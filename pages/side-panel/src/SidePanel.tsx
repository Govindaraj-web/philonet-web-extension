import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  MoreHorizontal,
  Share2,
  Bookmark,
  MessageSquare,
  Sparkles,
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
} from "lucide-react";
import MarkdownIt from "markdown-it";
import { withErrorBoundary, withSuspense } from '@extension/shared';
import { cn, ErrorDisplay, LoadingSpinner } from '@extension/ui';

// Philonet UI Components
const Button = ({ className = "", children, ...props }: any) => (
  <button
    {...props}
    className={cn(
      "inline-flex items-center justify-center select-none outline-none transition-colors",
      "rounded-2xl border border-philonet-border-light bg-transparent text-white font-light tracking-philonet-wide",
      "hover:text-philonet-blue-500 hover:border-philonet-blue-500 focus-visible:ring-0",
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
      "placeholder:text-philonet-text-subtle font-light tracking-philonet-tight leading-6 focus:outline-none",
      className
    )}
  />
));

const ScrollArea = React.forwardRef<HTMLDivElement, any>(({ className = "", children, ...props }, ref) => (
  <div 
    ref={ref} 
    {...props} 
    className={cn("overflow-y-auto philonet-scrollbar", className)}
    style={{
      scrollbarWidth: 'thin',
      scrollbarColor: '#374151 #1f2937'
    }}
  >
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
      <div className="absolute inset-0 grid place-items-center text-[10px] tabular-nums text-philonet-blue-400 font-medium">
        {value}/{total}
      </div>
    </div>
  );
}

// Sample markdown content
const SAMPLE_MARKDOWNS = [
  {
    name: "Philonet Interface Overview",
    md: `# The Humane Interface of Philonet

![cover](https://images.unsplash.com/photo-1526378722484-bd91ca387e72?w=1200&q=80)

A minimalist, high-contrast reading surface with humane spacing and subtle blue affordances.

**Categories:** Design, Systems, Product
**Tags:** philonet, ui, reading, dark-mode

## Introduction
Philonet emphasizes clarity, legibility, and rhythm in digital reading experiences.

## Details
- Lightweight typography with generous scale
- Neutral grays for clear hierarchy
- Blue accents for interactive elements
- Responsive layout patterns

## Conclusion
Design for the eyes first, then optimize for everything else.

| Element   | Purpose         | Implementation |
|-----------|-----------------|----------------|
| Spacing   | Comfort         | 8px grid       |
| Contrast  | Readability     | WCAG AA        |
| Motion    | Feedback        | Subtle spring  |
`,
  },
];

const SidePanel = () => {
  console.log('🔧 SidePanel component initializing...');
  
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
      text: "Great design principles for modern reading interfaces.", 
      ts: new Date().toLocaleTimeString(), 
      tag: { text: "Philonet emphasizes clarity, legibility, and rhythm" } 
    },
  ]);
  const [composerTab, setComposerTab] = useState("comments");
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiAnswers, setAiAnswers] = useState<Array<{ id: number; q: string; a: string }>>([]);

  const [sampleIdx] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const commentRef = useRef<HTMLTextAreaElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);

  const [footerH, setFooterH] = useState(172);
  const [hiLiteText, setHiLiteText] = useState("");
  const [dockFilterText, setDockFilterText] = useState("");
  const [dockOpen, setDockOpen] = useState(true);
  const [dockActiveIndex, setDockActiveIndex] = useState(0);
  const [dockMinimized, setDockMinimized] = useState(false);

  const markdownContent = SAMPLE_MARKDOWNS[sampleIdx].md;
  console.log('📝 Markdown content loaded:', markdownContent.substring(0, 100) + '...');

  // Markdown processor
  const md = useMemo(() => new MarkdownIt({ html: false, linkify: true, breaks: false }), []);
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
        (m) => `<mark data-philo-mark="1" class="bg-philonet-blue-500/20 text-inherit rounded px-0.5">${m}</mark>`
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
  console.log('🏷️ Extracted metadata:', meta);

  // Parse sections
  function parseSections(body: string) {
    const introRe = /^##{1,2}\s+Introduction[\r\n]+([\s\S]*?)(?=^##{1,2}\s+|\Z)/m;
    const detailsRe = /^##{1,2}\s+Details[\r\n]+([\s\S]*?)(?=^##{1,2}\s+|\Z)/m;
    const conclRe = /^##{1,2}\s+Conclusion[\r\n]+([\s\S]*?)(?=^##{1,2}\s+|\Z)/m;

    const intro = body.match(introRe);
    const details = body.match(detailsRe);
    const concl = body.match(conclRe);

    const rest = body
      .replace(introRe, '')
      .replace(detailsRe, '')
      .replace(conclRe, '')
      .trim();

    return {
      introduction: intro ? intro[1].trim() : undefined,
      details: details ? details[1].trim() : undefined,
      conclusion: concl ? concl[1].trim() : undefined,
      rest,
    };
  }

  const sections = parseSections(meta.body);
  console.log('📋 Parsed sections:', sections);

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
    const bullets = (sections.details || "").match(/^[-*]\s.+/gm) || [];
    const cats = meta.categories?.join(", ") || "Uncategorized";
    const tags = meta.tags?.join(", ") || "—";
    const title = meta.title || "Untitled";
    const tableMention = /\|.+\|/.test(sections.rest || meta.body) ? "It also includes a table." : "";
    
    return `**Draft answer**

You're asking: _${q}_.

**Context from ${title}**
- Categories: ${cats}
- Tags: ${tags}  
- Key points: ${bullets.slice(0,3).map(b => b.replace(/^[-*]\s/, '')).join('; ') || 'n/a'}

${tableMention}

If you want, I can focus on introduction, details, or conclusion.`;
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

  // Selection handling
  useEffect(() => {
    function handleUp() {
      const sel = window.getSelection();
      if (!sel) return;
      const text = String(sel.toString() || "").trim();
      if (!text) { 
        setHiLiteText(""); 
        return; 
      }
      if (!contentRef.current) return;
      
      const anchorNode = sel.anchorNode && sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentElement : sel.anchorNode;
      const focusNode = sel.focusNode && sel.focusNode.nodeType === 3 ? sel.focusNode.parentElement : sel.focusNode;
      
      if ((anchorNode && contentRef.current.contains(anchorNode)) || 
          (focusNode && contentRef.current.contains(focusNode))) {
        if (text.length >= 3 && text.length <= 160) {
          setHiLiteText(text);
          setDockFilterText(text);
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

  try {
    return (
      <div className="relative w-full h-screen bg-philonet-black text-white overflow-hidden font-inter">
        {/* Main Panel - always visible */}
        <motion.aside
        initial={false}
        animate={{ width: "100%" }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="relative h-screen bg-philonet-panel text-white shadow-2xl overflow-visible w-full max-w-none"
        aria-label="Philonet side panel"
      >
        {/* Top Action Bar */}
        <div className="absolute top-0 left-0 right-0 h-[68px] border-b border-philonet-border flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
              <div className="h-8 w-8 rounded-full border border-philonet-border-light bg-philonet-card grid place-items-center text-philonet-text-muted">
                <UserRound className="h-4 w-4" />
              </div>
              <span className="text-sm font-light tracking-philonet-wide truncate max-w-[150px] lg:max-w-[200px]">
                Philonet User
              </span>
            </div>
            <div className="hidden md:flex items-center gap-2 flex-shrink-0">
              <Button className="h-9 px-4">
                <Share2 className="h-4 w-4" />
                <span className="ml-2">Share</span>
              </Button>
              <Button className="h-9 px-4">
                <Bookmark className="h-4 w-4" />
                <span className="ml-2">Save</span>
              </Button>
              <Button className="h-9 px-4">
                <MoreHorizontal className="h-4 w-4" />
                <span className="ml-2">More</span>
              </Button>
            </div>
            <div className="md:hidden flex items-center gap-1">
              <Button className="h-9 px-2">
                <Share2 className="h-4 w-4" />
              </Button>
              <Button className="h-9 px-2">
                <Bookmark className="h-4 w-4" />
              </Button>
              <Button className="h-9 px-2">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content zone */}
        <div className="absolute left-0 right-0" style={{ top: 68, bottom: footerH }}>
          <ScrollArea ref={contentRef} className="h-full pr-1">
            {/* Meta header */}
            <section className="px-4 md:px-6 lg:px-8 pt-6">
              {/* Philonet Header */}
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-philonet-border/30">
                <img 
                  src={chrome.runtime?.getURL('philonet.png') || '/philonet.png'} 
                  alt="Philonet" 
                  className="object-contain w-8 h-8 md:w-10 md:h-10"
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
                <div>
                  <h1 className="font-light tracking-philonet-wide text-philonet-blue-400 text-xl md:text-2xl">
                    Philonet
                  </h1>
                  <p className="text-philonet-text-muted tracking-philonet-wide text-xs md:text-sm">
                    Knowledge Network
                  </p>
                </div>
              </div>

              {meta.image && (
                <div className="rounded-philonet-lg overflow-hidden border border-philonet-border mb-5">
                  <img 
                    src={meta.image} 
                    alt={meta.title || "cover"} 
                    className="w-full object-cover h-[180px] md:h-[240px]"
                    onError={(e) => {
                      console.log('📸 External image failed to load, using fallback');
                      const target = e.currentTarget as HTMLImageElement;
                      // Try to use the local Philonet image as fallback
                      if (typeof chrome !== 'undefined' && chrome.runtime) {
                        target.src = chrome.runtime.getURL('philonet.png');
                      } else {
                        // If that fails, hide the image container
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
                <h2 className="font-light tracking-philonet-wider text-philonet-text-primary text-2xl md:text-4xl lg:text-5xl">
                  {meta.title}
                </h2>
              )}

              {meta.description && (
                <p className="mt-3 leading-7 text-philonet-text-tertiary font-light tracking-philonet-normal max-w-[70ch] text-sm md:text-base">
                  {meta.description}
                </p>
              )}

              {/* Categories & Tags */}
              <div className="mt-4 flex flex-wrap items-start gap-2">
                {meta.categories && meta.categories.length > 0 && (
                  <div className="flex flex-wrap items-start gap-2 text-philonet-text-muted">
                    <FolderOpen className="h-4 w-4 mt-1" />
                    {meta.categories.map((c) => (
                      <span 
                        key={`cat-${c}`} 
                        className="rounded-full border border-philonet-border-light font-light tracking-philonet-wider text-philonet-text-muted hover:text-philonet-blue-500 hover:border-philonet-blue-500 transition-colors px-3 py-1 text-xs md:px-4 md:py-2 md:text-sm"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                )}

                {meta.tags && meta.tags.length > 0 && (
                  <div className="flex flex-wrap items-start gap-2 text-philonet-text-muted">
                    <Tag className="h-4 w-4 mt-1" />
                    {meta.tags.map((t) => (
                      <span 
                        key={`tag-${t}`} 
                        className="rounded-full border border-philonet-border-light font-light tracking-philonet-wider text-philonet-text-muted hover:text-philonet-blue-500 hover:border-philonet-blue-500 transition-colors px-3 py-1 text-xs md:px-4 md:py-2 md:text-sm"
                      >
                        #{String(t).replace(/^#/, '')}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Content sections */}
            <section className="px-4 md:px-6 lg:px-8 pb-6 mt-6 space-y-8">
              <div className="prose prose-invert prose-hr:hidden prose-headings:font-light prose-headings:tracking-philonet-wide prose-p:font-light prose-p:tracking-philonet-tight prose-p:text-philonet-text-secondary prose-strong:text-white prose-a:text-philonet-text-muted hover:prose-a:text-philonet-blue-500 prose-li:marker:text-philonet-border-light prose-blockquote:border-l-philonet-border prose-table:rounded-philonet-lg prose-table:overflow-hidden prose-table:border prose-table:border-philonet-border prose-th:bg-philonet-card prose-td:bg-philonet-panel max-w-none prose-sm md:prose-base lg:prose-lg">
                
                {/* Introduction */}
                {sections.introduction && (
                  <div>
                    <h3 className="font-light tracking-philonet-wide text-philonet-text-secondary text-xl md:text-2xl">Introduction</h3>
                    <div className="mt-3" dangerouslySetInnerHTML={renderHighlighted(sections.introduction)} />
                  </div>
                )}

                {/* Details */}
                {sections.details && (
                  <div className="mt-8">
                    <h3 className="font-light tracking-philonet-wide text-philonet-text-secondary text-xl md:text-2xl">Details</h3>
                    <div className="mt-3" dangerouslySetInnerHTML={renderHighlighted(sections.details)} />
                  </div>
                )}

                {/* Conclusion */}
                {sections.conclusion && (
                  <div className="mt-8">
                    <h3 className="font-light tracking-philonet-wide text-philonet-text-secondary text-xl md:text-2xl">Conclusion</h3>
                    <div className="mt-3" dangerouslySetInnerHTML={renderHighlighted(sections.conclusion)} />
                  </div>
                )}

                {/* Remaining content */}
                {sections.rest && (
                  <div className="mt-10" dangerouslySetInnerHTML={renderHighlighted(sections.rest)} />
                )}

                {/* Recent comments preview */}
                {comments && comments.length > 0 && (
                  <div className="mt-12 pt-6 border-t border-philonet-border">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-light tracking-philonet-wider text-philonet-text-secondary">Recent Comments</h4>
                      <span className="text-xs text-philonet-text-muted tracking-philonet-wide">
                        {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
                      </span>
                    </div>
                    <div className="space-y-4">
                      {comments.slice(0, 5).map((c) => (
                        <div key={c.id} className="group rounded-philonet border border-philonet-border bg-philonet-card/60 p-4 hover:border-philonet-border-light transition-colors">
                          <div className="flex items-start gap-3">
                            <div className="h-8 w-8 rounded-full border border-philonet-border-light bg-philonet-card grid place-items-center text-philonet-text-muted text-xs flex-shrink-0">
                              {c.author[0] || 'U'}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs text-philonet-text-subtle tracking-philonet-wide">
                                {c.author} • {c.ts}
                              </div>
                              {c.tag && (
                                <div className="mt-1 text-[11px] text-philonet-blue-400">
                                  Tagged excerpt: "{c.tag.text}"
                                </div>
                              )}
                              <div className="text-sm text-philonet-text-tertiary leading-relaxed">
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
        <div ref={footerRef} className="absolute bottom-0 left-0 right-0 border-t border-philonet-border bg-philonet-panel px-4 py-3 md:px-6 md:py-4">
          {/* Tabs */}
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => setComposerTab("comments")}
              className={cn(
                'rounded-full border tracking-philonet-wider flex items-center h-8 px-3 text-xs md:h-9 md:px-4 md:text-sm',
                composerTab === 'comments' 
                  ? 'text-philonet-blue-500 border-philonet-blue-500' 
                  : 'text-philonet-text-muted border-philonet-border-light'
              )}
            >
              <MessageSquare className="inline mr-2 h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Comments</span>
            </button>
            <button
              onClick={() => setComposerTab("ai")}
              className={cn(
                'rounded-full border tracking-philonet-wider flex items-center h-8 px-3 text-xs md:h-9 md:px-4 md:text-sm',
                composerTab === 'ai' 
                  ? 'text-philonet-blue-500 border-philonet-blue-500' 
                  : 'text-philonet-text-muted border-philonet-border-light'
              )}
            >
              <Bot className="inline mr-2 h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Ask AI</span>
            </button>
          </div>

          {/* Selection tag */}
          {hiLiteText && (
            <div className="mb-2 flex items-center gap-2 text-xs">
              <span className="px-2 py-1 rounded-full border border-philonet-blue-500/60 text-philonet-blue-400 bg-philonet-blue-500/10 truncate max-w-[80%]" title={hiLiteText}>
                Tagged: "{hiLiteText}"
              </span>
              <button 
                onClick={() => setHiLiteText("")} 
                className="text-philonet-text-muted hover:text-philonet-blue-500 text-xs"
              >
                Clear
              </button>
            </div>
          )}

          {/* Content */}
          {composerTab === 'comments' ? (
            <div>
              <div className="flex items-start gap-3 md:gap-4">
                <div className="self-center rounded-full border border-philonet-border-light bg-philonet-card grid place-items-center text-philonet-text-muted flex-shrink-0 h-10 w-10 md:h-12 md:w-12">
                  <UserRound className="h-5 w-5 md:h-6 md:w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="rounded-full border border-philonet-border-light bg-philonet-card focus-within:border-philonet-blue-500 flex items-center px-4 py-2 md:px-5 md:py-3">
                    <Textarea
                      ref={commentRef}
                      placeholder="Add a comment…"
                      value={comment}
                      rows={commentRows}
                      className="flex-1 text-xs md:text-sm"
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
                      className="ml-2 rounded-full grid place-items-center text-philonet-text-subtle hover:text-philonet-blue-500 h-8 w-8 md:h-9 md:w-9"
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
                      <Smile className="h-4 w-4 md:h-5 md:w-5" />
                    </button>
                    <Button 
                      disabled={!comment.trim()} 
                      onClick={submitComment} 
                      className="ml-1 h-9 px-3 md:h-10 md:px-4"
                    >
                      <CornerDownLeft className="h-3 w-3 md:h-4 md:w-4" />
                    </Button>
                  </div>
                  <div className="mt-1 flex justify-end text-philonet-text-subtle text-[10px] md:text-xs">
                    <span>{Math.max(0, 280 - comment.length)} characters left</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-philonet-lg border border-philonet-blue-500/40 bg-philonet-card/60 shadow-[0_0_0_1px_rgba(59,130,246,0.25)_inset] p-3 md:p-4">
              <div className="mb-2 flex items-center gap-2 text-philonet-text-muted tracking-philonet-wider text-xs md:text-sm">
                <Bot className="h-3 w-3 md:h-4 md:w-4" />
                <span>ASK AI</span>
              </div>
              <Textarea
                placeholder="Ask a question about this document…"
                value={aiQuestion}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAiQuestion(e.target.value)}
                rows={3}
                className="bg-transparent text-xs md:text-sm"
                onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => { 
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { 
                    e.preventDefault(); 
                    askAi(); 
                  } 
                }}
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-philonet-text-muted text-[10px] md:text-xs">Press Cmd/Ctrl+Enter to ask</span>
                <Button 
                  disabled={!aiQuestion.trim() || aiBusy} 
                  onClick={askAi} 
                  className="h-9 px-3 md:h-10 md:px-4"
                >
                  {aiBusy ? (
                    <Loader2 className="animate-spin h-3 w-3 md:h-4 md:w-4" />
                  ) : (
                    <>
                      <Bot className="mr-2 h-3 w-3 md:h-4 md:w-4" />
                      <span className="hidden sm:inline">Ask</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Comments dock */}
        {dockOpen && dockList.length > 0 && (
          <div
            className="pointer-events-auto absolute right-3 z-30"
            style={{ bottom: footerH + 12 }}
          >
            {!dockMinimized ? (
              <motion.div
                key={dockList[dockActiveIndex]?.id || 'empty'}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 250, damping: 20 }}
                className="relative w-[320px] rounded-philonet-lg border border-philonet-border bg-philonet-card/95 backdrop-blur p-4 shadow-xl"
              >
                {/* Current comment */}
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full border border-philonet-border-light bg-philonet-card grid place-items-center text-philonet-text-muted">
                    <UserRound className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-philonet-text-secondary truncate">
                      {dockList[dockActiveIndex]?.author || 'Unknown'}
                    </div>
                    <div className="text-[11px] text-philonet-text-subtle">
                      {dockList[dockActiveIndex]?.ts || ''}
                    </div>
                  </div>
                </div>

                <div className="mt-3 text-[13px] leading-6 text-philonet-text-secondary pr-2">
                  {dockList[dockActiveIndex]?.text || ''}
                </div>

                {/* Tagged excerpt */}
                {dockList[dockActiveIndex]?.tag?.text && (
                  <div className="mt-3 pt-2 border-t border-philonet-border/60">
                    <div className="text-[12px] text-philonet-blue-400 cursor-pointer hover:text-philonet-blue-500 transition-colors flex items-center gap-2 p-2 rounded-lg bg-philonet-blue-500/5 border border-philonet-blue-500/20">
                      <Tag className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate font-medium">
                        "{dockList[dockActiveIndex].tag.text}"
                      </span>
                    </div>
                  </div>
                )}

                {/* Navigation controls */}
                <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2">
                  <button 
                    onClick={() => gotoDockIndex(wrap(dockActiveIndex - 1, dockList.length))} 
                    className="h-7 w-7 grid place-items-center rounded-full border border-philonet-border-light bg-philonet-panel text-philonet-text-muted hover:text-philonet-blue-500 hover:border-philonet-blue-500 shadow-xl backdrop-blur-sm" 
                    aria-label="Previous"
                    disabled={dockList.length <= 1}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button 
                    onClick={() => gotoDockIndex(wrap(dockActiveIndex + 1, dockList.length))} 
                    className="h-7 w-7 grid place-items-center rounded-full border border-philonet-border-light bg-philonet-panel text-philonet-text-muted hover:text-philonet-blue-500 hover:border-philonet-blue-500 shadow-xl backdrop-blur-sm" 
                    aria-label="Next"
                    disabled={dockList.length <= 1}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                  <div className="ml-2">
                    <LoaderRing value={dockActiveIndex + 1} total={dockList.length} size={34} stroke={2} />
                  </div>
                  <button 
                    onClick={() => setDockMinimized(true)} 
                    className="ml-2 h-7 w-7 grid place-items-center rounded-full border border-philonet-border-light bg-philonet-panel text-philonet-text-muted hover:text-philonet-blue-500 hover:border-philonet-blue-500 shadow-xl backdrop-blur-sm" 
                    title="Minimize"
                    aria-label="Minimize dock"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>
              </motion.div>
            ) : (
              <AnimatePresence>
                <motion.button
                  key="mini"
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                  onClick={() => setDockMinimized(false)}
                  className="rounded-full border border-philonet-border bg-philonet-card/90 backdrop-blur px-3 py-2 flex items-center gap-3 shadow-xl max-w-[300px]"
                  title="Expand"
                >
                  <LoaderRing value={dockActiveIndex + 1} total={dockList.length} size={28} stroke={2} />
                  <div className="h-6 w-[1px] bg-philonet-border" />
                  <div className="text-xs text-philonet-text-secondary truncate">
                    {dockList[dockActiveIndex]?.tag?.text ? (
                      <div className="flex items-center gap-2">
                        <Tag className="h-3 w-3 text-philonet-blue-400" />
                        <span className="text-philonet-blue-400 truncate">{dockList[dockActiveIndex].tag.text}</span>
                      </div>
                    ) : (
                      <>
                        <span className="text-philonet-text-muted">Comment</span> {dockActiveIndex + 1} of {dockList.length}
                      </>
                    )}
                  </div>
                </motion.button>
              </AnimatePresence>
            )}
          </div>
        )}
      </motion.aside>
      
      {/* Custom Scrollbar Styles */}
      <style>{`
        .philonet-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        
        .philonet-scrollbar::-webkit-scrollbar-track {
          background: #1f2937;
          border-radius: 4px;
        }
        
        .philonet-scrollbar::-webkit-scrollbar-thumb {
          background: #374151;
          border-radius: 4px;
          border: 1px solid #1f2937;
        }
        
        .philonet-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #4b5563;
        }
        
        .philonet-scrollbar::-webkit-scrollbar-corner {
          background: #1f2937;
        }
        
        /* For Firefox */
        .philonet-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #374151 #1f2937;
        }
      `}</style>
    </div>
  );
  } catch (error) {
    console.error('❌ SidePanel render error:', error);
    return (
      <div className="w-full h-screen bg-red-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl mb-4">SidePanel Error</h1>
          <p className="text-sm">Check console for details</p>
          <pre className="text-xs mt-2 bg-red-800 p-2 rounded">{String(error)}</pre>
        </div>
      </div>
    );
  }
};

export default withErrorBoundary(withSuspense(SidePanel, <LoadingSpinner />), ErrorDisplay);
