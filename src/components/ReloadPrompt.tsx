import { usePwaUpdate } from '../contexts/PwaUpdateContext';
import {
  Snackbar,
  Alert,
  Typography,
  Box
} from '@mui/material';
import { Info as InfoIcon, CheckCircle as SuccessIcon } from '@mui/icons-material';

import { useState, useEffect } from 'react';

const ReloadPrompt = () => {
  const { updatePending, showSuccessToast, setShowSuccessToast } = usePwaUpdate();
  const [showPending, setShowPending] = useState(false);

  useEffect(() => {
    if (updatePending) {
      setShowPending(true);
    }
  }, [updatePending]);

  return (
    <>
      {/* Aviso discreto no interactivo cuando la actualización está pospuesta, ocultándose tras 4 segundos */}
      <Snackbar
        open={showPending}
        autoHideDuration={4000}
        onClose={() => setShowPending(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert
          severity="info"
          icon={<InfoIcon sx={{ fontSize: '18px', color: '#3B82F6' }} />}
          sx={{
            borderRadius: '12px',
            bgcolor: '#1E293B',
            color: '#FFFFFF',
            boxShadow: '0 4px 15px rgba(0,0,0,0.25)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            display: 'flex',
            alignItems: 'center',
            py: 0.5,
            px: 1.5,
            '& .MuiAlert-message': {
              py: 0.2
            }
          }}
        >
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '12.5px', lineHeight: 1.2 }}>
              Nueva versión lista
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.85, fontSize: '10.5px', display: 'block' }}>
              Se aplicará automáticamente al terminar tu redacción o cambios.
            </Typography>
          </Box>
        </Alert>
      </Snackbar>

      {/* Aviso discreto de actualización exitosa */}
      <Snackbar
        open={showSuccessToast}
        autoHideDuration={4000}
        onClose={() => setShowSuccessToast(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity="success"
          icon={<SuccessIcon sx={{ color: '#10B981', fontSize: '18px' }} />}
          sx={{
            borderRadius: '12px',
            bgcolor: '#131722',
            color: '#FFFFFF',
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            display: 'flex',
            alignItems: 'center',
            py: 0.5,
            px: 1.5,
            '& .MuiAlert-message': {
              py: 0.2
            }
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '12.5px' }}>
            Pixel Mail se actualizó correctamente.
          </Typography>
        </Alert>
      </Snackbar>
    </>
  );
};

export default ReloadPrompt;
