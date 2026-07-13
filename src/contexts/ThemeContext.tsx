import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme as createMuiTheme } from '@mui/material';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const CustomThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('pixelmail_theme');
    if (saved === 'light' || saved === 'dark') return saved;
    const systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return systemPreference ? 'dark' : 'light';
  });

  useEffect(() => {
    localStorage.setItem('pixelmail_theme', mode);
    document.documentElement.setAttribute('data-theme', mode);
    // Aplicar las clases o atributos al body también
    if (mode === 'dark') {
      document.body.classList.add('dark');
      document.body.classList.remove('light');
    } else {
      document.body.classList.add('light');
      document.body.classList.remove('dark');
    }
  }, [mode]);

  const toggleTheme = () => {
    setMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const muiTheme = useMemo(() => {
    const isDark = mode === 'dark';
    return createMuiTheme({
      palette: {
        mode,
        primary: {
          main: '#3B82F6', // Azul principal
        },
        secondary: {
          main: '#EF4444', // Rojo
        },
        success: {
          main: '#22C55E', // Verde
        },
        warning: {
          main: '#FACC15', // Amarillo
        },
        background: {
          default: isDark ? '#0F1117' : '#F4F7FB', // Fondo general
          paper: isDark ? '#1B2130' : '#FFFFFF',   // Superficies/Tarjetas
        },
        text: {
          primary: isDark ? '#FFFFFF' : '#111827',
          secondary: isDark ? '#B8C1D1' : '#64748B',
          disabled: isDark ? '#6F7A8A' : '#94A3B8',
        },
        divider: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15, 23, 42, 0.10)', // Bordes
      },
      typography: {
        fontFamily: '"Inter", "Manrope", "Roboto", sans-serif',
        h4: {
          fontWeight: 700,
        },
        h5: {
          fontWeight: 700,
        },
        subtitle1: {
          fontWeight: 600,
        },
        body1: {
          fontSize: '14px',
        },
        body2: {
          fontSize: '12.5px',
        }
      },
      components: {
        MuiButton: {
          styleOverrides: {
            root: {
              textTransform: 'none',
              borderRadius: '8px',
              fontWeight: 500,
              transition: 'all 180ms ease-in-out',
            },
          },
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              borderRadius: '10px',
              backgroundImage: 'none',
              boxShadow: isDark
                ? '0 4px 6px -1px rgba(0,0,0,0.3), 0 2px 4px -1px rgba(0,0,0,0.2)'
                : '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
              border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(15, 23, 42, 0.10)',
              backgroundColor: isDark ? '#1B2130' : '#FFFFFF',
            },
          },
        },
        MuiTextField: {
          defaultProps: {
            variant: 'outlined',
            fullWidth: true,
          },
        },
      },
    });
  }, [mode]);

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <MuiThemeProvider theme={muiTheme}>
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

export const useCustomTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useCustomTheme must be used within CustomThemeProvider');
  }
  return context;
};
