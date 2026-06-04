import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#0a1228',
          900: '#0f1e3c',
          800: '#162447',
          700: '#1b2d56',
          600: '#213567',
          500: '#2d4580',
        },
        surface: '#f5f8ff',
        card: '#ffffff',
        'blue-retc': '#1d6ae5',
        'blue2': '#2979ff',
        'blue-light': '#e8f0fe',
        'retc-border': '#dce6f9',
        'text-main': '#1a2744',
        'text-sub': '#4a6080',
      },
    },
  },
  plugins: [],
};

export default config;
