import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Redactar from './pages/Redactar';
import Enviados from './pages/Enviados';
import Configuracion from './pages/Configuracion';
import Recibidos from './pages/Recibidos';
import { useMemo } from 'react';

function App() {
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: 'dark',
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
            default: '#0F1117', // Background principal
            paper: '#1B2130',   // Cards / Papeles
          },
          text: {
            primary: '#FFFFFF',
            secondary: '#B8C1D1',
            disabled: '#6F7A8A',
          },
          divider: 'rgba(255,255,255,0.08)', // Separadores
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
            fontSize: '16px',
          },
          body2: {
            fontSize: '14px',
          }
        },
        components: {
          MuiButton: {
            styleOverrides: {
              root: {
                textTransform: 'none',
                borderRadius: '12px',
                fontWeight: 500,
                transition: 'all 180ms ease-in-out',
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                borderRadius: '16px',
                backgroundImage: 'none',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
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
      }),
    [],
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/recibidos" replace />} />
              <Route path="recibidos" element={<Recibidos />} />
              <Route path="redactar" element={<Redactar />} />
              <Route path="enviados" element={<Enviados />} />
              <Route path="configuracion" element={<Configuracion />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
