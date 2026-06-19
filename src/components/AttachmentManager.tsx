import { useDropzone } from 'react-dropzone';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Paper
} from '@mui/material';
import {
  Delete as DeleteIcon,
  CloudUpload as UploadIcon,
  AttachFile as AttachIcon
} from '@mui/icons-material';

interface FileWithMetadata extends File {
  id: string;
}

interface AttachmentManagerProps {
  files: FileWithMetadata[];
  onFilesChange: (files: FileWithMetadata[]) => void;
  maxTotalSize?: number; // en bytes
}

const AttachmentManager = ({ files, onFilesChange, maxTotalSize = 10 * 1024 * 1024 }: AttachmentManagerProps) => {
  const onDrop = (acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => Object.assign(file, {
      id: Math.random().toString(36).substring(7)
    })) as FileWithMetadata[];

    const totalCurrentSize = files.reduce((acc, file) => acc + file.size, 0);
    const totalNewSize = newFiles.reduce((acc, file) => acc + file.size, 0);

    if (totalCurrentSize + totalNewSize > maxTotalSize) {
      alert('El tamaño total de los archivos no puede superar los 10 MB');
      return;
    }

    onFilesChange([...files, ...newFiles]);
  };

  const removeFile = (id: string) => {
    onFilesChange(files.filter(file => file.id !== id));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'text/plain': ['.txt'],
      'text/csv': ['.csv'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'application/zip': ['.zip'],
      'application/x-zip-compressed': ['.zip']
    }
  });

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <AttachIcon fontSize="small" /> Adjuntos ({files.length})
      </Typography>

      <Paper
        {...getRootProps()}
        variant="outlined"
        sx={{
          p: 2,
          textAlign: 'center',
          cursor: 'pointer',
          bgcolor: isDragActive ? 'action.hover' : 'background.paper',
          borderStyle: 'dashed',
          borderColor: isDragActive ? 'primary.main' : 'divider',
          '&:hover': { bgcolor: 'action.hover' }
        }}
      >
        <input {...getInputProps()} />
        <UploadIcon color="action" sx={{ fontSize: 40, mb: 1 }} />
        <Typography variant="body2" color="textSecondary">
          Arrastra archivos aquí o haz clic para seleccionar
        </Typography>
        <Typography variant="caption" color="textSecondary">
          PDF, DOC, XLS, PPT, TXT, CSV, JPG, PNG, WEBP, ZIP (Máx. 10MB total)
        </Typography>
      </Paper>

      {files.length > 0 && (
        <List sx={{ mt: 1 }}>
          {files.map((file) => (
            <ListItem
              key={file.id}
              secondaryAction={
                <IconButton edge="end" aria-label="delete" onClick={() => removeFile(file.id)}>
                  <DeleteIcon />
                </IconButton>
              }
              sx={{ bgcolor: 'background.paper', mb: 0.5, borderRadius: 1, border: 1, borderColor: 'divider' }}
            >
              <ListItemText
                primary={file.name}
                secondary={formatSize(file.size)}
                slotProps={{
                  primary: { variant: 'body2', noWrap: true } as any
                }}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
};

export default AttachmentManager;
