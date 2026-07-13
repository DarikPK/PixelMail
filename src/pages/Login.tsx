import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Container,
  Alert,
  CircularProgress
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { login, user, loading } = useAuth();
  const navigate = useNavigate();

  // Redirigir si el usuario ya está autenticado o acaba de autenticarse
  useEffect(() => {
    if (!loading && user) {
      navigate('/redactar', { replace: true });
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoggingIn) return;

    setError('');
    setIsLoggingIn(true);
    try {
      await login(email, password);
      // La redirección se maneja en el useEffect
    } catch (err: any) {
      console.error(err);
      setError('Error al iniciar sesión. Verifica tus credenciales.');
      setIsLoggingIn(false);
    }
  };

  const showLoading = loading || isLoggingIn;

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%', borderRadius: 2 }}>
          <Typography component="h1" variant="h5" align="center" gutterBottom sx={{ fontWeight: 'bold' }}>
            PixelMail
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 1 }}>
            Inicia sesión para continuar
          </Typography>
          <Typography variant="caption" align="center" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            versión 5.13
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Correo Electrónico"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={showLoading}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Contraseña"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={showLoading}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2, py: 1.5, position: 'relative' }}
              disabled={showLoading}
            >
              {showLoading ? <CircularProgress size={24} /> : 'Entrar'}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;
