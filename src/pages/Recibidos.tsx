import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  IconButton,
  Tabs,
  Tab,
  Tooltip,
  Button,
  Checkbox,
  Avatar,
  Card,
  CardContent,
  Divider,
  Menu,
  MenuItem
} from '@mui/material';
import {
  Star,
  StarBorder,
  Archive,
  Delete,
  Attachment as AttachIcon,
  RestoreFromTrash,
  DeleteForever,
  Refresh,
  FilterList,
  MoreVert,
  ViewList,
  ChevronLeft,
  ChevronRight
} from '@mui/icons-material';
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { useSearchParams } from 'react-router-dom';
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

// Colores suaves de avatares estilo Gmail
const avatarColors = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'
];

const getAvatarColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % avatarColors.length;
  return avatarColors[index];
};

const Recibidos = () => {
  const { user, loading: authLoading } = useAuth();
  const [emails, setEmails] = useState<EmailData[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0); // 0: Recibidos, 1: Destacados, 2: Archivados, 3: Eliminados
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [emptying, setEmptying] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');

  // Menú de "Más opciones" en barra de acciones
  const [actionsAnchorEl, setActionsAnchorEl] = useState<null | HTMLElement>(null);

  useEffect(() => {
    if (tabParam !== null) {
      setTabValue(parseInt(tabParam, 10));
    } else {
      setTabValue(0);
    }
  }, [tabParam]);

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

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setSearchParams({ tab: newValue.toString() });
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

  const tabLabels = [
    { label: "RECIBIDOS", count: emails.length },
    { label: "DESTACADOS", count: emails.length },
    { label: "ARCHIVADOS", count: emails.length },
    { label: "ELIMINADOS", count: emails.length }
  ];

  return (
    <Box sx={{ animation: 'fadeIn 200ms ease-in-out' }}>
      {/* Título de la sección compactado a 26px en escritorio */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.0, mb: 1.5 }}>
        <Typography variant="h3" sx={{ fontWeight: 700, color: 'text.primary', letterSpacing: '-0.5px', fontSize: { xs: '22px', md: '26px' }, lineHeight: 1.2 }}>
          Bandeja de Entrada
        </Typography>

        {/* Botón Vaciar Papelera con diseño Premium */}
        {tabValue === 3 && emails.length > 0 && (
          <Button
            variant="contained"
            color="error"
            startIcon={emptying ? <CircularProgress size={14} color="inherit" /> : <DeleteForever sx={{ fontSize: '18px' }} />}
            onClick={handleEmptyTrash}
            disabled={emptying}
            sx={{
              borderRadius: '10px',
              py: 0.6,
              px: 2.0,
              fontSize: '13px',
              fontWeight: 'bold',
              transition: 'all 150ms ease-in-out',
              boxShadow: '0 4px 10px rgba(239, 68, 68, 0.2)',
              '&:hover': {
                transform: 'scale(1.02)'
              }
            }}
            aria-label="Vaciar papelera"
          >
            {emptying ? "Vaciando..." : `Vaciar papelera (${emails.length})`}
          </Button>
        )}
      </Box>

      {/* Pestañas de la Bandeja */}
      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          sx={{
            minHeight: '34px',
            '& .MuiTabs-indicator': {
              height: '2px',
              bgcolor: '#3B82F6',
              borderRadius: '2px 2px 0 0'
            }
          }}
        >
          {tabLabels.map((tab, idx) => {
            const isActive = tabValue === idx;
            return (
              <Tab
                key={tab.label}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, letterSpacing: '0.2px', fontSize: '11.5px' }}>
                      {tab.label}
                    </Typography>
                    {tab.count > 0 && (
                      <Box sx={{ display: 'inline-flex', px: 0.6, py: 0.1, borderRadius: '6px', bgcolor: isActive ? 'rgba(59,130,246,0.12)' : 'rgba(15,23,42,0.04)', color: isActive ? '#3B82F6' : 'text.secondary', fontSize: '9px', fontWeight: 'bold' }}>
                        {tab.count}
                      </Box>
                    )}
                  </Box>
                }
                sx={{
                  color: isActive ? '#3B82F6 !important' : 'text.secondary',
                  py: 0.5,
                  px: 1.0,
                  minHeight: '34px',
                  minWidth: 'auto',
                  transition: 'color 150ms ease-in-out',
                  '&:hover': { color: 'text.primary' }
                }}
              />
            );
          })}
        </Tabs>
      </Box>

      {/* Barra de acciones horizontal */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 0.8, py: 0.6, px: 0.2, borderBottom: '1px solid', borderColor: 'divider', mb: 1.0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
          <Checkbox size="small" disabled sx={{ color: 'text.disabled', p: 0.2 }} />
          <Divider orientation="vertical" flexItem sx={{ borderColor: 'divider', mx: 0.2 }} />
          <Tooltip title="Actualizar">
            <IconButton size="small" sx={{ color: 'text.secondary', p: 0.4 }} onClick={() => setLoading(true)}>
              <Refresh sx={{ fontSize: '16px' }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Filtrar">
            <IconButton size="small" sx={{ color: 'text.secondary', p: 0.4 }} disabled>
              <FilterList sx={{ fontSize: '16px' }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Más opciones">
            <IconButton size="small" sx={{ color: 'text.secondary', p: 0.4 }} onClick={(e) => setActionsAnchorEl(e.currentTarget)}>
              <MoreVert sx={{ fontSize: '16px' }} />
            </IconButton>
          </Tooltip>

          <Menu
            anchorEl={actionsAnchorEl}
            open={Boolean(actionsAnchorEl)}
            onClose={() => setActionsAnchorEl(null)}
            slotProps={{
              paper: {
                sx: {
                  borderRadius: '8px',
                  border: '1px solid divider',
                  p: 0.2
                }
              }
            }}
          >
            <MenuItem onClick={() => setActionsAnchorEl(null)} disabled sx={{ borderRadius: '4px', fontSize: '11.5px', py: 0.5 }}>Marcar todos como leídos</MenuItem>
            <MenuItem onClick={() => setActionsAnchorEl(null)} disabled sx={{ borderRadius: '4px', fontSize: '11.5px', py: 0.5 }}>Seleccionar todo</MenuItem>
          </Menu>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
          <Tooltip title="Cambiar vista">
            <IconButton size="small" sx={{ color: 'text.secondary', p: 0.4 }} disabled>
              <ViewList sx={{ fontSize: '16px' }} />
            </IconButton>
          </Tooltip>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.2 }}>
            <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600, fontSize: '10.5px' }}>
              1-{emails.length} de {emails.length}
            </Typography>
            <IconButton size="small" sx={{ color: 'text.disabled', p: 0.3 }} disabled>
              <ChevronLeft sx={{ fontSize: '16px' }} />
            </IconButton>
            <IconButton size="small" sx={{ color: 'text.disabled', p: 0.3 }} disabled>
              <ChevronRight sx={{ fontSize: '16px' }} />
            </IconButton>
          </Box>
        </Box>
      </Box>

      {/* Listado de Filas de Correo compactadas (CSS Grid) */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={26} />
          </Box>
        ) : emails.length === 0 ? (
          <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'rgba(15,23,42,0.01)', border: '1px dashed divider' }}>
            <Typography variant="body2" color="text.secondary">
              No hay correos en esta sección.
            </Typography>
          </Paper>
        ) : (
          emails.map((email) => {
            const isUnread = !email.read;
            const senderName = email.fromName || email.fromEmail.split('@')[0] || email.from;
            const initial = senderName.charAt(0).toUpperCase();
            const avatarBg = getAvatarColor(senderName);

            // Extraer primer fragmento de contenido para vista previa
            const previewText = email.text || email.html?.replace(/<[^>]*>/g, '').substring(0, 100) || '(Sin contenido)';

            return (
              <Card
                key={email.id}
                variant="outlined"
                onClick={() => handleOpenEmail(email)}
                sx={{
                  borderRadius: '6px',
                  bgcolor: isUnread ? 'action.selected' : 'background.paper',
                  borderColor: isUnread ? '#3B82F6' : 'divider',
                  cursor: 'pointer',
                  transition: 'all 120ms ease-in-out',
                  height: '48px', // Ultra compacto
                  display: 'flex',
                  alignItems: 'center',
                  '&:hover': {
                    bgcolor: 'action.hover',
                    borderColor: 'text.secondary',
                    '& .quick-actions': { opacity: 1 }
                  }
                }}
              >
                <CardContent sx={{
                  p: '0px 12px !important',
                  width: '100%',
                  display: 'grid',
                  gridTemplateColumns: '70px 42px minmax(140px, 200px) minmax(200px, 1fr) 90px 80px',
                  alignItems: 'center',
                  gap: 1.0
                }}>
                  {/* Selección y estrella (70px) */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.2 }} onClick={(e) => e.stopPropagation()}>
                    <Checkbox size="small" disabled sx={{ color: 'text.disabled', p: 0.2 }} />
                    <IconButton size="small" onClick={(e) => handleToggleStar(e, email)} sx={{ p: 0.2, color: email.starred ? '#FACC15' : 'text.disabled' }}>
                      {email.starred ? <Star sx={{ fontSize: '16px' }} /> : <StarBorder sx={{ fontSize: '16px' }} />}
                    </IconButton>
                  </Box>

                  {/* Avatar circular (42px) */}
                  <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <Avatar sx={{ bgcolor: avatarBg, width: 26, height: 26, fontSize: '10.5px', fontWeight: 'bold' }}>
                      {initial}
                    </Avatar>
                  </Box>

                  {/* Remitente (minmax(140px, 200px)) */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
                    <Typography variant="body2" noWrap sx={{ fontWeight: isUnread ? 700 : 500, color: 'text.primary', textOverflow: 'ellipsis', overflow: 'hidden', fontSize: '12.5px' }}>
                      {senderName}
                    </Typography>

                    {isUnread && (
                      <Box sx={{ px: 0.6, py: 0.05, borderRadius: '3px', bgcolor: 'rgba(59,130,246,0.15)', color: '#3B82F6', fontSize: '8px', fontWeight: 'bold' }}>
                        NUEVO
                      </Box>
                    )}

                    {email.attachments.length > 0 && (
                      <AttachIcon sx={{ fontSize: '12px', color: 'text.disabled' }} />
                    )}
                  </Box>

                  {/* Asunto y vista previa (minmax(200px, 1fr)) */}
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.8, minWidth: 0 }}>
                    <Typography variant="body2" noWrap sx={{ fontWeight: isUnread ? 600 : 400, color: 'text.primary', textOverflow: 'ellipsis', overflow: 'hidden', fontSize: '12.5px', flexShrink: 0, mr: 1 }}>
                      {email.subject || '(Sin asunto)'}
                    </Typography>
                    <Typography variant="caption" noWrap sx={{ color: 'text.secondary', textOverflow: 'ellipsis', overflow: 'hidden', fontSize: '12px' }}>
                      — {previewText}
                    </Typography>
                  </Box>

                  {/* Fecha (90px) */}
                  <Box sx={{ textAlign: 'right', pr: 1 }}>
                    <Typography variant="caption" sx={{ color: isUnread ? '#3B82F6' : 'text.secondary', fontWeight: isUnread ? 700 : 500, fontSize: '11px' }}>
                      {email.receivedAt.toLocaleDateString('es-PE', { month: 'short', day: 'numeric' })}
                    </Typography>
                  </Box>

                  {/* Acciones de hover (80px) */}
                  <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <Box
                      className="quick-actions"
                      onClick={(e) => e.stopPropagation()}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.2,
                        opacity: 0,
                        transition: 'opacity 100ms ease-in-out',
                        bgcolor: 'background.paper',
                        borderRadius: '4px',
                        border: '1px solid divider',
                        p: 0.1
                      }}
                    >
                      {tabValue === 3 ? (
                        <>
                          <Tooltip title="Restaurar">
                            <IconButton size="small" onClick={(e) => handleToggleDelete(e, email)} sx={{ color: '#3B82F6', p: 0.2 }} aria-label="Restaurar correo">
                              <RestoreFromTrash sx={{ fontSize: '14px' }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Eliminar definitivamente">
                            <IconButton size="small" onClick={(e) => handleDeleteForeverSingle(e, email)} sx={{ color: '#EF4444', p: 0.2 }} aria-label="Eliminar definitivamente">
                              <DeleteForever sx={{ fontSize: '14px' }} />
                            </IconButton>
                          </Tooltip>
                        </>
                      ) : (
                        <>
                          <Tooltip title={email.archived ? "Mover a Recibidos" : "Archivar"}>
                            <IconButton size="small" onClick={(e) => handleToggleArchive(e, email)} sx={{ color: 'text.secondary', p: 0.2 }} aria-label="Archivar correo">
                              <Archive sx={{ fontSize: '14px' }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Eliminar">
                            <IconButton size="small" onClick={(e) => handleToggleDelete(e, email)} sx={{ color: '#EF4444', p: 0.2 }} aria-label="Eliminar correo">
                              <Delete sx={{ fontSize: '14px' }} />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            );
          })
        )}
      </Box>
    </Box>
  );
};

export default Recibidos;
