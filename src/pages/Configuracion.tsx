import { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Paper,
  Divider,
  Button
} from '@mui/material';

const Configuracion = () => {
  const defaultSignature = 'Saludos,\nDavid Lachira\nPixel';
  const [signature, setSignature] = useState(localStorage.getItem('pixel_mail_signature') || defaultSignature);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem('pixel_mail_signature', signature);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
        Configuración
      </Typography>
      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium' }}>
          Editor de firma
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <TextField
          fullWidth
          multiline
          rows={6}
          variant="outlined"
          value={signature}
          onChange={(e) => setSignature(e.target.value)}
          placeholder="Escribe tu firma aquí..."
          sx={{ mb: 3 }}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            variant="contained"
            onClick={handleSave}
            size="large"
          >
            Guardar Firma
          </Button>
          {saved && (
            <Typography variant="body2" color="success.main">
              ¡Firma guardada correctamente!
            </Typography>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default Configuracion;
