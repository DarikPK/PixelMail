import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Divider,
  Button,
  IconButton,
  TextField,
  Tabs,
  Tab,
  Card,
  CardContent,
  Tooltip,
  Menu,
  MenuItem,
  ButtonGroup,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress
} from '@mui/material';
import {
  ArrowUpward as MoveUpIcon,
  ArrowDownward as MoveDownIcon,
  FileCopy as DuplicateIcon,
  Delete as DeleteIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  PostAdd as PostAddIcon,
  Download as DownloadIcon,
  ContentCopy as CopyIcon,
  Save as SaveIcon,
  Upload as UploadIcon,
  FolderOpen as FolderOpenIcon,
  Settings as SettingsIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon
} from '@mui/icons-material';

import type { SignatureBlock, SignatureProject } from './types';
import { parseHTMLToBlocks } from './BlockParser';
import { PreviewRenderer } from './PreviewRenderer';
import { BlockEditor } from './BlockEditor';
import { HTMLCodeEditor } from './HTMLCodeEditor';
import { HistoryManager } from './HistoryManager';
import { ProjectManager } from './ProjectManager';
import { exportBlocksToHTML } from './HTMLExporter';
import type { ExportOption } from './HTMLExporter';
import { PREMIUM_TEMPLATES } from '../../pages/ConfiguracionTemplates';
import { PREDEFINED_COMPONENTS } from '../../pages/ConfiguracionComponents';

interface SignatureHTMLEditorProps {
  onSaveToFirebase?: (html: string, structureJSON: string) => Promise<void>;
  initialStructureJSON?: string;
  saving?: boolean;
}

