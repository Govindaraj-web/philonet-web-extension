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
          },
          'blue': {
            '400': 'rgb(96 165 250 / 0.9)',
            '500': '#3b82f6',
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
