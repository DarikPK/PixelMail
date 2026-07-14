import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  CircularProgress,
  Collapse
} from '@mui/material';
import {
  Undo as UndoIcon,
  Redo as RedoIcon,
  PostAdd as PostAddIcon,
  Download as DownloadIcon,
  ContentCopy as CopyIcon,
  Save as SaveIcon,
  Upload as UploadIcon,
  FolderOpen as FolderOpenIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  FactCheck as AuditIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
  KeyboardArrowDown as ArrowDownIcon,
  KeyboardArrowRight as ArrowRightIcon,
  CheckCircle as SuccessIcon,
  Search as SearchIcon
} from '@mui/icons-material';

import type { SignatureBlock, SignatureProject, AssetRecord } from './types';
import {
  injectSBIds,
  sanitizeHTML,
  findMissingAssets,
  buildDOMTree,
  updateHTMLNode
} from './BlockParser';
import { PreviewRenderer } from './PreviewRenderer';
import { BlockEditor } from './BlockEditor';
import { HTMLCodeEditor } from './HTMLCodeEditor';
import { HistoryManager } from './HistoryManager';
import { ProjectManager } from './ProjectManager';
import { OutlookAnalyzer } from './OutlookAnalyzer';
import { exportBlocksToHTML } from './HTMLExporter';
import type { ExportOption } from './HTMLExporter';
import { PREMIUM_TEMPLATES } from '../../pages/ConfiguracionTemplates';
import { PREDEFINED_COMPONENTS } from '../../pages/ConfiguracionComponents';
import { DOMTreePanel } from './DOMTreePanel';
import { generateHTMLFromStructure } from '../../pages/Configuracion';

interface SignatureHTMLEditorProps {
  onSaveToFirebase?: (html: string, structureJSON: string) => Promise<void>;
  initialStructureJSON?: string;
  saving?: boolean;
  initialName?: string;
}