export const SignatureHTMLEditor: React.FC<SignatureHTMLEditorProps> = ({
  onSaveToFirebase,
  initialStructureJSON,
  saving = false
}) => {
  // Estado principal de bloques
  const [blocks, setBlocks] = useState<SignatureBlock[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  // Proyecto e Historial
  const [projectName, setProjectName] = useState<string>('Mi Firma Profesional');
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [savedProjects, setSavedProjects] = useState<SignatureProject[]>([]);

  const historyManagerRef = useRef<HistoryManager>(new HistoryManager());
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Visualizaciones
  const [showCatalog, setShowCatalog] = useState(true);
  const [canvasTab, setCanvasTab] = useState(0); // 0: Previsualización, 1: Código HTML
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile' | 'outlook' | 'gmail' | 'apple'>('desktop');
  const [zoom, setZoom] = useState<number>(100);
  const [gridVisible, setGridVisible] = useState<boolean>(true);
  const [rawHTMLCode, setRawHTMLCode] = useState<string>('');

  // Menús de Importación / Exportación
  const [importAnchorEl, setImportAnchorEl] = useState<null | HTMLElement>(null);
  const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null);
  const [pasteModalOpen, setPasteModalOpen] = useState(false);
  const [pastedHTML, setPastedHTML] = useState('');

  // Cargar proyectos existentes
  useEffect(() => {
    setSavedProjects(ProjectManager.getAllProjects());
    if (initialStructureJSON) {
      try {
        const parsed = JSON.parse(initialStructureJSON);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setBlocks(parsed);
          setShowCatalog(false);
          historyManagerRef.current.clear(parsed);
        }
      } catch (e) {
        console.error("Error al cargar firma inicial de Firebase:", e);
      }
    }
  }, [initialStructureJSON]);

  // Actualizar código HTML en tiempo real cuando cambian los bloques
  useEffect(() => {
    if (blocks.length > 0 && canvasTab !== 1) {
      const generated = exportBlocksToHTML(blocks, 'clean');
      setRawHTMLCode(generated);
    }
  }, [blocks, canvasTab]);

  // Guardar estado en el historial al realizar cambios
  const updateBlocksState = (newBlocks: SignatureBlock[]) => {
    setBlocks(newBlocks);
    historyManagerRef.current.pushState(newBlocks);
    setCanUndo(true);
    setCanRedo(false);
  };

  // Undo / Redo
  const handleUndo = () => {
    const prev = historyManagerRef.current.undo(blocks);
    if (prev) {
      setBlocks(prev);
    } else {
      setCanUndo(false);
    }
  };

  const handleRedo = () => {
    const next = historyManagerRef.current.redo();
    if (next) {
      setBlocks(next);
      setCanUndo(true);
    } else {
      setCanRedo(false);
    }
  };

  // Importar desde Archivo / Drag and Drop
  const handleImportHTMLFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsedBlocks = parseHTMLToBlocks(text);
      updateBlocksState(parsedBlocks);
      setShowCatalog(false);
      setSelectedBlockId(parsedBlocks[0]?.id || null);
    };
    reader.readAsText(file);
    setImportAnchorEl(null);
  };

  const handlePasteHTMLSubmit = () => {
    if (!pastedHTML.trim()) return;
    const parsedBlocks = parseHTMLToBlocks(pastedHTML);
    updateBlocksState(parsedBlocks);
    setShowCatalog(false);
    setSelectedBlockId(parsedBlocks[0]?.id || null);
    setPasteModalOpen(false);
    setPastedHTML('');
    setImportAnchorEl(null);
  };

  // Exportar firma HTML compilada
  const handleExportSignature = (option: ExportOption) => {
    const html = exportBlocksToHTML(blocks, option);
    navigator.clipboard.writeText(html);
    alert(`¡HTML optimizado para ${option.toUpperCase()} copiado al portapapeles!`);
    setExportAnchorEl(null);
  };

  const handleDownloadSignature = () => {
    const html = exportBlocksToHTML(blocks, 'clean');
    const element = document.createElement("a");
    const file = new Blob([html], { type: 'text/html' });
    element.href = URL.createObjectURL(file);
    element.download = `${projectName.toLowerCase().replace(/\s+/g, '-')}.html`;
    document.body.appendChild(element);
    element.click();
    element.remove();
  };

  // Guardar proyecto completo en localStorage y Firebase
  const handleSaveProject = async () => {
    // 1. Guardar localmente
    const proj = ProjectManager.saveProject(projectName, blocks, currentProjectId || undefined);
    setCurrentProjectId(proj.id);
    setSavedProjects(ProjectManager.getAllProjects());

    // 2. Guardar en Firebase de forma transparente si la función de callback existe
    if (onSaveToFirebase) {
      const html = exportBlocksToHTML(blocks, 'clean');
      const structureJSON = JSON.stringify(blocks);
      await onSaveToFirebase(html, structureJSON);
    }

    alert('¡Firma guardada exitosamente en tus proyectos y servidor!');
  };

  const handleLoadProject = (proj: SignatureProject) => {
    setBlocks(proj.blocks);
    setProjectName(proj.name);
    setCurrentProjectId(proj.id);
    setShowCatalog(false);
    setSelectedBlockId(proj.blocks[0]?.id || null);
    historyManagerRef.current.clear(proj.blocks);
  };

  const handleDeleteProject = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('¿Deseas eliminar este proyecto de firmas?')) {
      ProjectManager.deleteProject(id);
      setSavedProjects(ProjectManager.getAllProjects());
      if (currentProjectId === id) {
        setCurrentProjectId(null);
        setBlocks([]);
        setShowCatalog(true);
      }
    }
  };

  // Sincronizar edición directa de código HTML
  const handleHTMLCodeChange = (code: string) => {
    setRawHTMLCode(code);
    const parsed = parseHTMLToBlocks(code);
    setBlocks(parsed);
  };

  // Árbol de Bloques: Operaciones (Mover, Duplicar, Eliminar, Ocultar, Bloquear)
  const handleMoveBlock = (id: string, direction: 'up' | 'down') => {
    const idx = blocks.findIndex(b => b.id === id);
    if (idx === -1) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === blocks.length - 1) return;

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const nextBlocks = [...blocks];
    const temp = nextBlocks[idx];
    nextBlocks[idx] = nextBlocks[targetIdx];
    nextBlocks[targetIdx] = temp;

    updateBlocksState(nextBlocks);
  };

  const handleDuplicateBlock = (id: string) => {
    const idx = blocks.findIndex(b => b.id === id);
    if (idx === -1) return;

    const target = blocks[idx];
    const duplicated: SignatureBlock = {
      ...target,
      id: 'sb-' + Math.random().toString(36).substr(2, 9),
      name: `${target.name} (Copia)`
    };

    const nextBlocks = [...blocks];
    nextBlocks.splice(idx + 1, 0, duplicated);
    updateBlocksState(nextBlocks);
  };

  const handleDeleteBlock = (id: string) => {
    const nextBlocks = blocks.filter(b => b.id !== id);
    updateBlocksState(nextBlocks);
    if (selectedBlockId === id) {
      setSelectedBlockId(null);
    }
  };

  const handleUpdateBlockProperties = (updatedFields: Partial<SignatureBlock>) => {
    if (!selectedBlockId) return;
    const nextBlocks = blocks.map(b => b.id === selectedBlockId ? { ...b, ...updatedFields } : b);
    updateBlocksState(nextBlocks);
  };

  const handleInsertLibraryComponent = (comp: any) => {
    // Generar bloque clonado
    const freshBlocks: SignatureBlock[] = comp.blocks.map((b: any, idx: number) => ({
      ...b,
      id: `sb-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`
    }));

    updateBlocksState([...blocks, ...freshBlocks]);
    setSelectedBlockId(freshBlocks[0]?.id || null);
  };

  const selectedBlock = blocks.find(b => b.id === selectedBlockId) || null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, animation: 'fadeIn 150ms ease-in-out' }}>

      {/* HEADER DE CONTROLES DEL EDITOR */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, pb: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <TextField
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            size="small"
            placeholder="Nombre del Proyecto"
            sx={{
              '& .MuiInputBase-input': {
                fontWeight: 'bold',
                fontSize: '14.5px',
                color: 'text.primary',
                width: '180px'
              }
            }}
          />

          {/* Historial Deshacer/Rehacer */}
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title="Deshacer (Undo)">
              <IconButton size="small" onClick={handleUndo} disabled={!canUndo}>
                <UndoIcon sx={{ fontSize: '18px' }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Rehacer (Redo)">
              <IconButton size="small" onClick={handleRedo} disabled={!canRedo}>
                <RedoIcon sx={{ fontSize: '18px' }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Botones de Acción principales */}
        <Box sx={{ display: 'flex', gap: 1.0, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<PostAddIcon />}
            onClick={() => setShowCatalog(true)}
            sx={{ fontSize: '11px', textTransform: 'none', height: '30px', fontWeight: 'bold' }}
          >
            Selector de Plantillas
          </Button>

          {/* Botón Importar Dropdown */}
          <Button
            size="small"
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={(e) => setImportAnchorEl(e.currentTarget)}
            sx={{ fontSize: '11px', textTransform: 'none', height: '30px' }}
          >
            Importar Firma HTML
          </Button>
          <Menu
            anchorEl={importAnchorEl}
            open={Boolean(importAnchorEl)}
            onClose={() => setImportAnchorEl(null)}
          >
            <MenuItem component="label" sx={{ fontSize: '12px' }}>
              📁 Subir Archivo HTML
              <input type="file" accept=".html" onChange={handleImportHTMLFile} style={{ display: 'none' }} />
            </MenuItem>
            <MenuItem onClick={() => { setPasteModalOpen(true); setImportAnchorEl(null); }} sx={{ fontSize: '12px' }}>
              📝 Pegar código HTML
            </MenuItem>
          </Menu>

          {/* Botón Copiar HTML con opciones */}
          <Button
            size="small"
            variant="outlined"
            startIcon={<CopyIcon />}
            onClick={(e) => setExportAnchorEl(e.currentTarget)}
            sx={{ fontSize: '11px', textTransform: 'none', height: '30px' }}
          >
            Copiar HTML Optimizado
          </Button>
          <Menu
            anchorEl={exportAnchorEl}
            open={Boolean(exportAnchorEl)}
            onClose={() => setExportAnchorEl(null)}
          >
            <MenuItem onClick={() => handleExportSignature('clean')} sx={{ fontSize: '12px' }}>Copiar HTML Limpio</MenuItem>
            <MenuItem onClick={() => handleExportSignature('gmail')} sx={{ fontSize: '12px' }}>Optimizado para Gmail</MenuItem>
            <MenuItem onClick={() => handleExportSignature('outlook')} sx={{ fontSize: '12px' }}>Optimizado para Outlook</MenuItem>
            <MenuItem onClick={() => handleExportSignature('apple')} sx={{ fontSize: '12px' }}>Optimizado para Apple Mail</MenuItem>
            <MenuItem onClick={() => handleExportSignature('base64_img')} sx={{ fontSize: '12px' }}>Firma con imágenes Base64</MenuItem>
          </Menu>

          <Button
            size="small"
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadSignature}
            sx={{ fontSize: '11px', textTransform: 'none', height: '30px' }}
          >
            Descargar HTML
          </Button>

          <Button
            size="small"
            variant="contained"
            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
            onClick={handleSaveProject}
            disabled={saving}
            sx={{ fontSize: '11px', textTransform: 'none', height: '30px', background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)', fontWeight: 'bold' }}
          >
            {saving ? 'Guardando...' : 'Guardar Firma'}
          </Button>
        </Box>
      </Box>

      {/* CATALOGO DE PLANTILLAS INICIAL */}
      {showCatalog && (
        <Box sx={{ animation: 'fadeIn 180ms ease' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 2, color: 'text.primary', fontSize: '13px' }}>
            Selecciona una plantilla corporativa, importa tu firma HTML o reabre un proyecto:
          </Typography>

          {/* Proyectos Guardados previamente */}
          {savedProjects.length > 0 && (
            <Box sx={{ mb: 4, p: 2, bgcolor: 'action.hover', borderRadius: '8px', border: '1px solid divider' }}>
              <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5, color: '#3B82F6' }}>
                <FolderOpenIcon sx={{ fontSize: '15px' }} /> TUS PROYECTOS GUARDADOS ({savedProjects.length})
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 1.5 }}>
                {savedProjects.map((p) => (
                  <Card
                    key={p.id}
                    variant="outlined"
                    onClick={() => handleLoadProject(p)}
                    sx={{
                      p: 1.2,
                      cursor: 'pointer',
                      borderRadius: '6px',
                      '&:hover': { borderColor: '#3B82F6', bgcolor: 'background.paper' }
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '12px' }}>
                        {p.name}
                      </Typography>
                      <IconButton size="small" color="error" onClick={(e) => handleDeleteProject(e, p.id)}>
                        <DeleteIcon sx={{ fontSize: '14px' }} />
                      </IconButton>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontSize: '9px' }}>
                      Modificado: {new Date(p.updatedAt).toLocaleDateString()}
                    </Typography>
                  </Card>
                ))}
              </Box>
            </Box>
          )}

          {/* Plantillas Pre-diseñadas */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 2.5 }}>
            {PREMIUM_TEMPLATES.map((tmpl: any) => (
              <Card
                key={tmpl.id}
                variant="outlined"
                onClick={() => {
                  setBlocks(JSON.parse(JSON.stringify(tmpl.rows)));
                  setShowCatalog(false);
                }}
                sx={{
                  borderRadius: '8px',
                  cursor: 'pointer',
                  border: '1.5px solid',
                  borderColor: 'divider',
                  overflow: 'hidden',
                  transition: 'transform 150ms, box-shadow 150ms',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 16px rgba(0,0,0,0.06)',
                    borderColor: '#3B82F6'
                  }
                }}
              >
                <Box sx={{ p: 2, bgcolor: '#FAFAFA', borderBottom: '1px solid', borderColor: 'divider', minHeight: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'text.secondary', opacity: 0.7, fontSize: '14px' }}>
                    {tmpl.name}
                  </Typography>
                </Box>
                <CardContent sx={{ p: 1.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '12px' }}>{tmpl.name}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, height: '34px', overflow: 'hidden', fontSize: '10px' }}>
                    {tmpl.description}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>
      )}

      {/* WORKSPACE DE EDICIÓN EN 3 PANELES */}
      {!showCatalog && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '210px 1fr 230px' }, gap: 2, animation: 'fadeIn 120ms ease' }}>

          {/* PANEL IZQUIERDO: Arbol de bloques y Biblioteca */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

            {/* ÁRBOL DE BLOQUES DE LA FIRMA */}
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: '8px', border: '1px solid divider', bgcolor: 'background.paper' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, fontSize: '12px' }}>
                🗂 Árbol de Bloques HTML
              </Typography>
              <Divider sx={{ mb: 1.5 }} />

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6, maxHeight: '280px', overflowY: 'auto' }}>
                {blocks.map((block, idx) => {
                  const isSelected = selectedBlockId === block.id;
                  return (
                    <Box
                      key={block.id}
                      onClick={() => setSelectedBlockId(block.id)}
                      sx={{
                        p: '6px 8px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        border: '1px solid',
                        borderColor: isSelected ? '#3B82F6' : 'divider',
                        bgcolor: isSelected ? 'rgba(59,130,246,0.06)' : 'transparent',
                        '&:hover': { bgcolor: 'action.hover' }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
                        <span style={{ fontSize: '12px' }}>
                          {block.type === 'logo' ? '🖼' : block.type === 'name' ? '👤' : block.type === 'qr' ? '🔳' : block.type === 'button' ? '🎛' : '📄'}
                        </span>
                        <Typography variant="caption" noWrap sx={{ fontWeight: isSelected ? 'bold' : 'normal', fontSize: '10.5px' }}>
                          {block.name}
                        </Typography>
                      </Box>

                      {/* Controles de ordenamiento en el árbol */}
                      <Box sx={{ display: 'flex', gap: 0.2 }} onClick={(e) => e.stopPropagation()}>
                        <IconButton size="small" onClick={() => handleMoveBlock(block.id, 'up')} disabled={idx === 0} sx={{ p: 0.1 }}>
                          <MoveUpIcon sx={{ fontSize: '11px' }} />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleMoveBlock(block.id, 'down')} disabled={idx === blocks.length - 1} sx={{ p: 0.1 }}>
                          <MoveDownIcon sx={{ fontSize: '11px' }} />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleDuplicateBlock(block.id)} sx={{ p: 0.1 }}>
                          <DuplicateIcon sx={{ fontSize: '11px' }} />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDeleteBlock(block.id)} sx={{ p: 0.1 }}>
                          <DeleteIcon sx={{ fontSize: '11px' }} />
                        </IconButton>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Paper>

            {/* BIBLIOTECA DE COMPONENTES ADICIONALES */}
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: '8px', border: '1px solid divider', bgcolor: 'background.paper' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, fontSize: '12px' }}>
                📦 Insertar Componente
              </Typography>
              <Divider sx={{ mb: 1.5 }} />

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: '200px', overflowY: 'auto' }}>
                {PREDEFINED_COMPONENTS.map((comp: any) => (
                  <Card
                    key={comp.id}
                    variant="outlined"
                    onClick={() => handleInsertLibraryComponent(comp)}
                    sx={{
                      p: 1,
                      cursor: 'pointer',
                      borderRadius: '5px',
                      '&:hover': { borderColor: '#3B82F6', bgcolor: 'action.hover' }
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '10.5px' }}>
                      {comp.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '8.5px', lineHeight: 1.2 }}>
                      {comp.description}
                    </Typography>
                  </Card>
                ))}
              </Box>
            </Paper>
          </Box>

          {/* PANEL CENTRAL: Canvas interactivo o código HTML */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

            {/* Controles de Vista, Zoom, Guías */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'action.hover', p: 1, borderRadius: '6px', border: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <ButtonGroup size="small">
                  <IconButton size="small" onClick={() => setZoom(prev => Math.max(50, prev - 25))}>
                    <ZoomOutIcon sx={{ fontSize: '15px' }} />
                  </IconButton>
                  <Button disabled sx={{ fontSize: '10px', fontWeight: 'bold', px: 1, py: 0.1 }}>
                    {zoom}%
                  </Button>
                  <IconButton size="small" onClick={() => setZoom(prev => Math.min(150, prev + 25))}>
                    <ZoomInIcon sx={{ fontSize: '15px' }} />
                  </IconButton>
                </ButtonGroup>
                <Button size="small" onClick={() => setZoom(100)} sx={{ fontSize: '9.5px', textTransform: 'none', py: 0.2 }}>
                  Ajustar
                </Button>
              </Box>

              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button size="small" variant="text" onClick={() => setGridVisible(!gridVisible)} startIcon={<SettingsIcon />} sx={{ fontSize: '9.5px', textTransform: 'none' }}>
                  {gridVisible ? 'Ocultar Guías' : 'Mostrar Guías'}
                </Button>
              </Box>
            </Box>

            {/* Pestañas de Vista Previa vs Código */}
            <Box sx={{ borderBottom: '1px solid divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Tabs value={canvasTab} onChange={(_, v) => setCanvasTab(v)} sx={{ minHeight: '30px' }}>
                <Tab label="📱 Previsualización" sx={{ fontSize: '11px', minHeight: '30px', textTransform: 'none' }} />
                <Tab label="💻 Código HTML" sx={{ fontSize: '11px', minHeight: '30px', textTransform: 'none' }} />
              </Tabs>

              {canvasTab === 0 && (
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Button size="small" onClick={() => setPreviewMode('desktop')} variant={previewMode === 'desktop' ? 'contained' : 'text'} sx={{ fontSize: '9px', py: 0.1, minWidth: 'auto', textTransform: 'none' }}>Escritorio</Button>
                  <Button size="small" onClick={() => setPreviewMode('mobile')} variant={previewMode === 'mobile' ? 'contained' : 'text'} sx={{ fontSize: '9px', py: 0.1, minWidth: 'auto', textTransform: 'none' }}>Móvil</Button>
                  <Button size="small" onClick={() => setPreviewMode('outlook')} variant={previewMode === 'outlook' ? 'contained' : 'text'} sx={{ fontSize: '9px', py: 0.1, minWidth: 'auto', textTransform: 'none' }}>Outlook</Button>
                  <Button size="small" onClick={() => setPreviewMode('gmail')} variant={previewMode === 'gmail' ? 'contained' : 'text'} sx={{ fontSize: '9px', py: 0.1, minWidth: 'auto', textTransform: 'none' }}>Gmail</Button>
                </Box>
              )}
            </Box>

            {/* RENDERIZADO DEL LIENZO O CÓDIGO */}
            {canvasTab === 0 ? (
              <PreviewRenderer
                blocks={blocks}
                selectedBlockId={selectedBlockId}
                onSelectBlock={setSelectedBlockId}
                previewMode={previewMode}
                zoom={zoom}
                gridVisible={gridVisible}
              />
            ) : (
              <HTMLCodeEditor
                htmlCode={rawHTMLCode}
                onCodeChange={handleHTMLCodeChange}
              />
            )}
          </Box>

          {/* PANEL DERECHO: Inspector de Propiedades */}
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: '8px', border: '1px solid divider', bgcolor: 'background.paper', height: 'fit-content' }}>
            <BlockEditor
              selectedBlock={selectedBlock}
              onUpdateBlock={handleUpdateBlockProperties}
              onDeleteBlock={handleDeleteBlock}
            />
          </Paper>

        </Box>
      )}

      {/* MODAL DE PEGAR CÓDIGO HTML */}
      <Dialog open={pasteModalOpen} onClose={() => setPasteModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: '15px', fontWeight: 'bold' }}>Pegar código de firma HTML existente</DialogTitle>
        <DialogContent>
          <TextField
            multiline
            rows={12}
            fullWidth
            value={pastedHTML}
            onChange={(e) => setPastedHTML(e.target.value)}
            placeholder="Pega el código HTML completo aquí..."
            slotProps={{ input: { sx: { fontFamily: 'monospace', fontSize: '11px' } } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasteModalOpen(false)} size="small" sx={{ textTransform: 'none' }}>Cancelar</Button>
          <Button onClick={handlePasteHTMLSubmit} size="small" variant="contained" sx={{ textTransform: 'none' }}>Importar Ahora</Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};
export default SignatureHTMLEditor;
