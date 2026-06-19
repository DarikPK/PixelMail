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
  CircularProgress,
  Tabs,
  Tab
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import Editor from '../components/Editor';
import AttachmentManager from '../components/AttachmentManager';
import { db } from '../config/firebase';
import { collection, addDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';

const Redactar = () => {
  const { user } = useAuth();
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<any[]>([]);
  const [addSignature, setAddSignature] = useState(true);
  const [tabValue, setTabValue] = useState(0);
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

    const finalMessage = addSignature ? `${message}<br><br>--<br>${signature}` : message;

    try {
      // 1. Obtener Token
      const idToken = await user.getIdToken();

      const functionUrl = import.meta.env.VITE_SEND_EMAIL_URL;
      if (!functionUrl) {
        throw new Error("VITE_SEND_EMAIL_URL no configurada");
      }

      // 2. Enviar Correo mediante Function
      console.log('[RESEND] sending');
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          to,
          cc: cc || undefined,
          bcc: bcc || undefined,
          subject,
          html: finalMessage
        })
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.log('[RESEND] error');
        throw new Error(responseData.error || 'Error al enviar el correo');
      }

      console.log('[RESEND] success');

      // 3. Solo si Resend tuvo éxito, guardar en Firestore
      await addDoc(collection(db, 'emails'), {
        userId: user.uid,
        from: user.email,
        to,
        cc: cc || null,
        bcc: bcc || null,
        subject,
        body: finalMessage,
        signatureApplied: addSignature,
        status: 'sent',
        attachments: attachments.map(f => ({ name: f.name, size: f.size })),
        createdAt: serverTimestamp()
      });
      console.log('[FIRESTORE] email saved');

      setSuccess(true);
      setTo('');
      setSubject('');
      setMessage('');
    } catch (err: any) {
      console.error("Error en el envío:", err);
      setError(err.message || 'Error al enviar el correo.');
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

        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            fullWidth
            label="CC"
            placeholder="copia@correo.com"
            value={cc}
            onChange={(e) => setCc(e.target.value)}
            margin="normal"
            disabled={sending}
          />
          <TextField
            fullWidth
            label="CCO"
            placeholder="copia-oculta@correo.com"
            value={bcc}
            onChange={(e) => setBcc(e.target.value)}
            margin="normal"
            disabled={sending}
          />
        </Box>

        <TextField
          fullWidth
          label="Asunto"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          margin="normal"
          required
          disabled={sending}
        />

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
            <Tab label="Redactar" />
            <Tab label="Vista Previa" />
          </Tabs>
        </Box>

        {tabValue === 0 ? (
          <>
            <Editor
              content={message}
              onChange={(html) => setMessage(html)}
            />
            <AttachmentManager
              files={attachments}
              onFilesChange={setAttachments}
            />
          </>
        ) : (
          <Box
            sx={{
              p: 2,
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              minHeight: 300,
              bgcolor: '#f9f9f9',
              mt: 2,
              mb: 1
            }}
            dangerouslySetInnerHTML={{ __html: addSignature ? `${message}<br><br>--<br>${signature}` : message }}
          />
        )}

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
