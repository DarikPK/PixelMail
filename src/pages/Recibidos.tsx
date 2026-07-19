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
import { useEffect, useState, useMemo, Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { useSearchParams } from 'react-router-dom';
import EmailViewer from '../components/EmailViewer';
import { useEmails } from '../contexts/EmailContext';

interface EmailData {
  id: string;
  resendEmailId: string;
  from: string;
  fromName: string;
  fromEmail: string;
  to: any;
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
  deletedAt?: any;
  previousFolder?: string | null;
  folderId?: string | null;
  recipients?: any;
  labels?: any;
  body?: string;
}

const safeArray = (value: any): any[] => Array.isArray(value) ? value : [];

const normalizeRecipients = (value: any): any[] => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) return [value];
  return [];
};

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class EmailRowErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[EmailRowErrorBoundary] Error rendering email row:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <Card variant="outlined" sx={{ p: 1.5, borderColor: 'error.main', bgcolor: 'error.light', height: '48px', display: 'flex', alignItems: 'center', mb: 0.4 }}>
          <Typography variant="body2" color="error.dark">
            Error al cargar este correo.
          </Typography>
        </Card>
      );
    }

    return this.props.children;
  }
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
  const {
    emails,
    folders,
    loading,
    counts,
    activeNav,
    activeFolderId,
    selectedEmailIds,
    setSelectedEmailIds,
    bulkMoveToFolder,
    bulkToggleStar,
    bulkToggleArchive,
    bulkToggleRead,
    bulkMoveToTrash,
    bulkDeleteForever,
    bulkRestore
  } = useEmails();
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [emptying, setEmptying] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const openParam = searchParams.get('open');

  // Menús de barra de acciones
  const [actionsAnchorEl, setActionsAnchorEl] = useState<null | HTMLElement>(null);
  const [moveToAnchorEl, setMoveToAnchorEl] = useState<null | HTMLElement>(null);

  // Sub-pestaña para la papelera de reciclaje: 0 para recibidos, 1 para enviados
  const [trashSubTab, setTrashSubTab] = useState(0);

  // Resetear la sub-pestaña al cambiar de sección
  useEffect(() => {
    setTrashSubTab(0);
  }, [activeNav]);

  // Limpiar selección de correos al alternar entre sub-pestañas de papelera
  useEffect(() => {
    setSelectedEmailIds([]);
  }, [trashSubTab, setSelectedEmailIds]);

  // Sincronizar apertura de correos desde la barra lateral (mini preview)
  useEffect(() => {
    if (openParam) {
      setSelectedEmailId(openParam);
    } else {
      setSelectedEmailId(null);
    }
  }, [openParam]);

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
      const isSent = email.direction !== 'inbound';
      const prev = isSent ? 'sent' : (email.archived ? 'archived' : (email.folderId || 'inbox'));
      await updateDoc(doc(db, 'emails', email.id), {
        deleted: !email.deleted,
        deletedAt: new Date(),
        previousFolder: prev
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
    // Filtrar según la sub-pestaña seleccionada (Recibidos o Enviados) en la papelera
    const targetEmails = emails.filter((e) => {
      if (!e.deleted) return false;
      const isSent = e.direction !== 'inbound';
      return trashSubTab === 1 ? isSent : !isSent;
    });

    if (targetEmails.length === 0) return;

    const sectionName = trashSubTab === 1 ? 'enviados' : 'recibidos';
    const confirmMessage = `¿Vaciar la papelera de correos ${sectionName}?\n\nSe eliminarán definitivamente todos los correos ${sectionName} que estén en Papelera.\n\nEsta acción no se puede deshacer.`;
    if (!window.confirm(confirmMessage)) return;

    setEmptying(true);
    try {
      const batchSize = 500;
      let batch = writeBatch(db);
      let count = 0;

      for (const email of targetEmails) {
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

      console.log(`[PIXEL MAIL INBOX] Papelera de ${sectionName} vaciada con éxito.`);
    } catch (error) {
      console.error("[PIXEL MAIL INBOX] Error al vaciar la papelera:", error);
      alert("Ocurrió un error al vaciar la papelera.");
    } finally {
      setEmptying(false);
    }
  };

  const handleOpenEmail = async (email: EmailData) => {
    // Al abrir un correo, actualizamos los parámetros de búsqueda de la URL
    // conservando el resto de parámetros (tab, folder, filtros, búsqueda, etc.)
    const newParams = new URLSearchParams(searchParams);
    newParams.set('open', email.id);
    setSearchParams(newParams);

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
    if (newValue === 0) {
      setSearchParams({});
    } else {
      const folder = folders[newValue - 1];
      if (folder) {
        setSearchParams({ folder: folder.id });
      }
    }
  };

  if (authLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Filtrado de correos según la navegación activa (incluyendo enviados en papelera)
  const filteredEmails = emails.filter((email) => {
    if (activeNav === 'eliminados') {
      return email.deleted;
    }

    if (email.direction !== 'inbound') return false;

    if (activeNav === 'recibidos') {
      return !email.deleted && !email.archived && !email.folderId;
    } else if (activeNav === 'destacados') {
      return !email.deleted && email.starred;
    } else if (activeNav === 'archivados') {
      return !email.deleted && email.archived;
    } else if (activeNav === 'folder') {
      return !email.deleted && email.folderId === activeFolderId;
    }
    return false;
  });

  // Filtrar visibleEmails según la sub-pestaña en la papelera
  const visibleEmails = useMemo(() => {
    if (activeNav === 'eliminados') {
      return filteredEmails.filter((email) => {
        const isSent = email.direction !== 'inbound';
        return trashSubTab === 1 ? isSent : !isSent;
      });
    }
    return filteredEmails;
  }, [filteredEmails, activeNav, trashSubTab]);

  // Ordenar correos de la papelera por deletedAt desc
  const sortedEmails = useMemo(() => {
    const list = [...visibleEmails];
    if (activeNav === 'eliminados') {
      list.sort((a, b) => {
        const timeA = a.deletedAt ? (a.deletedAt.toDate ? a.deletedAt.toDate().getTime() : new Date(a.deletedAt).getTime()) : 0;
        const timeB = b.deletedAt ? (b.deletedAt.toDate ? b.deletedAt.toDate().getTime() : new Date(b.deletedAt).getTime()) : 0;
        return timeB - timeA;
      });
    }
    return list;
  }, [visibleEmails, activeNav]);

  // Contadores internos de la papelera
  const trashReceivedCount = useMemo(() => {
    return filteredEmails.filter(e => e.direction === 'inbound').length;
  }, [filteredEmails]);

  const trashSentCount = useMemo(() => {
    return filteredEmails.filter(e => e.direction !== 'inbound').length;
  }, [filteredEmails]);

  // Si hay un correo seleccionado, mostramos la vista completa del correo en lugar del listado
  const emailToShow = emails.find((e) => e.id === selectedEmailId);
  if (selectedEmailId && emailToShow) {
    return (
      <EmailViewer
        email={emailToShow}
        onBack={() => {
          // Remover únicamente el parámetro 'open' conservando todos los demás parámetros
          // (tab, folder, filtros, búsquedas, paginaciones, etc.)
          const newParams = new URLSearchParams(searchParams);
          newParams.delete('open');
          setSearchParams(newParams);
        }}
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
            const isSent = emailToShow.direction !== 'inbound';
            const prev = isSent ? 'sent' : (emailToShow.archived ? 'archived' : (emailToShow.folderId || 'inbox'));
            await updateDoc(doc(db, 'emails', emailToShow.id), {
              deleted: !emailToShow.deleted,
              deletedAt: new Date(),
              previousFolder: prev
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

  // Las pestañas superiores muestran "Recibidos" + las carpetas del usuario con contadores discretos
  const tabHeaders = [
    { label: 'RECIBIDOS', count: counts.inbox, id: 'recibidos', type: 'recibidos', color: '#3B82F6' },
    ...folders.map(f => ({ label: f.name.toUpperCase(), count: counts.folders[f.id] || 0, id: f.id, type: 'folder', color: f.color }))
  ];

  const currentTabValue = activeNav === 'folder'
    ? folders.findIndex(f => f.id === activeFolderId) + 1
    : (activeNav === 'recibidos' ? 0 : false);

  // Obtener el título dinámico según la navegación
  let dynamicTitle = 'Bandeja de Entrada';
  if (activeNav === 'destacados') dynamicTitle = 'Destacados';
  else if (activeNav === 'archivados') dynamicTitle = 'Archivados';
  else if (activeNav === 'eliminados') dynamicTitle = 'Papelera de Reciclaje';
  else if (activeNav === 'folder') {
    const f = folders.find(folder => folder.id === activeFolderId);
    dynamicTitle = f ? f.name : 'Carpeta';
  }

  // Contar el número de elementos de la sección de papelera activa
  const currentTrashCount = trashSubTab === 1 ? trashSentCount : trashReceivedCount;

  return (
    <Box sx={{ animation: 'fadeIn 200ms ease-in-out' }}>
      {/* Título de la sección compactado a 26px en escritorio */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.0, mb: 1.5 }}>
        <Typography variant="h3" sx={{ fontWeight: 700, color: 'text.primary', letterSpacing: '-0.5px', fontSize: { xs: '22px', md: '26px' }, lineHeight: 1.2 }}>
          {dynamicTitle}
        </Typography>

        {/* Botón Vaciar Papelera con diseño Premium - vacía solo la sección activa de papelera */}
        {activeNav === 'eliminados' && currentTrashCount > 0 && (
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
            {emptying ? "Vaciando..." : `Vaciar papelera (${currentTrashCount})`}
          </Button>
        )}
      </Box>

      {/* Pestañas de la Bandeja (Recibidos + Carpetas) - Ocultar en la Papelera, Deslizables Horizontalmente en Móvil */}
      {activeNav !== 'eliminados' && (
        <Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
          <Tabs
            value={currentTabValue}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{
              minHeight: '34px',
              '& .MuiTabs-indicator': {
                height: '2.5px',
                bgcolor: '#3B82F6',
                borderRadius: '2px 2px 0 0'
              }
            }}
          >
            {tabHeaders.map((tab, idx) => {
              const isActive = currentTabValue === idx;
              return (
                <Tab
                  key={tab.id}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                      {tab.type === 'folder' && (
                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: tab.color }} />
                      )}
                      <Typography variant="body2" sx={{ fontWeight: 600, letterSpacing: '0.2px', fontSize: '11px', display: 'flex', gap: 0.5, alignItems: 'center' }}>
                        {tab.label}
                        <Box component="span" sx={{ fontSize: '9px', opacity: 0.7, bgcolor: 'action.hover', px: 0.6, py: 0.1, borderRadius: '10px', fontWeight: 'bold', color: 'text.secondary' }}>
                          {tab.count}
                        </Box>
                      </Typography>
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
      )}

      {/* Switch segmentado compacto de dos opciones exclusivo para la papelera */}
      {activeNav === 'eliminados' && (
        <Box sx={{ display: 'inline-flex', bgcolor: 'action.hover', p: '3px', borderRadius: '8px', border: '1px solid divider', mb: 1.5 }}>
          <Button
            size="small"
            onClick={() => setTrashSubTab(0)}
            sx={{
              textTransform: 'none',
              borderRadius: '6px',
              px: 3,
              py: 0.5,
              fontSize: '12px',
              fontWeight: 600,
              bgcolor: trashSubTab === 0 ? '#3B82F6 !important' : 'transparent',
              color: trashSubTab === 0 ? '#FFFFFF !important' : 'text.secondary',
              '&:hover': {
                bgcolor: trashSubTab === 0 ? '#3B82F6' : 'rgba(255,255,255,0.05)'
              }
            }}
          >
            Recibidos ({trashReceivedCount})
          </Button>
          <Button
            size="small"
            onClick={() => setTrashSubTab(1)}
            sx={{
              textTransform: 'none',
              borderRadius: '6px',
              px: 3,
              py: 0.5,
              fontSize: '12px',
              fontWeight: 600,
              bgcolor: trashSubTab === 1 ? '#3B82F6 !important' : 'transparent',
              color: trashSubTab === 1 ? '#FFFFFF !important' : 'text.secondary',
              '&:hover': {
                bgcolor: trashSubTab === 1 ? '#3B82F6' : 'rgba(255,255,255,0.05)'
              }
            }}
          >
            Enviados ({trashSentCount})
          </Button>
        </Box>
      )}

      {/* Barra de acciones horizontal (Selección múltiple e indeterminada) */}
      {(() => {
        const allVisibleIds = visibleEmails.map((e: EmailData) => e.id);
        const areAllSelected = allVisibleIds.length > 0 && allVisibleIds.every((id: string) => selectedEmailIds.includes(id));
        const isIndeterminate = allVisibleIds.length > 0 && allVisibleIds.some((id: string) => selectedEmailIds.includes(id)) && !areAllSelected;

        const handleSelectAllToggle = () => {
          if (areAllSelected) {
            setSelectedEmailIds(prev => prev.filter((id: string) => !allVisibleIds.includes(id)));
          } else {
            setSelectedEmailIds(prev => {
              const otherSelected = prev.filter((id: string) => !allVisibleIds.includes(id));
              return [...otherSelected, ...allVisibleIds];
            });
          }
        };

        const hasSelection = selectedEmailIds.length > 0;

        return (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 0.8, py: 0.6, px: 0.2, borderBottom: '1px solid', borderColor: 'divider', mb: 1.0, minHeight: '38px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Checkbox
                size="small"
                checked={areAllSelected}
                indeterminate={isIndeterminate}
                onChange={handleSelectAllToggle}
                sx={{ p: 0.2 }}
              />
              <Divider orientation="vertical" flexItem sx={{ borderColor: 'divider', mx: 0.2 }} />

              {hasSelection ? (
                // ACCIONES MASIVAS CONTEXTUALES
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flexWrap: 'wrap' }}>
                  <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '11px', color: 'text.secondary', mr: 1 }}>
                    {selectedEmailIds.length} seleccionados
                  </Typography>

                  {/* Acciones para Eliminados */}
                  {activeNav === 'eliminados' ? (
                    <>
                      <Button size="small" variant="contained" color="primary" onClick={bulkRestore} sx={{ fontSize: '10.5px', py: 0.3, px: 1.2, textTransform: 'none', height: '26px' }}>
                        Restaurar
                      </Button>
                      <Button size="small" variant="contained" color="error" onClick={bulkDeleteForever} sx={{ fontSize: '10.5px', py: 0.3, px: 1.2, textTransform: 'none', height: '26px' }}>
                        Eliminar definitivamente
                      </Button>
                    </>
                  ) : (
                    // Acciones generales para recibidos, archivados, destacados, folders
                    <>
                      <Button size="small" variant="outlined" onClick={bulkMoveToTrash} sx={{ fontSize: '10.5px', py: 0.3, px: 1.2, textTransform: 'none', height: '26px' }}>
                        Eliminar
                      </Button>

                      {activeNav === 'archivados' ? (
                        <Button size="small" variant="outlined" onClick={() => bulkToggleArchive(false)} sx={{ fontSize: '10.5px', py: 0.3, px: 1.2, textTransform: 'none', height: '26px' }}>
                          Desarchivar
                        </Button>
                      ) : (
                        <Button size="small" variant="outlined" onClick={() => bulkToggleArchive(true)} sx={{ fontSize: '10.5px', py: 0.3, px: 1.2, textTransform: 'none', height: '26px' }}>
                          Archivar
                        </Button>
                      )}

                      <Button size="small" variant="outlined" onClick={() => bulkToggleStar(true)} sx={{ fontSize: '10.5px', py: 0.3, px: 1.2, textTransform: 'none', height: '26px' }}>
                        Destacar
                      </Button>
                      <Button size="small" variant="outlined" onClick={() => bulkToggleStar(false)} sx={{ fontSize: '10.5px', py: 0.3, px: 1.2, textTransform: 'none', height: '26px' }}>
                        Quitar destacado
                      </Button>

                      <Button size="small" variant="outlined" onClick={() => bulkToggleRead(true)} sx={{ fontSize: '10.5px', py: 0.3, px: 1.2, textTransform: 'none', height: '26px' }}>
                        Marcar leído
                      </Button>
                      <Button size="small" variant="outlined" onClick={() => bulkToggleRead(false)} sx={{ fontSize: '10.5px', py: 0.3, px: 1.2, textTransform: 'none', height: '26px' }}>
                        Marcar no leído
                      </Button>

                      {/* Menú desplegable Mover a */}
                      <Button
                        size="small"
                        variant="contained"
                        onClick={(e) => setMoveToAnchorEl(e.currentTarget)}
                        sx={{ fontSize: '10.5px', py: 0.3, px: 1.2, textTransform: 'none', height: '26px', background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)' }}
                      >
                        Mover a...
                      </Button>
                      <Menu
                        anchorEl={moveToAnchorEl}
                        open={Boolean(moveToAnchorEl)}
                        onClose={() => setMoveToAnchorEl(null)}
                        slotProps={{
                          paper: {
                            sx: {
                              borderRadius: '8px',
                              border: '1px solid divider',
                              p: 0.3
                            }
                          }
                        }}
                      >
                        {activeNav !== 'recibidos' && (
                          <MenuItem onClick={async () => { setMoveToAnchorEl(null); await bulkMoveToFolder(null); }} sx={{ fontSize: '12px', py: 0.4 }}>
                            Bandeja de Entrada
                          </MenuItem>
                        )}
                        {activeNav !== 'archivados' && (
                          <MenuItem onClick={async () => { setMoveToAnchorEl(null); await bulkToggleArchive(true); }} sx={{ fontSize: '12px', py: 0.4 }}>
                            Archivados
                          </MenuItem>
                        )}
                        {folders.map((f) => (
                          <MenuItem key={f.id} onClick={async () => { setMoveToAnchorEl(null); await bulkMoveToFolder(f.id); }} sx={{ fontSize: '12px', py: 0.4 }}>
                            {f.name}
                          </MenuItem>
                        ))}
                      </Menu>
                    </>
                  )}

                  <Button size="small" variant="text" onClick={() => setSelectedEmailIds([])} sx={{ fontSize: '10.5px', color: 'text.secondary', textTransform: 'none', height: '26px' }}>
                    Cancelar
                  </Button>
                </Box>
              ) : (
                // ACCIONES ESTÁNDAR
                <>
                  <Tooltip title="Actualizar">
                    <IconButton size="small" sx={{ color: 'text.secondary', p: 0.4 }} onClick={() => window.location.reload()}>
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
                </>
              )}
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
              <Tooltip title="Cambiar vista">
                <IconButton size="small" sx={{ color: 'text.secondary', p: 0.4 }} disabled>
                  <ViewList sx={{ fontSize: '16px' }} />
                </IconButton>
              </Tooltip>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.2 }}>
                <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600, fontSize: '10.5px' }}>
                  1-{visibleEmails.length} de {visibleEmails.length}
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
        );
      })()}

      {/* Listado de Filas de Correo compactadas (CSS Grid) */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={26} />
          </Box>
        ) : (sortedEmails ?? []).length === 0 ? (
          <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'rgba(15,23,42,0.01)', border: '1px dashed divider' }}>
            <Typography variant="body2" color="text.secondary">
              No hay correos en esta sección.
            </Typography>
          </Paper>
        ) : (
          (() => {
            // Diagnóstico temporal requerido por el usuario
            const sentTrashEmails = activeNav === 'eliminados' && trashSubTab === 1 ? sortedEmails : null;
            if (sentTrashEmails) {
              console.log("[TRASH SENT] total:", (sentTrashEmails ?? [])?.length);
              console.table(
                (sentTrashEmails ?? []).map(email => ({
                  id: email?.id,
                  keys: Object.keys(email ?? {}).join(", "),
                  toType: Array.isArray(email?.to) ? "array" : typeof email?.to,
                  recipientsType: Array.isArray(email?.recipients)
                    ? "array"
                    : typeof email?.recipients,
                  attachmentsType: Array.isArray(email?.attachments)
                    ? "array"
                    : typeof email?.attachments,
                  labelsType: Array.isArray(email?.labels)
                    ? "array"
                    : typeof email?.labels
                }))
              );
            }

            return (sortedEmails ?? []).map((email: EmailData) => {
              if (activeNav === 'eliminados' && trashSubTab === 1) {
                if (!email) {
                  console.error("[TRASH SENT] elemento undefined o null");
                  return null;
                }

                console.log("[TRASH SENT ITEM]", {
                  id: email.id,
                  to: email.to,
                  recipients: email.recipients,
                  attachments: email.attachments,
                  labels: email.labels
                });
              }

              const isInvalidEmail = !email ||
                !email.to ||
                (typeof email.to !== 'string' && !Array.isArray(email.to)) ||
                !email.subject ||
                (email.attachments && !Array.isArray(email.attachments)) ||
                (email.labels && !Array.isArray(email.labels)) ||
                (email.recipients && !Array.isArray(email.recipients));

              if (isInvalidEmail && activeNav === 'eliminados' && trashSubTab === 1 && email) {
                console.error("[TRASH SENT INVALID EMAIL]", {
                  id: email.id,
                  keys: Object.keys(email)
                });
              }

              const normalizedEmail = {
                ...email,
                to: normalizeRecipients(email?.to),
                cc: normalizeRecipients(email?.cc),
                bcc: normalizeRecipients(email?.bcc),
                recipients: normalizeRecipients(email?.recipients),
                attachments: safeArray(email?.attachments),
                labels: safeArray(email?.labels),
              };

              const isUnread = !normalizedEmail.read;
              const fromEmail = normalizedEmail.fromEmail || '';

              let displayName = '';
              const isSentEmail = normalizedEmail.direction !== 'inbound';
              if (isSentEmail) {
                const recipients = normalizedEmail.to;
                const recipient = recipients[0] || '';
                const recipientName = recipient
                  ? (recipient.split('@')[0] || recipient)
                  : '';
                displayName = recipientName ? `Para: ${recipientName}` : 'Sin destinatario';
              } else {
                displayName = normalizedEmail.fromName || (fromEmail ? fromEmail.split('@')[0] : '') || normalizedEmail.from || 'Remitente';
              }

              const initial = (displayName.startsWith('Para: ') ? displayName.substring(6) : displayName).charAt(0).toUpperCase() || 'U';
              const avatarBg = getAvatarColor(displayName);

              // Extraer primer fragmento de contenido para vista previa
              const previewText = normalizedEmail.text || normalizedEmail.body || normalizedEmail.html?.replace(/<[^>]*>/g, '').substring(0, 100) || '(Sin contenido)';

              return (
                <EmailRowErrorBoundary key={normalizedEmail.id}>
                  <Card
                    variant="outlined"
                    onClick={() => handleOpenEmail(normalizedEmail)}
                    sx={{
                      borderRadius: '6px',
                      bgcolor: isUnread ? 'action.selected' : 'background.paper',
                      borderColor: isUnread ? '#3B82F6' : 'divider',
                      cursor: 'pointer',
                      transition: 'all 120ms ease-in-out',
                      height: { xs: 'auto', md: '48px' }, // Auto en móvil para acomodar dos líneas, ultra compacto en desktop
                      display: 'flex',
                      alignItems: 'center',
                      mb: 0.4,
                      '&:hover': {
                        bgcolor: 'action.hover',
                        borderColor: 'text.secondary',
                        '& .quick-actions': { opacity: 1 }
                      }
                    }}
                  >
                    <CardContent sx={{
                      p: { xs: '10px 12px !important', md: '0px 12px !important' },
                      width: '100%'
                    }}>
                      {/* VISTA MÓVIL (xs a md) - Rediseñada para sentirse 100% nativa con gestos simulados */}
                      <Box sx={{
                        display: { xs: 'flex', md: 'none' },
                        flexDirection: 'column',
                        gap: 0.2,
                        transition: 'transform 0.2s ease, opacity 0.2s ease',
                        '&:active': {
                          transform: 'scale(0.99) translateX(4px)',
                          opacity: 0.95
                        }
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, minWidth: 0 }}>
                            <Avatar sx={{ bgcolor: avatarBg, width: 22, height: 22, fontSize: '9px', fontWeight: 'bold' }}>
                              {initial}
                            </Avatar>
                            <Typography variant="body2" noWrap sx={{ fontWeight: isUnread ? 600 : 500, color: 'text.primary', fontSize: '17px', fontFamily: '"Inter", sans-serif' }}>
                              {displayName}
                            </Typography>
                            {isUnread && (
                              <Box sx={{ px: 0.5, py: 0.05, borderRadius: '3px', bgcolor: 'rgba(59,130,246,0.15)', color: '#3B82F6', fontSize: '8px', fontWeight: 'bold' }}>
                                NUEVO
                              </Box>
                            )}
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }} onClick={(e) => e.stopPropagation()}>
                            <Typography variant="caption" sx={{ color: isUnread ? '#3B82F6' : 'text.secondary', fontWeight: isUnread ? 700 : 500, fontSize: '12px' }}>
                              {normalizedEmail.receivedAt?.toLocaleDateString ? normalizedEmail.receivedAt.toLocaleDateString('es-PE', { month: 'short', day: 'numeric' }) : 'Sin fecha'}
                            </Typography>
                            <IconButton size="small" onClick={(e) => handleToggleStar(e, normalizedEmail)} sx={{ p: 0.1, color: normalizedEmail.starred ? '#FACC15' : 'text.disabled' }}>
                              {normalizedEmail.starred ? <Star sx={{ fontSize: '14px' }} /> : <StarBorder sx={{ fontSize: '14px' }} />}
                            </IconButton>
                          </Box>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1.0 }}>
                          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                            <Typography variant="body2" noWrap sx={{ fontWeight: isUnread ? 500 : 400, color: 'text.primary', fontSize: '15px' }}>
                              {normalizedEmail.subject || 'Sin asunto'}
                            </Typography>
                            <Typography variant="caption" noWrap sx={{ color: 'text.secondary', fontSize: '13px', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                              {previewText}
                            </Typography>
                          </Box>
                          {safeArray(normalizedEmail.attachments).length > 0 && (
                            <AttachIcon sx={{ fontSize: '11px', color: 'text.disabled', alignSelf: 'center' }} />
                          )}
                        </Box>
                      </Box>

                      {/* VISTA ESCRITORIO (md en adelante) */}
                      <Box sx={{
                        display: { xs: 'none', md: 'grid' },
                        gridTemplateColumns: '70px 42px minmax(140px, 200px) minmax(200px, 1fr) 90px 80px',
                        alignItems: 'center',
                        gap: 1.0,
                        width: '100%'
                      }}>
                        {/* Checkbox y Estrella */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.2 }} onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            size="small"
                            checked={selectedEmailIds.includes(normalizedEmail.id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              setSelectedEmailIds(prev =>
                                prev.includes(normalizedEmail.id)
                                  ? prev.filter(id => id !== normalizedEmail.id)
                                  : [...prev, normalizedEmail.id]
                              );
                            }}
                            sx={{ p: 0.2 }}
                          />
                          <IconButton size="small" onClick={(e) => handleToggleStar(e, normalizedEmail)} sx={{ p: 0.2, color: normalizedEmail.starred ? '#FACC15' : 'text.disabled' }}>
                            {normalizedEmail.starred ? <Star sx={{ fontSize: '16px' }} /> : <StarBorder sx={{ fontSize: '16px' }} />}
                          </IconButton>
                        </Box>

                        {/* Avatar circular */}
                        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                          <Avatar sx={{ bgcolor: avatarBg, width: 26, height: 26, fontSize: '10.5px', fontWeight: 'bold' }}>
                            {initial}
                          </Avatar>
                        </Box>

                        {/* Remitente/Destinatario */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
                          <Typography variant="body2" noWrap sx={{ fontWeight: isUnread ? 700 : 500, color: 'text.primary', textOverflow: 'ellipsis', overflow: 'hidden', fontSize: '12.5px' }}>
                            {displayName}
                          </Typography>

                          {isUnread && (
                            <Box sx={{ px: 0.6, py: 0.05, borderRadius: '3px', bgcolor: 'rgba(59,130,246,0.15)', color: '#3B82F6', fontSize: '8px', fontWeight: 'bold' }}>
                              NUEVO
                            </Box>
                          )}

                          {safeArray(normalizedEmail.attachments).length > 0 && (
                            <AttachIcon sx={{ fontSize: '12px', color: 'text.disabled' }} />
                          )}
                        </Box>

                        {/* Asunto y vista previa */}
                        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.8, minWidth: 0 }}>
                          <Typography variant="body2" noWrap sx={{ fontWeight: isUnread ? 600 : 400, color: 'text.primary', textOverflow: 'ellipsis', overflow: 'hidden', fontSize: '12.5px', flexShrink: 0, mr: 1 }}>
                            {normalizedEmail.subject || 'Sin asunto'}
                          </Typography>
                          <Typography variant="caption" noWrap sx={{ color: 'text.secondary', textOverflow: 'ellipsis', overflow: 'hidden', fontSize: '12px' }}>
                            — {previewText}
                          </Typography>
                        </Box>

                        {/* Fecha */}
                        <Box sx={{ textAlign: 'right', pr: 1 }}>
                          <Typography variant="caption" sx={{ color: isUnread ? '#3B82F6' : 'text.secondary', fontWeight: isUnread ? 700 : 500, fontSize: '11px' }}>
                            {normalizedEmail.receivedAt?.toLocaleDateString ? normalizedEmail.receivedAt.toLocaleDateString('es-PE', { month: 'short', day: 'numeric' }) : 'Sin fecha'}
                          </Typography>
                        </Box>

                        {/* Acciones de hover */}
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
                            {activeNav === 'eliminados' ? (
                              <>
                                <Tooltip title="Restaurar">
                                  <IconButton size="small" onClick={(e) => handleToggleDelete(e, normalizedEmail)} sx={{ color: '#3B82F6', p: 0.2 }} aria-label="Restaurar correo">
                                    <RestoreFromTrash sx={{ fontSize: '14px' }} />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Eliminar definitivamente">
                                  <IconButton size="small" onClick={(e) => handleDeleteForeverSingle(e, normalizedEmail)} sx={{ color: '#EF4444', p: 0.2 }} aria-label="Eliminar definitivamente">
                                    <DeleteForever sx={{ fontSize: '14px' }} />
                                  </IconButton>
                                </Tooltip>
                              </>
                            ) : (
                              <>
                                <Tooltip title={normalizedEmail.archived ? "Mover a Recibidos" : "Archivar"}>
                                  <IconButton size="small" onClick={(e) => handleToggleArchive(e, normalizedEmail)} sx={{ color: 'text.secondary', p: 0.2 }} aria-label="Archivar correo">
                                    <Archive sx={{ fontSize: '14px' }} />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Eliminar">
                                  <IconButton size="small" onClick={(e) => handleToggleDelete(e, normalizedEmail)} sx={{ color: '#EF4444', p: 0.2 }} aria-label="Eliminar correo">
                                    <Delete sx={{ fontSize: '14px' }} />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
                          </Box>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </EmailRowErrorBoundary>
              );
            });
          })()
        )}
      </Box>
    </Box>
  );
};

export default Recibidos;
