import React, { useState } from 'react';
import {
  Box,
  Typography,
  Divider,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  ColorLens as ColorLensIcon,
  Delete as DeleteIcon,
  PhotoCamera as PhotoCameraIcon,
  Link as LinkIcon
} from '@mui/icons-material';
import type { SignatureBlock } from './types';

const PREDEFINED_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#1E293B', '#64748B', '#FFFFFF'
];

interface BlockEditorProps {
  selectedBlock: SignatureBlock | null;
  onUpdateBlock: (updatedFields: Partial<SignatureBlock>) => void;
  onDeleteBlock: (id: string) => void;
}

export const BlockEditor: React.FC<BlockEditorProps> = ({
  selectedBlock,
  onUpdateBlock,
  onDeleteBlock
}) => {
  const [recentColors, setRecentColors] = useState<string[]>(['#3B82F6', '#1E293B', '#10B981', '#F59E0B']);

  if (!selectedBlock) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
          Propiedades del Bloque
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '11px', px: 2 }}>
          Selecciona un elemento de la firma en la previsualización o el panel lateral para editar sus propiedades en tiempo real.
        </Typography>
      </Box>
    );
  }

  const isTextLike = ['text', 'name', 'cargo', 'empresa', 'tel', 'cel', 'correo', 'web', 'direccion', 'frase', 'link', 'button', 'social', 'legal'].includes(selectedBlock.type);
  const isImageLike = ['image', 'logo', 'gif'].includes(selectedBlock.type);

  // Conversión de archivo local a imagen en Base64
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Verificar límite de tamaño prudencial (ej. 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('La imagen es demasiado grande. Te sugerimos optimizarla o usar un enlace externo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      onUpdateBlock({ content: base64 });
    };
    reader.readAsDataURL(file);
  };

  const handleColorUpdate = (color: string) => {
    if (selectedBlock.type === 'button') {
      onUpdateBlock({ buttonColor: color });
    } else {
      onUpdateBlock({ color });
    }
    if (!recentColors.includes(color)) {
      setRecentColors(prev => [color, ...prev.slice(0, 5)]);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Encabezado del Bloque */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '12.5px', color: 'text.primary', textTransform: 'uppercase' }}>
          Configurar: {selectedBlock.name}
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title={selectedBlock.locked ? "Desbloquear bloque" : "Bloquear bloque"}>
            <IconButton size="small" onClick={() => onUpdateBlock({ locked: !selectedBlock.locked })}>
              {selectedBlock.locked ? <LockIcon sx={{ fontSize: '15.5px', color: 'error.main' }} /> : <LockOpenIcon sx={{ fontSize: '15.5px' }} />}
            </IconButton>
          </Tooltip>
          <Tooltip title={selectedBlock.hidden ? "Mostrar en firma" : "Ocultar temporalmente"}>
            <IconButton size="small" onClick={() => onUpdateBlock({ hidden: !selectedBlock.hidden })}>
              {selectedBlock.hidden ? <VisibilityOffIcon sx={{ fontSize: '15.5px', color: 'warning.main' }} /> : <VisibilityIcon sx={{ fontSize: '15.5px' }} />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Divider />

      <Box sx={{ pointerEvents: selectedBlock.locked ? 'none' : 'auto', opacity: selectedBlock.locked ? 0.6 : 1, display: 'flex', flexDirection: 'column', gap: 1.8 }}>
        {/* Atributo de Contenido textual */}
        {['text', 'name', 'cargo', 'empresa', 'tel', 'cel', 'correo', 'web', 'direccion', 'frase', 'link', 'button'].includes(selectedBlock.type) && (
          <TextField
            label="Contenido"
            size="small"
            fullWidth
            value={selectedBlock.content}
            onChange={(e) => onUpdateBlock({ content: e.target.value })}
            slotProps={{ input: { sx: { fontSize: '12px' } } }}
          />
        )}

        {/* Atributo para Redes Sociales */}
        {selectedBlock.type === 'social' && (
          <FormControl size="small" fullWidth>
            <InputLabel sx={{ fontSize: '11px' }}>Red Social</InputLabel>
            <Select
              value={selectedBlock.socialPlatform || 'linkedin'}
              onChange={(e) => onUpdateBlock({ socialPlatform: e.target.value as any, name: e.target.value as string })}
              label="Red Social"
              sx={{ fontSize: '12px' }}
            >
              <MenuItem value="linkedin">LinkedIn</MenuItem>
              <MenuItem value="facebook">Facebook</MenuItem>
              <MenuItem value="instagram">Instagram</MenuItem>
              <MenuItem value="twitter">Twitter / X</MenuItem>
              <MenuItem value="youtube">YouTube</MenuItem>
              <MenuItem value="tiktok">TikTok</MenuItem>
              <MenuItem value="whatsapp">WhatsApp</MenuItem>
            </Select>
          </FormControl>
        )}

        {/* Atributo para Aviso Legal */}
        {selectedBlock.type === 'legal' && (
          <FormControl size="small" fullWidth>
            <InputLabel sx={{ fontSize: '11px' }}>Modelo de Disclaimer</InputLabel>
            <Select
              value={selectedBlock.legalModel || 'estandar'}
              onChange={(e) => onUpdateBlock({ legalModel: e.target.value as any })}
              label="Modelo de Disclaimer"
              sx={{ fontSize: '12px' }}
            >
              <MenuItem value="estandar">Ecológico / Medio Ambiente</MenuItem>
              <MenuItem value="financiero">Aviso de Regulación Financiera</MenuItem>
              <MenuItem value="corporativo">Aviso Corporativo S.A.C.</MenuItem>
              <MenuItem value="confidencial">Información Altamente Confidencial</MenuItem>
            </Select>
          </FormControl>
        )}

        {/* Gestor Avanzado de Imágenes (Soporte Base64 / URL externa) */}
        {isImageLike && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <TextField
              label="Enlace URL de Imagen"
              size="small"
              fullWidth
              value={selectedBlock.content.startsWith('data:image') ? 'Imagen cargada en Base64 (Local)' : selectedBlock.content}
              disabled={selectedBlock.content.startsWith('data:image')}
              onChange={(e) => onUpdateBlock({ content: e.target.value })}
              slotProps={{ input: { sx: { fontSize: '11.5px' } } }}
            />

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                component="label"
                startIcon={<PhotoCameraIcon />}
                sx={{ fontSize: '10px', textTransform: 'none' }}
              >
                Cargar Local
                <input type="file" accept="image/*" onChange={handleImageFileChange} style={{ display: 'none' }} />
              </Button>

              {selectedBlock.content.startsWith('data:image') && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<LinkIcon />}
                  onClick={() => onUpdateBlock({ content: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100&h=100' })}
                  sx={{ fontSize: '10px', textTransform: 'none' }}
                >
                  Usar URL Demo
                </Button>
              )}
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
              <TextField
                label="Ancho (width)"
                size="small"
                value={selectedBlock.width || ''}
                placeholder="Ej. 100px, 80"
                onChange={(e) => onUpdateBlock({ width: e.target.value })}
                slotProps={{ input: { sx: { fontSize: '11px' } } }}
              />
              <TextField
                label="Alto (height)"
                size="small"
                value={selectedBlock.height || ''}
                placeholder="Ej. 100px, Auto"
                onChange={(e) => onUpdateBlock({ height: e.target.value })}
                slotProps={{ input: { sx: { fontSize: '11px' } } }}
              />
            </Box>

            <TextField
              label="Texto ALT (Accesibilidad)"
              size="small"
              fullWidth
              value={selectedBlock.altText || ''}
              onChange={(e) => onUpdateBlock({ altText: e.target.value })}
              slotProps={{ input: { sx: { fontSize: '11.5px' } } }}
            />
          </Box>
        )}

        {/* Gestor Específico de Enlaces y URLs */}
        {['link', 'button', 'social'].includes(selectedBlock.type) && (
          <TextField
            label="Enlace URL de Destino"
            size="small"
            fullWidth
            value={selectedBlock.href || ''}
            onChange={(e) => onUpdateBlock({ href: e.target.value })}
            slotProps={{ input: { sx: { fontSize: '11.5px' } } }}
          />
        )}

        {/* Atributos de Tipografía y Formatos */}
        {isTextLike && (
          <>
            <FormControl size="small" fullWidth>
              <InputLabel sx={{ fontSize: '11px' }}>Fuente Tipográfica</InputLabel>
              <Select
                value={selectedBlock.fontFamily || 'Inter'}
                onChange={(e) => onUpdateBlock({ fontFamily: e.target.value })}
                label="Fuente Tipográfica"
                sx={{ fontSize: '12px' }}
              >
                <MenuItem value="Inter" sx={{ fontFamily: 'Inter' }}>Inter (Por Defecto)</MenuItem>
                <MenuItem value="Roboto" sx={{ fontFamily: 'Roboto' }}>Roboto (Limpia)</MenuItem>
                <MenuItem value="Segoe UI" sx={{ fontFamily: 'Segoe UI' }}>Segoe UI (Outlook)</MenuItem>
                <MenuItem value="Arial" sx={{ fontFamily: 'Arial' }}>Arial (Estándar)</MenuItem>
                <MenuItem value="Georgia" sx={{ fontFamily: 'Georgia' }}>Georgia (Formal Serif)</MenuItem>
                <MenuItem value="Tahoma" sx={{ fontFamily: 'Tahoma' }}>Tahoma (Fina)</MenuItem>
                <MenuItem value="Verdana" sx={{ fontFamily: 'Verdana' }}>Verdana (Legible)</MenuItem>
              </Select>
            </FormControl>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 1 }}>
              <TextField
                label="Tamaño Letra"
                size="small"
                value={selectedBlock.fontSize || ''}
                placeholder="Ej. 14px, 12pt"
                onChange={(e) => onUpdateBlock({ fontSize: e.target.value })}
                slotProps={{ input: { sx: { fontSize: '11px' } } }}
              />

              <FormControl size="small">
                <InputLabel sx={{ fontSize: '11px' }}>Alineación</InputLabel>
                <Select
                  value={selectedBlock.align || 'left'}
                  onChange={(e) => onUpdateBlock({ align: e.target.value as any })}
                  label="Alineación"
                  sx={{ fontSize: '12px' }}
                >
                  <MenuItem value="left">Izquierda</MenuItem>
                  <MenuItem value="center">Centro</MenuItem>
                  <MenuItem value="right">Derecha</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </>
        )}

        {/* Gestor de Colores en el Inspector */}
        <Box sx={{ p: 1, border: '1px solid', borderColor: 'divider', borderRadius: '6px', bgcolor: 'action.hover' }}>
          <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
            <ColorLensIcon sx={{ fontSize: '14px', color: '#3B82F6' }} /> Selector de Color Moderno
          </Typography>

          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
            {PREDEFINED_COLORS.map((c) => (
              <Box
                key={c}
                onClick={() => handleColorUpdate(c)}
                sx={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  bgcolor: c,
                  cursor: 'pointer',
                  border: '1.5px solid #FFF',
                  boxShadow: '0 0 2px rgba(0,0,0,0.3)',
                  transition: 'transform 100ms',
                  '&:hover': { transform: 'scale(1.2)' }
                }}
              />
            ))}
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 1, alignItems: 'center' }}>
            <TextField
              label="Color (Hex)"
              size="small"
              value={selectedBlock.type === 'button' ? (selectedBlock.buttonColor || '#3B82F6') : (selectedBlock.color || '#1E293B')}
              onChange={(e) => handleColorUpdate(e.target.value)}
              slotProps={{ input: { sx: { fontSize: '11px', height: '24px' } } }}
            />
            <input
              type="color"
              value={selectedBlock.type === 'button' ? (selectedBlock.buttonColor || '#3B82F6') : (selectedBlock.color || '#1E293B')}
              onChange={(e) => handleColorUpdate(e.target.value)}
              style={{ width: '100%', height: '32px', cursor: 'pointer', border: '1px solid #CFD8DC', borderRadius: '4px', padding: '1px' }}
            />
          </Box>
        </Box>

        {/* Espaciadores y Atributos de Caja Avanzados (CSS Inline) */}
        <Box sx={{ p: 1.5, border: '1px dashed', borderColor: 'divider', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
            📐 Estilos Avanzados (Márgenes y Padding)
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
            <TextField
              label="Margen (CSS)"
              size="small"
              value={selectedBlock.margin || ''}
              placeholder="Ej. 10px 0"
              onChange={(e) => onUpdateBlock({ margin: e.target.value })}
              slotProps={{ input: { sx: { fontSize: '11px' } } }}
            />
            <TextField
              label="Relleno (CSS)"
              size="small"
              value={selectedBlock.padding || ''}
              placeholder="Ej. 8px 12px"
              onChange={(e) => onUpdateBlock({ padding: e.target.value })}
              slotProps={{ input: { sx: { fontSize: '11px' } } }}
            />
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
            <TextField
              label="Borde (CSS)"
              size="small"
              value={selectedBlock.border || ''}
              placeholder="Ej. 1px solid #CCC"
              onChange={(e) => onUpdateBlock({ border: e.target.value })}
              slotProps={{ input: { sx: { fontSize: '11px' } } }}
            />
            <TextField
              label="Radio Borde"
              size="small"
              value={selectedBlock.borderRadius || ''}
              placeholder="Ej. 8px, 50%"
              onChange={(e) => onUpdateBlock({ borderRadius: e.target.value })}
              slotProps={{ input: { sx: { fontSize: '11px' } } }}
            />
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
            <TextField
              label="Fondo (bgcolor)"
              size="small"
              value={selectedBlock.backgroundColor || ''}
              placeholder="Ej. #F1F5F9"
              onChange={(e) => onUpdateBlock({ backgroundColor: e.target.value })}
              slotProps={{ input: { sx: { fontSize: '11px' } } }}
            />
            <TextField
              label="Sombra (shadow)"
              size="small"
              value={selectedBlock.shadow || ''}
              placeholder="Ej. 0 2px 4px"
              onChange={(e) => onUpdateBlock({ shadow: e.target.value })}
              slotProps={{ input: { sx: { fontSize: '11px' } } }}
            />
          </Box>
        </Box>

        <Button
          size="small"
          variant="outlined"
          color="error"
          onClick={() => onDeleteBlock(selectedBlock.id)}
          startIcon={<DeleteIcon />}
          sx={{ mt: 1, fontSize: '11px', textTransform: 'none', fontWeight: 'bold' }}
        >
          Eliminar Bloque
        </Button>
      </Box>
    </Box>
  );
};
export default BlockEditor;
