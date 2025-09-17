// KaTeX loading utility
declare global {
  interface Window {
    katex: any;
  }
}

let katexLoaded = false;
let katexLoading = false;
let katexPromise: Promise<void> | null = null;

export function loadKaTeX(): Promise<void> {
  console.log('🔢 KaTeX loader called, current state:', { katexLoaded, katexLoading, hasKatex: !!window.katex });
  
  if (katexLoaded && window.katex) {
    console.log('✅ KaTeX already loaded');
    return Promise.resolve();
  }

  if (katexLoading && katexPromise) {
    console.log('⏳ KaTeX loading in progress');
    return katexPromise;
  }

  katexLoading = true;
  console.log('🚀 Starting KaTeX import...');
  
  katexPromise = new Promise((resolve, reject) => {
    try {
      // Try to import KaTeX
      import('katex').then((katex) => {
        console.log('✅ KaTeX module imported successfully:', katex);
        window.katex = katex.default || katex;
        katexLoaded = true;
        katexLoading = false;
        console.log('✅ KaTeX loaded and attached to window:', !!window.katex);
        resolve();
      }).catch((error) => {
        console.error('❌ Failed to load KaTeX module:', error);
        katexLoading = false;
        katexPromise = null;
        reject(error);
      });
    } catch (error) {
      console.error('❌ Failed to import KaTeX:', error);
      katexLoading = false;
      katexPromise = null;
      reject(error);
    }
  });

  return katexPromise;
}

export function isKaTeXLoaded(): boolean {
  const loaded = katexLoaded && !!window.katex;
  console.log('🔍 Checking KaTeX status:', { katexLoaded, hasWindow: !!window.katex, result: loaded });
  return loaded;
}
