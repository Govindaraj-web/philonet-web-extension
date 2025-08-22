import { useMemo } from 'react';
import MarkdownIt from 'markdown-it';
import { MarkdownMeta, ContentSections } from '../types';
import { createMathMarkdownRenderer } from '../utils/markdownRenderer';

export function useMarkdown() {
  const md = useMemo(() => createMathMarkdownRenderer(), []);
  
  const renderMD = (text: string) => md.render(text || "");
  const render = (text: string) => ({ __html: renderMD(text) });

  // Render with highlighting
  const renderHighlighted = (text: string, hiLiteText: string) => {
    const html = renderMD(text);
    if (!hiLiteText) return { __html: html };
    try {
      const safe = hiLiteText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(safe, "i");
      const marked = html.replace(
        re,
        (m) => `<mark data-philo-mark="1" class="rounded px-0.5" style="background-color: rgba(203, 163, 57, 0.2); color: #CBA339;">${m}</mark>`
      );
      return { __html: marked };
    } catch {
      return { __html: html };
    }
  };

  // Extract metadata from markdown
  const extractMeta = (mdText: string): MarkdownMeta => {
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
  };

  // Parse sections
  const parseSections = (body: string): ContentSections => {
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
  };

  // Get clean text for speech
  const getArticleText = (meta: MarkdownMeta, sections: ContentSections) => {
    let text = '';
    if (meta.title) text += meta.title + '. ';
    if (meta.description) text += meta.description + '. ';
    if (sections.introduction) text += 'Introduction. ' + sections.introduction + ' ';
    if (sections.details) text += 'Details. ' + sections.details + ' ';
    if (sections.conclusion) text += 'Conclusion. ' + sections.conclusion + ' ';
    if (sections.rest) {
      const cleanText = sections.rest
        .replace(/#{1,6}\s+/g, '')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\|.+\|/g, '')
        .replace(/[-*]\s+/g, '')
        .replace(/\n+/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/([.!?])\s*([A-Z])/g, '$1 $2')
        .trim();
      text += cleanText;
    }
    return text.trim();
  };

  return {
    renderMD,
    render,
    renderHighlighted,
    extractMeta,
    parseSections,
    getArticleText
  };
}
