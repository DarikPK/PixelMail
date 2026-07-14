import React, { createContext, useContext, useState, useCallback } from 'react';
import { Snackbar, Alert, Typography, Box, IconButton } from '@mui/material';
import { CheckCircle as SuccessIcon, Error as ErrorIcon, Close as CloseIcon } from '@mui/icons-material';

export interface ToastOptions {
  message: string;
  subtitle?: string;
  severity?: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

interface ToastContextType {
  showToast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<ToastOptions>({ message: '', severity: 'success' });

  const showToast = useCallback((options: ToastOptions) => {
    setToast(options);
    setOpen(true);
  }, []);

  const handleClose = (_?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpen(false);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={toast.duration || 4000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleClose}
          severity={toast.severity || 'success'}
          icon={
            toast.severity === 'error' ? (
              <ErrorIcon sx={{ fontSize: '20px' }} />
            ) : (
              <SuccessIcon sx={{ color: '#10B981', fontSize: '20px' }} />
            )
          }
          sx={{
            width: '100%',
            borderRadius: '12px',
            bgcolor: toast.severity === 'error' ? '#EF4444' : '#1E293B',
            color: '#FFFFFF',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            '& .MuiAlert-icon': {
              color: toast.severity === 'error' ? '#FFFFFF' : '#10B981'
            },
            '& .MuiAlert-message': {
              flexGrow: 1,
              py: 0.5
            },
            '& .MuiAlert-action': {
              color: '#FFFFFF',
              pt: 0
            }
          }}
          action={
            <IconButton size="small" aria-label="close" color="inherit" onClick={handleClose}>
              <CloseIcon fontSize="small" />
            </IconButton>
          }
        >
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '13px', lineHeight: 1.2 }}>
              {toast.message}
            </Typography>
            {toast.subtitle && (
              <Typography variant="caption" sx={{ opacity: 0.85, fontSize: '11px', mt: 0.5 }}>
                {toast.subtitle}
              </Typography>
            )}
          </Box>
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast debe ser usado dentro de un ToastProvider');
  }
  return context;
};
