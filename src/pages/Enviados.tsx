import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Card,
  CardContent,
  Avatar,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Send as SendIcon,
  Attachment as AttachIcon,
  Delete
} from '@mui/icons-material';
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { collection, query, where, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';

interface EmailData {
  id: string;
  to: string;
  subject: string;
  body: string;
  status: string;
  createdAt: any;
  attachments: any[];
}

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

const Enviados = () => {
  const { user } = useAuth();
  const [emails, setEmails] = useState<EmailData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'emails'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const emailsData: EmailData[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Filtrar en memoria por enviados (direction != inbound) por robustez
        if (data.direction !== 'inbound') {
          emailsData.push({
            id: doc.id,
            to: data.to || '',
            subject: data.subject || '',
            body: data.body || '',
            status: data.status || 'sent',
            createdAt: data.createdAt?.toDate() || new Date(),
            attachments: data.attachments || []
          });
        }
      });
      setEmails(emailsData);
      setLoading(false);
      console.log('[FIRESTORE] sent emails loaded');
    }, (error) => {
      console.error("Error fetching emails:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleDeleteSent = async (e: React.MouseEvent, emailId: string) => {
    e.stopPropagation();
    const confirmMessage = "¿Deseas eliminar este registro de correo enviado?\n\nEsta acción no se puede deshacer de forma sencilla.";
    if (!window.confirm(confirmMessage)) return;

    try {
      await deleteDoc(doc(db, 'emails', emailId));
      console.log(`[FIRESTORE] Correo enviado ${emailId} eliminado.`);
    } catch (err) {
      console.error("Error al borrar correo enviado:", err);
    }
  };

  return (
    <Box sx={{ animation: 'fadeIn 200ms ease-in-out' }}>
      <Typography variant="h3" sx={{ fontWeight: 800, color: '#FFFFFF', letterSpacing: '-1px', mb: 3 }}>
        Correos Enviados
      </Typography>

      {/* Listado de Tarjetas Modernas de Correos Enviados */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={36} />
          </Box>
        ) : emails.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: 'center', bgcolor: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.08)' }}>
            <Typography variant="body1" color="text.secondary">
              No hay correos enviados.
            </Typography>
          </Paper>
        ) : (
          emails.map((email) => {
            const recipientName = email.to.split('@')[0] || email.to;
            const initial = recipientName.charAt(0).toUpperCase();
            const avatarBg = getAvatarColor(recipientName);

            // Primer fragmento del cuerpo
            const previewText = email.body?.replace(/<[^>]*>/g, '').substring(0, 100) || '(Sin contenido)';

            return (
              <Card
                key={email.id}
                variant="outlined"
                sx={{
                  borderRadius: '16px',
                  bgcolor: 'rgba(255,255,255,0.02)',
                  borderColor: 'rgba(255,255,255,0.08)',
                  transition: 'all 180ms ease-in-out',
                  '&:hover': {
                    bgcolor: '#242C3D',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 16px -2px rgba(0,0,0,0.3)',
                    borderColor: 'rgba(255,255,255,0.15)',
                    '& .quick-actions': { opacity: 1 }
                  }
                }}
              >
                <CardContent sx={{ p: '16px !important', display: 'flex', alignItems: 'center', gap: 2, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
                  {/* Icono de envíos */}
                  <Box sx={{ display: 'flex', alignItems: 'center', px: 1 }}>
                    <SendIcon sx={{ color: '#3B82F6', fontSize: '20px' }} />
                  </Box>

                  {/* Avatar del destinatario */}
                  <Avatar sx={{ bgcolor: avatarBg, width: 40, height: 40, fontSize: '14px', fontWeight: 'bold' }}>
                    {initial}
                  </Avatar>

                  {/* Asunto, destinatario y vista previa */}
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
                      <Typography variant="body1" noWrap sx={{ fontWeight: 600, color: '#FFFFFF', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: 200 }}>
                        Para: {recipientName}
                      </Typography>

                      <Box sx={{ px: 1, py: 0.2, borderRadius: '4px', bgcolor: 'rgba(34,197,94,0.15)', color: '#22C55E', fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                        ENVIADO
                      </Box>

                      {email.attachments && email.attachments.length > 0 && (
                        <AttachIcon sx={{ fontSize: '16px', color: '#6F7A8A' }} />
                      )}
                    </Box>

                    <Typography variant="body1" noWrap sx={{ fontWeight: 500, color: '#B8C1D1', mb: 0.5, textOverflow: 'ellipsis', overflow: 'hidden' }}>
                      {email.subject || '(Sin asunto)'}
                    </Typography>

                    <Typography variant="body2" noWrap sx={{ color: '#6F7A8A', textOverflow: 'ellipsis', overflow: 'hidden', display: 'block' }}>
                      {previewText}
                    </Typography>
                  </Box>

                  {/* Fecha y acciones rápidas */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1, minWidth: 100, alignSelf: 'stretch', justifyContent: 'space-between' }}>
                    <Typography variant="caption" sx={{ color: '#6F7A8A', fontWeight: 500 }}>
                      {email.createdAt.toLocaleDateString('es-PE', { month: 'short', day: 'numeric' })}
                    </Typography>

                    {/* Acciones rápidas al hacer hover */}
                    <Box
                      className="quick-actions"
                      onClick={(e) => e.stopPropagation()}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        opacity: { xs: 1, md: 0 },
                        transition: 'opacity 150ms ease-in-out',
                        bgcolor: 'background.paper',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.05)',
                        p: 0.2
                      }}
                    >
                      <Tooltip title="Eliminar registro">
                        <IconButton size="small" onClick={(e) => handleDeleteSent(e, email.id)} sx={{ color: '#EF4444' }}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
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

export default Enviados;
