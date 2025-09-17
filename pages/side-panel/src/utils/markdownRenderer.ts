import MarkdownIt from 'markdown-it';
import { loadKaTeX, isKaTeXLoaded } from './katexLoader';

// Initialize KaTeX loading
loadKaTeX().catch(console.error);

// KaTeX renderer function that processes math expressions
export function renderMathExpressions(html: string): string {
  console.log('🔢 Processing math expressions in HTML:', html.substring(0, 200) + '...');
  
  // Process square bracket notation [formula] - common in physics
  html = html.replace(/\[\s*([^[\]]+)\s*\]/g, (match, latex) => {
    console.log('📐 Found square bracket math:', latex);
    try {
      if (!isKaTeXLoaded()) {
        console.warn('KaTeX not loaded, showing raw LaTeX');
        return `<div class="katex-fallback bg-gray-800 p-3 rounded font-mono text-sm border-l-4 border-yellow-500">[${latex}]</div>`;
      }
      const katex = window.katex;
      const rendered = katex.renderToString(latex.trim(), {
        displayMode: true,
        throwOnError: false,
        errorColor: '#ff6b6b'
      });
      console.log('✅ Successfully rendered square bracket math');
      return rendered;
    } catch (error) {
      console.warn('KaTeX render error for square brackets:', error);
      return `<div class="katex-error bg-red-900/20 p-2 rounded border border-red-500/50 text-red-400 font-mono text-sm">Error: [${latex}]</div>`;
    }
  });

  // Process display math ($$...$$) - more robust regex
  html = html.replace(/\$\$([\s\S]*?)\$\$/g, (match, latex) => {
    console.log('📐 Found display math:', latex);
    try {
      if (!isKaTeXLoaded()) {
        console.warn('KaTeX not loaded, showing raw LaTeX');
        return `<div class="katex-fallback bg-gray-800 p-3 rounded font-mono text-sm border-l-4 border-yellow-500">$$${latex}$$</div>`;
      }
      const katex = window.katex;
      const rendered = katex.renderToString(latex.trim(), {
        displayMode: true,
        throwOnError: false,
        errorColor: '#ff6b6b'
      });
      console.log('✅ Successfully rendered display math');
      return rendered;
    } catch (error) {
      console.warn('KaTeX render error for display math:', error);
      return `<div class="katex-error bg-red-900/20 p-2 rounded border border-red-500/50 text-red-400 font-mono text-sm">Error: $$${latex}$$</div>`;
    }
  });

  // Process inline math ($...$) - improved regex to avoid conflicts
  html = html.replace(/\$([^$\n]+?)\$/g, (match, latex) => {
    console.log('📐 Found inline math:', latex);
    try {
      if (!isKaTeXLoaded()) {
        console.warn('KaTeX not loaded, showing raw LaTeX');
        return `<code class="katex-fallback bg-gray-800 px-1 rounded">$${latex}$</code>`;
      }
      const katex = window.katex;
      const rendered = katex.renderToString(latex.trim(), {
        displayMode: false,
        throwOnError: false,
        errorColor: '#ff6b6b'
      });
      console.log('✅ Successfully rendered inline math');
      return rendered;
    } catch (error) {
      console.warn('KaTeX render error for inline math:', error);
      return `<code class="katex-error bg-red-900/20 px-1 rounded text-red-400">$${latex}$</code>`;
    }
  });

  // Process LaTeX equation environments
  html = html.replace(/\\begin\{equation\}([\s\S]*?)\\end\{equation\}/g, (match, latex) => {
    console.log('📐 Found equation environment:', latex);
    try {
      if (!isKaTeXLoaded()) {
        return `<div class="katex-fallback bg-gray-800 p-3 rounded font-mono text-sm border-l-4 border-yellow-500">\\begin{equation}${latex}\\end{equation}</div>`;
      }
      const katex = window.katex;
      const rendered = katex.renderToString(latex.trim(), {
        displayMode: true,
        throwOnError: false,
        errorColor: '#ff6b6b'
      });
      console.log('✅ Successfully rendered equation environment');
      return rendered;
    } catch (error) {
      console.warn('KaTeX render error for equation environment:', error);
      return `<div class="katex-error bg-red-900/20 p-2 rounded border border-red-500/50 text-red-400 font-mono text-sm">\\begin{equation}${latex}\\end{equation}</div>`;
    }
  });

  // Process align environments
  html = html.replace(/\\begin\{align\}([\s\S]*?)\\end\{align\}/g, (match, latex) => {
    console.log('📐 Found align environment:', latex);
    try {
      if (!isKaTeXLoaded()) {
        return `<div class="katex-fallback bg-gray-800 p-3 rounded font-mono text-sm border-l-4 border-yellow-500">\\begin{align}${latex}\\end{align}</div>`;
      }
      const katex = window.katex;
      const rendered = katex.renderToString(latex.trim(), {
        displayMode: true,
        throwOnError: false,
        errorColor: '#ff6b6b'
      });
      console.log('✅ Successfully rendered align environment');
      return rendered;
    } catch (error) {
      console.warn('KaTeX render error for align environment:', error);
      return `<div class="katex-error bg-red-900/20 p-2 rounded border border-red-500/50 text-red-400 font-mono text-sm">\\begin{align}${latex}\\end{align}</div>`;
    }
  });

  console.log('🔢 Final processed HTML:', html.substring(0, 200) + '...');
  return html;
}

// Create enhanced markdown renderer with math support
export function createMathMarkdownRenderer(): MarkdownIt {
  const md = new MarkdownIt({ 
    html: false, 
    linkify: true, 
    breaks: false 
  });

  // Override the default render method to include math processing
  const originalRender = md.render.bind(md);
  md.render = function(src: string, env?: any): string {
    console.log('📝 Markdown render called with source:', src.substring(0, 100) + '...');
    const html = originalRender(src, env);
    console.log('📝 Original markdown HTML:', html.substring(0, 200) + '...');
    
    // Ensure KaTeX is loaded before processing math
    if (!isKaTeXLoaded()) {
      console.log('⚠️ KaTeX not loaded yet, attempting to load...');
      loadKaTeX().then(() => {
        console.log('✅ KaTeX loaded, but too late for this render cycle');
      }).catch(console.error);
    }
    
    const processedHtml = renderMathExpressions(html);
    console.log('📝 Final processed HTML:', processedHtml.substring(0, 200) + '...');
    return processedHtml;
  };

  return md;
}
