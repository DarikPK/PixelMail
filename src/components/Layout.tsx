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
  Add as AddIcon
} from '@mui/icons-material';
import { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const drawerWidth = 280;

const Layout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorOpen] = useState<null | HTMLElement>(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorOpen(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorOpen(null);
  };

  // Secciones principales del menú lateral
  const menuItems = [
    { text: 'Bandeja de Entrada', icon: <InboxIcon />, path: '/recibidos' },
    { text: 'Destacados', icon: <StarIcon />, path: '/recibidos?tab=1' },
    { text: 'Enviados', icon: <SendIcon />, path: '/enviados' },
    { text: 'Archivados', icon: <ArchiveIcon />, path: '/recibidos?tab=2' },
    { text: 'Eliminados', icon: <DeleteIcon />, path: '/recibidos?tab=3' },
    { text: 'Configuración', icon: <SettingsIcon />, path: '/configuracion' },
  ];

  // Carpetas preparadas para futuras funcionalidades
  const folderItems = [
    { text: 'Trabajo', color: '#3B82F6' },
    { text: 'Personal', color: '#22C55E' },
    { text: 'Importante', color: '#FACC15' },
  ];

  const userInitial = user?.email ? user.email.charAt(0).toUpperCase() : 'U';
  const userName = user?.email ? user.email.split('@')[0] : 'Usuario';

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#131722', color: '#FFFFFF', p: 2 }}>
      {/* Parte superior: Logo Pixel Mail */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2, px: 1 }}>
        <Box sx={{ width: 32, height: 32, borderRadius: '8px', bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#FFF', fontSize: '18px' }}>
          P
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.5px', color: '#FFFFFF' }}>
          PixelMail
        </Typography>
      </Box>

      {/* Botón muy llamativo: Redactar */}
      <Box sx={{ my: 2 }}>
        <Button
          fullWidth
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            navigate('/redactar');
            if (isMobile) setMobileOpen(false);
          }}
          sx={{
            py: 1.5,
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
            fontWeight: 'bold',
            color: '#FFFFFF',
            fontSize: '16px',
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

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', my: 1 }} />

      {/* Opciones del menú */}
      <List sx={{ flexGrow: 1, overflowY: 'auto' }}>
        {menuItems.map((item) => {
          const isSelected = location.pathname + location.search === item.path;
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                selected={isSelected}
                onClick={() => {
                  navigate(item.path);
                  if (isMobile) setMobileOpen(false);
                }}
                sx={{
                  py: 1.2,
                  px: 2,
                  borderRadius: '12px',
                  transition: 'all 150ms ease-in-out',
                  position: 'relative',
                  color: isSelected ? '#FFFFFF' : '#B8C1D1',
                  bgcolor: isSelected ? 'rgba(59, 130, 246, 0.15) !important' : 'transparent',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.05)',
                    color: '#FFFFFF',
                  }
                }}
              >
                {/* Indicador lateral azul */}
                {isSelected && (
                  <Box sx={{ position: 'absolute', left: 0, top: '25%', bottom: '25%', width: 4, bgcolor: '#3B82F6', borderRadius: '0 4px 4px 0' }} />
                )}
                <ListItemIcon sx={{ minWidth: 36, color: isSelected ? '#3B82F6' : 'inherit' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  slotProps={{
                    primary: { fontSize: '15px', fontWeight: isSelected ? 600 : 500 } as any
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}

        {/* Sección "Carpetas" preparada */}
        <Typography variant="caption" sx={{ display: 'block', px: 2, pt: 3, pb: 1, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold', color: '#6F7A8A' }}>
          Carpetas
        </Typography>
        {folderItems.map((folder) => (
          <ListItem key={folder.text} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              disabled
              sx={{
                py: 0.8,
                px: 2,
                borderRadius: '12px',
                color: '#6F7A8A',
                '&:hover': { bgcolor: 'transparent' }
              }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: folder.color }}>
                <FolderIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={folder.text}
                slotProps={{
                  primary: { fontSize: '14px', fontWeight: 500 } as any
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', my: 1 }} />

      {/* Al final: Almacenamiento, Versión y Toggle visual */}
      <Box sx={{ p: 1 }}>
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" sx={{ color: '#B8C1D1', fontWeight: 500 }}>
              Almacenamiento
            </Typography>
            <Typography variant="caption" sx={{ color: '#6F7A8A' }}>
              2.4 GB de 10 GB
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={24}
            sx={{
              height: 6,
              borderRadius: '3px',
              bgcolor: 'rgba(255,255,255,0.08)',
              '& .MuiLinearProgress-bar': {
                bgcolor: '#3B82F6',
              }
            }}
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="caption" sx={{ color: '#6F7A8A', fontWeight: 600 }}>
            versión 5.14
          </Typography>

          <Tooltip title="Cambiar tema (Solo visual)">
            <IconButton size="small" sx={{ color: '#B8C1D1' }}>
              <DarkModeIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#0F1117' }}>
      {/* Barra superior (AppBar) */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          boxShadow: 'none',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          bgcolor: 'rgba(15, 17, 23, 0.8)',
          backdropFilter: 'blur(12px)',
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', gap: 2, px: { xs: 2, md: 3 } }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ display: { md: 'none' }, color: '#FFFFFF' }}
          >
            <MenuIcon />
          </IconButton>

          {/* Buscador grande con efecto glass */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              bgcolor: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px',
              px: 2,
              py: 0.5,
              width: '100%',
              maxWidth: 500,
              transition: 'all 150ms ease-in-out',
              '&:focus-within': {
                bgcolor: 'rgba(255,255,255,0.08)',
                borderColor: '#3B82F6',
                boxShadow: '0 0 0 2px rgba(59,130,246,0.2)'
              }
            }}
          >
            <SearchIcon sx={{ color: '#6F7A8A', mr: 1, fontSize: '20px' }} />
            <InputBase
              placeholder="Buscar correos..."
              fullWidth
              disabled
              sx={{
                color: '#FFFFFF',
                fontSize: '14px',
                '& .MuiInputBase-input::placeholder': {
                  color: '#6F7A8A',
                  opacity: 1
                }
              }}
            />
          </Box>

          {/* Acciones derecha: Notificaciones, Configuración, Perfil */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="Notificaciones">
              <IconButton sx={{ color: '#B8C1D1' }} disabled>
                <NotificationsIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Configuración">
              <IconButton
                sx={{ color: '#B8C1D1' }}
                onClick={() => navigate('/configuracion')}
              >
                <SettingsIcon />
              </IconButton>
            </Tooltip>

            <Divider orientation="vertical" flexItem sx={{ mx: 1, borderColor: 'rgba(255,255,255,0.08)' }} />

            {/* Avatar interactivo */}
            <Box
              onClick={handleProfileMenuOpen}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                cursor: 'pointer',
                p: 0.5,
                borderRadius: '12px',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' }
              }}
            >
              <Avatar
                sx={{
                  bgcolor: '#3B82F6',
                  color: '#FFFFFF',
                  width: 36,
                  height: 36,
                  fontSize: '14px',
                  fontWeight: 'bold',
                  border: '2px solid rgba(255,255,255,0.1)'
                }}
              >
                {userInitial}
              </Avatar>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#FFFFFF', display: { xs: 'none', sm: 'block' } }}>
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
                    mt: 1.5,
                    p: 1,
                    borderRadius: '12px',
                    bgcolor: '#1B2130',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)',
                    minWidth: 180
                  }
                }
              }}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <MenuItem onClick={() => { handleProfileMenuClose(); navigate('/configuracion'); }} sx={{ borderRadius: '8px', py: 1 }}>
                <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
                Configuración
              </MenuItem>
              <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />
              <MenuItem onClick={() => { handleProfileMenuClose(); logout(); }} sx={{ borderRadius: '8px', py: 1, color: 'error.main' }}>
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
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: '1px solid rgba(255,255,255,0.08)' },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: '1px solid rgba(255,255,255,0.08)' },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Área principal del contenido */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, md: 4 },
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: '64px',
          bgcolor: '#0F1117',
          minHeight: 'calc(100vh - 64px)'
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;
