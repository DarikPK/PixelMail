import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  useTheme,
  Button,
  LinearProgress,
  InputBase,
  Avatar,
  Menu,
  MenuItem,
  Tooltip,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  FormControl,
  InputLabel,
  CircularProgress
} from '@mui/material';
import {
  Menu as MenuIcon,
  Send as SendIcon,
  Inbox as InboxIcon,
  Star as StarIcon,
  Archive as ArchiveIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Search as SearchIcon,
  Notifications as NotificationsIcon,
  Folder as FolderIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  Add as AddIcon,
  KeyboardArrowDown as ArrowDownIcon,
  KeyboardArrowRight as ArrowRightIcon,
  Attachment as AttachIcon,
  DeleteForever as DeleteForeverIcon,
  Close as CloseIcon,
  OpenInNew as OpenIcon
} from '@mui/icons-material';
import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCustomTheme } from '../contexts/ThemeContext';
import { useEmails, getEmailSizeBytes } from '../contexts/EmailContext';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const drawerWidth = 220;

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  if (bytes < 1024) return bytes + ' Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

const Layout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorOpen] = useState<null | HTMLElement>(null);
  const { user, logout, loading: authLoading } = useAuth();
  const { mode, toggleTheme } = useCustomTheme();
  const { emails, folders, counts, activeNav, activeFolderId, setActiveNav, setActiveFolderId, storageBreakdown } = useEmails();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Estado para carpetas colapsadas/expandidas en la barra lateral
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>(() => {
    return { trabajo: false, personal: false, importante: false };
  });

  // Modal de administración de almacenamiento y sus filtros/ordenamientos
  const [storageModalOpen, setStorageModalOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<'all' | 'inbound' | 'outbound' | 'trash' | 'attachments'>('all');
  const [filterSize, setFilterSize] = useState<string>('all'); // all, 1, 5, 10 (MB)
  const [sortType, setSortType] = useState<string>('size_desc'); // size_desc, size_asc, date_desc, date_asc

  // Lista procesada de elementos que ocupan espacio
  const spaceEaters = useMemo(() => {
    let list = emails.map(email => ({
      email,
      size: getEmailSizeBytes(email),
      hasAttachments: email.attachments && email.attachments.length > 0
    }));

    // Filtro por categoría
    if (filterCategory === 'inbound') {
      list = list.filter(item => item.email.direction === 'inbound' && !item.email.deleted);
    } else if (filterCategory === 'outbound') {
      list = list.filter(item => item.email.direction !== 'inbound' && !item.email.deleted);
    } else if (filterCategory === 'trash') {
      list = list.filter(item => item.email.deleted);
    } else if (filterCategory === 'attachments') {
      list = list.filter(item => item.hasAttachments && !item.email.deleted);
    }

    // Filtro por tamaño mínimo
    if (filterSize === '1') {
      list = list.filter(item => item.size >= 1 * 1024 * 1024);
    } else if (filterSize === '5') {
      list = list.filter(item => item.size >= 5 * 1024 * 1024);
    } else if (filterSize === '10') {
      list = list.filter(item => item.size >= 10 * 1024 * 1024);
    }

    // Ordenamiento
    list.sort((a, b) => {
      if (sortType === 'size_desc') {
        return b.size - a.size;
      } else if (sortType === 'size_asc') {
        return a.size - b.size;
      } else if (sortType === 'date_desc') {
        return b.email.receivedAt.getTime() - a.email.receivedAt.getTime();
      } else if (sortType === 'date_asc') {
        return a.email.receivedAt.getTime() - b.email.receivedAt.getTime();
      }
      return 0;
    });

    return list;
  }, [emails, filterCategory, filterSize, sortType]);

  const handleOpenEmailFromStorage = (emailId: string, email: any) => {
    setStorageModalOpen(false);
    if (email.direction !== 'inbound') {
      navigate('/enviados');
    } else {
      const folderParam = email.folderId ? `&folder=${email.folderId}` : '';
      const tabParam = email.archived ? '&tab=2' : '';
      navigate(`/recibidos?open=${emailId}${folderParam}${tabParam}`);
    }
  };

  const handleDeleteEmailFromStorage = async (emailId: string, email: any) => {
    if (email.deleted) {
      const confirmMsg = '¿Deseas eliminar definitivamente este correo de la papelera?\n\nEsta acción no se puede deshacer y liberará espacio de almacenamiento.';
      if (!window.confirm(confirmMsg)) return;
      try {
        await deleteDoc(doc(db, 'emails', emailId));
        console.log(`[STORAGE MANAGER] Correo ${emailId} eliminado definitivamente.`);
      } catch (err) {
        console.error("Error deleting definitively from storage manager:", err);
      }
    } else {
      const isSent = email.direction !== 'inbound';
      const prev = isSent ? 'sent' : (email.archived ? 'archived' : (email.folderId || 'inbox'));
      try {
        await updateDoc(doc(db, 'emails', emailId), {
          deleted: true,
          deletedAt: new Date(),
          previousFolder: prev
        });
        console.log(`[STORAGE MANAGER] Correo ${emailId} movido a la papelera.`);
      } catch (err) {
        console.error("Error moving to trash from storage manager:", err);
      }
    }
  };

  const toggleFolderExpand = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Evitar navegación si solo se hace clic en la flecha de expandir
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorOpen(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorOpen(null);
  };

  // Sincronizar la navegación URL con el estado global de EmailContext
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    const folder = params.get('folder');

    if (location.pathname === '/recibidos') {
      if (folder) {
        setActiveNav('folder');
        setActiveFolderId(folder);
      } else if (tab === '1') {
        setActiveNav('destacados');
        setActiveFolderId(null);
      } else if (tab === '2') {
        setActiveNav('archivados');
        setActiveFolderId(null);
      } else if (tab === '3') {
        setActiveNav('eliminados');
        setActiveFolderId(null);
      } else {
        setActiveNav('recibidos');
        setActiveFolderId(null);
      }
    } else if (location.pathname === '/enviados') {
      setActiveNav('enviados');
      setActiveFolderId(null);
    } else if (location.pathname === '/configuracion') {
      setActiveNav('configuracion');
      setActiveFolderId(null);
    }
  }, [location.pathname, location.search, setActiveNav, setActiveFolderId]);

  // Secciones principales del menú lateral con contadores independientes
  const menuItems = [
    { text: `Bandeja de Entrada (${counts.inbox})`, icon: <InboxIcon />, path: '/recibidos', key: 'recibidos' },
    { text: `Destacados (${counts.starred})`, icon: <StarIcon />, path: '/recibidos?tab=1', key: 'destacados' },
    { text: `Enviados (${counts.sent})`, icon: <SendIcon />, path: '/enviados', key: 'enviados' },
    { text: `Archivados (${counts.archived})`, icon: <ArchiveIcon />, path: '/recibidos?tab=2', key: 'archivados' },
    { text: `Eliminados (${counts.deleted})`, icon: <DeleteIcon />, path: '/recibidos?tab=3', key: 'eliminados' },
    { text: 'Configuración', icon: <SettingsIcon />, path: '/configuracion', key: 'configuracion' },
  ];

  const userInitial = user?.email ? user.email.charAt(0).toUpperCase() : 'U';
  const userName = user?.email ? user.email.split('@')[0] : 'Usuario';

  const drawer = (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      bgcolor: mode === 'dark' ? '#131722' : '#FFFFFF',
      color: mode === 'dark' ? '#FFFFFF' : '#111827',
      p: 1.5
    }}>
      {/* Parte superior: Logo Pixel Mail (reducido, logo: 18px-20px) */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.0, py: 1.0, px: 0.5 }}>
        <Box sx={{ width: 22, height: 22, borderRadius: '4px', bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#FFF', fontSize: '12px' }}>
          P
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.5px', color: mode === 'dark' ? '#FFFFFF' : '#111827', fontSize: '15px' }}>
          PixelMail
        </Typography>
      </Box>

      {/* Botón muy llamativo: Redactar (alto aproximado de 40px) */}
      <Box sx={{ my: 1.0 }}>
        <Button
          fullWidth
          variant="contained"
          startIcon={<AddIcon sx={{ fontSize: '16px' }} />}
          onClick={() => {
            navigate('/redactar');
            if (isMobile) setMobileOpen(false);
          }}
          sx={{
            py: 0.8,
            height: '38px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
            boxShadow: '0 2px 8px rgba(59, 130, 246, 0.2)',
            fontWeight: 'bold',
            color: '#FFFFFF',
            fontSize: '13px',
            transition: 'transform 150ms ease-in-out',
            '&:hover': {
              transform: 'scale(1.02)',
              background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)',
            }
          }}
        >
          Redactar
        </Button>
      </Box>

      <Divider sx={{ borderColor: mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.10)', my: 0.5 }} />

      {/* Opciones del menú compactas */}
      <List sx={{ flexGrow: 1, py: 0.1, overflowY: 'auto', '& .MuiListItem-root': { py: 0 } }}>
        {menuItems.map((item) => {
          const isSelected = activeNav === item.key;
          return (
            <ListItem key={item.key} disablePadding sx={{ mb: 0.1 }}>
              <ListItemButton
                selected={isSelected}
                onClick={() => {
                  navigate(item.path);
                  if (isMobile) setMobileOpen(false);
                }}
                sx={{
                  py: 0.4,
                  px: 1.0,
                  height: '32px',
                  borderRadius: '6px',
                  transition: 'all 120ms ease-in-out',
                  position: 'relative',
                  color: isSelected ? (mode === 'dark' ? '#FFFFFF' : '#3B82F6') : (mode === 'dark' ? '#B8C1D1' : '#64748B'),
                  bgcolor: isSelected ? (mode === 'dark' ? 'rgba(59, 130, 246, 0.15) !important' : 'rgba(59, 130, 246, 0.08) !important') : 'transparent',
                  '&:hover': {
                    bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.03)',
                    color: mode === 'dark' ? '#FFFFFF' : '#111827',
                  }
                }}
              >
                {/* Indicador lateral azul */}
                {isSelected && (
                  <Box sx={{ position: 'absolute', left: 0, top: '25%', bottom: '25%', width: 2.5, bgcolor: '#3B82F6', borderRadius: '0 2px 2px 0' }} />
                )}
                <ListItemIcon sx={{ minWidth: 24, color: isSelected ? '#3B82F6' : 'inherit', '& svg': { fontSize: '16px' } }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  slotProps={{
                    primary: { fontSize: '12px', fontWeight: isSelected ? 600 : 500 } as any
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}

        {/* Sección "Carpetas" con explorador interactivo */}
        <Typography variant="caption" sx={{ display: 'block', px: 1.0, pt: 1.0, pb: 0.2, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 'bold', color: '#6F7A8A', fontSize: '9.5px' }}>
          Carpetas
        </Typography>
        {folders.map((folder) => {
          const isSelected = activeNav === 'folder' && activeFolderId === folder.id;
          const isExpanded = !!expandedFolders[folder.id];
          const folderEmails = emails.filter((e) => e.folderId === folder.id);
          const folderCount = counts.folders[folder.id] || 0;

          return (
            <Box key={folder.id} sx={{ mb: 0.1 }}>
              <ListItemButton
                selected={isSelected}
                onClick={() => {
                  navigate(`/recibidos?folder=${folder.id}`);
                  if (isMobile) setMobileOpen(false);
                }}
                sx={{
                  py: 0.4,
                  px: 1.0,
                  height: '32px',
                  borderRadius: '6px',
                  color: isSelected ? (mode === 'dark' ? '#FFFFFF' : '#3B82F6') : (mode === 'dark' ? '#B8C1D1' : '#64748B'),
                  bgcolor: isSelected ? (mode === 'dark' ? 'rgba(59, 130, 246, 0.15) !important' : 'rgba(59, 130, 246, 0.08) !important') : 'transparent',
                  '&:hover': {
                    bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.03)',
                  }
                }}
              >
                {/* Botón de expandir/colapsar */}
                <IconButton
                  size="small"
                  onClick={(e) => toggleFolderExpand(folder.id, e)}
                  sx={{ p: 0.1, mr: 0.5, color: 'text.secondary' }}
                >
                  {isExpanded ? <ArrowDownIcon sx={{ fontSize: '15px' }} /> : <ArrowRightIcon sx={{ fontSize: '15px' }} />}
                </IconButton>

                <ListItemIcon sx={{ minWidth: 20, color: folder.color, '& svg': { fontSize: '15px' } }}>
                  <FolderIcon />
                </ListItemIcon>

                <ListItemText
                  primary={`${folder.name} (${folderCount})`}
                  slotProps={{
                    primary: { fontSize: '12px', fontWeight: isSelected ? 600 : 500 } as any
                  }}
                />
              </ListItemButton>

              {/* Vista previa miniatura de los correos contenidos (Mini Outlook) */}
              <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                <List component="div" disablePadding sx={{ pl: 2, mt: 0.5, mb: 0.5, display: 'flex', flexDirection: 'column', gap: 0.4 }}>
                  {folderEmails.length === 0 ? (
                    <Typography variant="caption" sx={{ pl: 1, py: 0.2, color: 'text.disabled', fontStyle: 'italic', fontSize: '10px' }}>
                      Vacía
                    </Typography>
                  ) : (
                    folderEmails.slice(0, 3).map((email) => {
                      const senderName = email.fromName || email.fromEmail.split('@')[0] || email.from;
                      const initial = senderName.charAt(0).toUpperCase();
                      const isUnread = !email.read;

                      return (
                        <Box
                          key={email.id}
                          onClick={() => {
                            navigate(`/recibidos?folder=${folder.id}&open=${email.id}`);
                            if (isMobile) setMobileOpen(false);
                          }}
                          sx={{
                            p: 0.5,
                            borderRadius: '4px',
                            cursor: 'pointer',
                            bgcolor: isUnread ? (mode === 'dark' ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.05)') : 'transparent',
                            border: `1px solid ${isUnread ? 'rgba(59,130,246,0.2)' : 'transparent'}`,
                            transition: 'all 100ms',
                            display: 'flex',
                            gap: 0.6,
                            alignItems: 'center',
                            minWidth: 0,
                            '&:hover': {
                              bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.03)'
                            }
                          }}
                        >
                          <Avatar sx={{ bgcolor: folder.color, width: 16, height: 16, fontSize: '8px', fontWeight: 'bold', color: '#FFF' }}>
                            {initial}
                          </Avatar>
                          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                            <Typography variant="caption" noWrap sx={{ fontWeight: isUnread ? 700 : 500, fontSize: '10px', color: 'text.primary', display: 'block', lineHeight: 1.1 }}>
                              {senderName}
                            </Typography>
                            <Typography variant="caption" noWrap sx={{ fontSize: '9px', color: 'text.secondary', display: 'block', lineHeight: 1.1 }}>
                              {email.subject || '(Sin asunto)'}
                            </Typography>
                          </Box>
                        </Box>
                      );
                    })
                  )}
                  {folderEmails.length > 3 && (
                    <Typography variant="caption" sx={{ pl: 1, color: '#3B82F6', fontWeight: 600, fontSize: '9px' }}>
                      + {folderEmails.length - 3} más...
                    </Typography>
                  )}
                </List>
              </Collapse>
            </Box>
          );
        })}
      </List>

      <Divider sx={{ borderColor: mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.10)', my: 0.5 }} />

      {/* Al final: Almacenamiento, Versión y Toggle de Tema Funcional */}
      <Box sx={{ p: 0.2, mt: 'auto' }}>
        <Box
          onClick={() => setStorageModalOpen(true)}
          sx={{
            mb: 1.0,
            cursor: 'pointer',
            borderRadius: '6px',
            p: '4px 6px',
            transition: 'background 120ms',
            '&:hover': {
              bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.03)'
            }
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.2 }}>
            <Typography variant="caption" sx={{ color: mode === 'dark' ? '#B8C1D1' : '#64748B', fontWeight: 600, fontSize: '10px' }}>
              Almacenamiento
            </Typography>
            <Typography variant="caption" sx={{ color: '#6F7A8A', fontSize: '10px' }}>
              {formatBytes(storageBreakdown.totalBytes)} de 10 GB
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={storageBreakdown.percentageUsed}
            sx={{
              height: 4,
              borderRadius: '2px',
              bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)',
              '& .MuiLinearProgress-bar': {
                bgcolor: '#3B82F6',
              }
            }}
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="caption" sx={{ color: '#6F7A8A', fontWeight: 600, fontSize: '10.5px' }}>
            versión 7.1
          </Typography>

          <Tooltip title={mode === 'dark' ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}>
            <IconButton
              size="small"
              type="button"
              onClick={toggleTheme}
              sx={{
                color: mode === 'dark' ? '#B8C1D1' : '#64748B',
                p: 0.5,
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.05)',
                }
              }}
              aria-label={mode === 'dark' ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}
            >
              {mode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: mode === 'dark' ? '#0F1117' : '#F4F7FB' }}>
      {/* Barra superior (AppBar) de 56px de alto */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          boxShadow: 'none',
          borderBottom: `1px solid ${mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.10)'}`,
          bgcolor: mode === 'dark' ? 'rgba(15, 17, 23, 0.8)' : 'rgba(244, 247, 251, 0.8)',
          backdropFilter: 'blur(12px)',
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', gap: 2, px: { xs: 1.5, md: 2 }, minHeight: '56px !important' }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ display: { md: 'none' }, color: mode === 'dark' ? '#FFFFFF' : '#111827' }}
          >
            <MenuIcon />
          </IconButton>

          {/* Buscador grande con efecto glass (altura de 34px-38px y ancho equilibrado) */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.03)',
              border: `1px solid ${mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.10)'}`,
              borderRadius: '8px',
              px: 1.2,
              height: '34px',
              width: '100%',
              maxWidth: 380,
              transition: 'all 150ms ease-in-out',
              '&:focus-within': {
                bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#FFFFFF',
                borderColor: '#3B82F6',
                boxShadow: '0 0 0 2px rgba(59,130,246,0.15)'
              }
            }}
          >
            <SearchIcon sx={{ color: '#6F7A8A', mr: 0.8, fontSize: '16px' }} />
            <InputBase
              placeholder="Buscar correos..."
              fullWidth
              disabled
              sx={{
                color: mode === 'dark' ? '#FFFFFF' : '#111827',
                fontSize: '13px',
                '& .MuiInputBase-input::placeholder': {
                  color: '#6F7A8A',
                  opacity: 1
                }
              }}
            />
          </Box>

          {/* Acciones derecha: Notificaciones, Configuración, Perfil */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Tooltip title="Notificaciones">
              <IconButton sx={{ color: mode === 'dark' ? '#B8C1D1' : '#64748B' }} disabled size="small">
                <NotificationsIcon sx={{ fontSize: '18px' }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Configuración">
              <IconButton
                sx={{ color: mode === 'dark' ? '#B8C1D1' : '#64748B' }}
                onClick={() => navigate('/configuracion')}
                size="small"
              >
                <SettingsIcon sx={{ fontSize: '18px' }} />
              </IconButton>
            </Tooltip>

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5, borderColor: mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.10)' }} />

            {/* Avatar interactivo */}
            <Box
              onClick={handleProfileMenuOpen}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.0,
                cursor: 'pointer',
                p: 0.2,
                borderRadius: '8px',
                '&:hover': { bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.03)' }
              }}
            >
              <Avatar
                sx={{
                  bgcolor: '#3B82F6',
                  color: '#FFFFFF',
                  width: 28,
                  height: 28,
                  fontSize: '11px',
                  fontWeight: 'bold',
                  border: '1.5px solid rgba(255,255,255,0.1)'
                }}
              >
                {userInitial}
              </Avatar>
              <Typography variant="body2" sx={{ fontWeight: 600, color: mode === 'dark' ? '#FFFFFF' : '#111827', display: { xs: 'none', sm: 'block' }, fontSize: '12.5px' }}>
                {userName}
              </Typography>
            </Box>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleProfileMenuClose}
              slotProps={{
                paper: {
                  sx: {
                    mt: 1.0,
                    p: 0.5,
                    borderRadius: '10px',
                    bgcolor: mode === 'dark' ? '#1B2130' : '#FFFFFF',
                    border: `1px solid ${mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15, 23, 42, 0.10)'}`,
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)',
                    minWidth: 160
                  }
                }
              }}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <MenuItem onClick={() => { handleProfileMenuClose(); navigate('/configuracion'); }} sx={{ borderRadius: '6px', py: 0.8, fontSize: '13px' }}>
                <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
                Configuración
              </MenuItem>
              <Divider sx={{ borderColor: mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.10)' }} />
              <MenuItem onClick={() => { handleProfileMenuClose(); logout(); }} sx={{ borderRadius: '6px', py: 0.8, color: 'error.main', fontSize: '13px' }}>
                <ListItemIcon><LogoutIcon fontSize="small" color="error" /></ListItemIcon>
                Cerrar Sesión
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Drawer menú lateral */}
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: `1px solid ${mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.10)'}` },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: `1px solid ${mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.10)'}` },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Área principal del contenido súper ancha y con márgenes reducidos */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 1.5, md: 2.5 },
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: '56px',
          bgcolor: mode === 'dark' ? '#0F1117' : '#F4F7FB',
          minHeight: 'calc(100vh - 56px)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}
      >
        <Box sx={{ width: '100%', maxWidth: '100%', flexGrow: 1, position: 'relative', minHeight: '100%' }}>
          {authLoading ? (
            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', bgcolor: 'transparent' }}>
              <CircularProgress size={32} />
            </Box>
          ) : (
            <Outlet />
          )}
        </Box>
      </Box>

      {/* Modal / Dialog "Administrar Almacenamiento" */}
      <Dialog
        open={storageModalOpen}
        onClose={() => setStorageModalOpen(false)}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: '12px',
              bgcolor: mode === 'dark' ? '#1B2130' : '#FFFFFF',
              border: `1px solid ${mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.10)'}`,
              backgroundImage: 'none',
              p: 1.5
            }
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, borderBottom: '1px solid divider' }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: '16px', color: 'text.primary' }}>
            Administrar almacenamiento
          </Typography>
          <IconButton size="small" onClick={() => setStorageModalOpen(false)} sx={{ color: 'text.secondary' }}>
            <CloseIcon sx={{ fontSize: '20px' }} />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: '16px 8px !important' }}>
          {/* Desglose de Almacenamiento usando Box con display grid */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 2fr' }, gap: 2, mb: 3 }}>
            <Card variant="outlined" sx={{ bgcolor: 'action.hover', p: 1.5, borderRadius: '8px', border: '1px solid divider' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block' }}>
                ESTADO GENERAL
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.5, fontSize: '16px', color: 'text.primary' }}>
                {formatBytes(storageBreakdown.totalBytes)} de 10 GB
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                Usado: {storageBreakdown.percentageUsed.toFixed(2)}% | Actualizado: {storageBreakdown.lastUpdated}
              </Typography>
            </Card>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr' }, gap: 1 }}>
              {[
                { label: 'Recibidos', val: storageBreakdown.receivedBytes, color: '#3B82F6' },
                { label: 'Enviados', val: storageBreakdown.sentBytes, color: '#10B981' },
                { label: 'Adjuntos', val: storageBreakdown.attachmentsBytes, color: '#EF4444' },
                { label: 'Imágenes Embebidas', val: storageBreakdown.embeddedBytes, color: '#8B5CF6' },
                { label: 'Papelera', val: storageBreakdown.trashBytes, color: '#F59E0B' },
                { label: 'Otros / Sistema', val: storageBreakdown.othersBytes, color: '#6F7A8A' }
              ].map((item) => (
                <Box key={item.label} sx={{ p: 0.8, border: '1px solid divider', borderRadius: '6px', bgcolor: 'background.paper' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: item.color }} />
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '10.5px' }}>
                      {item.label}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, ml: 1.2, fontSize: '12px', mt: 0.2, color: 'text.primary' }}>
                    {formatBytes(item.val)}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {/* Elementos que más espacio ocupan */}
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1.5, fontSize: '13.5px', color: 'text.primary' }}>
            Elementos que más espacio ocupan
          </Typography>

          {/* Filtros y Ordenamiento */}
          <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel sx={{ fontSize: '11.5px' }}>Categoría</InputLabel>
              <Select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value as any)}
                label="Categoría"
                sx={{ fontSize: '12px' }}
              >
                <MenuItem value="all">Todos</MenuItem>
                <MenuItem value="inbound">Recibidos</MenuItem>
                <MenuItem value="outbound">Enviados</MenuItem>
                <MenuItem value="trash">Papelera</MenuItem>
                <MenuItem value="attachments">Con adjuntos</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel sx={{ fontSize: '11.5px' }}>Tamaño mínimo</InputLabel>
              <Select
                value={filterSize}
                onChange={(e) => setFilterSize(e.target.value as string)}
                label="Tamaño mínimo"
                sx={{ fontSize: '12px' }}
              >
                <MenuItem value="all">Todos</MenuItem>
                <MenuItem value="1">Mayores a 1 MB</MenuItem>
                <MenuItem value="5">Mayores a 5 MB</MenuItem>
                <MenuItem value="10">Mayores a 10 MB</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel sx={{ fontSize: '11.5px' }}>Ordenación</InputLabel>
              <Select
                value={sortType}
                onChange={(e) => setSortType(e.target.value as string)}
                label="Ordenación"
                sx={{ fontSize: '12px' }}
              >
                <MenuItem value="size_desc">Mayor tamaño</MenuItem>
                <MenuItem value="size_asc">Menor tamaño</MenuItem>
                <MenuItem value="date_desc">Más reciente</MenuItem>
                <MenuItem value="date_asc">Más antiguo</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Listado de elementos en tabla súper compacta con TableContainer */}
          <TableContainer sx={{ maxHeight: 220, border: '1px solid divider', borderRadius: '6px', bgcolor: 'background.paper' }}>
            <Table stickyHeader size="small" sx={{ '& .MuiTableCell-root': { py: 0.5, px: 1, fontSize: '11.5px' } }}>
              <TableHead>
                <TableRow>
                  <TableCell>De/Para</TableCell>
                  <TableCell>Asunto</TableCell>
                  <TableCell>Origen</TableCell>
                  <TableCell align="right">Tamaño</TableCell>
                  <TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {spaceEaters.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary', fontStyle: 'italic' }}>
                      No se encontraron correos con los filtros activos.
                    </TableCell>
                  </TableRow>
                ) : (
                  spaceEaters.map(({ email, size, hasAttachments }) => {
                    const fromEmail = email.fromEmail || '';
                    const recipient = Array.isArray(email.to)
                      ? (email.to[0] || '')
                      : (typeof email.to === 'string' ? email.to : '');

                    const party = email.direction === 'inbound'
                      ? (email.fromName || (fromEmail ? fromEmail.split('@')[0] : '') || email.from || 'Remitente')
                      : `Para: ${recipient ? (recipient.split('@')[0] || recipient) : 'Destinatario'}`;

                    let origin = 'Inbox';
                    if (email.deleted) origin = 'Papelera';
                    else if (email.direction !== 'inbound') origin = 'Enviados';
                    else if (email.archived) origin = 'Archivados';
                    else if (email.folderId) origin = `Carpeta: ${email.folderId}`;

                    return (
                      <TableRow key={email.id} hover>
                        <TableCell sx={{ fontWeight: 600, maxWidth: 120, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{party}</TableCell>
                        <TableCell sx={{ maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {hasAttachments && <AttachIcon sx={{ fontSize: '13px', color: 'text.secondary' }} />}
                            {email.subject || '(Sin asunto)'}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{origin}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>{formatBytes(size)}</TableCell>
                        <TableCell align="center" sx={{ display: 'flex', justifyContent: 'center', gap: 0.5, whiteSpace: 'nowrap' }}>
                          <Tooltip title="Abrir correo">
                            <IconButton size="small" onClick={() => handleOpenEmailFromStorage(email.id, email)} sx={{ p: 0.2, color: 'primary.main' }}>
                              <OpenIcon sx={{ fontSize: '15px' }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={email.deleted ? "Eliminar definitivamente" : "Mover a papelera"}>
                            <IconButton size="small" onClick={() => handleDeleteEmailFromStorage(email.id, email)} sx={{ p: 0.2, color: 'error.main' }}>
                              <DeleteForeverIcon sx={{ fontSize: '15px' }} />
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
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default Layout;
