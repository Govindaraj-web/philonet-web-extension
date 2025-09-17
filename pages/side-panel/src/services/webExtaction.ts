// Extracts the current page URL
export function extractUrl(): string {
  return window.location.href;
}

// Extracts the page title
export function extractTitle(): string {
  return document.title;
}

// Extracts the meta description
export function extractMetaDescription(): string | null {
  const meta = document.querySelector('meta[name="description"]');
  return meta ? meta.getAttribute('content') : null;
}

// Extracts all headings (h1-h6) as an array of text
export function extractHeadings(): string[] {
  const headings = Array.from(document.querySelectorAll('h1, h2, h3'));
  return headings.map(h => h.textContent?.trim() || '');
}

// Extracts visible text from the body, similar to innerText but with extra cleaning for summarization
export function extractVisibleText(): string {
  // Clone body to avoid modifying the live DOM
  const bodyClone = document.body.cloneNode(true) as HTMLElement;
  console.log('[extractVisibleText] Cloned body outerhtml:', bodyClone.outerHTML);


  // Remove elements that are almost always non-content
  const selectorsToRemove = [
    'noscript', 'script', 'style', 'iframe', 'svg', 'canvas',
    'input', 'button', 'select', 'option', '[aria-hidden="true"]',
    'nav', 'footer', 'aside', 'form', 'header',
    '.sidebar', '.side-bar', '.sidepanel', '.side-panel', '.ad', '.ads', '.advert', '.advertisement',
    '.popup', '.modal', '.overlay', '.newsletter', '.cookie', '.cookies', '.subscribe', '.subscription',
    '.banner', '.promo', '.promotions', '.breadcrumb', '.breadcrumbs',
    '[role="navigation"]', '[role="banner"]', '[role="complementary"]', '[role="contentinfo"]', '[role="search"]',
    '#sidebar', '#side-bar', '#sidepanel', '#side-panel', '#ad', '#ads', '#advert', '#advertisement',
    '#popup', '#modal', '#overlay', '#newsletter', '#cookie', '#cookies', '#subscribe', '#subscription',
    '#banner', '#promo', '#promotions', '#breadcrumb', '#breadcrumbs'
  ];
  bodyClone.querySelectorAll(selectorsToRemove.join(',')).forEach(el => el.remove());

  // Get the visible text using innerText (respects CSS visibility)
  let text = bodyClone.innerText || '';

  // Normalize whitespace, remove empty lines, and trim
  text = text
    .replace(/\r\n|\r/g, '\n') // Normalize line endings
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');

console.log('[extractVisibleText] Cloned body:', text.replace(/\n/g, ' ').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c)));

  return text;
}

// Extracts structured data (tags, categories) from meta tags or common selectors
export function extractStructuredData(): { tags: string[]; categories: string[] } {
  const tags: string[] = [];
  const categories: string[] = [];

  // Common meta tags for tags/categories
  document.querySelectorAll('meta[name="keywords"], meta[property="article:tag"]').forEach(meta => {
    const content = meta.getAttribute('content');
    if (content) {
      content.split(',').map(s => s.trim()).forEach(tag => {
        if (tag && !tags.includes(tag)) {
          tags.push(tag);
          console.log(`[extractStructuredData] Tag "${tag}" from meta tag:`, meta.outerHTML);
        }
      });
    }
  });

  // Try to find categories in common places
  document.querySelectorAll('[rel="category tag"], .category, .categories, .tag, .tags').forEach(el => {
    const text = el.textContent?.trim();
    if (text && !categories.includes(text)) {
      categories.push(text);
      console.log(`[extractStructuredData] Category "${text}" from selector:`, el.outerHTML);
    }
  });

  // Breadcrumbs
  document.querySelectorAll('.breadcrumb a, [aria-label="breadcrumb"] a, nav[role="navigation"] a').forEach(link => {
    const text = link.textContent?.trim();
    if (text && !categories.includes(text)) {
      categories.push(text);
      console.log(`[extractStructuredData] Category "${text}" from breadcrumb:`, link.outerHTML);
    }
  });

  // Microdata
  document.querySelectorAll('[itemprop="keywords"], [itemprop="articleSection"]').forEach(el => {
    const text = el.textContent?.trim();
    if (text && !tags.includes(text) && el.getAttribute('itemprop') === 'keywords') {
      tags.push(text);
      console.log(`[extractStructuredData] Tag "${text}" from microdata:`, el.outerHTML);
    }
    if (text && !categories.includes(text) && el.getAttribute('itemprop') === 'articleSection') {
      categories.push(text);
      console.log(`[extractStructuredData] Category "${text}" from microdata:`, el.outerHTML);
    }
  });

  // Extract from JSON-LD
  document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
    try {
      const json = JSON.parse(script.textContent || '');
      if (json.keywords) {
        (Array.isArray(json.keywords) ? json.keywords : json.keywords.split(',')).forEach((tag: string) => {
          const t = tag.trim();
          if (t && !tags.includes(t)) {
            tags.push(t);
            console.log(`[extractStructuredData] Tag "${t}" from JSON-LD:`, script.outerHTML);
          }
        });
      }
      if (json.articleSection) {
        (Array.isArray(json.articleSection) ? json.articleSection : [json.articleSection]).forEach((cat: string) => {
          const c = cat.trim();
          if (c && !categories.includes(c)) {
            categories.push(c);
            console.log(`[extractStructuredData] Category "${c}" from JSON-LD:`, script.outerHTML);
          }
        });
      }
    } catch (e) {
      // Optionally log JSON parse errors
      // console.warn('[extractStructuredData] JSON-LD parse error:', e, script.outerHTML);
    }
  });

  return { tags, categories };
}

// Extracts OpenGraph details
export function extractOpenGraph(): Record<string, string> {
  const og: Record<string, string> = {};
  document.querySelectorAll('meta[property^="og:"]').forEach(meta => {
    const property = meta.getAttribute('property');
    const content = meta.getAttribute('content');
    if (property && content) {
      og[property] = content;
    }
  });
  return og;
}

// Extracts the thumbnail URL from meta tags or common selectors
export function extractThumbnailUrl(): string | null {
  // Try Open Graph image
  const ogImage = document.querySelector('meta[property="og:image"]');
  if (ogImage?.getAttribute('content')) {
    return ogImage.getAttribute('content');
  }

  // Try Twitter Card image
  const twitterImage = document.querySelector('meta[name="twitter:image"]');
  if (twitterImage?.getAttribute('content')) {
    return twitterImage.getAttribute('content');
  }

  // Fallback: first large image in the body
  const img = document.querySelector('img');
  if (img?.src) {
    return img.src;
  }

  return null;
}