/**
 * Matrix Theme Configuration
 * A cohesive green-accented dark theme inspired by The Matrix
 * for consistent styling across the application
 */

export const matrixTheme = {
  // Base colors
  colors: {
    // Primary greens
    primary: '#34d399',        // Emerald-400
    primaryLight: '#6ee7b7',   // Emerald-300
    primaryLighter: '#86efac', // Emerald-200
    primaryPale: '#a7f3d0',    // Emerald-100
    primaryDark: '#059669',    // Emerald-600

    // Backgrounds
    bgDarkest: '#0a0f1a',      // Very dark blue-black
    bgDarker: '#0f1419',       // Slightly lighter
    bgDark: '#1a1f2e',         // Card background
    bgCard: '#1e293b',         // Slate-800

    // Text colors
    textPrimary: '#cbd5e0',    // Main text - muted gray-blue
    textSecondary: '#a0aec0',  // Secondary text
    textMuted: '#6b7280',      // Muted/disabled text
    textBright: '#d1fae5',     // Bright text for emphasis

    // Borders & Separators
    border: 'rgba(52, 211, 153, 0.2)',
    borderLight: 'rgba(52, 211, 153, 0.15)',
    borderDark: 'rgba(52, 211, 153, 0.3)',

    // States
    success: '#34d399',
    warning: '#fbbf24',
    error: '#f87171',
    info: '#60a5fa',
  },

  // CopilotKit specific variables
  copilotKit: {
    '--copilot-kit-primary-color': '#34d399',
    '--copilot-kit-contrast-color': '#cbd5e0',
    '--copilot-kit-background-color': '#0a0f1a',
    '--copilot-kit-input-background-color': '#0f1419',
    '--copilot-kit-secondary-color': '#1a1f2e',
    '--copilot-kit-secondary-contrast-color': '#a7f3d0',
    '--copilot-kit-separator-color': 'rgba(52, 211, 153, 0.15)',
    '--copilot-kit-muted-color': '#6b7280',
    '--copilot-kit-response-button-color': '#34d399',
    '--copilot-kit-response-button-background-color': 'rgba(52, 211, 153, 0.1)',
  } as React.CSSProperties,

  // Tailwind class utilities
  classes: {
    // Backgrounds
    bgPrimary: 'bg-gray-900',
    bgCard: 'bg-slate-800',
    bgCardHover: 'hover:bg-slate-700',

    // Borders
    border: 'border-gray-700',
    borderPrimary: 'border-emerald-400/20',
    borderPrimaryHover: 'hover:border-emerald-400/40',

    // Text
    textPrimary: 'text-gray-300',
    textSecondary: 'text-gray-400',
    textMuted: 'text-gray-500',
    textAccent: 'text-emerald-400',
    textAccentLight: 'text-emerald-300',

    // Buttons
    btnPrimary: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    btnSecondary: 'bg-gray-700 hover:bg-gray-600 text-gray-200',
    btnGhost: 'hover:bg-emerald-400/10 text-emerald-400',

    // Inputs
    input: 'bg-gray-900 border-gray-700 text-gray-200 focus:border-emerald-400 focus:ring-emerald-400/50',
    inputLabel: 'text-gray-400 text-sm font-medium',

    // Cards
    card: 'bg-slate-800 border border-gray-700 rounded-lg',
    cardHover: 'hover:border-emerald-400/40 transition-colors',
  },

  // Form component styles
  form: {
    container: 'space-y-6',
    field: 'space-y-2',
    label: 'block text-sm font-medium text-emerald-300',
    input: 'w-full px-3 py-2 bg-gray-900/80 border border-emerald-400/50 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400 hover:border-emerald-400/70 transition-all',
    textarea: 'w-full px-3 py-2 bg-gray-900/80 border border-emerald-400/50 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400 hover:border-emerald-400/70 transition-all resize-none',
    select: 'w-full px-3 py-2 bg-gray-900/80 border border-emerald-400/50 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400 hover:border-emerald-400/70 transition-all',
    checkbox: 'w-4 h-4 text-emerald-500 bg-gray-900/80 border-emerald-400/50 rounded focus:ring-emerald-400/50 focus:ring-offset-gray-900',
    radio: 'w-4 h-4 text-emerald-500 bg-gray-900/80 border-emerald-400/50 focus:ring-emerald-400/50 focus:ring-offset-gray-900',
    button: 'px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 disabled:bg-gray-700 disabled:cursor-not-allowed disabled:shadow-none',
    buttonSecondary: 'px-4 py-2 bg-gray-800 hover:bg-gray-700 text-emerald-300 font-medium rounded-lg border border-emerald-400/50 hover:border-emerald-400/70 transition-all',
    error: 'text-sm text-red-400 mt-1',
    helper: 'text-sm text-emerald-400/60 mt-1',
  },
};

// Helper to apply theme to an element
export function applyMatrixTheme(element: HTMLElement | null) {
  if (!element) return;

  Object.entries(matrixTheme.copilotKit).forEach(([key, value]) => {
    element.style.setProperty(key, value as string);
  });
}

// Helper to get inline styles for CopilotKit
export function getCopilotKitTheme(): React.CSSProperties {
  return matrixTheme.copilotKit;
}
