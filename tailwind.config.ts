import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'surface': '#f8f9ff',
        'surface-dim': '#cbdbf5',
        'surface-bright': '#f8f9ff',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#eff4ff',
        'surface-container': '#e5eeff',
        'surface-container-high': '#dce9ff',
        'surface-container-highest': '#d3e4fe',
        'on-surface': '#0b1c30',
        'on-surface-variant': '#434656',
        'inverse-surface': '#213145',
        'inverse-on-surface': '#eaf1ff',
        'outline': '#737688',
        'outline-variant': '#c3c5d9',
        'primary': '#0041c8',
        'on-primary': '#ffffff',
        'primary-container': '#0055ff',
        'on-primary-container': '#e3e6ff',
        'inverse-primary': '#b6c4ff',
        'secondary': '#565e74',
        'on-secondary': '#ffffff',
        'secondary-container': '#dae2fd',
        'on-secondary-container': '#5c647a',
        'error': '#ba1a1a',
        'on-error': '#ffffff',
        'error-container': '#ffdad6',
        'on-background': '#0b1c30',
        'background': '#f8f9ff',
        'surface-variant': '#d3e4fe',
        'surface-tint': '#004dea',
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      borderRadius: {
        DEFAULT: '0.5rem',
        sm: '0.25rem',
        md: '0.75rem',
        lg: '1rem',
        xl: '1.5rem',
      },
    },
  },
  plugins: [],
}

export default config
