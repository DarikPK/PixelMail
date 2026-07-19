import { useState, useEffect, useRef, useMemo } from 'react';
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
  Tab,
  Divider,
  Menu,
  MenuItem,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useEmails } from '../contexts/EmailContext';
import { useSignatures } from '../contexts/SignatureContext';
import { useToast } from '../contexts/ToastContext';
import Editor from '../components/Editor';
import AttachmentManager from '../components/AttachmentManager';
import type { AttachmentItem } from '../components/AttachmentManager';
import { db } from '../config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Send as SendIcon, SignLanguage as SignatureIcon, Edit as EditIcon, Delete as DeleteIcon, OpenInNew as OpenIcon } from '@mui/icons-material';
import type { Signature } from '../contexts/SignatureContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { applyScaleToHTML } from '../utils/signatureScaler';
import { usePwaUpdate } from '../contexts/PwaUpdateContext';

// Helpers para manipulación de firma en HTML
const removeSignatureFromHTML = (html: string): string => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const sigDiv = doc.querySelector('[data-pixel-signature="true"]');
  if (sigDiv) {
    sigDiv.remove();
  }
  return doc.body.innerHTML;
};

const setOrReplaceSignatureInHTML = (html: string, signatureId: string, signatureHtml: string): string => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const sigDiv = doc.querySelector('[data-pixel-signature="true"]');

  const newSigHTML = `<div data-pixel-signature="true" data-signature-id="${signatureId}" contenteditable="false" style="user-select: none; border: 1px dashed rgba(16, 185, 129, 0.3); padding: 8px; margin: 10px 0; border-radius: 4px; pointer-events: none;">${signatureHtml}</div>`;

  if (sigDiv) {
    sigDiv.outerHTML = newSigHTML;
  } else {
    // Buscar si hay quote/blockquote para colocarla ANTES del blockquote
    const quote = doc.querySelector('blockquote');
    if (quote) {
      const wrapper = doc.createElement('div');
      wrapper.innerHTML = newSigHTML;
      quote.parentNode?.insertBefore(wrapper, quote);
    } else {
      // Si no, colocar al final
      doc.body.innerHTML = doc.body.innerHTML + '<br><br>' + newSigHTML;
    }
  }

  return doc.body.innerHTML;
};

const logHTMLStructure = (html: string, phase: string) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const tables = doc.querySelectorAll('table');
  const tds = doc.querySelectorAll('td');

  console.log(`[HTML DIAGNOSTIC - ${phase}]`);
  console.log("Ancho de la tabla principal:", tables[0]?.getAttribute('width') || 'Sin width');
  console.log("Cantidad de tablas:", tables.length);
  console.log("Cantidad de td:", tds.length);

  tds.forEach((td, idx) => {
    console.log(`td #${idx + 1}: width attribute = "${td.getAttribute('width')}", style = "${td.getAttribute('style')}"`);
  });

  console.log(`Peso del HTML (${phase}):`, new Blob([html]).size, "bytes");
};

const cleanHTMLOfEmptyBRs = (html: string): string => {
  if (!html) return html;
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Encontrar y remover <br> que estén directamente dentro de table, tbody, tr
  const tableParents = doc.querySelectorAll('table, tbody, tr');
  tableParents.forEach((parent) => {
    const children = Array.from(parent.childNodes);
    children.forEach((child) => {
      if (child.nodeName.toLowerCase() === 'br') {
        child.remove();
      }
    });
  });

  return doc.body.innerHTML;
};

