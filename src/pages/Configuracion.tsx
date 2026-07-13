import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Divider,
  Button,
  CircularProgress
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import Editor from '../components/Editor';
import { db } from '../config/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Save as SaveIcon } from '@mui/icons-material';

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
      const path = `settings/${user.uid}`;
      console.log(`[SIGNATURE] loading path ${path}`);
      try {
        const docRef = doc(db, 'settings', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSignature(docSnap.data().signature);
        } else {
          setSignature(defaultSignature);
        }
        console.log('[SIGNATURE] loaded OK');
      } catch (error: any) {
        if (error.code === 'permission-denied') {
          console.error(`[SIGNATURE] permission error ${path}`);
        } else {
          console.error("Error al obtener la firma:", error);
        }
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
    <Box sx={{ maxWidth: 700, mx: 'auto', animation: 'fadeIn 200ms ease-in-out' }}>
      <Typography variant="h3" sx={{ fontWeight: 800, color: '#FFFFFF', letterSpacing: '-1px', mb: 3 }}>
        Configuración
      </Typography>

      <Paper sx={{ p: 4, borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', bgcolor: '#131722' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#FFFFFF', mb: 1 }}>
          Editor de firma
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Personaliza la firma que se agregará automáticamente al final de todos tus correos redactados.
        </Typography>

        <Divider sx={{ mb: 3, borderColor: 'rgba(255,255,255,0.08)' }} />

        <Editor
          content={signature}
          onChange={(html) => setSignature(html)}
        />

        <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.08)' }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            variant="contained"
            onClick={handleSave}
            size="large"
            startIcon={saving ? null : <SaveIcon />}
            disabled={saving}
            sx={{
              minWidth: 160,
              py: 1.2,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
              fontWeight: 'bold',
              color: '#FFFFFF',
              '&:hover': {
                background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)',
              }
            }}
          >
            {saving ? <CircularProgress size={24} color="inherit" /> : 'Guardar Firma'}
          </Button>
          {saved && (
            <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 'bold' }}>
              ¡Firma guardada correctamente!
            </Typography>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default Configuracion;
