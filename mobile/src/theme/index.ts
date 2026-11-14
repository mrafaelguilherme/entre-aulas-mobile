// Direcao visual "Lousa": cores, espacos e fontes em um so lugar.
// As telas nunca escrevem um codigo de cor direto; elas leem daqui.
export const colors = {
  background: '#f3f1ec',
  surface: '#ffffff',
  text: '#202326',
  textSecondary: '#5a6268',
  primary: '#155d7a',
  dark: '#0d4055',
  border: '#d7d2c8',
  danger: '#a52721',
  success: '#246b3c',
  onDark: '#ffffff',
  disabled: '#e9e6df',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

export const fontSizes = {
  sm: 13,
  md: 15,
  lg: 18,
  xl: 25,
  logo: 29,
} as const;

// Nomes registrados pelo expo-font em App.tsx.
export const fonts = {
  regular: 'AtkinsonHyperlegibleNext_400Regular',
  bold: 'AtkinsonHyperlegibleNext_700Bold',
} as const;

export const radius = 6;

// Altura minima de qualquer alvo de toque (acessibilidade).
export const touchTarget = 48;

// A canaleta de giz, logo abaixo da lousa.
export const chalkTray = 7;
