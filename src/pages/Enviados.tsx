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
      <Typography variant="h3" sx={{ fontWeight: 700, color: 'text.primary', letterSpacing: '-0.5px', fontSize: { xs: '22px', md: '26px' }, lineHeight: 1.2, mb: 1.5 }}>
        Correos Enviados
      </Typography>

      {/* Listado de Filas de Correos Enviados compactadas (CSS Grid) */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4, mt: 1.5 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={26} />
          </Box>
        ) : emails.length === 0 ? (
          <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'rgba(15,23,42,0.01)', border: '1px dashed divider' }}>
            <Typography variant="body2" color="text.secondary">
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
                  borderRadius: '6px',
                  bgcolor: 'background.paper',
                  borderColor: 'divider',
                  transition: 'all 120ms ease-in-out',
                  height: '48px', // Ultra compacto
                  display: 'flex',
                  alignItems: 'center',
                  '&:hover': {
                    bgcolor: 'action.hover',
                    borderColor: 'text.secondary',
                    '& .quick-actions': { opacity: 1 }
                  }
                }}
              >
                <CardContent sx={{
                  p: '0px 12px !important',
                  width: '100%',
                  display: 'grid',
                  gridTemplateColumns: '70px 42px minmax(140px, 200px) minmax(200px, 1fr) 90px 80px',
                  alignItems: 'center',
                  gap: 1.0
                }}>
                  {/* Icono de envíos */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.2 }}>
                    <SendIcon sx={{ color: '#3B82F6', fontSize: '15px' }} />
                  </Box>

                  {/* Avatar del destinatario (reducido a 26px) */}
                  <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <Avatar sx={{ bgcolor: avatarBg, width: 26, height: 26, fontSize: '10.5px', fontWeight: 'bold' }}>
                      {initial}
                    </Avatar>
                  </Box>

                  {/* Destinatario (minmax(140px, 200px)) */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
                    <Typography variant="body2" noWrap sx={{ fontWeight: 600, color: 'text.primary', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: 200, fontSize: '12.5px' }}>
                      Para: {recipientName}
                    </Typography>

                    <Box sx={{ px: 0.6, py: 0.05, borderRadius: '3px', bgcolor: 'rgba(34,197,94,0.15)', color: '#22C55E', fontSize: '8px', fontWeight: 'bold' }}>
                      ENVIADO
                    </Box>

                    {email.attachments && email.attachments.length > 0 && (
                      <AttachIcon sx={{ fontSize: '12px', color: 'text.disabled' }} />
                    )}
                  </Box>

                  {/* Asunto y vista previa */}
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.8, minWidth: 0 }}>
                    <Typography variant="body2" noWrap sx={{ fontWeight: 500, color: 'text.primary', mb: 0.2, textOverflow: 'ellipsis', overflow: 'hidden', fontSize: '12.5px', flexShrink: 0, mr: 1 }}>
                      {email.subject || '(Sin asunto)'}
                    </Typography>
                    <Typography variant="caption" noWrap sx={{ color: 'text.secondary', textOverflow: 'ellipsis', overflow: 'hidden', fontSize: '12px' }}>
                      — {previewText}
                    </Typography>
                  </Box>

                  {/* Fecha (90px) */}
                  <Box sx={{ textAlign: 'right', pr: 1 }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '11px' }}>
                      {email.createdAt.toLocaleDateString('es-PE', { month: 'short', day: 'numeric' })}
                    </Typography>
                  </Box>

                  {/* Acciones rápidas al hacer hover */}
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
                      <Tooltip title="Eliminar registro">
                        <IconButton size="small" onClick={(e) => handleDeleteSent(e, email.id)} sx={{ color: '#EF4444', p: 0.2 }}>
                          <Delete sx={{ fontSize: '14px' }} />
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
