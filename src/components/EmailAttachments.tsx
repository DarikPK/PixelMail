import { Box, Typography, Chip, Card, CardContent } from '@mui/material';
import {
  Attachment as AttachIcon,
  PictureAsPdf,
  Description,
  InsertDriveFile,
  Image as ImageIcon
} from '@mui/icons-material';

interface Attachment {
  id?: string;
  name?: string | null;
  size?: number | null;
  contentType?: string | null;
}

interface EmailAttachmentsProps {
  attachments?: Attachment[] | null;
  onDownload: (filename: string) => void;
  emailHtml?: string;
}

const EmailAttachments = ({ attachments, onDownload, emailHtml }: EmailAttachmentsProps) => {
  if (!attachments || !Array.isArray(attachments) || attachments.length === 0) return null;

  const isInlineResource = (att: Attachment) => {
    if (!emailHtml || typeof emailHtml !== 'string') return false;

    // Verificar por ID
    if (att.id && typeof att.id === 'string' && att.id.trim().length > 0) {
      const idLower = att.id.toLowerCase();
      if (emailHtml.toLowerCase().includes(`cid:${idLower}`)) {
        return true;
      }
      if (emailHtml.toLowerCase().includes(idLower)) {
        return true;
      }
    }

    // Verificar por Name
    if (att.name && typeof att.name === 'string' && att.name.trim().length > 0) {
      const nameLower = att.name.toLowerCase();
      if (emailHtml.toLowerCase().includes(`cid:${nameLower}`)) {
        return true;
      }
    }

    return false;
  };

  // Filtrar adjuntos válidos que no sean recursos inline
  const visibleAttachments = attachments.filter((att) => {
    if (!att) return false;
    // Si se detecta como recurso inline usado en el HTML, no mostrar en la lista de adjuntos
    if (isInlineResource(att)) {
      return false;
    }
    return true;
  });

  if (visibleAttachments.length === 0) return null;

  const getAttachmentIcon = (name?: string | null, contentType?: string | null) => {
    const ext = (typeof name === 'string') ? name.split('.').pop()?.toLowerCase() || '' : '';
    const mime = (typeof contentType === 'string') ? contentType.toLowerCase() : '';

    if (ext === 'pdf' || mime.includes('pdf')) {
      return <PictureAsPdf color="error" />;
    }
    if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext) || mime.includes('image/')) {
      return <ImageIcon color="primary" />;
    }
    if (['doc', 'docx', 'txt', 'rtf'].includes(ext) || mime.includes('text/') || mime.includes('word')) {
      return <Description color="info" />;
    }
    return <InsertDriveFile color="action" />;
  };

  const formatSize = (bytes?: number | null) => {
    if (!bytes || typeof bytes !== 'number' || bytes <= 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <AttachIcon fontSize="small" /> Archivos Adjuntos ({visibleAttachments.length})
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        {visibleAttachments.map((att, index) => {
          try {
            const displayName = typeof att.name === 'string' && att.name.trim().length > 0
              ? att.name
              : 'Adjunto';
            const downloadName = typeof att.name === 'string' && att.name.trim().length > 0
              ? att.name
              : 'adjunto';
            const sizeDisplay = formatSize(att.size);

            return (
              <Card key={index} variant="outlined" sx={{ minWidth: 200, maxWidth: 300, borderRadius: 2 }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  {getAttachmentIcon(att.name, att.contentType)}
                  <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                    <Typography variant="body2" noWrap sx={{ fontWeight: 'bold' }}>
                      {displayName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                      {sizeDisplay}
                    </Typography>
                    <Chip
                      label="Descargar"
                      onClick={() => onDownload(downloadName)}
                      size="small"
                      variant="outlined"
                      clickable
                      color="primary"
                    />
                  </Box>
                </CardContent>
              </Card>
            );
          } catch (error) {
            console.error('[ATTACHMENT MAP ERROR] Error al renderizar un adjunto individual:', error);
            return null; // Evita derribar toda la vista si un mapa falla catastróficamente
          }
        })}
      </Box>
    </Box>
  );
};

export default EmailAttachments;
