import { useMemo, type ReactNode } from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { ptBR } from '@mui/material/locale';
import { domAnimation, LazyMotion, MotionConfig } from 'motion/react';
import { useThemeStore } from '../stores/themeStore';
export function MaterialTheme({ children }: { children: ReactNode }) {
  const mode = useThemeStore((s) => s.theme);
  const theme = useMemo(
    () =>
      createTheme(
        {
          palette: {
            mode,
            primary: { main: mode === 'dark' ? '#b5f3ba' : '#286640' },
            background: {
              default: mode === 'dark' ? '#101715' : '#f2f5f0',
              paper: mode === 'dark' ? '#19231e' : '#ffffff',
            },
          },
          typography: {
            fontFamily: 'Inter, system-ui, sans-serif',
            h6: { fontWeight: 650, fontSize: '1.2rem' },
          },
          shape: { borderRadius: 16 },
          components: {
            MuiDialog: {
              styleOverrides: {
                paper: {
                  backgroundImage: 'none',
                  maxHeight: 'calc(var(--modal-viewport-height, 100dvh) - 32px)',
                },
              },
            },
            MuiButtonBase: { styleOverrides: { root: { minHeight: 48 } } },
          },
        },
        ptBR,
      ),
    [mode],
  );
  return (
    <ThemeProvider theme={theme}>
      <LazyMotion features={domAnimation}>
        <MotionConfig reducedMotion="user">{children}</MotionConfig>
      </LazyMotion>
    </ThemeProvider>
  );
}
