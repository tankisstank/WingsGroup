// Keep these in sync with the CSS variables in your tailwind configuration

export const cssVariables = {
  breakpoints: {
    '3xl': 1920,
    '2xl': 1536,
    xl: 1280,
    lg: 1024,
    md: 768,
    sm: 640,
  },
  theme: {
    colors: {
      accent: 'var(--site-accent)',
      brand: 'var(--site-brand)',
      brandContrast: 'var(--site-brand-contrast)',
      surface: 'var(--site-surface)',
    },
    radius: {
      section: 'var(--site-radius)',
    },
    spacing: {
      section: 'var(--section-space)',
      sectionSmall: 'var(--section-space-sm)',
    },
  },
}
