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
  Tooltip
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
  KeyboardArrowRight as ArrowRightIcon
} from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCustomTheme } from '../contexts/ThemeContext';
import { useEmails } from '../contexts/EmailContext';
import { Collapse } from '@mui/material';

const drawerWidth = 220;

const Layout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorOpen] = useState<null | HTMLElement>(null);
  const { user, logout } = useAuth();
  const { mode, toggleTheme } = useCustomTheme();
  const { emails, folders, counts, activeNav, activeFolderId, setActiveNav, setActiveFolderId } = useEmails();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Estado para carpetas colapsadas/expandidas en la barra lateral
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>(() => {
    return { trabajo: false, personal: false, importante: false };
  });

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
      p: 1.5,
      borderRight: `1px solid ${mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.10)'}`
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
        <Box sx={{ mb: 1.0 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.2 }}>
            <Typography variant="caption" sx={{ color: mode === 'dark' ? '#B8C1D1' : '#64748B', fontWeight: 500, fontSize: '10px' }}>
              Almacenamiento
            </Typography>
            <Typography variant="caption" sx={{ color: '#6F7A8A', fontSize: '10px' }}>
              2.4 GB de 10 GB
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={24}
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
            versión 6.2
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
          flexDirection: 'column'
        }}
      >
        <Box sx={{ width: '100%', maxWidth: '100%', flexGrow: 1 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;
