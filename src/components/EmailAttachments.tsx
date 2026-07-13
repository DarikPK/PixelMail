import { Box, Typography, Chip, Card, CardContent } from '@mui/material';
import {
  Attachment as AttachIcon,
  PictureAsPdf,
  Description,
  InsertDriveFile,
  Image as ImageIcon
} from '@mui/icons-material';

interface Attachment {
  name: string;
  size: number;
  contentType?: string;
}

interface EmailAttachmentsProps {
  attachments: Attachment[];
  onDownload: (filename: string) => void;
}

const EmailAttachments = ({ attachments, onDownload }: EmailAttachmentsProps) => {
  if (!attachments || attachments.length === 0) return null;

  const getAttachmentIcon = (name: string, contentType?: string) => {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    const mime = contentType?.toLowerCase() || '';

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

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <AttachIcon fontSize="small" /> Archivos Adjuntos ({attachments.length})
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        {attachments.map((att, index) => (
          <Card key={index} variant="outlined" sx={{ minWidth: 200, maxWidth: 300, borderRadius: 2 }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {getAttachmentIcon(att.name, att.contentType)}
              <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                <Typography variant="body2" noWrap sx={{ fontWeight: 'bold' }}>
                  {att.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  {formatSize(att.size)}
                </Typography>
                <Chip
                  label="Descargar"
                  onClick={() => onDownload(att.name)}
                  size="small"
                  variant="outlined"
                  clickable
                  color="primary"
                />
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  );
};

export default EmailAttachments;
