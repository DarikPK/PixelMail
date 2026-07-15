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
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress
} from '@mui/material';
import {
  PhotoCamera as PhotoCameraIcon,
  Link as LinkIcon,
  Warning as WarningIcon,
  Upload as UploadIcon,
  CheckCircle as SuccessIcon
} from '@mui/icons-material';
import type { SignatureBlock, AssetRecord } from './types';
import { optimizeImage, type OptimizationResult } from '../../utils/imageOptimizer';

const PREDEFINED_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#1E293B', '#64748B', '#FFFFFF'
];

interface BlockEditorProps {
  selectedBlock: SignatureBlock | null;
  onUpdateBlockNode: (updates: {
    content?: string;
    attributes?: Record<string, string>;
    inlineStyles?: Record<string, string>;
  }) => void;
  onDeleteBlockNode: (id: string) => void;
  missingAssets: AssetRecord[];
  onResolveAsset: (filename: string, dataUrl: string) => void;
}

export const BlockEditor: React.FC<BlockEditorProps> = ({
  selectedBlock,
  onUpdateBlockNode,
  onDeleteBlockNode,
  missingAssets,
  onResolveAsset
}) => {
  const [recentColors, setRecentColors] = useState<string[]>(['#3B82F6', '#1E293B', '#10B981', '#F59E0B']);

  // Estados para optimización de imagen
  const [optResult, setOptResult] = useState<OptimizationResult | null>(null);
  const [optModalOpen, setOptModalOpen] = useState(false);
  const [isProcessing, setIsCreating] = useState(false);
  const [targetAssetFilename, setTargetAssetFilename] = useState<string | null>(null);

  const getStyle = (key: string): string => {
    return selectedBlock?.inlineStyles?.[key] || '';
  };

  const getAttr = (key: string): string => {
    return selectedBlock?.attributes?.[key] || '';
  };

  const handleStyleChange = (key: string, value: string) => {
    if (!selectedBlock) return;
    const nextStyles = { ...selectedBlock.inlineStyles, [key]: value };
    onUpdateBlockNode({ inlineStyles: nextStyles });
  };

  const handleAttrChange = (key: string, value: string) => {
    if (!selectedBlock) return;
    const nextAttrs = { ...selectedBlock.attributes, [key]: value };
    onUpdateBlockNode({ attributes: nextAttrs });
  };

  // Conversión y OPTIMIZACIÓN de archivo local
  const handleLocalImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isAssetFilename?: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Aumentado el límite defensivamente a 10MB
    if (file.size > 10 * 1024 * 1024) {
      alert('La imagen supera los 10MB.');
      return;
    }

    setIsCreating(true);
    setTargetAssetFilename(isAssetFilename || null);

    // Auto-detectar categoría basándose en nombre o tipo de bloque
    let category: 'logo' | 'qr' | 'foto' | 'banner' = 'foto';
    const lowerName = file.name.toLowerCase();
    if (lowerName.includes('logo')) category = 'logo';
    else if (lowerName.includes('qr')) category = 'qr';
    else if (lowerName.includes('banner')) category = 'banner';

    try {
      console.log("SIGNATURE CREATE START", { fileName: file.name, category });
      const result = await optimizeImage(file, file.name, category);
      console.log("SIGNATURE CREATE SUCCESS", { result });

      setOptResult(result);
      setOptModalOpen(true);
    } catch (err) {
      console.error("SIGNATURE CREATE ERROR", err);
      alert('Error al procesar y optimizar la imagen.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleConfirmOptimization = () => {
    if (!optResult) return;

    const finalDataUrl = optResult.optimizedDataUrl;
    if (targetAssetFilename) {
      onResolveAsset(targetAssetFilename, finalDataUrl);
    } else {
      handleAttrChange('src', finalDataUrl);
    }

    setOptModalOpen(false);
    setOptResult(null);
  };

  const handleColorUpdate = (color: string) => {
    handleStyleChange('color', color);
    if (!recentColors.includes(color)) {
      setRecentColors(prev => [color, ...prev.slice(0, 5)]);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

      {/* MODAL DE COMPARACIÓN DE OPTIMIZACIÓN */}
      <Dialog open={optModalOpen} onClose={() => setOptModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', fontSize: '15px', display: 'flex', alignItems: 'center', gap: 1 }}>
          <SuccessIcon color="success" /> Imagen Optimizada Automáticamente
        </DialogTitle>
        {optResult && (
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '10px !important' }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Card variant="outlined" sx={{ p: 1.5, textAlign: 'center', bgcolor: 'action.hover' }}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>IMAGEN ORIGINAL</Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '15px', mt: 1, color: 'error.main' }}>
                  {formatBytes(optResult.originalSize)}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  Resolución: {optResult.originalWidth}x{optResult.originalHeight} px
                </Typography>
              </Card>

              <Card variant="outlined" sx={{ p: 1.5, textAlign: 'center', borderColor: '#10B981', bgcolor: 'rgba(16,185,129,0.04)' }}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#10B981' }}>IMAGEN OPTIMIZADA</Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '15px', mt: 1, color: '#10B981' }}>
                  {formatBytes(optResult.optimizedSize)}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  Resolución: {optResult.optimizedWidth}x{optResult.optimizedHeight} px
                </Typography>
              </Card>
            </Box>

            <Box sx={{ p: 1.5, bgcolor: '#1E293B', color: '#FFFFFF', borderRadius: '8px', textAlign: 'center' }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                ¡Ahorro de espacio del {optResult.ratio}%!
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.85 }}>
                Formato: {optResult.format} | Tipo: {optResult.category.toUpperCase()}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'center', p: 1, border: '1px solid divider', borderRadius: '6px', bgcolor: '#FAFAFA' }}>
              <img
                src={optResult.optimizedDataUrl}
                alt="Optimized preview"
                style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: '4px', objectFit: 'contain' }}
              />
            </Box>
          </DialogContent>
        )}
        <DialogActions>
          <Button onClick={() => setOptModalOpen(false)} size="small">Cancelar</Button>
          <Button onClick={handleConfirmOptimization} variant="contained" color="success" size="small">Insertar imagen optimizada</Button>
        </DialogActions>
      </Dialog>

      {/* SECCIÓN RECURSOS FALTANTES */}
      {missingAssets.length > 0 && (
        <Card variant="outlined" sx={{ borderColor: 'warning.main', bgcolor: 'rgba(245,158,11,0.04)', mb: 1 }}>
          <CardContent sx={{ p: '10px 12px !important' }}>
            <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 0.5, color: 'warning.dark', mb: 1 }}>
              <WarningIcon sx={{ fontSize: '15px' }} /> RECURSOS FALTANTES DETECTADOS
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5, fontSize: '9.5px', lineHeight: 1.3 }}>
              Se detectaron imágenes con rutas locales/relativas. Cárgalas desde tu computadora para incorporarlas de forma optimizada:
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {missingAssets.map((asset) => (
                <Box key={asset.filename} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'background.paper', p: 0.8, borderRadius: '4px', border: '1px solid divider' }}>
                  <Typography variant="caption" noWrap sx={{ fontWeight: 'bold', maxWidth: 120, fontSize: '9px' }}>
                    {asset.filename}
                  </Typography>

                  {asset.isFound ? (
                    <span style={{ fontSize: '8.5px', fontWeight: 'bold', color: '#10B981', padding: '1px 6px', borderRadius: '10px', backgroundColor: 'rgba(16,185,129,0.1)' }}>
                      Resuelto
                    </span>
                  ) : (
                    <Button
                      variant="outlined"
                      size="small"
                      component="label"
                      disabled={isProcessing}
                      startIcon={isProcessing ? <CircularProgress size={10} color="inherit" /> : <UploadIcon sx={{ fontSize: '11px' }} />}
                      sx={{ fontSize: '8.5px', p: '1px 6px', textTransform: 'none', height: '20px' }}
                    >
                      {isProcessing ? 'Procesando...' : 'Cargar'}
                      <input type="file" accept="image/*" onChange={(e) => handleLocalImageUpload(e, asset.filename)} style={{ display: 'none' }} />
                    </Button>
                  )}
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* INSPECTOR DE PROPIEDADES CONTEXTUAL */}
      {!selectedBlock ? (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
            Inspector DOM Visual
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '11px', px: 2 }}>
            Haz clic en cualquier elemento de la firma (imagen, texto, enlace, celda) en el lienzo para ver y editar sus atributos y estilos inline directamente.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

          {/* Detalles de Ruta DOM */}
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '12px', color: 'text.primary' }}>
              Elemento Seleccionado: <span style={{ color: '#3B82F6' }}>&lt;{selectedBlock.tagName}&gt;</span>
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', wordBreak: 'break-all', fontSize: '9.5px', mt: 0.5 }}>
              Ruta: {selectedBlock.domPath.split(' > ').slice(-3).join(' > ')}
            </Typography>
          </Box>

          <Divider />

          {/* Campo Contenido de Texto */}
          {selectedBlock.tagName !== 'img' && selectedBlock.tagName !== 'table' && selectedBlock.tagName !== 'tr' && (
            <TextField
              label="Contenido / Texto"
              size="small"
              fullWidth
              value={selectedBlock.content}
              onChange={(e) => onUpdateBlockNode({ content: e.target.value })}
              slotProps={{ input: { sx: { fontSize: '12px' } } }}
            />
          )}

          {/* Campos específicos de Enlaces (a) */}
          {selectedBlock.tagName === 'a' && (
            <TextField
              label="Destino del Enlace (href)"
              size="small"
              fullWidth
              value={getAttr('href')}
              onChange={(e) => handleAttrChange('href', e.target.value)}
              slotProps={{ input: { sx: { fontSize: '12px' } } }}
            />
          )}

          {/* Campos específicos de Imágenes (img) */}
          {selectedBlock.tagName === 'img' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <TextField
                label="Ruta de Imagen (src)"
                size="small"
                fullWidth
                value={getAttr('src').startsWith('data:image') ? 'Imagen en Base64 (Local)' : getAttr('src')}
                disabled={getAttr('src').startsWith('data:image')}
                onChange={(e) => handleAttrChange('src', e.target.value)}
                slotProps={{ input: { sx: { fontSize: '11px' } } }}
              />

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  component="label"
                  disabled={isProcessing}
                  startIcon={isProcessing ? <CircularProgress size={12} color="inherit" /> : <PhotoCameraIcon />}
                  sx={{ fontSize: '9px', textTransform: 'none', py: 0.5 }}
                >
                  {isProcessing ? 'Procesando...' : 'Cargar Imagen'}
                  <input type="file" accept="image/*" onChange={(e) => handleLocalImageUpload(e)} style={{ display: 'none' }} />
                </Button>

                {getAttr('src').startsWith('data:image') && (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<LinkIcon />}
                    onClick={() => handleAttrChange('src', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100&h=100')}
                    sx={{ fontSize: '9px', textTransform: 'none', py: 0.5 }}
                  >
                    Quitar Base64
                  </Button>
                )}
              </Box>

              <TextField
                label="Texto Alternativo (alt)"
                size="small"
                fullWidth
                value={getAttr('alt')}
                onChange={(e) => handleAttrChange('alt', e.target.value)}
                slotProps={{ input: { sx: { fontSize: '11.5px' } } }}
              />
            </Box>
          )}

          {/* Atributos de Dimensiones de Ancho y Alto */}
          {(selectedBlock.tagName === 'img' || selectedBlock.tagName === 'td' || selectedBlock.tagName === 'table') && (
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
              <TextField
                label="Ancho (width)"
                size="small"
                value={getAttr('width') || getStyle('width')}
                placeholder="Ej. 100px, 80%"
                onChange={(e) => {
                  handleAttrChange('width', e.target.value);
                  handleStyleChange('width', e.target.value);
                }}
                slotProps={{ input: { sx: { fontSize: '11px' } } }}
              />
              <TextField
                label="Alto (height)"
                size="small"
                value={getAttr('height') || getStyle('height')}
                placeholder="Ej. 120px, Auto"
                onChange={(e) => {
                  handleAttrChange('height', e.target.value);
                  handleStyleChange('height', e.target.value);
                }}
                slotProps={{ input: { sx: { fontSize: '11px' } } }}
              />
            </Box>
          )}

          {/* Atributos de Tipografía para textos */}
          {selectedBlock.tagName !== 'img' && selectedBlock.tagName !== 'table' && selectedBlock.tagName !== 'tr' && (
            <>
              <FormControl size="small" fullWidth>
                <InputLabel sx={{ fontSize: '11px' }}>Tipografía</InputLabel>
                <Select
                  value={getStyle('font-family').replace(/['"]/g, '').split(',')[0] || 'Inter'}
                  onChange={(e) => handleStyleChange('font-family', `${e.target.value}, sans-serif`)}
                  label="Tipografía"
                  sx={{ fontSize: '12px' }}
                >
                  <MenuItem value="Inter" sx={{ fontFamily: 'Inter' }}>Inter (Por Defecto)</MenuItem>
                  <MenuItem value="Roboto" sx={{ fontFamily: 'Roboto' }}>Roboto</MenuItem>
                  <MenuItem value="Segoe UI" sx={{ fontFamily: 'Segoe UI' }}>Segoe UI (Outlook)</MenuItem>
                  <MenuItem value="Arial" sx={{ fontFamily: 'Arial' }}>Arial</MenuItem>
                  <MenuItem value="Georgia" sx={{ fontFamily: 'Georgia' }}>Georgia (Serif)</MenuItem>
                  <MenuItem value="Verdana" sx={{ fontFamily: 'Verdana' }}>Verdana</MenuItem>
                </Select>
              </FormControl>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 1 }}>
                <TextField
                  label="Tamaño Fuente"
                  size="small"
                  value={getStyle('font-size')}
                  placeholder="Ej. 14px, 11pt"
                  onChange={(e) => handleStyleChange('font-size', e.target.value)}
                  slotProps={{ input: { sx: { fontSize: '11px' } } }}
                />
                <TextField
                  label="Peso (weight)"
                  size="small"
                  value={getStyle('font-weight')}
                  placeholder="Ej. bold, 700"
                  onChange={(e) => handleStyleChange('font-weight', e.target.value)}
                  slotProps={{ input: { sx: { fontSize: '11px' } } }}
                />
              </Box>

              {/* Selector de Color Integrado */}
              <Box sx={{ p: 1, border: '1px solid', borderColor: 'divider', borderRadius: '6px', bgcolor: 'action.hover' }}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                  🎨 Color del Elemento
                </Typography>

                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                  {PREDEFINED_COLORS.map((c) => (
                    <Box
                      key={c}
                      onClick={() => handleColorUpdate(c)}
                      sx={{
                        width: 16,
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
                    value={getStyle('color')}
                    onChange={(e) => handleColorUpdate(e.target.value)}
                    slotProps={{ input: { sx: { fontSize: '11px', height: '22px' } } }}
                  />
                  <input
                    type="color"
                    value={getStyle('color') || '#000000'}
                    onChange={(e) => handleColorUpdate(e.target.value)}
                    style={{ width: '100%', height: '30px', cursor: 'pointer', border: '1px solid #CFD8DC', borderRadius: '4px', padding: '1px' }}
                  />
                </Box>
              </Box>
            </>
          )}

          {/* Atributos Avanzados de Diseño CSS inline */}
          <Box sx={{ p: 1.5, border: '1px dashed', borderColor: 'divider', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
              📐 Relleno y Bordes CSS (Compatibles)
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
              <TextField
                label="Relleno (padding)"
                size="small"
                value={getStyle('padding') || getAttr('padding')}
                placeholder="Ej. 10px 12px"
                onChange={(e) => handleStyleChange('padding', e.target.value)}
                slotProps={{ input: { sx: { fontSize: '11px' } } }}
              />
              <TextField
                label="Margen (margin)"
                size="small"
                value={getStyle('margin') || getAttr('margin')}
                placeholder="Ej. 5px 0"
                onChange={(e) => handleStyleChange('margin', e.target.value)}
                slotProps={{ input: { sx: { fontSize: '11px' } } }}
              />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
              <TextField
                label="Borde (border)"
                size="small"
                value={getStyle('border') || getAttr('border')}
                placeholder="Ej. 1px solid #CCC"
                onChange={(e) => handleStyleChange('border', e.target.value)}
                slotProps={{ input: { sx: { fontSize: '11px' } } }}
              />
              <TextField
                label="Radio de Bordes"
                size="small"
                value={getStyle('border-radius') || getAttr('border-radius')}
                placeholder="Ej. 6px"
                onChange={(e) => handleStyleChange('border-radius', e.target.value)}
                slotProps={{ input: { sx: { fontSize: '11px' } } }}
              />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
              <TextField
                label="Fondo (bgcolor)"
                size="small"
                value={getStyle('background-color') || getAttr('background-color')}
                placeholder="Ej. #F8FAFC"
                onChange={(e) => handleStyleChange('background-color', e.target.value)}
                slotProps={{ input: { sx: { fontSize: '11px' } } }}
              />
              <TextField
                label="Alineación (align)"
                size="small"
                value={getAttr('align') || getStyle('text-align')}
                placeholder="Ej. center, left"
                onChange={(e) => {
                  handleAttrChange('align', e.target.value);
                  handleStyleChange('text-align', e.target.value);
                }}
                slotProps={{ input: { sx: { fontSize: '11px' } } }}
              />
            </Box>
          </Box>

          <Button
            size="small"
            variant="outlined"
            color="error"
            onClick={() => onDeleteBlockNode(selectedBlock.id)}
            sx={{ mt: 1, fontSize: '11px', textTransform: 'none', fontWeight: 'bold' }}
          >
            Eliminar Nodo DOM
          </Button>

        </Box>
      )}
    </Box>
  );
};
export default BlockEditor;
