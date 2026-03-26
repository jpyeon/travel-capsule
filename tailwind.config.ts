import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/app/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Muted sage-teal — primary accent
        accent: {
          50:  '#f2f8f7',
          100: '#daeee9',
          200: '#b5ddd8',
          300: '#82c4bd',
          400: '#52a49c',
          500: '#4e7c77',
          600: '#3e6460',
          700: '#335250',
          800: '#2b4442',
          900: '#243837',
        },
        // Warm off-white grays — backgrounds & borders
        sand: {
          50:  '#faf9f7',
          100: '#f3f0ea',
          200: '#e8e3da',
          300: '#d4cdc1',
          400: '#bbb4a6',
          500: '#9e978a',
        },
      },
      boxShadow: {
        card: '0 1px 4px 0 rgb(0 0 0 / 0.07), 0 1px 2px -1px rgb(0 0 0 / 0.05)',
        'card-hover': '0 4px 12px 0 rgb(0 0 0 / 0.10), 0 2px 4px -1px rgb(0 0 0 / 0.06)',
      },
    },
  },
  plugins: [],
};

export default config;
