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
  CircularProgress,
  IconButton,
  Tabs,
  Tab,
  Tooltip,
  Button
} from '@mui/material';
import {
  Star,
  StarBorder,
  Archive,
  Delete,
  Mail,
  Drafts,
  Attachment as AttachIcon,
  RestoreFromTrash,
  DeleteForever
} from '@mui/icons-material';
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import EmailViewer from '../components/EmailViewer';

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
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [emptying, setEmptying] = useState(false);

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

  const handleDeleteForeverSingle = async (e: React.MouseEvent, email: EmailData) => {
    e.stopPropagation();
    const confirmMessage = "¿Deseas eliminar definitivamente este correo?\n\nEsta acción no se puede deshacer.";
    if (!window.confirm(confirmMessage)) return;

    try {
      await deleteDoc(doc(db, 'emails', email.id));
      console.log(`[PIXEL MAIL INBOX] Correo ${email.id} eliminado definitivamente.`);
    } catch (error) {
      console.error("[PIXEL MAIL INBOX] Error al eliminar definitivamente:", error);
    }
  };

  const handleEmptyTrash = async () => {
    if (emails.length === 0) return;

    const confirmMessage = `¿Deseas eliminar definitivamente todos los correos de la papelera? Esta acción no se puede deshacer.\n\nCantidad de correos que serán eliminados: ${emails.length}`;
    if (!window.confirm(confirmMessage)) return;

    setEmptying(true);
    try {
      const batchSize = 500;
      let batch = writeBatch(db);
      let count = 0;

      for (const email of emails) {
        batch.delete(doc(db, 'emails', email.id));
        count++;

        if (count === batchSize) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }

      if (count > 0) {
        await batch.commit();
      }

      console.log("[PIXEL MAIL INBOX] Papelera vaciada con éxito.");
    } catch (error) {
      console.error("[PIXEL MAIL INBOX] Error al vaciar la papelera:", error);
      alert("Ocurrió un error al vaciar la papelera.");
    } finally {
      setEmptying(false);
    }
  };

  const handleOpenEmail = async (email: EmailData) => {
    setSelectedEmailId(email.id);
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
    if (!selectedEmailId || !user) return;
    const currentEmail = emails.find(e => e.id === selectedEmailId);
    if (!currentEmail) return;

    try {
      const idToken = await user.getIdToken();
      const getAttachmentUrl = `${import.meta.env.VITE_SEND_EMAIL_URL.replace('/sendEmail', '/getAttachment')}?emailId=${currentEmail.resendEmailId}&filename=${encodeURIComponent(filename)}`;

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

  if (authLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Si hay un correo seleccionado, mostramos la vista completa del correo en lugar del listado
  const emailToShow = emails.find((e) => e.id === selectedEmailId);
  if (selectedEmailId && emailToShow) {
    return (
      <EmailViewer
        email={emailToShow}
        onBack={() => setSelectedEmailId(null)}
        onToggleRead={async () => {
          try {
            await updateDoc(doc(db, 'emails', emailToShow.id), {
              read: !emailToShow.read
            });
          } catch (error) {
            console.error("[PIXEL MAIL INBOX] Error toggling read:", error);
          }
        }}
        onToggleStar={async () => {
          try {
            await updateDoc(doc(db, 'emails', emailToShow.id), {
              starred: !emailToShow.starred
            });
          } catch (error) {
            console.error("[PIXEL MAIL INBOX] Error toggling star:", error);
          }
        }}
        onToggleArchive={async () => {
          try {
            await updateDoc(doc(db, 'emails', emailToShow.id), {
              archived: !emailToShow.archived
            });
            setSelectedEmailId(null);
          } catch (error) {
            console.error("[PIXEL MAIL INBOX] Error toggling archive:", error);
          }
        }}
        onToggleDelete={async () => {
          try {
            await updateDoc(doc(db, 'emails', emailToShow.id), {
              deleted: !emailToShow.deleted
            });
            setSelectedEmailId(null);
          } catch (error) {
            console.error("[PIXEL MAIL INBOX] Error toggling delete:", error);
          }
        }}
        onDeleteForever={async () => {
          const confirmMessage = "¿Deseas eliminar definitivamente este correo?\n\nEsta acción no se puede deshacer.";
          if (!window.confirm(confirmMessage)) return;

          try {
            await deleteDoc(doc(db, 'emails', emailToShow.id));
            setSelectedEmailId(null);
            console.log(`[PIXEL MAIL INBOX] Correo ${emailToShow.id} eliminado definitivamente.`);
          } catch (error) {
            console.error("[PIXEL MAIL INBOX] Error deleting email forever:", error);
          }
        }}
        onDownloadAttachment={handleDownloadAttachment}
      />
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 1 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
          Bandeja de Entrada
        </Typography>

        {/* Botón Vaciar Papelera: aparece únicamente en la pestaña de Eliminados y si hay correos */}
        {tabValue === 3 && emails.length > 0 && (
          <Button
            variant="contained"
            color="error"
            size="small"
            startIcon={emptying ? <CircularProgress size={16} color="inherit" /> : <DeleteForever />}
            onClick={handleEmptyTrash}
            disabled={emptying}
            aria-label="Vaciar papelera"
          >
            {emptying ? "Vaciando..." : "Vaciar papelera"}
          </Button>
        )}
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 1 }}>
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
                      <IconButton size="small" onClick={(e) => handleToggleStar(e, email)} aria-label="Destacar">
                        {email.starred ? <Star color="warning" /> : <StarBorder />}
                      </IconButton>
                      <IconButton size="small" onClick={(e) => handleToggleRead(e, email)} aria-label="Cambiar leido">
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
                      {tabValue === 3 ? (
                        <>
                          <Tooltip title="Restaurar">
                            <IconButton size="small" onClick={(e) => handleToggleDelete(e, email)} aria-label="Restaurar">
                              <RestoreFromTrash color="primary" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Eliminar definitivamente">
                            <IconButton size="small" onClick={(e) => handleDeleteForeverSingle(e, email)} aria-label="Eliminar definitivamente">
                              <DeleteForever color="error" />
                            </IconButton>
                          </Tooltip>
                        </>
                      ) : (
                        <>
                          <Tooltip title={email.archived ? "Mover a Recibidos" : "Archivar"}>
                            <IconButton size="small" onClick={(e) => handleToggleArchive(e, email)} aria-label="Archivar">
                              <Archive color={email.archived ? 'primary' : 'action'} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Eliminar">
                            <IconButton size="small" onClick={(e) => handleToggleDelete(e, email)} aria-label="Eliminar">
                              <Delete color="error" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default Recibidos;