export const SignatureHTMLEditor: React.FC<SignatureHTMLEditorProps> = ({
  onSaveToFirebase,
  initialStructureJSON,
  saving = false,
  initialName = 'Mi Firma Profesional'
}) => {
  // HTML maestro original con IDs inyectados
  const [rawHTML, setRawHTML] = useState<string>('');

  // Árbol simplificado construido del DOM
  const [blocks, setBlocks] = useState<SignatureBlock[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  // Registro de recursos locales/faltantes
  const [missingAssets, setMissingAssets] = useState<AssetRecord[]>([]);

  // Proyecto e Historial
  const [projectName, setProjectName] = useState<string>(initialName);

  useEffect(() => {
    if (initialName) {
      setProjectName(initialName);
    }
  }, [initialName]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [savedProjects, setSavedProjects] = useState<SignatureProject[]>([]);

  const historyManagerRef = useRef<HistoryManager>(new HistoryManager());
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Visualizaciones
  const [showCatalog, setShowCatalog] = useState(true);
  const [canvasTab, setCanvasTab] = useState(0); // 0: Previsualización, 1: Código HTML
  const [rightSidebarTab, setRightSidebarTab] = useState(0); // 0: Propiedades, 1: Auditoría Outlook
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile' | 'outlook' | 'gmail' | 'apple'>('desktop');
  const [zoom, setZoom] = useState<number>(100);
  const [gridVisible, setGridVisible] = useState<boolean>(true);

  // Buscador de componentes
  const [searchComponentQuery, setSearchComponentQuery] = useState<string>('');

  // Categorías colapsables colapsadas/expandidas persistidas en la sesión
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>(() => {
    try {
      const saved = sessionStorage.getItem('pixelmail_sig_categories');
      return saved ? JSON.parse(saved) : {
        'Básicos': false,
        'Imágenes': false,
        'Contacto': false,
        'Acciones': false,
        'Social': false,
        'Legal': false
      };
    } catch (e) {
      return {
        'Básicos': false,
        'Imágenes': false,
        'Contacto': false,
        'Acciones': false,
        'Social': false,
        'Legal': false
      };
    }
  });

  // Guardar colapso de categorías
  useEffect(() => {
    sessionStorage.setItem('pixelmail_sig_categories', JSON.stringify(collapsedCategories));
  }, [collapsedCategories]);

  // Mensaje flotante de confirmación visual
  const [toastMessage, setToastMessage] = useState<string>('');

  // Modales de visualización de recursos y confirmación
  const [viewAsset, setViewAsset] = useState<AssetRecord | null>(null);
  const [viewAssetMetadata, setViewAssetMetadata] = useState<{ dimensions: string; size: string; type: string } | null>(null);
  const [replaceMultipleOpen, setReplaceMultipleOpen] = useState(false);
  const [replaceMultipleData, setReplaceMultipleData] = useState<{ filename: string; dataUrl: string; occurrences: number } | null>(null);

  // Menús de Importación / Exportación
  const [importAnchorEl, setImportAnchorEl] = useState<null | HTMLElement>(null);
  const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null);
  const [pasteModalOpen, setPasteModalOpen] = useState(false);
  const [pastedHTML, setPastedHTML] = useState('');

  // Cargar proyectos existentes
  useEffect(() => {
    setSavedProjects(ProjectManager.getAllProjects());
  }, []);

  // Inicializar con firma de Firebase si existe
  useEffect(() => {
    if (initialStructureJSON) {
      try {
        const parsed = JSON.parse(initialStructureJSON);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Si poseemos datos estructurados del visual builder anterior
          const compiledHTML = generateHTMLFromStructure(parsed);
          const enriched = injectSBIds(compiledHTML);
          setRawHTML(enriched);
          const tree = buildDOMTree(enriched);
          setBlocks(tree);
          setMissingAssets(findMissingAssets(enriched));
          setShowCatalog(false);
          historyManagerRef.current.clear(tree);
        }
      } catch (e) {
        console.error("Error al cargar firma inicial de Firebase:", e);
      }
    }
  }, [initialStructureJSON]);

  // Guardar estado en el historial al realizar cambios
  const updateHTMLState = (newHTML: string) => {
    const enriched = injectSBIds(newHTML);
    setRawHTML(enriched);
    const tree = buildDOMTree(enriched);
    setBlocks(tree);
    setMissingAssets(findMissingAssets(enriched));

    // Guardar instantánea para Undo/Redo
    historyManagerRef.current.pushState(tree);
    setCanUndo(true);
    setCanRedo(false);
  };

  // Undo / Redo
  const handleUndo = () => {
    const prev = historyManagerRef.current.undo(blocks);
    if (prev) {
      setBlocks(prev);
      // Re-compilar HTML desde el árbol
      const reconstructed = exportBlocksToHTML(rawHTML, 'clean');
      setRawHTML(reconstructed);
    } else {
      setCanUndo(false);
    }
  };

  const handleRedo = () => {
    const next = historyManagerRef.current.redo();
    if (next) {
      setBlocks(next);
      const reconstructed = exportBlocksToHTML(rawHTML, 'clean');
      setRawHTML(reconstructed);
      setCanUndo(true);
    } else {
      setCanRedo(false);
    }
  };

  // Importar desde Archivo / Drag and Drop (NUEVO MODO DOM SEGURO)
  const handleImportHTMLFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const sanitized = sanitizeHTML(text);
      const enriched = injectSBIds(sanitized);
      setRawHTML(enriched);

      const tree = buildDOMTree(enriched);
      setBlocks(tree);
      setMissingAssets(findMissingAssets(enriched));
      setShowCatalog(false);
      setSelectedBlockId(tree[0]?.id || null);

      historyManagerRef.current.clear(tree);
    };
    reader.readAsText(file);
    setImportAnchorEl(null);
  };

  const handlePasteHTMLSubmit = () => {
    if (!pastedHTML.trim()) return;
    const sanitized = sanitizeHTML(pastedHTML);
    const enriched = injectSBIds(sanitized);
    setRawHTML(enriched);

    const tree = buildDOMTree(enriched);
    setBlocks(tree);
    setMissingAssets(findMissingAssets(enriched));
    setShowCatalog(false);
    setSelectedBlockId(tree[0]?.id || null);

    setPasteModalOpen(false);
    setPastedHTML('');
    setImportAnchorEl(null);

    historyManagerRef.current.clear(tree);
  };

  // Cargar una plantilla pre-diseñada al lienzo
  const handleSelectTemplate = (tmpl: any) => {
    const compiledHTML = generateHTMLFromStructure(tmpl.rows);
    const enriched = injectSBIds(compiledHTML);
    setRawHTML(enriched);

    const tree = buildDOMTree(enriched);
    setBlocks(tree);
    setMissingAssets(findMissingAssets(enriched));
    setShowCatalog(false);
    setSelectedBlockId(tree[0]?.id || null);

    historyManagerRef.current.clear(tree);
  };

  // Resolver / Reemplazar un recurso local
  const handleResolveAsset = (filename: string, dataUrl: string) => {
    // Buscar ocurrencias en el HTML
    const parser = new DOMParser();
    const docParser = parser.parseFromString(rawHTML, 'text/html');
    const imgs = docParser.querySelectorAll('img');

    let occurrences = 0;
    imgs.forEach((img) => {
      const src = img.getAttribute('src') || '';
      if (src.includes(filename)) {
        occurrences++;
      }
    });

    if (occurrences > 1) {
      // Si se utiliza en más de un lugar, preguntar antes
      setReplaceMultipleData({ filename, dataUrl, occurrences });
      setReplaceMultipleOpen(true);
    } else {
      applyAssetReplacement(filename, dataUrl, true);
    }
  };

  const applyAssetReplacement = (filename: string, dataUrl: string, replaceAll: boolean) => {
    const parser = new DOMParser();
    const docParser = parser.parseFromString(rawHTML, 'text/html');
    const imgs = docParser.querySelectorAll('img');

    imgs.forEach((img) => {
      const src = img.getAttribute('src') || '';
      const isMatch = src.includes(filename);

      if (isMatch) {
        if (replaceAll) {
          img.setAttribute('src', dataUrl);
        } else {
          // Reemplazar solo si está seleccionado actualmente
          const sbId = img.getAttribute('data-sb-id');
          if (sbId === selectedBlockId) {
            img.setAttribute('src', dataUrl);
          }
        }
      }
    });

    const nextHTML = docParser.body.innerHTML;

    // Actualizar registro de assets
    const updatedAssets = missingAssets.map((a) =>
      a.filename === filename ? { ...a, isFound: true, resolvedDataUrl: dataUrl } : a
    );
    // Si no existía, agregarlo a vinculados
    if (!updatedAssets.some((a) => a.filename === filename)) {
      updatedAssets.push({ filename, isFound: true, resolvedDataUrl: dataUrl });
    }

    setMissingAssets(updatedAssets);
    updateHTMLState(nextHTML);
    setReplaceMultipleOpen(false);
    setReplaceMultipleData(null);
    showToast('Recurso reemplazado con éxito');
  };

  // Reemplazar recurso manual desde el selector
  const handleLocalImageUpload = (e: React.ChangeEvent<HTMLInputElement>, filename: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('La imagen es demasiado grande (máximo 2MB).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      handleResolveAsset(filename, base64);
    };
    reader.readAsDataURL(file);
  };

  // Visualizar detalles del recurso (Ver)
  const handleViewAssetDetails = (asset: AssetRecord) => {
    setViewAsset(asset);

    // Obtener metadatos de dimensiones y tamaño estimulados
    if (asset.resolvedDataUrl) {
      const img = new Image();
      img.src = asset.resolvedDataUrl;
      img.onload = () => {
        const approxSize = Math.round((asset.resolvedDataUrl!.length * 3) / 4 / 1024);
        setViewAssetMetadata({
          dimensions: `${img.width} x ${img.height} px`,
          size: `${approxSize} KB`,
          type: asset.resolvedDataUrl!.split(';')[0].split(':')[1] || 'Imagen'
        });
      };
    } else {
      setViewAssetMetadata(null);
    }
  };

  // Descargar recurso
  const handleDownloadAsset = (asset: AssetRecord) => {
    if (!asset.resolvedDataUrl) return;
    const link = document.createElement('a');
    link.href = asset.resolvedDataUrl;
    link.download = asset.filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Restaurar ruta original del recurso
  const handleRestoreAssetPath = (asset: AssetRecord) => {
    if (window.confirm(`¿Deseas restaurar la ruta original "${asset.filename}" de este recurso?`)) {
      const parser = new DOMParser();
      const docParser = parser.parseFromString(rawHTML, 'text/html');

      docParser.querySelectorAll('img').forEach((img) => {
        const src = img.getAttribute('src') || '';
        if (src === asset.resolvedDataUrl) {
          img.setAttribute('src', `assets/${asset.filename}`);
        }
      });

      const nextHTML = docParser.body.innerHTML;
      const updatedAssets = missingAssets.map((a) =>
        a.filename === asset.filename ? { ...a, isFound: false, resolvedDataUrl: undefined } : a
      );
      setMissingAssets(updatedAssets);
      updateHTMLState(nextHTML);
      showToast('Ruta de recurso restaurada');
    }
  };

  // Eliminar asociación del recurso
  const handleUnlinkAsset = (filename: string) => {
    if (window.confirm('¿Deseas desvincular este recurso y marcarlo como pendiente de carga?')) {
      const updatedAssets = missingAssets.map((a) =>
        a.filename === filename ? { ...a, isFound: false, resolvedDataUrl: undefined } : a
      );
      setMissingAssets(updatedAssets);
      showToast('Recurso desvinculado');
    }
  };

  // Mostrar mensaje flotante temporal
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  // Copiar / Exportar
  const handleExportSignature = (option: ExportOption) => {
    const html = exportBlocksToHTML(rawHTML, option);
    navigator.clipboard.writeText(html);
    alert(`¡HTML optimizado para ${option.toUpperCase()} copiado al portapapeles!`);
    setExportAnchorEl(null);
  };

  const handleDownloadSignature = () => {
    const html = exportBlocksToHTML(rawHTML, 'clean');
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
    const proj = ProjectManager.saveProject(
      projectName,
      rawHTML,
      blocks,
      missingAssets,
      currentProjectId || undefined
    );
    setCurrentProjectId(proj.id);
    setSavedProjects(ProjectManager.getAllProjects());

    // Sincronizar en Firebase
    if (onSaveToFirebase) {
      const html = exportBlocksToHTML(rawHTML, 'clean');
      const structureJSON = JSON.stringify(blocks);
      await onSaveToFirebase(html, structureJSON);
    }

    showToast('Firma guardada en la base de datos');
  };

  const handleLoadProject = (proj: SignatureProject) => {
    setBlocks(proj.blocks);
    setProjectName(proj.name);
    setCurrentProjectId(proj.id);

    const enriched = injectSBIds(proj.rawHTML);
    setRawHTML(enriched);
    setMissingAssets(findMissingAssets(enriched));

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
        setRawHTML('');
        setShowCatalog(true);
      }
    }
  };

  // Sincronizar cambios directos de código HTML
  const handleHTMLCodeChange = (code: string) => {
    setRawHTMLCode(code);
  };

  const setRawHTMLCode = (code: string) => {
    const sanitized = sanitizeHTML(code);
    const enriched = injectSBIds(sanitized);
    setRawHTML(enriched);
    const tree = buildDOMTree(enriched);
    setBlocks(tree);
  };

  // Modificación del Nodo DOM Seleccionado (Alineación, Atributos, Contenido)
  const handleUpdateNodeDOMProperties = (updates: {
    content?: string;
    attributes?: Record<string, string>;
    inlineStyles?: Record<string, string>;
  }) => {
    if (!selectedBlockId) return;
    const updatedHTML = updateHTMLNode(rawHTML, selectedBlockId, updates);
    setRawHTML(updatedHTML);
    setBlocks(buildDOMTree(updatedHTML));
  };

  const handleDeleteNodeDOM = (id: string) => {
    if (window.confirm('¿Deseas eliminar este nodo del DOM de la firma?')) {
      const parser = new DOMParser();
      const docParser = parser.parseFromString(rawHTML, 'text/html');
      const el = docParser.querySelector(`[data-sb-id="${id}"]`);
      if (el) {
        el.remove();
        const nextHTML = docParser.body.innerHTML;
        updateHTMLState(nextHTML);
        setSelectedBlockId(null);
      }
    }
  };

  const handleUpdateBlockMeta = (id: string, updates: Partial<SignatureBlock>) => {
    const nextBlocks = blocks.map((b) => (b.id === id ? { ...b, ...updates } : b));
    setBlocks(nextBlocks);
  };

  // OPTIMIZAR COPIA PARA OUTLOOK (Auditoría interactiva no destructiva de MSO)
  const handleOptimizeForOutlook = () => {
    if (window.confirm('¿Deseas optimizar una copia de la firma actual para máxima compatibilidad con Outlook?')) {
      // Reemplaza elementos Base64 locales por imágenes fallback externas, remueve border-radius y box-shadows incompatibles
      const parser = new DOMParser();
      const docParser = parser.parseFromString(rawHTML, 'text/html');

      // 1. Quitar base64
      docParser.querySelectorAll('img').forEach((img) => {
        const src = img.getAttribute('src') || '';
        if (src.startsWith('data:image')) {
          img.setAttribute('src', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100&h=100');
        }
        img.style.borderRadius = '';
      });

      // 2. Limpiar estilos no soportados en td
      docParser.querySelectorAll('td, div, table').forEach((el) => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.borderRadius = '';
        htmlEl.style.boxShadow = '';
        htmlEl.style.display = '';
      });

      const nextHTML = docParser.body.innerHTML;
      updateHTMLState(nextHTML);
      alert('¡Firma optimizada para Outlook!');
    }
  };

  // Insertar componente de biblioteca en la firma HTML activa
  const handleInsertLibraryComponent = (comp: any) => {
    const compHTML = generateHTMLFromStructure(comp.blocks);
    const parser = new DOMParser();
    const docParser = parser.parseFromString(rawHTML, 'text/html');

    const wrapper = docParser.createElement('div');
    wrapper.innerHTML = compHTML;

    // Insertar después del seleccionado, si existe
    if (selectedBlockId) {
      const el = docParser.querySelector(`[data-sb-id="${selectedBlockId}"]`);
      if (el && el.parentElement) {
        el.parentElement.insertBefore(wrapper, el.nextSibling);
      } else {
        docParser.body.appendChild(wrapper);
      }
    } else {
      docParser.body.appendChild(wrapper);
    }

    const nextHTML = docParser.body.innerHTML;
    updateHTMLState(nextHTML);
    showToast('Componente insertado con éxito');
  };

  // Encontrar recursivamente el bloque seleccionado
  const findSelectedBlockRecursively = (nodes: SignatureBlock[]): SignatureBlock | null => {
    for (const node of nodes) {
      if (node.id === selectedBlockId) return node;
      if (node.children) {
        const found = findSelectedBlockRecursively(node.children);
        if (found) return found;
      }
    }
    return null;
  };

  const selectedBlock = findSelectedBlockRecursively(blocks);

  // Filtrado de componentes según buscador
  const filteredComponents = useMemo<any[]>(() => {
    const query = searchComponentQuery.trim().toLowerCase();
    if (!query) return PREDEFINED_COMPONENTS;

    return PREDEFINED_COMPONENTS.filter((comp: any) => {
      const matchName = comp.name.toLowerCase().includes(query);
      const matchCategory = comp.category.toLowerCase().includes(query);
      const matchDesc = comp.description.toLowerCase().includes(query);
      const matchKeywords = comp.keywords && comp.keywords.some((k: string) => k.toLowerCase().includes(query));

      return matchName || matchCategory || matchDesc || matchKeywords;
    });
  }, [searchComponentQuery]);

  // Agrupamiento por categorías
  const groupedComponents = useMemo<Record<string, any[]>>(() => {
    const groups: Record<string, any[]> = {
      'Básicos': [],
      'Imágenes': [],
      'Contacto': [],
      'Acciones': [],
      'Social': [],
      'Legal': []
    };

    filteredComponents.forEach((comp: any) => {
      const cat = comp.category || 'Básicos';
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(comp);
    });

    return groups;
  }, [filteredComponents]);

  const toggleCategoryCollapse = (cat: string) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [cat]: !prev[cat]
    }));
  };

  // Dividir recursos en Pendientes (Faltantes) y Vinculados (Resueltos)
  const pendingAssets = missingAssets.filter(a => !a.isFound);
  const linkedAssets = missingAssets.filter(a => a.isFound);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, animation: 'fadeIn 150ms ease-in-out', position: 'relative' }}>

      {/* MENSAJE FLOTANTE TOAST DE CONFIRMACIÓN */}
      {toastMessage && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            bgcolor: '#1E293B',
            color: '#FFFFFF',
            px: 2.5,
            py: 1.2,
            borderRadius: '24px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            gap: 1.0,
            animation: 'fadeInUp 200ms ease-out'
          }}
        >
          <SuccessIcon sx={{ color: '#10B981', fontSize: '18px' }} />
          <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '12px' }}>
            {toastMessage}
          </Typography>
        </Box>
      )}

      {/* HEADER DE CONTROLES DEL EDITOR */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, pb: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <TextField
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            size="small"
            placeholder="Nombre del Proyecto"
            slotProps={{
              input: {
                sx: {
                  fontWeight: 'bold',
                  fontSize: '14.5px',
                  color: 'text.primary',
                  width: '180px'
                }
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
                onClick={() => handleSelectTemplate(tmpl)}
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
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '300px 1fr 240px' }, gap: 2, animation: 'fadeIn 120ms ease' }}>

          {/* PANEL IZQUIERDO REDISEÑADO: Biblioteca y Estructura */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: 'calc(100vh - 120px)', overflow: 'hidden' }}>

            {/* BUSCADOR DE COMPONENTES FIJO */}
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: '8px', border: '1px solid divider', display: 'flex', flexDirection: 'column', gap: 1.0, flexShrink: 0 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '12px', color: 'text.primary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                🔍 Biblioteca de Componentes
              </Typography>
              <TextField
                placeholder="Buscar componente..."
                size="small"
                fullWidth
                value={searchComponentQuery}
                onChange={(e) => setSearchComponentQuery(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: <SearchIcon sx={{ fontSize: '16px', color: 'text.secondary', mr: 0.8 }} />,
                    sx: { fontSize: '12px' }
                  }
                }}
              />
            </Paper>

            {/* LISTA DE COMPONENTES AGRUPADOS CON SCROLL VERTICAL INTERNO */}
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: '8px', border: '1px solid divider', bgcolor: 'background.paper', flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <Box sx={{ overflowY: 'auto', flexGrow: 1, pr: 0.5 }}>
                {Object.entries(groupedComponents).map(([cat, list]) => {
                  if (list.length === 0) return null;
                  const isCollapsed = !!collapsedCategories[cat];

                  return (
                    <Box key={cat} sx={{ mb: 1.5 }}>
                      {/* Cabecera de Categoría Desplegable */}
                      <Box
                        onClick={() => toggleCategoryCollapse(cat)}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          p: '4px 6px',
                          borderRadius: '4px',
                          bgcolor: 'action.hover',
                          mb: 0.8,
                          '&:hover': { bgcolor: 'action.selected' }
                        }}
                      >
                        <Typography variant="caption" sx={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'text.secondary', fontSize: '9.5px' }}>
                          {cat} ({list.length})
                        </Typography>
                        {isCollapsed ? <ArrowRightIcon sx={{ fontSize: '14px' }} /> : <ArrowDownIcon sx={{ fontSize: '14px' }} />}
                      </Box>

                      {/* Componentes de la Categoría */}
                      <Collapse in={!isCollapsed} timeout="auto" unmountOnExit>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.0 }}>
                          {list.map((comp) => (
                            <Tooltip key={comp.id} title={`${comp.name}: ${comp.description}`} placement="right">
                              <Card
                                variant="outlined"
                                onClick={() => handleInsertLibraryComponent(comp)}
                                sx={{
                                  p: 1.2,
                                  cursor: 'pointer',
                                  borderRadius: '6px',
                                  transition: 'all 120ms',
                                  borderColor: 'divider',
                                  '&:hover': {
                                    borderColor: '#3B82F6',
                                    bgcolor: 'rgba(59,130,246,0.02)',
                                    transform: 'translateX(2px)',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                                  }
                                }}
                              >
                                <Box sx={{ display: 'flex', gap: 1.0, alignItems: 'flex-start' }}>
                                  <span style={{ fontSize: '20px', display: 'block', marginTop: '2px' }}>{comp.icon}</span>
                                  <Box sx={{ minWidth: 0 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '11.5px', color: 'text.primary', display: 'block', lineHeight: 1.2 }}>
                                      {comp.name}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '9px', lineHeight: 1.3, mt: 0.2 }}>
                                      {comp.description}
                                    </Typography>
                                  </Box>
                                </Box>
                              </Card>
                            </Tooltip>
                          ))}
                        </Box>
                      </Collapse>
                    </Box>
                  );
                })}
              </Box>
            </Paper>

            {/* ÁRBOL DE ESTRUCTURA REAL (Fijo al final) */}
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: '8px', border: '1px solid divider', bgcolor: 'background.paper', maxHeight: '200px', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, fontSize: '11px', color: 'text.secondary' }}>
                🗂 Estructura del HTML
              </Typography>
              <Divider sx={{ mb: 1 }} />
              <Box sx={{ overflowY: 'auto', flexGrow: 1 }}>
                <DOMTreePanel
                  blocks={blocks}
                  selectedBlockId={selectedBlockId}
                  onSelectBlock={setSelectedBlockId}
                  onDeleteBlock={handleDeleteNodeDOM}
                  onUpdateBlockProperties={handleUpdateBlockMeta}
                />
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
                rawHTML={rawHTML}
                selectedBlockId={selectedBlockId}
                onSelectBlock={setSelectedBlockId}
                previewMode={previewMode}
                zoom={zoom}
                gridVisible={gridVisible}
              />
            ) : (
              <HTMLCodeEditor
                htmlCode={rawHTML}
                onCodeChange={handleHTMLCodeChange}
              />
            )}
          </Box>

          {/* PANEL DERECHO: Inspector, Recursos Reemplazables y Auditoría */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Tabs value={rightSidebarTab} onChange={(_, v) => setRightSidebarTab(v)} variant="fullWidth" sx={{ minHeight: '28px', borderBottom: '1px solid divider' }}>
              <Tab icon={<SettingsIcon sx={{ fontSize: '14px' }} />} iconPosition="start" label="Propiedades" sx={{ fontSize: '10px', minHeight: '28px', textTransform: 'none' }} />
              <Tab icon={<AuditIcon sx={{ fontSize: '14px' }} />} iconPosition="start" label="Outlook Auditoría" sx={{ fontSize: '10px', minHeight: '28px', textTransform: 'none' }} />
            </Tabs>

            {/* SECCIÓN RECURSOS VINCULADOS / PENDIENTES REDISEÑADA COMPACTA */}
            <Paper variant="outlined" sx={{ p: 1.2, borderRadius: '8px', border: '1px solid divider', bgcolor: 'background.paper', mb: 1.0, flexShrink: 0 }}>
              <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary', mb: 1, textTransform: 'uppercase', fontSize: '9px' }}>
                🖼 Gestión de Recursos e Imágenes
              </Typography>

              {/* Recursos pendientes */}
              {pendingAssets.length > 0 ? (
                <Box sx={{ mb: 1.5, p: 1, borderRadius: '6px', bgcolor: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.15)' }}>
                  <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#B45309', fontSize: '8.5px', display: 'block', mb: 1 }}>
                    Recursos pendientes ({pendingAssets.length})
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6 }}>
                    {pendingAssets.map((asset) => (
                      <Box key={asset.filename} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#FFF', p: '4px 6px', borderRadius: '4px', border: '1px solid divider' }}>
                        <Typography variant="caption" noWrap sx={{ fontSize: '8.5px', maxWidth: 100 }}>{asset.filename}</Typography>
                        <Button
                          variant="outlined"
                          size="small"
                          component="label"
                          startIcon={<UploadIcon sx={{ fontSize: '9px' }} />}
                          sx={{ fontSize: '8px', p: '1px 4px', height: '18px', textTransform: 'none' }}
                        >
                          Vincular
                          <input type="file" accept="image/*" onChange={(e) => handleLocalImageUpload(e, asset.filename)} style={{ display: 'none' }} />
                        </Button>
                      </Box>
                    ))}
                  </Box>
                </Box>
              ) : (
                <Box sx={{ mb: 1.0, p: 1, borderRadius: '6px', bgcolor: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)' }}>
                  <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#10B981', fontSize: '9px', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <SuccessIcon sx={{ fontSize: '12px' }} /> Todos los recursos están vinculados correctamente.
                  </Typography>
                </Box>
              )}

              {/* Recursos vinculados (Siempre visibles e interactivos, tal como fue solicitado) */}
              {linkedAssets.length > 0 && (
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', fontSize: '8.5px', display: 'block', mb: 0.8 }}>
                    Recursos vinculados ({linkedAssets.length})
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6, maxHeight: '160px', overflowY: 'auto' }}>
                    {linkedAssets.map((asset) => (
                      <Box key={asset.filename} sx={{ display: 'flex', flexDirection: 'column', gap: 0.4, bgcolor: 'action.hover', p: 0.8, borderRadius: '6px', border: '1px solid divider' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="caption" noWrap sx={{ fontSize: '8.5px', fontWeight: 'bold', maxWidth: 110 }}>
                            {asset.filename}
                          </Typography>
                          <span style={{ fontSize: '8px', fontWeight: 'bold', color: '#8B5CF6', padding: '1px 5px', borderRadius: '10px', backgroundColor: 'rgba(139,92,246,0.1)' }}>
                            Vinculado
                          </span>
                        </Box>

                        {/* Botones de acción enriquecidos */}
                        <Box sx={{ display: 'flex', gap: 0.4, mt: 0.4 }}>
                          <Button size="small" onClick={() => handleViewAssetDetails(asset)} sx={{ fontSize: '8px', p: '1px 4px', height: '18px', textTransform: 'none' }}>Ver</Button>
                          <Button
                            size="small"
                            component="label"
                            sx={{ fontSize: '8px', p: '1px 4px', height: '18px', textTransform: 'none', color: '#3B82F6', fontWeight: 'bold' }}
                          >
                            Reemplazar
                            <input type="file" accept="image/*" onChange={(e) => handleLocalImageUpload(e, asset.filename)} style={{ display: 'none' }} />
                          </Button>
                          <Button size="small" onClick={() => handleDownloadAsset(asset)} sx={{ fontSize: '8px', p: '1px 4px', height: '18px', textTransform: 'none', color: 'text.secondary' }}>Descargar</Button>
                          <Button size="small" onClick={() => handleRestoreAssetPath(asset)} sx={{ fontSize: '8px', p: '1px 4px', height: '18px', textTransform: 'none', color: 'warning.main' }}>Restaurar</Button>
                          <Button size="small" onClick={() => handleUnlinkAsset(asset.filename)} sx={{ fontSize: '8px', p: '1px 4px', height: '18px', textTransform: 'none', color: 'error.main' }}>Quitar</Button>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
            </Paper>

            {/* INSPECTOR PRINCIPAL */}
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: '8px', border: '1px solid divider', bgcolor: 'background.paper', height: 'fit-content' }}>
              {rightSidebarTab === 0 ? (
                <BlockEditor
                  selectedBlock={selectedBlock}
                  onUpdateBlockNode={handleUpdateNodeDOMProperties}
                  onDeleteBlockNode={handleDeleteNodeDOM}
                  missingAssets={[]}
                  onResolveAsset={handleResolveAsset}
                />
              ) : (
                <OutlookAnalyzer
                  blocks={blocks}
                  onOptimizeForOutlook={handleOptimizeForOutlook}
                />
              )}
            </Paper>
          </Box>

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

      {/* MODAL DETALLES DEL RECURSO (VER) */}
      <Dialog open={!!viewAsset} onClose={() => setViewAsset(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: '13.5px', fontWeight: 'bold' }}>Detalles del Recurso</DialogTitle>
        {viewAsset && (
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 2 }}>
            {viewAsset.resolvedDataUrl && (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 1, bgcolor: '#FAFAFA', borderRadius: '6px', border: '1px solid divider' }}>
                <img src={viewAsset.resolvedDataUrl} alt="Vista previa" style={{ maxWidth: '100%', maxHeight: '120px', borderRadius: '4px' }} />
              </Box>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>Nombre de Archivo:</Typography>
              <Typography variant="body2" sx={{ fontSize: '11px' }}>{viewAsset.filename}</Typography>

              <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mt: 0.5 }}>Dimensiones:</Typography>
              <Typography variant="body2" sx={{ fontSize: '11px' }}>{viewAssetMetadata?.dimensions || 'Desconocido'}</Typography>

              <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mt: 0.5 }}>Tamaño Estimado:</Typography>
              <Typography variant="body2" sx={{ fontSize: '11px' }}>{viewAssetMetadata?.size || 'Desconocido'}</Typography>

              <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mt: 0.5 }}>Tipo de Archivo:</Typography>
              <Typography variant="body2" sx={{ fontSize: '11px' }}>{viewAssetMetadata?.type || 'Imagen'}</Typography>

              <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mt: 0.5 }}>Ruta Lógica Original:</Typography>
              <Typography variant="body2" sx={{ fontSize: '11.5px', wordBreak: 'break-all', fontFamily: 'monospace' }}>assets/{viewAsset.filename}</Typography>
            </Box>
          </DialogContent>
        )}
        <DialogActions>
          <Button onClick={() => setViewAsset(null)} size="small" variant="contained" sx={{ textTransform: 'none' }}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG DE CONFIRMACIÓN PARA REEMPLAZAR MÚLTIPLES OCURRENCIAS */}
      <Dialog open={replaceMultipleOpen} onClose={() => setReplaceMultipleOpen(false)} maxWidth="xs">
        <DialogTitle sx={{ fontSize: '13.5px', fontWeight: 'bold' }}>Reemplazar Ocurrencias</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ fontSize: '11.5px', lineHeight: 1.4 }}>
            Este recurso se utiliza en <strong>{replaceMultipleData?.occurrences}</strong> lugares de la firma HTML. ¿Deseas reemplazarlo en todas las apariciones o solo en la celda seleccionada?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ flexDirection: 'column', gap: 0.5, p: 2 }}>
          <Button
            fullWidth
            variant="contained"
            onClick={() => applyAssetReplacement(replaceMultipleData!.filename, replaceMultipleData!.dataUrl, true)}
            sx={{ textTransform: 'none', fontSize: '11px', fontWeight: 'bold' }}
          >
            Reemplazar en todas las apariciones
          </Button>
          <Button
            fullWidth
            variant="outlined"
            onClick={() => applyAssetReplacement(replaceMultipleData!.filename, replaceMultipleData!.dataUrl, false)}
            sx={{ textTransform: 'none', fontSize: '11px' }}
          >
            Reemplazar solo en el elemento seleccionado
          </Button>
          <Button
            fullWidth
            onClick={() => { setReplaceMultipleOpen(false); setReplaceMultipleData(null); }}
            sx={{ textTransform: 'none', fontSize: '11px', color: 'text.secondary' }}
          >
            Cancelar
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};
export default SignatureHTMLEditor;
