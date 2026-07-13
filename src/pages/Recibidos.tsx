import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tabs,
  Tab,
  Tooltip,
  Divider
} from '@mui/material';
import {
  Star,
  StarBorder,
  Archive,
  Delete,
  Mail,
  Drafts,
  Attachment as AttachIcon
} from '@mui/icons-material';
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';

interface EmailData {
  id: string;
  resendEmailId: string;
  from: string;
  fromName: string;
  fromEmail: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  text: string;
  html: string;
  attachments: any[];
  receivedAt: any;
  direction: string;
  status: string;
  read: boolean;
  starred: boolean;
  archived: boolean;
  deleted: boolean;
}

const Recibidos = () => {
  const { user, loading: authLoading } = useAuth();
  const [emails, setEmails] = useState<EmailData[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0); // 0: Recibidos, 1: Destacados, 2: Archivados, 3: Eliminados
  const [selectedEmail, setSelectedEmail] = useState<EmailData | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    // 2. Esperar a que Firebase Authentication termine de cargar
    if (authLoading) {
      console.log("[PIXEL MAIL INBOX] Esperando a que cargue la autenticación...");
      return;
    }

    if (!user) {
      console.log("[PIXEL MAIL INBOX] No hay usuario autenticado.");
      return;
    }

    // 4. Configurar la consulta con filtros dinámicos compatibles
    let q;
    const emailsRef = collection(db, 'emails');

    if (tabValue === 0) {
      // Recibidos: no archivados, no eliminados
      q = query(
        emailsRef,
        where('userId', '==', user.uid),
        where('direction', '==', 'inbound'),
        where('deleted', '==', false),
        where('archived', '==', false),
        orderBy('receivedAt', 'desc')
      );
    } else if (tabValue === 1) {
      // Destacados: starred, no eliminados
      q = query(
        emailsRef,
        where('userId', '==', user.uid),
        where('direction', '==', 'inbound'),
        where('deleted', '==', false),
        where('starred', '==', true),
        orderBy('receivedAt', 'desc')
      );
    } else if (tabValue === 2) {
      // Archivados: archived, no eliminados
      q = query(
        emailsRef,
        where('userId', '==', user.uid),
        where('direction', '==', 'inbound'),
        where('deleted', '==', false),
        where('archived', '==', true),
        orderBy('receivedAt', 'desc')
      );
    } else {
      // Eliminados: deleted
      q = query(
        emailsRef,
        where('userId', '==', user.uid),
        where('direction', '==', 'inbound'),
        where('deleted', '==', true),
        orderBy('receivedAt', 'desc')
      );
    }

    console.log("[PIXEL MAIL INBOX] Iniciando suscripción con parámetros:", {
      uid: user.uid,
      authLoading,
      collectionName: "emails",
      tabValue,
      filters: {
        userId: user.uid,
        direction: "inbound",
        deleted: tabValue === 3 ? true : false,
        archived: tabValue === 2 ? true : (tabValue === 0 ? false : undefined),
        starred: tabValue === 1 ? true : undefined
      }
    });

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const emailsData: EmailData[] = [];
      console.log(`[PIXEL MAIL INBOX] Documentos recibidos del servidor: ${querySnapshot.size}`);

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`[PIXEL MAIL INBOX] Doc ID: ${doc.id}, userId de documento: ${data.userId}`);

        emailsData.push({
          id: doc.id,
          resendEmailId: data.resendEmailId || doc.id,
          from: data.from || '',
          fromName: data.fromName || '',
          fromEmail: data.fromEmail || '',
          to: data.to || [],
          cc: data.cc || [],
          bcc: data.bcc || [],
          subject: data.subject || '',
          text: data.text || '',
          html: data.html || '',
          attachments: data.attachments || [],
          receivedAt: data.receivedAt?.toDate() || new Date(),
          direction: data.direction || 'inbound',
          status: data.status || 'received',
          read: data.read ?? false,
          starred: data.starred ?? false,
          archived: data.archived ?? false,
          deleted: data.deleted ?? false,
        });
      });

      setEmails(emailsData);
      setLoading(false);
      console.log('[PIXEL MAIL INBOX] emails loaded successfully');
    }, (error) => {
      console.error("[PIXEL MAIL INBOX] Errores completos de Firestore:", {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, authLoading, tabValue]);

  const handleToggleStar = async (e: React.MouseEvent, email: EmailData) => {
    e.stopPropagation();
    try {
      await updateDoc(doc(db, 'emails', email.id), {
        starred: !email.starred
      });
    } catch (error) {
      console.error("[PIXEL MAIL INBOX] Error toggling starred:", error);
    }
  };

  const handleToggleRead = async (e: React.MouseEvent, email: EmailData) => {
    e.stopPropagation();
    try {
      await updateDoc(doc(db, 'emails', email.id), {
        read: !email.read
      });
    } catch (error) {
      console.error("[PIXEL MAIL INBOX] Error toggling read:", error);
    }
  };

  const handleToggleArchive = async (e: React.MouseEvent, email: EmailData) => {
    e.stopPropagation();
    try {
      await updateDoc(doc(db, 'emails', email.id), {
        archived: !email.archived
      });
    } catch (error) {
      console.error("[PIXEL MAIL INBOX] Error toggling archived:", error);
    }
  };

  const handleToggleDelete = async (e: React.MouseEvent, email: EmailData) => {
    e.stopPropagation();
    try {
      await updateDoc(doc(db, 'emails', email.id), {
        deleted: !email.deleted
      });
    } catch (error) {
      console.error("[PIXEL MAIL INBOX] Error toggling deleted:", error);
    }
  };

  const handleOpenEmail = async (email: EmailData) => {
    setSelectedEmail(email);
    setDialogOpen(true);
    if (!email.read) {
      try {
        await updateDoc(doc(db, 'emails', email.id), {
          read: true
        });
      } catch (error) {
        console.error("[PIXEL MAIL INBOX] Error marking as read:", error);
      }
    }
  };

  const handleDownloadAttachment = async (filename: string) => {
    if (!selectedEmail || !user) return;
    try {
      const idToken = await user.getIdToken();
      const getAttachmentUrl = `${import.meta.env.VITE_SEND_EMAIL_URL.replace('/sendEmail', '/getAttachment')}?emailId=${selectedEmail.resendEmailId}&filename=${encodeURIComponent(filename)}`;

      const response = await fetch(getAttachmentUrl, {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (!response.ok) {
        throw new Error("Error al descargar el adjunto");
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error: any) {
      alert("No se pudo obtener el adjunto desde Resend: " + error.message);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (authLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
        Bandeja de Entrada
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 2 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="Recibidos" />
          <Tab label="Destacados" />
          <Tab label="Archivados" />
          <Tab label="Eliminados" />
        </Tabs>
      </Box>

      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table sx={{ minWidth: 650 }} aria-label="tabla de correos recibidos">
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell sx={{ width: 80 }}></TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: 220 }}>Remitente</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Asunto</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: 100 }}>Adjuntos</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: 180 }}>Fecha</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: 120 }}>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            ) : emails.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                  <Typography variant="body1" color="text.secondary">
                    No hay correos en esta sección.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              emails.map((email) => {
                const isUnread = !email.read;
                return (
                  <TableRow
                    key={email.id}
                    hover
                    onClick={() => handleOpenEmail(email)}
                    sx={{
                      cursor: 'pointer',
                      bgcolor: isUnread ? 'action.selected' : 'inherit',
                      fontWeight: isUnread ? 'bold' : 'normal'
                    }}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <IconButton size="small" onClick={(e) => handleToggleStar(e, email)}>
                        {email.starred ? <Star color="warning" /> : <StarBorder />}
                      </IconButton>
                      <IconButton size="small" onClick={(e) => handleToggleRead(e, email)}>
                        {email.read ? <Drafts color="action" /> : <Mail color="primary" />}
                      </IconButton>
                    </TableCell>
                    <TableCell sx={{ fontWeight: isUnread ? 'bold' : 'normal' }}>
                      {email.fromName || email.fromEmail || email.from}
                    </TableCell>
                    <TableCell sx={{ fontWeight: isUnread ? 'bold' : 'normal' }}>
                      {email.subject}
                    </TableCell>
                    <TableCell align="center">
                      {email.attachments.length > 0 && <AttachIcon fontSize="small" color="action" />}
                    </TableCell>
                    <TableCell>{email.receivedAt.toLocaleString()}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Tooltip title={email.archived ? "Mover a Recibidos" : "Archivar"}>
                        <IconButton size="small" onClick={(e) => handleToggleArchive(e, email)}>
                          <Archive color={email.archived ? 'primary' : 'action'} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={email.deleted ? "Restaurar" : "Eliminar"}>
                        <IconButton size="small" onClick={(e) => handleToggleDelete(e, email)}>
                          <Delete color={email.deleted ? 'error' : 'action'} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Diálogo para visualizar el correo */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedEmail && (
          <>
            <DialogTitle sx={{ fontWeight: 'bold' }}>
              {selectedEmail.subject}
            </DialogTitle>
            <DialogContent dividers>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>De:</strong> {selectedEmail.fromName ? `${selectedEmail.fromName} <${selectedEmail.fromEmail}>` : selectedEmail.from}
                </Typography>
                <Typography variant="body2">
                  <strong>Para:</strong> {selectedEmail.to.join(', ')}
                </Typography>
                {selectedEmail.cc.length > 0 && (
                  <Typography variant="body2">
                    <strong>CC:</strong> {selectedEmail.cc.join(', ')}
                  </Typography>
                )}
                <Typography variant="body2" color="text.secondary">
                  <strong>Fecha:</strong> {selectedEmail.receivedAt.toLocaleString()}
                </Typography>
              </Box>
              <Divider sx={{ my: 1 }} />

              {/* Sanitizar HTML con iframe sandboxed para total seguridad */}
              <Box sx={{ mt: 2, minHeight: 300, border: '1px solid #ddd', borderRadius: 1, p: 1, bgcolor: '#fff' }}>
                {selectedEmail.html ? (
                  <iframe
                    title="Contenido del Correo"
                    srcDoc={selectedEmail.html}
                    sandbox="allow-popups"
                    style={{
                      width: '100%',
                      height: '400px',
                      border: 'none'
                    }}
                  />
                ) : (
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {selectedEmail.text}
                  </Typography>
                )}
              </Box>

              {selectedEmail.attachments.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AttachIcon fontSize="small" /> Adjuntos ({selectedEmail.attachments.length})
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                    {selectedEmail.attachments.map((att, index) => (
                      <Chip
                        key={index}
                        label={`${att.name} (${formatSize(att.size)})`}
                        onClick={() => handleDownloadAttachment(att.name)}
                        variant="outlined"
                        clickable
                        color="primary"
                        icon={<AttachIcon />}
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDialogOpen(false)} variant="contained">
                Cerrar
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default Recibidos;
