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

interface EmailActionsProps {
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
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 1, pb: 2, mb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={onBack}
          variant="outlined"
          size="small"
          aria-label="Volver a la bandeja"
        >
          Volver
        </Button>
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        {/* Acciones de correo ficticias pero visuales (Responder, Responder a todos, Reenviar) */}
        <Tooltip title="Responder (Próximamente)">
          <Button startIcon={<Reply />} size="small" disabled sx={{ textTransform: 'none' }}>
            Responder
          </Button>
        </Tooltip>
        <Tooltip title="Responder a todos (Próximamente)">
          <Button startIcon={<ReplyAll />} size="small" disabled sx={{ textTransform: 'none', display: { xs: 'none', sm: 'inline-flex' } }}>
            Responder a todos
          </Button>
        </Tooltip>
        <Tooltip title="Reenviar (Próximamente)">
          <Button startIcon={<Forward />} size="small" disabled sx={{ textTransform: 'none' }}>
            Reenviar
          </Button>
        </Tooltip>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Tooltip title={read ? "Marcar como no leído" : "Marcar como leído"}>
          <IconButton onClick={onToggleRead} size="small" color="primary" aria-label="Cambiar estado leído">
            {read ? <Mail /> : <Drafts />}
          </IconButton>
        </Tooltip>
        <Tooltip title={starred ? "Quitar destacado" : "Destacar"}>
          <IconButton onClick={onToggleStar} size="small" color="warning" aria-label="Destacar correo">
            {starred ? <Star /> : <StarBorder />}
          </IconButton>
        </Tooltip>

        {/* Si el correo está en la papelera (deleted == true) */}
        {deleted ? (
          <>
            <Tooltip title="Restaurar">
              <IconButton onClick={onToggleDelete} size="small" color="primary" aria-label="Restaurar correo">
                <RestoreFromTrash />
              </IconButton>
            </Tooltip>
            <Tooltip title="Eliminar definitivamente">
              <IconButton onClick={onDeleteForever} size="small" color="error" aria-label="Eliminar definitivamente">
                <DeleteForever />
              </IconButton>
            </Tooltip>
          </>
        ) : (
          <>
            <Tooltip title={archived ? "Mover a Recibidos" : "Archivar"}>
              <IconButton onClick={onToggleArchive} size="small" color="default" aria-label="Archivar correo">
                <Archive />
              </IconButton>
            </Tooltip>
            <Tooltip title="Eliminar">
              <IconButton onClick={onToggleDelete} size="small" color="error" aria-label="Eliminar correo">
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
