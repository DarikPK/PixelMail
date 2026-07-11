import { useState, useEffect, useRef } from 'react';
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
import type { AttachmentItem } from '../components/AttachmentManager';
import { db } from '../config/firebase';
import { collection, addDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';

const Redactar = () => {
  const { user } = useAuth();
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    if (!user || sending) return;

    const html = message;
    const bodyText = html
      ?.replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ");

    const hasText = Boolean(bodyText?.trim());
    const hasHtmlContent = Boolean(
      html
        ?.replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/g, " ")
        .trim()
    );
    const hasAttachments = attachments.length > 0;
    const hasInlineImage = /<img[\s\S]*?>/i.test(html || "");

    const hasContent = hasText || hasHtmlContent || hasInlineImage || hasAttachments;

    const missingFields: string[] = [];
    if (!to?.trim()) missingFields.push("destinatario");
    if (!subject?.trim()) missingFields.push("asunto");
    if (!hasContent) missingFields.push("contenido o archivo adjunto");

    if (missingFields.length > 0) {
      setError(`Falta completar: ${missingFields.join(", ")}`);
      return;
    }

    if (html.includes('blob:')) {
      setError('No se pueden enviar imágenes locales ("blob:"). Por favor, sube la imagen o espera a que termine de cargarse.');
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

      // 2. Diagnóstico en consola (Punto 7)
      const bodyTextFinal = finalMessage
        ?.replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/g, " ");

      console.log("[PIXEL MAIL] Enviando correo", {
        to,
        subject,
        textLength: bodyTextFinal?.length || 0,
        htmlLength: finalMessage?.length || 0,
        attachmentCount: attachments.length,
        attachments: attachments.map((item) => ({
          name: item.file?.name || item.name,
          type: item.file?.type || item.type,
          size: item.file?.size || item.size,
          isRealFile: item.file instanceof File,
        })),
      });

      // 3. Crear FormData
      const formData = new FormData();
      formData.append('to', to);
      formData.append('subject', subject);
      if (cc?.trim()) formData.append('cc', cc);
      if (bcc?.trim()) formData.append('bcc', bcc);
      formData.append('html', finalMessage);
      formData.append('text', bodyTextFinal || '');

      attachments.forEach((item) => {
        if (item.file) {
          formData.append('attachments', item.file, item.name);
        }
      });

      // 4. Enviar Correo mediante Function
      console.log('[RESEND] sending');
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`
        },
        body: formData
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.log('[RESEND] error');
        throw new Error(responseData.error || 'Error al enviar el correo');
      }

      console.log('[RESEND] success');

      // 5. Solo si Resend tuvo éxito, guardar en Firestore
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

      // 6. Limpieza completa
      setSuccess(true);
      setTo('');
      setCc('');
      setBcc('');
      setSubject('');
      setMessage('');

      // Revocar las URLs de vista previa de los adjuntos antes de vaciarlos
      attachments.forEach((item) => {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
      setAttachments([]);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
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
          name="to"
          id="email-to"
          autoComplete="email"
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
            name="cc"
            id="email-cc"
            autoComplete="off"
          />
          <TextField
            fullWidth
            label="CCO"
            placeholder="copia-oculta@correo.com"
            value={bcc}
            onChange={(e) => setBcc(e.target.value)}
            margin="normal"
            disabled={sending}
            name="bcc"
            id="email-bcc"
            autoComplete="off"
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
              fileInputRef={fileInputRef}
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