const Redactar = () => {
  const { user } = useAuth();
  const { emails } = useEmails();
  const { signatures, activeSignature, activeSignatureId, activateSignature, preferences } = useSignatures();
  const { showToast } = useToast();
  const { setSafetyState } = usePwaUpdate();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Registrar estado de redacción (isComposing) en el contexto de PWA Update
  useEffect(() => {
    setSafetyState({ isComposing: true });
    return () => {
      setSafetyState({ isComposing: false, isUploading: false, isSending: false, isSavingDraft: false });
    };
  }, []);

  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [addSignature, setAddSignature] = useState(true);
  const [insertedSignatureId, setInsertedSignatureId] = useState<string | null>(null);
  const [signatureMenuAnchor, setSignatureMenuAnchor] = useState<null | HTMLElement>(null);

  const [tabValue, setTabValue] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [sending, setSending] = useState(false);
  const [pendingAssetsDialogOpen, setPendingAssetsDialogOpen] = useState(false);

  // Sincronizar el estado de envío con el contexto de PWA Update
  useEffect(() => {
    setSafetyState({ isSending: sending });
  }, [sending]);

  // Nombre de la firma insertada actualmente
  const insertedSignatureName = useMemo(() => {
    if (!insertedSignatureId) return 'Ninguna';
    const sig = signatures.find(s => s.id === insertedSignatureId);
    return sig ? sig.name : 'Personalizada';
  }, [signatures, insertedSignatureId]);

  const handleToChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTo(event.target.value);
  };

  const handleCcChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCc(event.target.value);
  };

  const handleBccChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setBcc(event.target.value);
  };

  const handleUnlockInput = (event: React.FocusEvent<HTMLInputElement>) => {
    event.currentTarget.removeAttribute("readonly");
  };

  // Cargar correo referenciado para responder/reenviar o cargar firma activa por defecto
  useEffect(() => {
    const loadDraftOrReference = async () => {
      if (!user) return;

      const replyId = searchParams.get('replyTo');
      const forwardId = searchParams.get('forward');

      let initialBody = '<p></p>';
      let initialTo = '';
      let initialSubject = '';

      if (replyId && emails.length > 0) {
        const source = emails.find(e => e.id === replyId);
        if (source) {
          initialTo = source.fromEmail || source.from || '';
          initialSubject = source.subject.startsWith('Re:') ? source.subject : `Re: ${source.subject}`;
          const formattedDate = source.receivedAt ? new Date(source.receivedAt).toLocaleString('es-PE') : '';

          initialBody = `
            <p></p>
            <br>
            <blockquote style="border-left: 2px solid #CBD5E1; padding-left: 12px; margin-left: 0; color: #64748B;">
              <strong>El ${formattedDate}, ${source.fromName || source.fromEmail || source.from} escribió:</strong><br>
              ${source.html || source.text}
            </blockquote>
          `;

          setTo(initialTo);
          setSubject(initialSubject);

          const shouldInsert = preferences.includeInReplies;
          setAddSignature(shouldInsert);

          if (shouldInsert && activeSignature) {
            const scaledHtml = applyScaleToHTML(activeSignature.html, activeSignature.scale || 0.8);
            initialBody = setOrReplaceSignatureInHTML(initialBody, activeSignature.id, scaledHtml);
            setInsertedSignatureId(activeSignature.id);
          }
          setMessage(initialBody);
          return;
        }
      }

      if (forwardId && emails.length > 0) {
        const source = emails.find(e => e.id === forwardId);
        if (source) {
          initialSubject = source.subject.startsWith('Fwd:') ? source.subject : `Fwd: ${source.subject}`;
          const formattedDate = source.receivedAt ? new Date(source.receivedAt).toLocaleString('es-PE') : '';

          initialBody = `
            <p></p>
            <br>
            <blockquote style="border-left: 2px solid #CBD5E1; padding-left: 12px; margin-left: 0; color: #64748B;">
              <strong>---------- Mensaje reenviado ----------</strong><br>
              <strong>De:</strong> ${source.fromName || source.fromEmail || source.from}<br>
              <strong>Fecha:</strong> ${formattedDate}<br>
              <strong>Asunto:</strong> ${source.subject}<br><br>
              ${source.html || source.text}
            </blockquote>
          `;

          setSubject(initialSubject);

          const shouldInsert = preferences.includeInForwards;
          setAddSignature(shouldInsert);

          if (shouldInsert && activeSignature) {
            const scaledHtml = applyScaleToHTML(activeSignature.html, activeSignature.scale || 0.8);
            initialBody = setOrReplaceSignatureInHTML(initialBody, activeSignature.id, scaledHtml);
            setInsertedSignatureId(activeSignature.id);
          }
          setMessage(initialBody);
          return;
        }
      }

      // Redacción nueva estándar
      const shouldInsert = preferences.includeInNewEmails;
      setAddSignature(shouldInsert);

      if (shouldInsert && activeSignature) {
        const scaledHtml = applyScaleToHTML(activeSignature.html, activeSignature.scale || 0.8);
        initialBody = setOrReplaceSignatureInHTML(initialBody, activeSignature.id, scaledHtml);
        setInsertedSignatureId(activeSignature.id);
      }
      setMessage(initialBody);
    };

    loadDraftOrReference();
  }, [user, emails, activeSignatureId, activeSignature]);

  // Manejar el toggle manual de firma
  const handleToggleSignature = (checked: boolean) => {
    setAddSignature(checked);
    if (checked) {
      if (activeSignature) {
        const scaledHtml = applyScaleToHTML(activeSignature.html, activeSignature.scale || 0.8);
        const nextBody = setOrReplaceSignatureInHTML(message, activeSignature.id, scaledHtml);
        setMessage(nextBody);
        setInsertedSignatureId(activeSignature.id);
        showToast({ message: 'Firma insertada en el correo', severity: 'success' });
      } else {
        showToast({ message: 'No se pudo cargar la firma activa', subtitle: 'Selecciona una firma activa en Configuración.', severity: 'error' });
      }
    } else {
      const nextBody = removeSignatureFromHTML(message);
      setMessage(nextBody);
      setInsertedSignatureId(null);
      showToast({ message: 'Firma retirada del correo', severity: 'success' });
    }
  };

  // Cambiar firma específica desde el selector rápido en el redactor
  const handleSelectSignature = (sig: Signature) => {
    setSignatureMenuAnchor(null);
    setAddSignature(true);
    const scaledHtml = applyScaleToHTML(sig.html, sig.scale || 0.8);
    const nextBody = setOrReplaceSignatureInHTML(message, sig.id, scaledHtml);
    setMessage(nextBody);
    setInsertedSignatureId(sig.id);
    showToast({ message: 'Firma reemplazada en este correo', subtitle: `Se insertó “${sig.name}”.`, severity: 'success' });
  };

  // Definir firma seleccionada como "Usar siempre esta firma" (Firma activa)
  const handleSetAlwaysUse = async () => {
    setSignatureMenuAnchor(null);
    if (!insertedSignatureId) return;
    try {
      await activateSignature(insertedSignatureId);
      showToast({
        message: 'Firma activa actualizada',
        subtitle: `“${insertedSignatureName}” ya está configurada como predeterminada.`,
        severity: 'success'
      });
    } catch (err: any) {
      showToast({ message: 'Error al actualizar firma predeterminada', subtitle: err.message, severity: 'error' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || sending) return;

    if (!isOnline) {
      setError('No puedes enviar correos mientras estás sin conexión a internet. Tu borrador se mantendrá a salvo aquí.');
      return;
    }

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

    // Registrar el estado del HTML antes de reemplazar imágenes
    logHTMLStructure(message, "ANTES de reemplazar imágenes");

    // Antes de insertar/enviar, verificar recursos de la firma actual
    if (insertedSignatureId) {
      const currentSig = signatures.find(s => s.id === insertedSignatureId);
      if (currentSig && currentSig.html.includes('assets/')) {
        setPendingAssetsDialogOpen(true);
        return;
      }
    }

    sendEmailProceed();
  };

  const sendEmailProceed = async () => {
    if (!user) return;

    // Obtener la firma seleccionada o la activa
    const selectedSignature = signatures.find(s => s.id === insertedSignatureId) || activeSignature;

    let bodyHtml = message;
    let signatureHtml = '';

    // Extraer el texto libre (bodyHtml) removiendo el contenedor de la firma del editor si existe
    bodyHtml = removeSignatureFromHTML(bodyHtml);

    if (addSignature) {
      if (!selectedSignature) {
        setError("No se pudo cargar la firma seleccionada. Recarga la página o vuelve a guardar la firma.");
        return;
      }
      signatureHtml = applyScaleToHTML(selectedSignature.html, selectedSignature.scale || 0.8);

      if (!signatureHtml.trim()) {
        setError("No se pudo cargar la firma seleccionada. Recarga la página o vuelve a guardar la firma.");
        return;
      }
    }

    let finalHtml = addSignature ? `${bodyHtml}<br><br>${signatureHtml}` : bodyHtml;
    finalHtml = cleanHTMLOfEmptyBRs(finalHtml);

    // Registrar el estado del HTML después de reemplazar imágenes
    logHTMLStructure(finalHtml, "DESPUÉS de reemplazar imágenes");

    // LOGS OBLIGATORIOS REQUERIDOS
    console.log("SIGNATURE SELECTED", selectedSignature);
    console.log("SIGNATURE HTML LENGTH", signatureHtml?.length ?? 0);
    console.log("BODY HTML LENGTH", bodyHtml?.length ?? 0);
    console.log("FINAL HTML LENGTH", finalHtml?.length ?? 0);

    setSending(true);
    setError('');
    setPendingAssetsDialogOpen(false);

    try {
      const idToken = await user.getIdToken();

      const functionUrl = import.meta.env.VITE_SEND_EMAIL_URL;
      if (!functionUrl) {
        throw new Error("VITE_SEND_EMAIL_URL no configurada");
      }

      const bodyTextFinal = finalHtml
        ?.replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/g, " ");

      console.log("[PIXEL MAIL] Enviando correo", {
        to,
        subject,
        textLength: bodyTextFinal?.length || 0,
        htmlLength: finalHtml?.length || 0,
        attachmentCount: attachments.length
      });

      const formData = new FormData();
      formData.append('to', to);
      formData.append('subject', subject);
      if (cc?.trim()) formData.append('cc', cc);
      if (bcc?.trim()) formData.append('bcc', bcc);
      formData.append('html', finalHtml); // Usar finalHtml para Resend
      formData.append('text', bodyTextFinal || '');

      attachments.forEach((item) => {
        if (item.file) {
          formData.append('attachments', item.file, item.name);
        }
      });

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

      // Guardar en Firestore usando finalHtml
      await addDoc(collection(db, 'emails'), {
        userId: user.uid,
        from: user.email,
        to,
        cc: cc || null,
        bcc: bcc || null,
        subject,
        body: finalHtml,
        signatureApplied: addSignature,
        status: 'sent',
        attachments: attachments.map(f => ({ name: f.name, size: f.size })),
        createdAt: serverTimestamp()
      });
      console.log('[FIRESTORE] email saved');

      setSuccess(true);
      setTo('');
      setCc('');
      setBcc('');
      setSubject('');
      setMessage('');
      setInsertedSignatureId(null);
      setAddSignature(false);

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
    <Box sx={{ maxWidth: 900, mx: 'auto', animation: 'fadeIn 200ms ease-in-out' }}>
      {/* DIÁLOGO ADVERTENCIA RECURSOS LOCALES/PENDIENTES */}
      <Dialog open={pendingAssetsDialogOpen} onClose={() => setPendingAssetsDialogOpen(false)}>
        <DialogTitle sx={{ fontWeight: 'bold', fontSize: '15px' }}>La firma contiene recursos pendientes</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Esta firma tiene imágenes pendientes con rutas locales (ej. <em>assets/</em>) y podría no visualizarse correctamente para el destinatario. ¿Qué deseas hacer?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ flexDirection: 'column', gap: 1, p: 2 }}>
          <Button
            fullWidth
            variant="contained"
            color="primary"
            onClick={() => {
              setPendingAssetsDialogOpen(false);
              navigate('/configuracion');
            }}
            sx={{ textTransform: 'none', fontSize: '12px', fontWeight: 'bold' }}
          >
            Resolver recursos (Subir imágenes públicas)
          </Button>
          <Button
            fullWidth
            variant="outlined"
            onClick={sendEmailProceed}
            sx={{ textTransform: 'none', fontSize: '12px' }}
          >
            Insertar de todas formas (Enviar correo)
          </Button>
          <Button
            fullWidth
            onClick={() => setPendingAssetsDialogOpen(false)}
            sx={{ textTransform: 'none', fontSize: '12px', color: 'text.secondary' }}
          >
            Cancelar
          </Button>
        </DialogActions>
      </Dialog>

      <Typography variant="h3" sx={{ fontWeight: 800, color: '#FFFFFF', letterSpacing: '-1px', mb: 3 }}>
        Redactar Correo
      </Typography>

      <Paper component="form" onSubmit={handleSubmit} autoComplete="off" sx={{ p: 4, borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', bgcolor: '#131722' }}>

        {error && <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>{error}</Alert>}

        <TextField
          fullWidth
          label="De"
          value={user?.email || "Cargando..."}
          disabled
          margin="normal"
          variant="filled"
          slotProps={{
            input: {
              sx: { borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.02)' }
            }
          }}
        />

        <TextField
          fullWidth
          label="Para"
          placeholder="ejemplo@correo.com"
          value={to}
          onChange={handleToChange}
          margin="normal"
          required
          disabled={sending}
          name="pixel_recipient_primary"
          id="pixel-recipient-primary"
          type="text"
          autoComplete="new-password"
          slotProps={{
            htmlInput: {
              autoComplete: "new-password",
              "data-lpignore": "true",
              "data-1p-ignore": "true",
              "data-form-type": "other",
              "aria-autocomplete": "none",
              inputMode: "email",
              readOnly: true,
              onFocus: handleUnlockInput
            },
            input: {
              sx: { borderRadius: '12px' }
            }
          }}
        />

        <Box sx={{ display: 'flex', gap: 2, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
          <TextField
            fullWidth
            label="CC"
            placeholder="copia@correo.com"
            value={cc}
            onChange={handleCcChange}
            margin="normal"
            disabled={sending}
            name="pixel_recipient_copy"
            id="pixel-recipient-copy"
            type="text"
            autoComplete="new-password"
            slotProps={{
              htmlInput: {
                autoComplete: "new-password",
                "data-lpignore": "true",
                "data-1p-ignore": "true",
                "data-form-type": "other",
                "aria-autocomplete": "none",
                inputMode: "email",
                readOnly: true,
                onFocus: handleUnlockInput
              },
              input: {
                sx: { borderRadius: '12px' }
              }
            }}
          />
          <TextField
            fullWidth
            label="CCO"
            placeholder="copia-oculta@correo.com"
            value={bcc}
            onChange={handleBccChange}
            margin="normal"
            disabled={sending}
            name="pixel_recipient_hidden"
            id="pixel-recipient-hidden"
            type="text"
            autoComplete="new-password"
            slotProps={{
              htmlInput: {
                autoComplete: "new-password",
                "data-lpignore": "true",
                "data-1p-ignore": "true",
                "data-form-type": "other",
                "aria-autocomplete": "none",
                inputMode: "email",
                readOnly: true,
                onFocus: handleUnlockInput
              },
              input: {
                sx: { borderRadius: '12px' }
              }
            }}
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
          slotProps={{
            input: {
              sx: { borderRadius: '12px' }
            }
          }}
        />

        <Box sx={{ borderBottom: 1, borderColor: 'rgba(255,255,255,0.08)', mb: 2, mt: 2 }}>
          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
            <Tab label="Redactar" sx={{ color: '#B8C1D1', '&.Mui-selected': { color: '#3B82F6' } }} />
            <Tab label="Vista Previa" sx={{ color: '#B8C1D1', '&.Mui-selected': { color: '#3B82F6' } }} />
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
              p: 3,
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              minHeight: 300,
              bgcolor: 'rgba(255,255,255,0.01)',
              mt: 2,
              mb: 1,
              color: '#FFFFFF'
            }}
            dangerouslySetInnerHTML={{ __html: message }}
          />
        )}

        {/* DETECTAR Y CONTROLAR FIRMA BLOQUEADA EN LA INTERFAZ */}
        {addSignature && insertedSignatureId && (
          <Card variant="outlined" sx={{ mt: 2, mb: 1, borderColor: '#10B981', bgcolor: 'rgba(16, 185, 129, 0.04)' }}>
            <CardContent sx={{ py: '12px !important', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#10B981', fontSize: '12.5px' }}>
                  Firma: {insertedSignatureName} [Bloqueada contra edición accidental]
                </Typography>
                <Typography variant="caption" sx={{ color: '#B8C1D1', fontSize: '11px' }}>
                  La firma se ha insertado al final del mensaje y se enviará en formato HTML completo.
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={(e) => setSignatureMenuAnchor(e.currentTarget)}
                  startIcon={<SignatureIcon />}
                  sx={{ textTransform: 'none', fontSize: '11px', color: '#10B981', borderColor: '#10B981', '&:hover': { borderColor: '#059669' } }}
                >
                  Cambiar firma
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => navigate('/configuracion')}
                  startIcon={<EditIcon />}
                  sx={{ textTransform: 'none', fontSize: '11px', color: '#3B82F6', borderColor: '#3B82F6', '&:hover': { borderColor: '#2563EB' } }}
                >
                  Editar en Configuración
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  onClick={() => handleToggleSignature(false)}
                  startIcon={<DeleteIcon />}
                  sx={{ textTransform: 'none', fontSize: '11px' }}
                >
                  Quitar de este correo
                </Button>
              </Box>
            </CardContent>
          </Card>
        )}

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', my: 3 }} />

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={addSignature}
                  onChange={(e) => handleToggleSignature(e.target.checked)}
                  color="primary"
                  disabled={sending}
                />
              }
              label="Agregar firma"
              sx={{ color: '#B8C1D1' }}
            />

            {addSignature && (
              <>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={(e) => setSignatureMenuAnchor(e.currentTarget)}
                  sx={{ textTransform: 'none', color: '#B8C1D1', borderColor: 'rgba(255,255,255,0.15)' }}
                >
                  Firma: {insertedSignatureName}
                </Button>

                <Menu
                  anchorEl={signatureMenuAnchor}
                  open={Boolean(signatureMenuAnchor)}
                  onClose={() => setSignatureMenuAnchor(null)}
                >
                  <Typography variant="caption" sx={{ display: 'block', px: 2, py: 0.5, fontWeight: 'bold', color: 'text.secondary' }}>
                    Selecciona una firma:
                  </Typography>
                  <Divider />

                  {signatures.map((sig) => {
                    const isInserted = sig.id === insertedSignatureId;
                    return (
                      <MenuItem
                        key={sig.id}
                        selected={isInserted}
                        onClick={() => handleSelectSignature(sig)}
                        sx={{ fontSize: '12.5px', py: 0.8 }}
                      >
                        {isInserted ? '✓ ' : ''} {sig.name} {sig.id === activeSignatureId ? '(Predeterminada)' : ''}
                      </MenuItem>
                    );
                  })}

                  <MenuItem
                    onClick={() => {
                      setSignatureMenuAnchor(null);
                      handleToggleSignature(false);
                    }}
                    sx={{ fontSize: '12.5px', color: 'error.main' }}
                  >
                    Quitar firma (Sin firma)
                  </MenuItem>

                  {insertedSignatureId && insertedSignatureId !== activeSignatureId && (
                    <>
                      <Divider />
                      <MenuItem onClick={handleSetAlwaysUse} sx={{ fontSize: '12.5px', fontWeight: 'bold', color: 'primary.main' }}>
                        Usar siempre esta firma
                      </MenuItem>
                    </>
                  )}

                  <Divider />
                  <MenuItem onClick={() => { setSignatureMenuAnchor(null); navigate('/configuracion?tab=firmas'); }} sx={{ fontSize: '12.5px' }}>
                    <OpenIcon sx={{ fontSize: '14px', mr: 1 }} /> Administrar firmas
                  </MenuItem>
                </Menu>
              </>
            )}
          </Box>

          <Button
            type="submit"
            variant="contained"
            size="large"
            endIcon={sending || !isOnline ? null : <SendIcon />}
            sx={{
              minWidth: 160,
              py: 1.2,
              borderRadius: '12px',
              background: !isOnline ? '#94A3B8' : 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
              boxShadow: !isOnline ? 'none' : '0 4px 12px rgba(59, 130, 246, 0.3)',
              fontWeight: 'bold',
              color: '#FFFFFF',
              '&:hover': {
                background: !isOnline ? '#94A3B8' : 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)',
              }
            }}
            disabled={sending || !isOnline}
          >
            {sending ? <CircularProgress size={24} color="inherit" /> : (!isOnline ? 'Sin conexión' : 'Enviar')}
          </Button>
        </Box>
      </Paper>

      <Snackbar
        open={success}
        autoHideDuration={6000}
        onClose={() => setSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSuccess(false)} severity="success" sx={{ width: '100%', borderRadius: '12px' }}>
          Correo enviado con éxito
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Redactar;
