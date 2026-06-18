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
  Chip
} from '@mui/material';
import { useEffect, useState } from 'react';
import type { Email } from '../types';

const Enviados = () => {
  const [emails, setEmails] = useState<Email[]>([]);

  useEffect(() => {
    const savedEmails = JSON.parse(localStorage.getItem('pixel_mail_sent') || '[]');
    setEmails(savedEmails);
  }, []);

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
        Correos Enviados
      </Typography>

      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table sx={{ minWidth: 650 }} aria-label="tabla de correos enviados">
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Destinatario</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Asunto</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Fecha</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Estado</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {emails.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                  <Typography variant="body1" color="text.secondary">
                    No hay correos enviados.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              emails.map((email) => (
                <TableRow key={email.id} hover>
                  <TableCell>{email.to}</TableCell>
                  <TableCell>{email.subject}</TableCell>
                  <TableCell>{email.date}</TableCell>
                  <TableCell>
                    <Chip
                      label={email.status}
                      color="info"
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default Enviados;
