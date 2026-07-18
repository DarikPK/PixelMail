import { useState, useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import {
  Snackbar,
  Button,
  Box,
  Typography
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';

const ReloadPrompt = () => {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: ServiceWorkerRegistration | undefined) {
      console.log('[SW] Service Worker registrado exitosamente:', r);
    },
    onRegisterError(error: any) {
      console.error('[SW] Error al registrar el Service Worker:', error);
    },
  });

  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (needRefresh) {
      setOpen(true);
    }
  }, [needRefresh]);

  const handleClose = () => {
    setOpen(false);
  };

  const handleUpdate = () => {
    updateServiceWorker(true);
    setOpen(false);
  };

  return (
    <Snackbar
      open={open}
      autoHideDuration={null}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    >
      <Box
        sx={{
          bgcolor: 'background.paper',
          color: 'text.primary',
          p: 2,
          borderRadius: '12px',
          border: '1px solid',
          borderColor: 'primary.main',
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          maxWidth: 320
        }}
      >
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
            Nueva versión disponible
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Hay cambios y optimizaciones en Pixel Mail listos para ti.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button
            size="small"
            variant="text"
            onClick={handleClose}
            sx={{ color: 'text.secondary', textTransform: 'none', fontSize: '12px' }}
          >
            Descartar
          </Button>
          <Button
            size="small"
            variant="contained"
            color="primary"
            startIcon={<RefreshIcon sx={{ fontSize: '14px' }} />}
            onClick={handleUpdate}
            sx={{ textTransform: 'none', fontSize: '12px', fontWeight: 'bold' }}
          >
            Actualizar
          </Button>
        </Box>
      </Box>
    </Snackbar>
  );
};

export default ReloadPrompt;
