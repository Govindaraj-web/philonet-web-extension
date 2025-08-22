import { withUI } from '@extension/ui';

export default withUI({
  content: ['index.html', 'src/**/*.tsx'],
  theme: {
    extend: {
      fontFamily: {
        'inter': ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        philonet: {
          'black': '#000000',
          'background': '#0a0a0a',
          'panel': '#0a0a0a',
          'card': '#0b0b0b',
          'border': '#262626',
          'border-light': '#404040',
          'text': {
            'primary': 'rgba(255, 255, 255, 0.95)',
            'secondary': 'rgba(255, 255, 255, 0.9)',
            'tertiary': 'rgba(255, 255, 255, 0.85)',
            'muted': '#a3a3a3',
            'subtle': '#737373',
            'accent': 'rgba(96, 165, 250, 0.5)',
            'accent-dim': 'rgba(59, 130, 246, 0.4)',
          },
          'blue': {
            '400': 'rgba(96, 165, 250, 0.6)',
            '500': 'rgba(59, 130, 246, 0.7)',
            '600': 'rgba(37, 99, 235, 0.8)',
            '700': 'rgba(29, 78, 216, 0.9)',
          },
          'accent': {
            'subtle': 'rgba(96, 165, 250, 0.4)',
            'muted': 'rgba(59, 130, 246, 0.5)',
            'dim': 'rgba(37, 99, 235, 0.3)',
          }
        }
      },
      letterSpacing: {
        'philonet-tight': '0.04em',
        'philonet-normal': '0.06em',
        'philonet-wide': '0.12em',
        'philonet-wider': '0.14em',
        'philonet-widest': '0.16em',
        'philonet-hero': '0.18em',
        'philonet-title': '0.2em',
      },
      fontWeight: {
        'philonet': '300',
      },
      borderRadius: {
        'philonet': '16px',
        'philonet-lg': '20px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
});
