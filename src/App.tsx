import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { CssBaseline } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import { CustomThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Redactar from './pages/Redactar';
import Enviados from './pages/Enviados';
import Configuracion from './pages/Configuracion';
import Recibidos from './pages/Recibidos';

function App() {
  return (
    <CustomThemeProvider>
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
    </CustomThemeProvider>
  );
}

export default App;
