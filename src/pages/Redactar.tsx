import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Paper,
  Button,
  Switch,
  FormControlLabel,
  Alert,
  Snackbar,
  CircularProgress
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { collection, addDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';

const Redactar = () => {
  const { user } = useAuth();
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [addSignature, setAddSignature] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [sending, setSending] = useState(false);
  const [signature, setSignature] = useState('Saludos,\nDavid Lachira\nPixel');

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
        }
        console.log('[SIGNATURE] loaded OK');
      } catch (error: any) {
        if (error.code === 'permission-denied') {
          console.error(`[SIGNATURE] permission error ${path}`);
        } else {
          console.error("Error fetching signature:", error);
        }
      }
    };
    fetchSignature();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!to || !subject || !message) {
      setError('Todos los campos son obligatorios');
      return;
    }

    setSending(true);
    setError('');

    const finalMessage = addSignature ? `${message}\n\n--\n${signature}` : message;

    try {
      // 1. Obtener Token
      const idToken = await user.getIdToken();
      console.log('[RESEND] token OK');

      // 2. Enviar Correo
      console.log('[RESEND] sending');
      const response = await fetch('https://sendemail-n6id7m67ba-uc.a.run.app', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          to,
          subject,
          body: finalMessage
        })
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Error al enviar el correo');
      }

      console.log('[RESEND] sent OK');

      // 3. Guardar en Firestore
      await addDoc(collection(db, 'emails'), {
        userId: user.uid,
        from: user.email,
        to,
        subject,
        body: finalMessage,
        signatureApplied: addSignature,
        status: 'sent',
        createdAt: serverTimestamp()
      });
      console.log('[FIRESTORE] email saved');

      setSuccess(true);
      setTo('');
      setSubject('');
      setMessage('');
    } catch (err: any) {
      console.error("Error en el proceso de envío:", err);
      console.log('[RESEND] send error');
      setError(err.message || 'Error al enviar el correo.');

      // Guardar el error en Firestore
      try {
        await addDoc(collection(db, 'emails'), {
          userId: user.uid,
          from: user.email,
          to,
          subject,
          body: finalMessage,
          signatureApplied: addSignature,
          status: 'failed',
          createdAt: serverTimestamp(),
          errorMessage: err.message
        });
        console.log('[FIRESTORE] email saved');
      } catch (fsErr) {
        console.error("Error al guardar registro de fallo en Firestore:", fsErr);
      }
    } finally {
      setSending(false);
    }
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
          value={user?.email || "Cargando..."}
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
          disabled={sending}
        />

        <TextField
          fullWidth
          label="Asunto"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          margin="normal"
          required
          disabled={sending}
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
          disabled={sending}
        />

        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={addSignature}
                onChange={(e) => setAddSignature(e.target.checked)}
                color="primary"
                disabled={sending}
              />
            }
            label="Agregar firma"
          />

          <Button
            type="submit"
            variant="contained"
            size="large"
            sx={{ minWidth: 150 }}
            disabled={sending}
          >
            {sending ? <CircularProgress size={24} color="inherit" /> : 'Enviar'}
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
          Correo enviado con éxito
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Redactar;
