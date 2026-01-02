import type { Config } from 'tailwindcss';

export default {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Background layers
        'bg-base': '#09090B',
        'bg-elevated': '#18181B',
        'bg-hover': '#27272A',

        // Text hierarchy
        'text-primary': '#FAFAFA',
        'text-secondary': '#A1A1AA',
        'text-muted': '#71717A',

        // Borders
        'border-subtle': '#27272A',
        'border-visible': '#3F3F46',

        // Accent
        accent: '#22D3EE',
        'accent-hover': '#67E8F9',

        // Semantic
        success: '#22C55E',
        error: '#EF4444',
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'Menlo', 'monospace'],
      },
      fontSize: {
        display: ['56px', { lineHeight: '64px', letterSpacing: '-0.02em', fontWeight: '700' }],
        h1: ['40px', { lineHeight: '48px', letterSpacing: '-0.015em', fontWeight: '600' }],
        h2: ['28px', { lineHeight: '36px', letterSpacing: '-0.01em', fontWeight: '600' }],
        h3: ['20px', { lineHeight: '28px', letterSpacing: '0em', fontWeight: '600' }],
        'body-lg': ['20px', { lineHeight: '32px', letterSpacing: '0em', fontWeight: '400' }],
        body: ['16px', { lineHeight: '26px', letterSpacing: '0em', fontWeight: '400' }],
        code: ['14px', { lineHeight: '24px', letterSpacing: '0em', fontWeight: '400' }],
      },
      spacing: {
        section: '128px',
        'section-mobile': '96px',
      },
      borderRadius: {
        sm: '8px',
        lg: '12px',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'slide-up': 'slideUp 0.6s ease-out forwards',
        'pulse-glow': 'pulseGlow 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(34, 211, 238, 0)' },
          '50%': { boxShadow: '0 0 20px 4px rgba(34, 211, 238, 0.3)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
