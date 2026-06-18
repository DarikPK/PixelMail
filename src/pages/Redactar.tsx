import { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Paper,
  Button,
  Switch,
  FormControlLabel,
  Alert,
  Snackbar
} from '@mui/material';
import type { Email } from '../types';

const Redactar = () => {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [addSignature, setAddSignature] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!to || !subject || !message) {
      setError('Todos los campos son obligatorios');
      return;
    }

    const signature = localStorage.getItem('pixel_mail_signature') || 'Saludos,\nDavid Lachira\nPixel';
    const finalMessage = addSignature ? `${message}\n\n--\n${signature}` : message;

    const newEmail: Email = {
      id: Date.now().toString(),
      to,
      subject,
      message: finalMessage,
      date: new Date().toLocaleString(),
      status: 'Simulado'
    };

    // Guardar en estado local (simulado con localStorage para persistencia básica en la demo)
    const existingEmails = JSON.parse(localStorage.getItem('pixel_mail_sent') || '[]');
    localStorage.setItem('pixel_mail_sent', JSON.stringify([newEmail, ...existingEmails]));

    setSuccess(true);
    setTo('');
    setSubject('');
    setMessage('');
    setError('');
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
        Redactar Correo
      </Typography>

      <Paper component="form" onSubmit={handleSubmit} sx={{ p: 3, mt: 2 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <TextField
          fullWidth
          label="De"
          value="David Lachira <david.lachira@pixel.com.pe>"
          disabled
          margin="normal"
          variant="filled"
        />

        <TextField
          fullWidth
          label="Para"
          placeholder="ejemplo@correo.com"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          margin="normal"
          required
        />

        <TextField
          fullWidth
          label="Asunto"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          margin="normal"
          required
        />

        <TextField
          fullWidth
          label="Mensaje"
          multiline
          rows={10}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          margin="normal"
          required
        />

        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={addSignature}
                onChange={(e) => setAddSignature(e.target.checked)}
                color="primary"
              />
            }
            label="Agregar firma"
          />

          <Button
            type="submit"
            variant="contained"
            size="large"
            sx={{ minWidth: 150 }}
          >
            Enviar
          </Button>
        </Box>
      </Paper>

      <Snackbar
        open={success}
        autoHideDuration={6000}
        onClose={() => setSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSuccess(false)} severity="success" sx={{ width: '100%' }}>
          Correo enviado con éxito (Simulado)
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Redactar;
