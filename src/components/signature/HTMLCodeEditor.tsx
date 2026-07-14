import React from 'react';
import { Box, Typography, TextField } from '@mui/material';

interface HTMLCodeEditorProps {
  htmlCode: string;
  onCodeChange: (code: string) => void;
}

export const HTMLCodeEditor: React.FC<HTMLCodeEditorProps> = ({
  htmlCode,
  onCodeChange
}) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, height: '100%' }}>
      <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', display: 'block' }}>
        💻 Editor de Código HTML (Sincronización en Tiempo Real)
      </Typography>

      <TextField
        multiline
        fullWidth
        rows={16}
        value={htmlCode}
        onChange={(e) => onCodeChange(e.target.value)}
        variant="outlined"
        placeholder="Modifica o pega código HTML de firmas aquí..."
        slotProps={{
          input: {
            sx: {
              fontFamily: 'Consolas, Monaco, monospace',
              fontSize: '11px',
              lineHeight: '1.4',
              bgcolor: '#1E1E1E',
              color: '#D4D4D4',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'divider'
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: '#3B82F6'
              }
            }
          }
        }}
      />

      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px' }}>
        * Nota: Cualquier cambio realizado aquí actualizará el lienzo visual automáticamente. El código se sanitiza de scripts peligrosos para garantizar total seguridad.
      </Typography>
    </Box>
  );
};
