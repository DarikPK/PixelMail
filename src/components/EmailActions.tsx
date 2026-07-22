import { Box, Button, IconButton, Tooltip, Divider } from '@mui/material';
import {
  ArrowBack,
  Reply,
  ReplyAll,
  Forward,
  Mail,
  Drafts,
  Star,
  StarBorder,
  Archive,
  Delete,
  RestoreFromTrash,
  DeleteForever
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface EmailActionsProps {
  emailId?: string;
  read: boolean;
  starred: boolean;
  archived: boolean;
  deleted: boolean;
  onBack: () => void;
  onToggleRead: () => void;
  onToggleStar: () => void;
  onToggleArchive: () => void;
  onToggleDelete: () => void;
  onDeleteForever: () => void;
}

const EmailActions = ({
  emailId,
  read,
  starred,
  archived,
  deleted,
  onBack,
  onToggleRead,
  onToggleStar,
  onToggleArchive,
  onToggleDelete,
  onDeleteForever
}: EmailActionsProps) => {
  const navigate = useNavigate();
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, pb: 2, mb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={onBack}
          variant="outlined"
          sx={{
            py: { xs: 1.0, sm: 0.6 },
            px: { xs: 1.8, sm: 1.2 },
            fontSize: { xs: '13px', sm: '12px' },
            textTransform: 'none',
            minHeight: '40px'
          }}
          aria-label="Volver a la bandeja"
        >
          Volver
        </Button>
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5, display: { xs: 'none', sm: 'block' } }} />

        {/* Acciones de correo ficticias pero visuales (Responder, Responder a todos, Reenviar) */}
        <Tooltip title="Responder a este correo">
          <Button
            startIcon={<Reply />}
            onClick={() => emailId && navigate(`/redactar?replyTo=${emailId}`)}
            sx={{
              textTransform: 'none',
              py: { xs: 1.0, sm: 0.6 },
              px: { xs: 1.8, sm: 1.2 },
              fontSize: { xs: '13px', sm: '12px' },
              minHeight: '40px'
            }}
          >
            Responder
          </Button>
        </Tooltip>
        <Tooltip title="Responder a todos">
          <Button
            startIcon={<ReplyAll />}
            onClick={() => emailId && navigate(`/redactar?replyTo=${emailId}`)}
            sx={{
              textTransform: 'none',
              display: { xs: 'none', sm: 'inline-flex' },
              py: { xs: 1.0, sm: 0.6 },
              px: { xs: 1.8, sm: 1.2 },
              fontSize: { xs: '13px', sm: '12px' },
              minHeight: '40px'
            }}
          >
            Responder a todos
          </Button>
        </Tooltip>
        <Tooltip title="Reenviar este correo">
          <Button
            startIcon={<Forward />}
            onClick={() => emailId && navigate(`/redactar?forward=${emailId}`)}
            sx={{
              textTransform: 'none',
              py: { xs: 1.0, sm: 0.6 },
              px: { xs: 1.8, sm: 1.2 },
              fontSize: { xs: '13px', sm: '12px' },
              minHeight: '40px'
            }}
          >
            Reenviar
          </Button>
        </Tooltip>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.0 }}>
        <Tooltip title={read ? "Marcar como no leído" : "Marcar como leído"}>
          <IconButton onClick={onToggleRead} sx={{ p: 1.2 }} color="primary" aria-label="Cambiar estado leído">
            {read ? <Mail /> : <Drafts />}
          </IconButton>
        </Tooltip>
        <Tooltip title={starred ? "Quitar destacado" : "Destacar"}>
          <IconButton onClick={onToggleStar} sx={{ p: 1.2 }} color="warning" aria-label="Destacar correo">
            {starred ? <Star /> : <StarBorder />}
          </IconButton>
        </Tooltip>

        {/* Si el correo está en la papelera (deleted == true) */}
        {deleted ? (
          <>
            <Tooltip title="Restaurar">
              <IconButton onClick={onToggleDelete} sx={{ p: 1.2 }} color="primary" aria-label="Restaurar correo">
                <RestoreFromTrash />
              </IconButton>
            </Tooltip>
            <Tooltip title="Eliminar definitivamente">
              <IconButton onClick={onDeleteForever} sx={{ p: 1.2 }} color="error" aria-label="Eliminar definitivamente">
                <DeleteForever />
              </IconButton>
            </Tooltip>
          </>
        ) : (
          <>
            <Tooltip title={archived ? "Mover a Recibidos" : "Archivar"}>
              <IconButton onClick={onToggleArchive} sx={{ p: 1.2 }} color="default" aria-label="Archivar correo">
                <Archive />
              </IconButton>
            </Tooltip>
            <Tooltip title="Eliminar">
              <IconButton onClick={onToggleDelete} sx={{ p: 1.2 }} color="error" aria-label="Eliminar correo">
                <Delete />
              </IconButton>
            </Tooltip>
          </>
        )}
      </Box>
    </Box>
  );
};

export default EmailActions;
