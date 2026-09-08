export const theme = {
  colors: {
    background: '#f5f7fb',
    surface: '#ffffff',
    text: '#17243b',
    muted: '#596780',
    primary: '#315de0',
    border: '#dce3ef',
  },
  spacing: { sm: 8, md: 16, lg: 24, xl: 40 },
} as const;

export type AppTheme = typeof theme;
