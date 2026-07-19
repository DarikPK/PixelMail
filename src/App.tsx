import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { CssBaseline } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import { CustomThemeProvider } from './contexts/ThemeContext';
import { EmailProvider } from './contexts/EmailContext';
import { ToastProvider } from './contexts/ToastContext';
import { SignatureProvider } from './contexts/SignatureContext';
import { PwaUpdateProvider } from './contexts/PwaUpdateContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Redactar from './pages/Redactar';
import Enviados from './pages/Enviados';
import Configuracion from './pages/Configuracion';
import Recibidos from './pages/Recibidos';
import ReloadPrompt from './components/ReloadPrompt';

function App() {
  return (
    <CustomThemeProvider>
      <CssBaseline />
      <ToastProvider>
        <AuthProvider>
          <EmailProvider>
            <SignatureProvider>
              <PwaUpdateProvider>
                <Router>
                  <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/" element={<Layout />}>
                      <Route index element={<Navigate to="/recibidos" replace />} />
                      <Route path="recibidos" element={<ProtectedRoute><Recibidos /></ProtectedRoute>} />
                      <Route path="redactar" element={<ProtectedRoute><Redactar /></ProtectedRoute>} />
                      <Route path="enviados" element={<ProtectedRoute><Enviados /></ProtectedRoute>} />
                      <Route path="configuracion" element={<ProtectedRoute><Configuracion /></ProtectedRoute>} />
                    </Route>
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Router>
                <ReloadPrompt />
              </PwaUpdateProvider>
            </SignatureProvider>
          </EmailProvider>
        </AuthProvider>
      </ToastProvider>
    </CustomThemeProvider>
  );
}

export default App;
