import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Card,
  CardContent,
  Avatar,
  IconButton,
  Tooltip,
  Button,
  Checkbox,
  Divider
} from '@mui/material';
import {
  Attachment as AttachIcon,
  Delete,
  DeleteOutlined as DeleteIcon
} from '@mui/icons-material';
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { useEmails } from '../contexts/EmailContext';

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
  const { selectedEmailIds, setSelectedEmailIds, bulkMoveToTrash, bulkToggleStar } = useEmails();
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
        // Filtrar en memoria por enviados (direction != inbound) y no eliminados
        if (data.direction !== 'inbound' && !data.deleted) {
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
    const confirmMessage = "¿Deseas mover este correo enviado a la papelera?";
    if (!window.confirm(confirmMessage)) return;

    try {
      await updateDoc(doc(db, 'emails', emailId), {
        deleted: true,
        deletedAt: new Date(),
        previousFolder: 'sent'
      });
      console.log(`[FIRESTORE] Correo enviado ${emailId} movido a la papelera.`);
    } catch (err) {
      console.error("Error al mover correo enviado a papelera:", err);
    }
  };

  const handleMoveAllToTrash = async () => {
    const confirmMessage = "¿Mover todos los correos enviados a la papelera?\n\nPodrás restaurarlos o eliminarlos definitivamente desde Eliminados.";
    if (!window.confirm(confirmMessage)) return;

    const batch = writeBatch(db);
    emails.forEach((email) => {
      const docRef = doc(db, 'emails', email.id);
      batch.update(docRef, {
        deleted: true,
        deletedAt: new Date(),
        previousFolder: 'sent'
      });
    });

    try {
      await batch.commit();
      console.log("[FIRESTORE] Todos los enviados movidos a papelera.");
    } catch (err) {
      console.error("Error al mover todos los enviados a papelera:", err);
    }
  };

  return (
    <Box sx={{ animation: 'fadeIn 200ms ease-in-out' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.0, mb: 1.5 }}>
        <Typography variant="h3" sx={{ fontWeight: 700, color: 'text.primary', letterSpacing: '-0.5px', fontSize: { xs: '22px', md: '26px' }, lineHeight: 1.2 }}>
          Correos Enviados
        </Typography>

        {emails.length > 0 && (
          <Button
            variant="contained"
            color="warning"
            startIcon={<DeleteIcon sx={{ fontSize: '18px' }} />}
            onClick={handleMoveAllToTrash}
            sx={{
              borderRadius: '10px',
              py: 0.6,
              px: 2.0,
              fontSize: '13px',
              fontWeight: 'bold',
              transition: 'all 150ms ease-in-out',
              boxShadow: '0 4px 10px rgba(245, 158, 11, 0.2)',
              '&:hover': {
                transform: 'scale(1.02)'
              }
            }}
          >
            Mover todos a papelera
          </Button>
        )}
      </Box>

      {/* Barra de acciones horizontal para Enviados */}
      {(() => {
        const allVisibleIds = emails.map(e => e.id);
        const areAllSelected = allVisibleIds.length > 0 && allVisibleIds.every(id => selectedEmailIds.includes(id));
        const isIndeterminate = allVisibleIds.length > 0 && allVisibleIds.some(id => selectedEmailIds.includes(id)) && !areAllSelected;

        const handleSelectAllToggle = () => {
          if (areAllSelected) {
            setSelectedEmailIds(prev => prev.filter(id => !allVisibleIds.includes(id)));
          } else {
            setSelectedEmailIds(prev => {
              const otherSelected = prev.filter(id => !allVisibleIds.includes(id));
              return [...otherSelected, ...allVisibleIds];
            });
          }
        };

        const hasSelection = selectedEmailIds.length > 0;

        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, py: 0.6, px: 0.2, borderBottom: '1px solid', borderColor: 'divider', mb: 1.0, minHeight: '38px' }}>
            <Checkbox
              size="small"
              checked={areAllSelected}
              indeterminate={isIndeterminate}
              onChange={handleSelectAllToggle}
              sx={{ p: 0.2 }}
            />
            <Divider orientation="vertical" flexItem sx={{ borderColor: 'divider', mx: 0.2 }} />

            {hasSelection ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '11px', color: 'text.secondary' }}>
                  {selectedEmailIds.length} seleccionados
                </Typography>
                <Button size="small" variant="outlined" onClick={bulkMoveToTrash} sx={{ fontSize: '10.5px', py: 0.3, px: 1.2, textTransform: 'none', height: '26px' }}>
                  Eliminar
                </Button>
                <Button size="small" variant="outlined" onClick={() => bulkToggleStar(true)} sx={{ fontSize: '10.5px', py: 0.3, px: 1.2, textTransform: 'none', height: '26px' }}>
                  Destacar
                </Button>
                <Button size="small" variant="outlined" onClick={() => bulkToggleStar(false)} sx={{ fontSize: '10.5px', py: 0.3, px: 1.2, textTransform: 'none', height: '26px' }}>
                  Quitar destacado
                </Button>
                <Button size="small" variant="text" onClick={() => setSelectedEmailIds([])} sx={{ fontSize: '10.5px', color: 'text.secondary', textTransform: 'none', height: '26px' }}>
                  Cancelar
                </Button>
              </Box>
            ) : null}
          </Box>
        );
      })()}

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
                  {/* Checkbox de selección */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.2 }} onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      size="small"
                      checked={selectedEmailIds.includes(email.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        setSelectedEmailIds(prev =>
                          prev.includes(email.id)
                            ? prev.filter(id => id !== email.id)
                            : [...prev, email.id]
                        );
                      }}
                      sx={{ p: 0.2 }}
                    />
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
