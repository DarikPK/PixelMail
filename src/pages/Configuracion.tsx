import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Paper,
  Divider,
  Button,
  CircularProgress
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const Configuracion = () => {
  const { user } = useAuth();
  const defaultSignature = 'Saludos,\nDavid Lachira\nPixel';
  const [signature, setSignature] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetchSignature = async () => {
      if (!user) return;
      try {
        const docRef = doc(db, 'settings', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSignature(docSnap.data().signature);
        } else {
          setSignature(defaultSignature);
        }
        console.log('[FIRESTORE] settings loaded');
      } catch (error) {
        console.error("Error al obtener la firma:", error);
        setSignature(defaultSignature);
      } finally {
        setLoading(false);
      }
    };

    fetchSignature();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setSaved(false);
    try {
      await setDoc(doc(db, 'settings', user.uid), {
        userId: user.uid,
        signature: signature,
        updatedAt: serverTimestamp()
      });
      console.log('[FIRESTORE] signature saved');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error("Error al guardar la firma:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

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
          disabled={saving}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            variant="contained"
            onClick={handleSave}
            size="large"
            disabled={saving}
          >
            {saving ? <CircularProgress size={24} color="inherit" /> : 'Guardar Firma'}
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
