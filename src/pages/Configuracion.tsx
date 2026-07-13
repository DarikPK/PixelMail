import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Divider,
  Button,
  CircularProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Card,
  CardContent,
  Tab,
  Tabs,
  Tooltip,
  ButtonGroup
} from '@mui/material';
import {
  Settings as SettingsIcon,
  SignLanguage as SignatureIcon,
  Rule as RuleIcon,
  Folder as FolderIcon,
  Person as AccountIcon,
  Palette as AppearanceIcon,
  Notifications as NotificationsIcon,
  Security as SecurityIcon,
  Save as SaveIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
  Download as DownloadIcon,
  ArrowUpward as MoveUpIcon,
  ArrowDownward as MoveDownIcon,
  Layers as BlockIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  GridOn as GridIcon,
  GridOff as GridOffIcon,
  ColorLens as ColorLensIcon,
  Style as StyleIcon,
  Preview as PreviewIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  PostAdd as PostAddIcon,
  FileCopy as FileCopyIcon,
  Upload as UploadIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useEmails } from '../contexts/EmailContext';
import { db } from '../config/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const PREDEFINED_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#6366F1', '#1E293B', '#64748B', '#FFFFFF'
];

interface Block {
  id: string;
  type: 'text' | 'name' | 'cargo' | 'link' | 'gif' | 'qr' | 'button' | 'separator' | 'espaciador' | 'legal' | 'estado' | 'social';
  content: string;
  fontFamily?: string;
  fontSize?: string;
  color?: string;
  fontWeight?: string | number;
  align?: 'left' | 'center' | 'right';
  padding?: string;
  margin?: string;
  width?: string;
  height?: string;
  border?: string;
  borderRadius?: string;
  href?: string;
  icon?: string;
  buttonColor?: string;
  hidden?: boolean;
  locked?: boolean;
  shadow?: string;
  backgroundColor?: string;
  // Campos especializados
  qrShape?: 'square' | 'circle';
  qrBorder?: string;
  qrLogoCenter?: boolean;
  legalModel?: 'financiero' | 'corporativo' | 'confidencial' | 'estandar';
  estadoType?: 'disponible' | 'reunion' | 'vacaciones' | 'fuera';
  socialPlatform?: 'linkedin' | 'facebook' | 'instagram' | 'twitter' | 'youtube';
}

interface Column {
  id: string;
  widthPercent: number; // e.g. 22, 56, etc.
  blocks: Block[];
}

interface Row {
  id: string;
  columns: Column[];
}

// Compilador de Estructura de Firma JSON a Tabla HTML inline
export const generateHTMLFromStructure = (rows: Row[]): string => {
  let html = `<table cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width: 600px; font-family: 'Inter', system-ui, sans-serif; border-collapse: collapse;">`;

  rows.forEach((row) => {
    html += `<tr><td style="padding: 0;"><table cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-collapse: collapse;"><tr>`;

    row.columns.forEach((col) => {
      html += `<td valign="top" style="width: ${col.widthPercent}%; padding: 8px; box-sizing: border-box;">`;

      col.blocks.forEach((block) => {
        if (block.hidden) return; // No renderizar si está oculto

        const alignStyle = block.align ? `text-align: ${block.align};` : '';
        const paddingStyle = block.padding ? `padding: ${block.padding};` : 'padding: 4px 0;';
        const marginStyle = block.margin ? `margin: ${block.margin};` : '';
        const borderStyle = block.border ? `border: ${block.border};` : '';
        const radiusStyle = block.borderRadius ? `border-radius: ${block.borderRadius};` : '';
        const bgStyle = block.backgroundColor ? `background-color: ${block.backgroundColor};` : '';
        const shadowStyle = block.shadow ? `box-shadow: ${block.shadow};` : '';

        const blockStyle = `${alignStyle} ${paddingStyle} ${marginStyle} ${borderStyle} ${radiusStyle} ${bgStyle} ${shadowStyle}`;

        html += `<div style="${blockStyle}">`;

        switch (block.type) {
          case 'name':
            html += `<div style="font-family: ${block.fontFamily || 'Inter'}, sans-serif; font-size: ${block.fontSize || '22px'}; font-weight: ${block.fontWeight || '700'}; color: ${block.color || '#1E293B'};">${block.content}</div>`;
            break;
          case 'cargo':
            html += `<div style="font-family: ${block.fontFamily || 'Inter'}, sans-serif; font-size: ${block.fontSize || '15px'}; font-weight: ${block.fontWeight || '500'}; color: ${block.color || '#64748B'};">${block.content}</div>`;
            break;
          case 'text':
            html += `<div style="font-family: ${block.fontFamily || 'Inter'}, sans-serif; font-size: ${block.fontSize || '13px'}; font-weight: ${block.fontWeight || '400'}; color: ${block.color || '#475569'};">${block.content}</div>`;
            break;
          case 'link':
            html += `<a href="${block.href || '#'}" style="font-family: ${block.fontFamily || 'Inter'}, sans-serif; font-size: ${block.fontSize || '13px'}; color: ${block.color || '#3B82F6'}; text-decoration: none; font-weight: ${block.fontWeight || '500'};">${block.content}</a>`;
            break;
          case 'button':
            html += `<a href="${block.href || '#'}" style="display: inline-block; background-color: ${block.buttonColor || '#3B82F6'}; color: #FFFFFF; font-family: ${block.fontFamily || 'Inter'}, sans-serif; font-size: ${block.fontSize || '13px'}; font-weight: 600; text-decoration: none; padding: 8px 16px; border-radius: ${block.borderRadius || '6px'}; border: ${block.border || 'none'}; text-align: center;">${block.content}</a>`;
            break;
          case 'separator':
            html += `<div style="border-top: 1px solid ${block.color || '#CBD5E1'}; height: 1px; width: 100%;"></div>`;
            break;
          case 'espaciador':
            html += `<div style="height: ${block.height || '12px'};"></div>`;
            break;
          case 'gif':
            html += `<div style="text-align: ${block.align || 'center'};"><img src="${block.content}" alt="Animación" style="max-width: 100%; border-radius: ${block.borderRadius || '4px'}; border: ${block.border || 'none'};" /></div>`;
            break;
          case 'qr':
            html += `<div style="text-align: ${block.align || 'center'}; padding: 4px;"><table cellpadding="0" cellspacing="0" border="0" style="display: inline-block; border-collapse: collapse; border: ${block.qrBorder || '1px solid #CBD5E1'}; border-radius: ${block.qrShape === 'circle' ? '50%' : '8px'}; background-color: #FFFFFF; padding: 12px;"><tr><td><img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(block.content)}" alt="Código QR" style="width: 100px; height: 100px; display: block;" /></td></tr></table></div>`;
            break;
          case 'legal': {
            const model = block.legalModel || 'estandar';
            let text = 'Por favor, considere el medio ambiente antes de imprimir este correo.';
            if (model === 'financiero') text = 'AVISO FINANCIERO: La información contenida en esta transmisión es de carácter estrictamente informativo y no constituye una oferta de compra/venta ni asesoría financiera formal.';
            if (model === 'corporativo') text = 'INFORMACIÓN CORPORATIVA: Este correo y sus archivos adjuntos están sujetos a las políticas de comunicación corporativa de Pixel S.A.C.';
            if (model === 'confidencial') text = 'CONFIDENCIALIDAD: Este mensaje es confidencial y para uso exclusivo del destinatario. Si lo recibe por error, por favor notifíquelo de inmediato al remitente y bórrelo de su sistema.';
            html += `<div style="font-family: ${block.fontFamily || 'Inter'}, sans-serif; font-size: ${block.fontSize || '10px'}; color: ${block.color || '#94A3B8'}; line-height: 1.4; text-align: ${block.align || 'left'};">${text}</div>`;
            break;
          }
          case 'estado': {
            const type = block.estadoType || 'disponible';
            let label = 'Disponible';
            let dotColor = '#22C55E';
            if (type === 'reunion') { label = 'En reunión'; dotColor = '#EF4444'; }
            if (type === 'vacaciones') { label = 'De vacaciones'; dotColor = '#F59E0B'; }
            if (type === 'fuera') { label = 'Fuera de oficina'; dotColor = '#64748B'; }
            html += `<table cellpadding="0" cellspacing="0" border="0" style="display: inline-block; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 20px; padding: 4px 10px;"><tr>` +
                    `<td valign="middle"><div style="width: 8px; height: 8px; border-radius: 50%; background-color: ${dotColor}; margin-right: 6px;"></div></td>` +
                    `<td valign="middle" style="font-family: ${block.fontFamily || 'Inter'}, sans-serif; font-size: 11px; font-weight: 600; color: #475569;">${label}</td>` +
                    `</tr></table>`;
            break;
          }
          case 'social': {
            const platform = block.socialPlatform || 'linkedin';
            let url = 'https://linkedin.com';
            let label = 'LinkedIn';
            let color = '#0A66C2';
            if (platform === 'facebook') { url = 'https://facebook.com'; label = 'Facebook'; color = '#1877F2'; }
            if (platform === 'instagram') { url = 'https://instagram.com'; label = 'Instagram'; color = '#E4405F'; }
            if (platform === 'twitter') { url = 'https://twitter.com'; label = 'Twitter'; color = '#1DA1F2'; }
            if (platform === 'youtube') { url = 'https://youtube.com'; label = 'YouTube'; color = '#FF0000'; }
            html += `<a href="${block.href || url}" style="font-family: ${block.fontFamily || 'Inter'}, sans-serif; font-size: 12px; color: ${color}; text-decoration: none; font-weight: bold; margin-right: 12px; display: inline-block;">${label}</a>`;
            break;
          }
          default:
            break;
        }

        html += `</div>`;
      });

      html += `</td>`;
    });

    html += `</tr></table></td></tr>`;
  });

  html += `</table>`;
  return html;
};

// Importar plantillas premium desde la constante
import { PREMIUM_TEMPLATES } from './ConfiguracionTemplates';
import { PREDEFINED_COMPONENTS } from './ConfiguracionComponents';

const Configuracion = () => {
  const { user } = useAuth();
  const { folders, addFolder, deleteFolder, rules, addRule, deleteRule } = useEmails();

  // Navigation sidebar interna
  const [activeSection, setActiveSection] = useState<'general' | 'cuenta' | 'firma' | 'reglas' | 'carpetas' | 'apariencia' | 'notificaciones' | 'seguridad'>('firma');

  // Estado del creador de firmas
  const [rows, setRows] = useState<Row[]>([]);
  const [loadingSig, setLoadingSig] = useState(true);
  const [savingSig, setSavingSig] = useState(false);
  const [savedSig, setSavedSig] = useState(false);

  // Pantalla previa de plantillas
  const [showTemplateSelector, setShowTemplateSelector] = useState(true);

  // Zoom, Grilla y Guías
  const [zoom, setZoom] = useState<number>(100);
  const [gridVisible, setGridVisible] = useState<boolean>(true);
  const [rulersVisible, setRulersVisible] = useState<boolean>(true);

  // Propiedades del bloque seleccionado
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  // Colores Recientes
  const [recentColors, setRecentColors] = useState<string[]>(['#3B82F6', '#1E293B', '#10B981', '#F59E0B']);

  // Pestañas de Vista Previa (0: Escritorio, 1: Móvil, 2: Outlook, 3: Gmail, 4: Apple Mail)
  const [previewTab, setPreviewTab] = useState<number>(0);

  // Drag and drop states
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Cargar firma
  useEffect(() => {
    const fetchSignature = async () => {
      if (!user) return;
      try {
        const docRef = doc(db, 'settings', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().signatureStructure) {
          const loadedRows = JSON.parse(docSnap.data().signatureStructure);
          setRows(loadedRows);
          if (loadedRows.length > 0) {
            setShowTemplateSelector(false);
          }
        }
      } catch (error) {
        console.error("Error al obtener la firma:", error);
      } finally {
        setLoadingSig(false);
      }
    };
    fetchSignature();
  }, [user]);

  // Encontrar el bloque seleccionado de forma reactiva
  const selectedBlock = useMemo(() => {
    if (!selectedBlockId) return null;
    for (const row of rows) {
      for (const col of row.columns) {
        const block = col.blocks.find(b => b.id === selectedBlockId);
        if (block) return block;
      }
    }
    return null;
  }, [rows, selectedBlockId]);

  // Actualizar propiedades del bloque seleccionado
  const updateSelectedBlock = (updatedFields: Partial<Block>) => {
    if (!selectedBlockId) return;
    setRows(prevRows => prevRows.map(row => ({
      ...row,
      columns: row.columns.map(col => ({
        ...col,
        blocks: col.blocks.map(block => block.id === selectedBlockId ? { ...block, ...updatedFields } : block)
      }))
    })));

    // Si actualizamos color, agregarlo a recientes
    if (updatedFields.color && !recentColors.includes(updatedFields.color)) {
      setRecentColors(prev => [updatedFields.color!, ...prev.slice(0, 7)]);
    }
    if (updatedFields.buttonColor && !recentColors.includes(updatedFields.buttonColor)) {
      setRecentColors(prev => [updatedFields.buttonColor!, ...prev.slice(0, 7)]);
    }
    if (updatedFields.backgroundColor && !recentColors.includes(updatedFields.backgroundColor)) {
      setRecentColors(prev => [updatedFields.backgroundColor!, ...prev.slice(0, 7)]);
    }
  };

  // Guardar firma en Firestore
  const handleSaveSignature = async () => {
    if (!user) return;
    setSavingSig(true);
    setSavedSig(false);

    // Generar HTML optimizado con tablas inline
    const finalHTML = generateHTMLFromStructure(rows);
    const finalStructureJSON = JSON.stringify(rows);

    try {
      await setDoc(doc(db, 'settings', user.uid), {
        userId: user.uid,
        signature: finalHTML,
        signatureStructure: finalStructureJSON,
        updatedAt: serverTimestamp()
      });
      setSavedSig(true);
      setTimeout(() => setSavedSig(false), 3000);
    } catch (error) {
      console.error("Error al guardar la firma:", error);
    } finally {
      setSavingSig(false);
    }
  };

  // Funciones de control de Filas y Columnas
  const handleAddRow = (colsCount: number) => {
    const newRowId = 'row-' + Date.now();
    const cols: Column[] = [];
    const width = Math.floor(100 / colsCount);
    for (let i = 0; i < colsCount; i++) {
      cols.push({
        id: `col-${newRowId}-${i}`,
        widthPercent: width,
        blocks: []
      });
    }
    setRows(prev => [...prev, { id: newRowId, columns: cols }]);
  };

  const handleDeleteRow = (rowId: string) => {
    setRows(prev => prev.filter(r => r.id !== rowId));
    if (selectedRowId === rowId) {
      setSelectedRowId(null);
      setSelectedBlockId(null);
    }
  };

  const handleDuplicateRow = (rowId: string) => {
    const target = rows.find(r => r.id === rowId);
    if (!target) return;
    const duplicated: Row = {
      id: 'row-' + Date.now(),
      columns: target.columns.map((col: Column, idx: number) => ({
        id: `col-${Date.now()}-${idx}`,
        widthPercent: col.widthPercent,
        blocks: col.blocks.map((b: Block, bIdx: number) => ({
          ...b,
          id: `b-${Date.now()}-${bIdx}`
        }))
      }))
    };
    const idx = rows.findIndex(r => r.id === rowId);
    const copy = [...rows];
    copy.splice(idx + 1, 0, duplicated);
    setRows(copy);
  };

  const handleMoveRow = (rowId: string, direction: 'up' | 'down') => {
    const idx = rows.findIndex(r => r.id === rowId);
    if (idx === -1) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === rows.length - 1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const copy = [...rows];
    const temp = copy[idx];
    copy[idx] = copy[targetIdx];
    copy[targetIdx] = temp;
    setRows(copy);
  };

  // Agregar bloques individuales o componentes pre-diseñados
  const handleAddBlockToColumn = (colId: string, type: Block['type']) => {
    const newBlock: Block = {
      id: 'b-' + Date.now() + Math.random().toString(36).substr(2, 4),
      type,
      content: type === 'name' ? 'Nuevo Nombre' : type === 'cargo' ? 'Nuevo Cargo' : type === 'button' ? 'Botón' : type === 'separator' ? '' : type === 'espaciador' ? '' : type === 'gif' ? 'https://media.giphy.com/media/l0HlIDU1mFT9fL40o/giphy.gif' : type === 'qr' ? 'Código QR' : 'Nuevo Texto'
    };

    setRows(prev => prev.map(row => ({
      ...row,
      columns: row.columns.map(col => {
        if (col.id === colId) {
          return { ...col, blocks: [...col.blocks, newBlock] };
        }
        return col;
      })
    })));
  };

  const handleAddPredefinedComponent = (componentId: string) => {
    const comp = PREDEFINED_COMPONENTS.find((c: any) => c.id === componentId);
    if (!comp) return;

    // Duplicar bloques con IDs únicos
    const freshBlocks: Block[] = comp.blocks.map((b: any, idx: number) => ({
      ...b,
      id: `b-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}` as any
    }));

    // Insertar como nueva fila
    const newRowId = 'row-' + Date.now();
    const newRow: Row = {
      id: newRowId,
      columns: [
        {
          id: `col-${newRowId}-0`,
          widthPercent: 100,
          blocks: freshBlocks
        }
      ]
    };

    setRows(prev => [...prev, newRow]);
    setSelectedBlockId(freshBlocks[0].id);
  };

  const handleDeleteBlock = (blockId: string) => {
    setRows(prev => prev.map(row => ({
      ...row,
      columns: row.columns.map(col => ({
        ...col,
        blocks: col.blocks.filter(b => b.id !== blockId)
      }))
    })));
    if (selectedBlockId === blockId) {
      setSelectedBlockId(null);
    }
  };

  const handleDuplicateBlock = (blockId: string) => {
    setRows(prev => prev.map(row => ({
      ...row,
      columns: row.columns.map(col => {
        const bIdx = col.blocks.findIndex(b => b.id === blockId);
        if (bIdx === -1) return col;
        const target = col.blocks[bIdx];
        const duplicated: Block = {
          ...target,
          id: 'b-' + Date.now() + Math.random().toString(36).substr(2, 4)
        };
        const blocksCopy = [...col.blocks];
        blocksCopy.splice(bIdx + 1, 0, duplicated);
        return { ...col, blocks: blocksCopy };
      })
    })));
  };

  // Exportar HTML generado
  const handleCopyHTML = () => {
    const html = generateHTMLFromStructure(rows);
    navigator.clipboard.writeText(html);
    alert('¡HTML de la firma copiado al portapapeles!');
  };

  const handleDownloadHTML = () => {
    const html = generateHTMLFromStructure(rows);
    const element = document.createElement("a");
    const file = new Blob([html], { type: 'text/html' });
    element.href = URL.createObjectURL(file);
    element.download = "firma-pixelmail.html";
    document.body.appendChild(element);
    element.click();
    element.remove();
  };

  // Importar / Exportar JSON
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(rows, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "firma-pixelmail.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (Array.isArray(parsed)) {
            setRows(parsed);
            setShowTemplateSelector(false);
          } else {
            alert('Formato de JSON inválido para firmas.');
          }
        } catch (err) {
          alert('Error al leer el archivo JSON.');
        }
      };
    }
  };

  // Duplicar firma activa
  const handleDuplicateSignature = () => {
    if (window.confirm('¿Deseas duplicar la firma activa actual?')) {
      const cloned = JSON.parse(JSON.stringify(rows));
      setRows(cloned);
      alert('¡Firma duplicada con éxito en el lienzo!');
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, blockId: string) => {
    setDraggedBlockId(blockId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOverBlock = (e: React.DragEvent, colId: string, index: number) => {
    e.preventDefault();
    setDragOverColId(colId);
    setDragOverIndex(index);
  };

  const handleDropOnCol = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    if (!draggedBlockId) return;

    // Buscar el bloque arrastrado y removerlo de su posición original
    let draggedBlock: Block | null = null;

    const nextRows = rows.map(row => ({
      ...row,
      columns: row.columns.map(col => {
        const found = col.blocks.find(b => b.id === draggedBlockId);
        if (found) {
          draggedBlock = found;
          return { ...col, blocks: col.blocks.filter(b => b.id !== draggedBlockId) };
        }
        return col;
      })
    }));

    if (!draggedBlock) {
      setDraggedBlockId(null);
      setDragOverColId(null);
      setDragOverIndex(null);
      return;
    }

    // Insertar en la nueva columna en la posición indicada
    const targetColId = colId;
    const targetIdx = dragOverIndex !== null ? dragOverIndex : 0;

    const finalRows = nextRows.map(row => ({
      ...row,
      columns: row.columns.map(col => {
        if (col.id === targetColId) {
          const nextBlocks = [...col.blocks];
          nextBlocks.splice(targetIdx, 0, draggedBlock!);
          return { ...col, blocks: nextBlocks };
        }
        return col;
      })
    }));

    setRows(finalRows);
    setDraggedBlockId(null);
    setDragOverColId(null);
    setDragOverIndex(null);
  };

  // Carpetas states
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#3B82F6');

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    addFolder({
      name: newFolderName.trim(),
      color: newFolderColor,
      icon: 'Folder',
      isVisible: true
    });
    setNewFolderName('');
  };

  // Reglas states
  const [conditionField, setConditionField] = useState<'from' | 'subject' | 'hasAttachments' | 'read' | 'starred'>('from');
  const [conditionOperator, setConditionOperator] = useState<'contains' | 'endsWith' | 'equals' | 'startsWith' | 'isTrue' | 'isFalse'>('contains');
  const [conditionValue, setConditionValue] = useState('');
  const [actionType, setActionType] = useState<'moveToFolder' | 'archive' | 'delete' | 'star' | 'markRead'>('moveToFolder');
  const [actionValue, setActionValue] = useState('');

  useEffect(() => {
    if (conditionField === 'hasAttachments' || conditionField === 'read' || conditionField === 'starred') {
      setConditionOperator('isTrue');
    } else {
      setConditionOperator('contains');
    }
  }, [conditionField]);

  useEffect(() => {
    if (folders.length > 0 && !actionValue) {
      setActionValue(folders[0].id);
    }
  }, [folders, actionValue]);

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    addRule({
      conditionField,
      conditionOperator,
      conditionValue: (conditionField === 'hasAttachments' || conditionField === 'read' || conditionField === 'starred') ? '' : conditionValue,
      actionType,
      actionValue: actionType === 'moveToFolder' ? actionValue : ''
    });
    setConditionValue('');
  };

  // Renderizar las propiedades del bloque seleccionado en el panel derecho (Inspector de Propiedades)
  const renderPropertiesPanel = () => {
    if (!selectedBlock) {
      return (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <BlockIcon sx={{ fontSize: '42px', color: 'text.disabled', mb: 2 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
            Inspector Visual
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '11px', px: 2 }}>
            Haz clic en cualquier bloque o componente en el lienzo para ver y editar sus atributos profesionales.
          </Typography>
        </Box>
      );
    }

    const isTextLike = ['text', 'name', 'cargo', 'link', 'button', 'legal', 'social'].includes(selectedBlock.type);

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '13px', color: 'text.primary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <StyleIcon sx={{ fontSize: '16px', color: '#3B82F6' }} /> Inspector: {selectedBlock.type.toUpperCase()}
          </Typography>

          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title={selectedBlock.locked ? "Desbloquear" : "Bloquear para edición"}>
              <IconButton size="small" onClick={() => updateSelectedBlock({ locked: !selectedBlock.locked })}>
                {selectedBlock.locked ? <LockIcon sx={{ fontSize: '15px', color: 'error.main' }} /> : <LockOpenIcon sx={{ fontSize: '15px' }} />}
              </IconButton>
            </Tooltip>
            <Tooltip title={selectedBlock.hidden ? "Mostrar en firma" : "Ocultar temporalmente"}>
              <IconButton size="small" onClick={() => updateSelectedBlock({ hidden: !selectedBlock.hidden })}>
                {selectedBlock.hidden ? <VisibilityOffIcon sx={{ fontSize: '15px', color: 'warning.main' }} /> : <VisibilityIcon sx={{ fontSize: '15px' }} />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Divider />

        {selectedBlock.locked && (
          <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 'bold', mb: 1, display: 'block', textAlign: 'center', bgcolor: 'rgba(239,68,68,0.08)', p: 1, borderRadius: '4px' }}>
            🔒 Este bloque está bloqueado. Desbloquéalo arriba para editarlo.
          </Typography>
        )}

        <Box sx={{ pointerEvents: selectedBlock.locked ? 'none' : 'auto', opacity: selectedBlock.locked ? 0.65 : 1, display: 'flex', flexDirection: 'column', gap: 1.8 }}>
          {/* Campo Contenido */}
          {['text', 'name', 'cargo', 'link', 'button', 'gif', 'qr'].includes(selectedBlock.type) && (
            <TextField
              label={selectedBlock.type === 'gif' ? 'URL de la Imagen / GIF' : selectedBlock.type === 'qr' ? 'Contenido del QR (URL o Texto)' : 'Contenido'}
              size="small"
              fullWidth
              value={selectedBlock.content}
              onChange={(e) => updateSelectedBlock({ content: e.target.value })}
              slotProps={{ input: { sx: { fontSize: '12px' } } }}
            />
          )}

          {/* Constructor específico de Aviso Legal */}
          {selectedBlock.type === 'legal' && (
            <FormControl size="small" fullWidth>
              <InputLabel sx={{ fontSize: '11px' }}>Modelo de Aviso Legal</InputLabel>
              <Select
                value={selectedBlock.legalModel || 'estandar'}
                onChange={(e) => updateSelectedBlock({ legalModel: e.target.value as any })}
                label="Modelo de Aviso Legal"
                sx={{ fontSize: '12px' }}
              >
                <MenuItem value="estandar">Ecológico / Estándar</MenuItem>
                <MenuItem value="financiero">Aviso de Regulación Financiera</MenuItem>
                <MenuItem value="corporativo">Aviso Corporativo S.A.C.</MenuItem>
                <MenuItem value="confidencial">Estricta Confidencialidad</MenuItem>
              </Select>
            </FormControl>
          )}

          {/* Constructor específico de Estado de Disponibilidad */}
          {selectedBlock.type === 'estado' && (
            <FormControl size="small" fullWidth>
              <InputLabel sx={{ fontSize: '11px' }}>Estado Activo</InputLabel>
              <Select
                value={selectedBlock.estadoType || 'disponible'}
                onChange={(e) => updateSelectedBlock({ estadoType: e.target.value as any })}
                label="Estado Activo"
                sx={{ fontSize: '12px' }}
              >
                <MenuItem value="disponible">🟢 Disponible</MenuItem>
                <MenuItem value="reunion">🔴 En reunión</MenuItem>
                <MenuItem value="vacaciones">🟠 De vacaciones</MenuItem>
                <MenuItem value="fuera">⚫ Fuera de oficina</MenuItem>
              </Select>
            </FormControl>
          )}

          {/* Constructor específico de Redes Sociales */}
          {selectedBlock.type === 'social' && (
            <FormControl size="small" fullWidth>
              <InputLabel sx={{ fontSize: '11px' }}>Plataforma Social</InputLabel>
              <Select
                value={selectedBlock.socialPlatform || 'linkedin'}
                onChange={(e) => updateSelectedBlock({ socialPlatform: e.target.value as any })}
                label="Plataforma Social"
                sx={{ fontSize: '12px' }}
              >
                <MenuItem value="linkedin">LinkedIn</MenuItem>
                <MenuItem value="facebook">Facebook</MenuItem>
                <MenuItem value="instagram">Instagram</MenuItem>
                <MenuItem value="twitter">Twitter / X</MenuItem>
                <MenuItem value="youtube">YouTube</MenuItem>
              </Select>
            </FormControl>
          )}

          {/* Constructor específico de QR */}
          {selectedBlock.type === 'qr' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <FormControl size="small" fullWidth>
                <InputLabel sx={{ fontSize: '11px' }}>Forma del QR</InputLabel>
                <Select
                  value={selectedBlock.qrShape || 'square'}
                  onChange={(e) => updateSelectedBlock({ qrShape: e.target.value as any })}
                  label="Forma del QR"
                  sx={{ fontSize: '12px' }}
                >
                  <MenuItem value="square">Cuadrado con esquinas redondeadas</MenuItem>
                  <MenuItem value="circle">Perfectamente circular</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="Borde del QR"
                size="small"
                fullWidth
                value={selectedBlock.qrBorder || ''}
                placeholder="Ej. 1px solid #3B82F6"
                onChange={(e) => updateSelectedBlock({ qrBorder: e.target.value })}
                slotProps={{ input: { sx: { fontSize: '12px' } } }}
              />
            </Box>
          )}

          {/* Campos específicos de Enlaces y Botones */}
          {['link', 'button', 'social'].includes(selectedBlock.type) && (
            <TextField
              label="Enlace de Destino (URL)"
              size="small"
              fullWidth
              value={selectedBlock.href || ''}
              onChange={(e) => updateSelectedBlock({ href: e.target.value })}
              slotProps={{ input: { sx: { fontSize: '12px' } } }}
            />
          )}

          {/* Atributos de Texto */}
          {isTextLike && (
            <>
              <FormControl size="small" fullWidth>
                <InputLabel sx={{ fontSize: '11px' }}>Tipografía</InputLabel>
                <Select
                  value={selectedBlock.fontFamily || 'Inter'}
                  onChange={(e) => updateSelectedBlock({ fontFamily: e.target.value })}
                  label="Tipografía"
                  sx={{ fontSize: '12px' }}
                >
                  <MenuItem value="Inter" sx={{ fontFamily: 'Inter' }}>Inter (Premium)</MenuItem>
                  <MenuItem value="Roboto" sx={{ fontFamily: 'Roboto' }}>Roboto (Limpia)</MenuItem>
                  <MenuItem value="Segoe UI" sx={{ fontFamily: 'Segoe UI' }}>Segoe UI (Sistema)</MenuItem>
                  <MenuItem value="Arial" sx={{ fontFamily: 'Arial' }}>Arial (Clásica)</MenuItem>
                  <MenuItem value="Helvetica" sx={{ fontFamily: 'Helvetica' }}>Helvetica (Avanzada)</MenuItem>
                  <MenuItem value="Georgia" sx={{ fontFamily: 'Georgia' }}>Georgia (Formal)</MenuItem>
                  <MenuItem value="Tahoma" sx={{ fontFamily: 'Tahoma' }}>Tahoma (Fina)</MenuItem>
                  <MenuItem value="Verdana" sx={{ fontFamily: 'Verdana' }}>Verdana (Ancha)</MenuItem>
                </Select>
              </FormControl>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.0 }}>
                <TextField
                  label="Tamaño (CSS)"
                  size="small"
                  value={selectedBlock.fontSize || ''}
                  placeholder="Ej: 14px, 22px"
                  onChange={(e) => updateSelectedBlock({ fontSize: e.target.value })}
                  slotProps={{ input: { sx: { fontSize: '12px' } } }}
                />

                <FormControl size="small">
                  <InputLabel sx={{ fontSize: '11px' }}>Alineación</InputLabel>
                  <Select
                    value={selectedBlock.align || 'left'}
                    onChange={(e) => updateSelectedBlock({ align: e.target.value as any })}
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

          {/* Constructor avanzado de Colores */}
          <Box sx={{ p: 1, border: '1px solid', borderColor: 'divider', borderRadius: '6px', bgcolor: 'action.hover' }}>
            <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
              <ColorLensIcon sx={{ fontSize: '14px', color: '#3B82F6' }} /> Selector de Color Moderno
            </Typography>

            <Box sx={{ mb: 1.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontSize: '10px' }}>
                Colores Recientes / Sugeridos
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {recentColors.map(c => (
                  <Box
                    key={c}
                    onClick={() => {
                      if (selectedBlock.type === 'button') {
                        updateSelectedBlock({ buttonColor: c });
                      } else {
                        updateSelectedBlock({ color: c });
                      }
                    }}
                    sx={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      bgcolor: c,
                      cursor: 'pointer',
                      border: '1.5px solid #FFF',
                      boxShadow: '0 0 2px rgba(0,0,0,0.25)',
                      transition: 'transform 100ms',
                      '&:hover': { transform: 'scale(1.2)' }
                    }}
                  />
                ))}
              </Box>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 1.0, alignItems: 'center' }}>
              <TextField
                label="Hex / RGB"
                size="small"
                value={selectedBlock.type === 'button' ? (selectedBlock.buttonColor || '#3B82F6') : (selectedBlock.color || '#1E293B')}
                placeholder="#3B82F6"
                onChange={(e) => {
                  if (selectedBlock.type === 'button') {
                    updateSelectedBlock({ buttonColor: e.target.value });
                  } else {
                    updateSelectedBlock({ color: e.target.value });
                  }
                }}
                slotProps={{ input: { sx: { fontSize: '11px', height: '26px' } } }}
              />
              <input
                type="color"
                value={selectedBlock.type === 'button' ? (selectedBlock.buttonColor || '#3B82F6') : (selectedBlock.color || '#1E293B')}
                onChange={(e) => {
                  if (selectedBlock.type === 'button') {
                    updateSelectedBlock({ buttonColor: e.target.value });
                  } else {
                    updateSelectedBlock({ color: e.target.value });
                  }
                }}
                style={{ width: '100%', height: '34px', border: '1px solid #CBD5E1', borderRadius: '4px', cursor: 'pointer', padding: '1px' }}
              />
            </Box>
          </Box>

          {/* Atributos Avanzados de Diseño / Estilos */}
          <Box sx={{ p: 1.5, border: '1px dashed divider', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
              ⚙️ Estilos de Caja (CSS Personalizado)
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.0 }}>
              <TextField
                label="Margen (margin)"
                size="small"
                value={selectedBlock.margin || ''}
                placeholder="Ej. 10px 0"
                onChange={(e) => updateSelectedBlock({ margin: e.target.value })}
                slotProps={{ input: { sx: { fontSize: '11px' } } }}
              />
              <TextField
                label="Relleno (padding)"
                size="small"
                value={selectedBlock.padding || ''}
                placeholder="Ej. 5px 8px"
                onChange={(e) => updateSelectedBlock({ padding: e.target.value })}
                slotProps={{ input: { sx: { fontSize: '11px' } } }}
              />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.0 }}>
              <TextField
                label="Borde (border)"
                size="small"
                value={selectedBlock.border || ''}
                placeholder="Ej. 1px solid #000"
                onChange={(e) => updateSelectedBlock({ border: e.target.value })}
                slotProps={{ input: { sx: { fontSize: '11px' } } }}
              />
              <TextField
                label="Radio Borde"
                size="small"
                value={selectedBlock.borderRadius || ''}
                placeholder="Ej. 4px, 50%"
                onChange={(e) => updateSelectedBlock({ borderRadius: e.target.value })}
                slotProps={{ input: { sx: { fontSize: '11px' } } }}
              />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.0 }}>
              <TextField
                label="Fondo (bgcolor)"
                size="small"
                value={selectedBlock.backgroundColor || ''}
                placeholder="Ej. #F8FAFC"
                onChange={(e) => updateSelectedBlock({ backgroundColor: e.target.value })}
                slotProps={{ input: { sx: { fontSize: '11px' } } }}
              />
              <TextField
                label="Sombra (shadow)"
                size="small"
                value={selectedBlock.shadow || ''}
                placeholder="Ej. 0 2px 4px rgba(0,0,0,0.1)"
                onChange={(e) => updateSelectedBlock({ shadow: e.target.value })}
                slotProps={{ input: { sx: { fontSize: '11px' } } }}
              />
            </Box>
          </Box>

          <Button
            size="small"
            variant="outlined"
            color="error"
            onClick={() => handleDeleteBlock(selectedBlock.id)}
            startIcon={<DeleteIcon />}
            sx={{ mt: 1, fontSize: '11px', textTransform: 'none', fontWeight: 'bold' }}
          >
            Eliminar de la firma
          </Button>
        </Box>
      </Box>
    );
  };

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'firma':
        if (loadingSig) {
          return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={30} />
            </Box>
          );
        }

        // Pantalla inicial de selección de plantillas si no tiene firma o prefiere ver el catálogo
        if (showTemplateSelector) {
          return (
            <Box sx={{ animation: 'fadeIn 180ms ease-in-out' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'text.primary', fontSize: '17px' }}>
                    Constructor Premium de Firmas PixelMail
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '12px' }}>
                    Selecciona una plantilla lista de alta gama para comenzar de inmediato, o carga un respaldo.
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    component="label"
                    startIcon={<UploadIcon />}
                    sx={{ fontSize: '11px', textTransform: 'none' }}
                  >
                    Importar JSON
                    <input type="file" accept=".json" onChange={handleImportJSON} style={{ display: 'none' }} />
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      setRows([
                        {
                          id: 'row-custom-1',
                          columns: [
                            { id: 'col-custom-1-1', widthPercent: 100, blocks: [] }
                          ]
                        }
                      ]);
                      setShowTemplateSelector(false);
                    }}
                    sx={{ fontSize: '11px', textTransform: 'none' }}
                  >
                    Lienzo en Blanco
                  </Button>
                </Box>
              </Box>

              <Divider sx={{ mb: 3 }} />

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 2.5 }}>
                {PREMIUM_TEMPLATES.map((tmpl: any) => (
                  <Card
                    key={tmpl.id}
                    variant="outlined"
                    sx={{
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'transform 150ms, box-shadow 150ms',
                      border: '1.5px solid',
                      borderColor: 'divider',
                      overflow: 'hidden',
                      '&:hover': {
                        transform: 'translateY(-3px)',
                        boxShadow: '0 8px 16px rgba(0,0,0,0.06)',
                        borderColor: '#3B82F6'
                      }
                    }}
                    onClick={() => {
                      setRows(JSON.parse(JSON.stringify(tmpl.rows))); // Clonación profunda para evitar mutación
                      setShowTemplateSelector(false);
                    }}
                  >
                    <Box sx={{ p: 2, bgcolor: '#FAFAFA', borderBottom: '1px solid', borderColor: 'divider', minHeight: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {/* Vista en miniatura estilizada */}
                      <Box sx={{ width: '100%', maxWidth: '280px', scale: '0.85', transformOrigin: 'center' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', color: '#555', fontFamily: 'sans-serif' }}>
                          <tbody>
                            <tr>
                              <td style={{ width: '30%', paddingRight: '10px', verticalAlign: 'middle' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontWeight: 'bold', fontSize: '14px' }}>
                                  {tmpl.name.charAt(0)}
                                </div>
                              </td>
                              <td style={{ width: '70%' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#111' }}>{tmpl.name.split(' ')[0]}</div>
                                <div style={{ color: '#3B82F6', fontSize: '9px', fontWeight: 'bold' }}>{tmpl.category}</div>
                                <div style={{ color: '#666', fontSize: '8px', marginTop: '2px' }}>pixel.com.pe</div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </Box>
                    </Box>
                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '12.5px', color: 'text.primary' }}>
                        {tmpl.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, height: '34px', overflow: 'hidden' }}>
                        {tmpl.description}
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5 }}>
                        <span style={{ fontSize: '9.5px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '20px', backgroundColor: '#EFF6FF', color: '#3B82F6', textTransform: 'uppercase' }}>
                          {tmpl.category}
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#3B82F6' }}>Diseñar →</span>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </Box>
          );
        }

        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, animation: 'fadeIn 150ms ease-in-out' }}>

            {/* Header del Editor de Firma */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: '14.5px', color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
                  🎨 Canva-Signature Premium Builder
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Modo de diseño avanzado de Canvas. Guarda, exporta o cambia de plantilla con libertad absoluta.
                </Typography>
              </Box>

              {/* Botones de acción principales */}
              <Box sx={{ display: 'flex', gap: 1.0, flexWrap: 'wrap', alignItems: 'center' }}>
                <Button size="small" variant="outlined" startIcon={<PostAddIcon />} onClick={() => setShowTemplateSelector(true)} sx={{ fontSize: '11px', textTransform: 'none', height: '30px', fontWeight: 'bold' }}>
                  Catálogo Plantillas
                </Button>
                <Button size="small" variant="outlined" startIcon={<CopyIcon />} onClick={handleCopyHTML} sx={{ fontSize: '11px', textTransform: 'none', height: '30px' }}>
                  Copiar HTML
                </Button>
                <Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={handleDownloadHTML} sx={{ fontSize: '11px', textTransform: 'none', height: '30px' }}>
                  Descargar HTML
                </Button>
                <Button size="small" variant="contained" startIcon={<SaveIcon />} onClick={handleSaveSignature} disabled={savingSig} sx={{ fontSize: '11px', textTransform: 'none', height: '30px', background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)', fontWeight: 'bold' }}>
                  {savingSig ? 'Guardando...' : 'Guardar Firma'}
                </Button>
              </Box>
            </Box>

            <Divider />

            {/* Editor de Firma Estilo Figma/Canva */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '210px 1fr 230px' }, gap: 2 }}>

              {/* PANEL IZQUIERDO: Biblioteca de Componentes Profesionales */}
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: '8px', border: '1px solid divider', bgcolor: 'background.paper', height: 'fit-content' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, fontSize: '12px', color: 'text.primary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  📦 Componentes
                </Typography>
                <Divider sx={{ mb: 1.5 }} />

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
                  {PREDEFINED_COMPONENTS.map((comp: any) => (
                    <Card
                      key={comp.id}
                      variant="outlined"
                      onClick={() => handleAddPredefinedComponent(comp.id)}
                      sx={{
                        p: 1,
                        cursor: 'pointer',
                        borderRadius: '6px',
                        transition: 'border-color 120ms, bgcolor 120ms',
                        borderColor: 'divider',
                        '&:hover': {
                          borderColor: '#3B82F6',
                          bgcolor: 'action.hover'
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 0.5 }}>
                        <span style={{ fontSize: '16px' }}>{comp.icon}</span>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '11.5px', color: 'text.primary' }}>
                          {comp.name}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '9px', lineHeight: 1.2 }}>
                        {comp.description}
                      </Typography>
                    </Card>
                  ))}
                </Box>
              </Paper>

              {/* PANEL CENTRAL: Canvas interactivo y previsualización */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

                {/* Sub-Header del Lienzo: Zoom y Controles */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'action.hover', p: 1, borderRadius: '6px', border: '1px solid', borderColor: 'divider' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <ButtonGroup size="small">
                      <IconButton size="small" onClick={() => setZoom(prev => Math.max(50, prev - 25))}>
                        <ZoomOutIcon sx={{ fontSize: '16px' }} />
                      </IconButton>
                      <Button disabled sx={{ fontSize: '10.5px', fontWeight: 'bold', px: 1, py: 0.2 }}>
                        {zoom}%
                      </Button>
                      <IconButton size="small" onClick={() => setZoom(prev => Math.min(150, prev + 25))}>
                        <ZoomInIcon sx={{ fontSize: '16px' }} />
                      </IconButton>
                    </ButtonGroup>

                    <Button size="small" onClick={() => setZoom(100)} sx={{ fontSize: '10px', textTransform: 'none', py: 0.2 }}>
                      Ajustar 100%
                    </Button>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1.0 }}>
                    <Tooltip title={gridVisible ? "Ocultar Cuadrícula" : "Mostrar Cuadrícula"}>
                      <IconButton size="small" onClick={() => setGridVisible(!gridVisible)} color={gridVisible ? "primary" : "default"}>
                        {gridVisible ? <GridIcon sx={{ fontSize: '16px' }} /> : <GridOffIcon sx={{ fontSize: '16px' }} />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={rulersVisible ? "Ocultar Reglas de Alineación" : "Mostrar Reglas"}>
                      <IconButton size="small" onClick={() => setRulersVisible(!rulersVisible)} color={rulersVisible ? "primary" : "default"}>
                        <PreviewIcon sx={{ fontSize: '16px' }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                {/* Pestañas de previsualización para clientes reales */}
                <Box sx={{ borderBottom: '1px solid divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Tabs value={previewTab} onChange={(_, v) => setPreviewTab(v)} sx={{ minHeight: '32px' }}>
                    <Tab label="📱 Escritorio" sx={{ fontSize: '11px', minHeight: '32px', textTransform: 'none' }} />
                    <Tab label="📱 Móvil (Responsivo)" sx={{ fontSize: '11px', minHeight: '32px', textTransform: 'none' }} />
                    <Tab label="✉ Outlook" sx={{ fontSize: '11px', minHeight: '32px', textTransform: 'none' }} />
                    <Tab label="✉ Gmail Inbox" sx={{ fontSize: '11px', minHeight: '32px', textTransform: 'none' }} />
                    <Tab label="✉ Apple Mail" sx={{ fontSize: '11px', minHeight: '32px', textTransform: 'none' }} />
                  </Tabs>
                </Box>

                {/* LIENZO INTERACTIVO (Framer/Canva Style Canvas) */}
                <Box
                  sx={{
                    position: 'relative',
                    width: '100%',
                    minHeight: '340px',
                    bgcolor: '#ECEFF1',
                    border: '1px solid divider',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    p: 2,
                    backgroundSize: gridVisible ? '20px 20px' : '0 0',
                    backgroundImage: gridVisible ? 'radial-gradient(circle, #CFD8DC 1px, transparent 1px)' : 'none'
                  }}
                >
                  {/* Reglas e indicadores superiores */}
                  {rulersVisible && (
                    <>
                      <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: '18px', borderBottom: '1px solid #B0BEC5', bgcolor: '#F5F7F8', display: 'flex', px: 1, justifyContent: 'space-between', zIndex: 5 }}>
                        <span style={{ fontSize: '8px', color: '#78909C' }}>0px</span>
                        <span style={{ fontSize: '8px', color: '#78909C' }}>150px</span>
                        <span style={{ fontSize: '8px', color: '#78909C' }}>300px</span>
                        <span style={{ fontSize: '8px', color: '#78909C' }}>450px</span>
                        <span style={{ fontSize: '8px', color: '#78909C' }}>600px (Límite Seguro)</span>
                      </Box>
                      <Box sx={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '18px', borderRight: '1px solid #B0BEC5', bgcolor: '#F5F7F8', display: 'flex', flexDirection: 'column', py: 2, justifyContent: 'space-between', zIndex: 5 }}>
                        <span style={{ fontSize: '8px', color: '#78909C', transform: 'rotate(-90deg)' }}>0px</span>
                        <span style={{ fontSize: '8px', color: '#78909C', transform: 'rotate(-90deg)' }}>100px</span>
                        <span style={{ fontSize: '8px', color: '#78909C', transform: 'rotate(-90deg)' }}>200px</span>
                      </Box>
                    </>
                  )}

                  {/* LIENZO / HOJA (Sheet Canvas Frame) */}
                  <Box
                    sx={{
                      transform: `scale(${zoom / 100})`,
                      transition: 'transform 100ms ease-out',
                      width: previewTab === 1 ? '360px' : '100%',
                      maxWidth: '600px',
                      boxShadow: '0 12px 24px rgba(0,0,0,0.08)',
                      bgcolor: '#FFFFFF',
                      border: '1.5px solid #CFD8DC',
                      p: 3,
                      position: 'relative'
                    }}
                  >
                    {/* Indicador de Margen Seguro */}
                    <Box sx={{ position: 'absolute', inset: 6, border: '1px dashed rgba(59,130,246,0.18)', pointerEvents: 'none', borderRadius: '4px' }} />

                    {/* Simulación específica de la vista del cliente de correo */}
                    {previewTab === 3 && (
                      <Box sx={{ mb: 2, p: 1, borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#EF4444' }} />
                        <Typography sx={{ fontSize: '9px', fontWeight: 'bold', color: '#1F2937' }}>
                          Gmail - Detalle del Mensaje
                        </Typography>
                      </Box>
                    )}
                    {previewTab === 2 && (
                      <Box sx={{ mb: 2, p: 1, borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#3B82F6' }} />
                        <Typography sx={{ fontSize: '9px', fontWeight: 'bold', color: '#334155' }}>
                          Outlook Desktop Web
                        </Typography>
                      </Box>
                    )}

                    {/* Filas */}
                    {rows.length === 0 ? (
                      <Box sx={{ py: 6, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', fontSize: '12px' }}>
                          Lienzo vacío. Agrega una fila o haz clic en un componente para cargarlo.
                        </Typography>
                      </Box>
                    ) : (
                      rows.map((row) => (
                        <Box
                          key={row.id}
                          sx={{
                            border: `1.5px solid ${selectedRowId === row.id ? '#3B82F6' : 'transparent'}`,
                            borderRadius: '6px',
                            p: 1.5,
                            mb: 1.5,
                            position: 'relative',
                            bgcolor: selectedRowId === row.id ? 'rgba(59,130,246,0.02)' : 'transparent',
                            transition: 'border-color 150ms',
                            '&:hover .row-controls': { opacity: 1 }
                          }}
                          onClick={() => setSelectedRowId(row.id)}
                        >
                          {/* Controles de Fila */}
                          <Box
                            className="row-controls"
                            sx={{
                              position: 'absolute',
                              right: 4,
                              top: -12,
                              display: 'flex',
                              gap: 0.3,
                              opacity: 0,
                              transition: 'opacity 120ms',
                              bgcolor: 'background.paper',
                              border: '1.5px solid #CBD5E1',
                              borderRadius: '4px',
                              px: 0.5,
                              zIndex: 10
                            }}
                          >
                            <Tooltip title="Subir fila">
                              <IconButton size="small" onClick={() => handleMoveRow(row.id, 'up')} sx={{ p: 0.2 }}><MoveUpIcon sx={{ fontSize: '14px' }} /></IconButton>
                            </Tooltip>
                            <Tooltip title="Bajar fila">
                              <IconButton size="small" onClick={() => handleMoveRow(row.id, 'down')} sx={{ p: 0.2 }}><MoveDownIcon sx={{ fontSize: '14px' }} /></IconButton>
                            </Tooltip>
                            <Tooltip title="Duplicar fila">
                              <IconButton size="small" onClick={() => handleDuplicateRow(row.id)} sx={{ p: 0.2 }}><FileCopyIcon sx={{ fontSize: '14px' }} /></IconButton>
                            </Tooltip>
                            <Tooltip title="Eliminar fila">
                              <IconButton size="small" color="error" onClick={() => handleDeleteRow(row.id)} sx={{ p: 0.2 }}><DeleteIcon sx={{ fontSize: '14px' }} /></IconButton>
                            </Tooltip>
                          </Box>

                          {/* Columnas */}
                          <Box sx={{ display: 'flex', gap: 1.5, width: '100%', flexDirection: previewTab === 1 ? 'column' : 'row' }}>
                            {row.columns.map((col) => (
                              <Box
                                key={col.id}
                                onDragOver={(e) => handleDragOverBlock(e, col.id, col.blocks.length)}
                                onDrop={(e) => handleDropOnCol(e, col.id)}
                                sx={{
                                  width: previewTab === 1 ? '100%' : `${col.widthPercent}%`,
                                  border: `1.5px dashed ${dragOverColId === col.id ? '#3B82F6' : 'divider'}`,
                                  borderRadius: '6px',
                                  p: 1.2,
                                  minHeight: '75px',
                                  position: 'relative',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 0.8,
                                  bgcolor: dragOverColId === col.id ? 'rgba(59,130,246,0.05)' : 'transparent',
                                  transition: 'border-color 150ms, bgcolor 150ms'
                                }}
                              >
                                {/* Bloques */}
                                {col.blocks.map((block, bIdx) => {
                                  if (block.hidden) return null;
                                  const isSelected = selectedBlockId === block.id;
                                  return (
                                    <Box
                                      key={block.id}
                                      draggable
                                      onDragStart={(e) => handleDragStart(e, block.id)}
                                      onDragOver={(e) => handleDragOverBlock(e, col.id, bIdx)}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedBlockId(block.id);
                                      }}
                                      sx={{
                                        border: `1.5px solid ${isSelected ? '#3B82F6' : 'transparent'}`,
                                        p: '6px 8px',
                                        position: 'relative',
                                        bgcolor: isSelected ? 'rgba(59,130,246,0.06)' : 'transparent',
                                        cursor: 'grab',
                                        margin: block.margin || '0',
                                        padding: block.padding || '4px 0',
                                        borderStyle: block.border ? 'solid' : undefined,
                                        borderWidth: block.border ? '1px' : undefined,
                                        borderColor: block.border || undefined,
                                        borderRadius: block.borderRadius || '6px',
                                        backgroundColor: block.backgroundColor || undefined,
                                        boxShadow: block.shadow || undefined,
                                        transition: 'all 120ms',
                                        '&:hover': {
                                          boxShadow: '0 4px 10px rgba(0,0,0,0.04)',
                                          borderColor: isSelected ? '#3B82F6' : '#94A3B8'
                                        },
                                        '&:hover .block-controls': { opacity: 1 }
                                      }}
                                    >
                                      {/* Controles del Bloque */}
                                      <Box
                                        className="block-controls"
                                        sx={{
                                          position: 'absolute',
                                          right: 4,
                                          top: -10,
                                          display: 'flex',
                                          gap: 0.2,
                                          opacity: 0,
                                          transition: 'opacity 120ms',
                                          bgcolor: 'background.paper',
                                          border: '1.5px solid #CBD5E1',
                                          borderRadius: '4px',
                                          px: 0.4,
                                          zIndex: 10
                                        }}
                                      >
                                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDuplicateBlock(block.id); }} sx={{ p: 0.1 }}><FileCopyIcon sx={{ fontSize: '11px' }} /></IconButton>
                                        <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); handleDeleteBlock(block.id); }} sx={{ p: 0.1 }}><DeleteIcon sx={{ fontSize: '11px' }} /></IconButton>
                                      </Box>

                                      {/* Visualización del bloque en el lienzo */}
                                      {block.type === 'name' && (
                                        <Typography variant="body1" sx={{ fontFamily: block.fontFamily || 'Inter', fontSize: block.fontSize || '16px', fontWeight: block.fontWeight || '700', color: block.color || 'text.primary', textAlign: block.align || 'left' }}>
                                          {block.content}
                                        </Typography>
                                      )}
                                      {block.type === 'cargo' && (
                                        <Typography variant="body2" sx={{ fontFamily: block.fontFamily || 'Inter', fontSize: block.fontSize || '13px', fontWeight: block.fontWeight || '500', color: block.color || 'text.secondary', textAlign: block.align || 'left' }}>
                                          {block.content}
                                        </Typography>
                                      )}
                                      {block.type === 'text' && (
                                        <Typography variant="body2" sx={{ fontFamily: block.fontFamily || 'Inter', fontSize: block.fontSize || '12px', color: block.color || 'text.primary', textAlign: block.align || 'left' }}>
                                          {block.content}
                                        </Typography>
                                      )}
                                      {block.type === 'link' && (
                                        <Typography variant="body2" sx={{ fontFamily: block.fontFamily || 'Inter', fontSize: block.fontSize || '12px', color: block.color || '#3B82F6', textAlign: block.align || 'left', textDecoration: 'underline', fontWeight: block.fontWeight || 'normal' }}>
                                          {block.content}
                                        </Typography>
                                      )}
                                      {block.type === 'button' && (
                                        <Box sx={{ textAlign: block.align || 'left' }}>
                                          <Button size="small" sx={{ bgcolor: block.buttonColor || '#3B82F6', color: '#FFF', fontSize: '11px', textTransform: 'none', py: 0.4, px: 1.5, borderRadius: block.borderRadius || '6px', fontWeight: 'bold' }}>
                                            {block.content}
                                          </Button>
                                        </Box>
                                      )}
                                      {block.type === 'separator' && (
                                        <Box sx={{ borderTop: `1px solid ${block.color || 'divider'}`, width: '100%', my: 0.5 }} />
                                      )}
                                      {block.type === 'espaciador' && (
                                        <Box sx={{ height: block.height || '12px' }} />
                                      )}
                                      {block.type === 'gif' && (
                                        <Box sx={{ textAlign: block.align || 'center' }}>
                                          <img src={block.content} alt="Animación" style={{ maxWidth: '100%', height: 'auto', borderRadius: block.borderRadius || '4px' }} />
                                        </Box>
                                      )}
                                      {block.type === 'qr' && (
                                        <Box sx={{ border: block.qrBorder || '1.5px dashed #10B981', borderRadius: block.qrShape === 'circle' ? '50%' : '6px', p: 1, width: '100px', height: '100px', mx: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#FFF' }}>
                                          <img src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(block.content)}`} alt="QR" style={{ width: '80px', height: '80px' }} />
                                        </Box>
                                      )}
                                      {block.type === 'legal' && (
                                        <Typography variant="caption" sx={{ fontFamily: block.fontFamily || 'Inter', fontSize: '10px', color: block.color || 'text.disabled', textAlign: block.align || 'left', display: 'block', lineHeight: 1.3 }}>
                                          {block.legalModel === 'financiero' && 'AVISO FINANCIERO: La información contenida en esta transmisión es de carácter estrictamente informativo y no constituye una oferta de compra/venta ni asesoría financiera formal.'}
                                          {block.legalModel === 'corporativo' && 'INFORMACIÓN CORPORATIVA: Este correo y sus archivos adjuntos están sujetos a las políticas de comunicación corporativa de Pixel S.A.C.'}
                                          {block.legalModel === 'confidencial' && 'CONFIDENCIALIDAD: Este mensaje es confidencial y para uso exclusivo del destinatario. Si lo recibe por error, por favor notifíquelo de inmediato al remitente y bórrelo de su sistema.'}
                                          {(block.legalModel === 'estandar' || !block.legalModel) && 'Por favor, considere el medio ambiente antes de imprimir este correo electrónico.'}
                                        </Typography>
                                      )}
                                      {block.type === 'estado' && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, justifyContent: block.align === 'center' ? 'center' : block.align === 'right' ? 'flex-end' : 'flex-start' }}>
                                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: block.estadoType === 'reunion' ? '#EF4444' : block.estadoType === 'vacaciones' ? '#F59E0B' : block.estadoType === 'fuera' ? '#64748B' : '#22C55E' }} />
                                          <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '11px', color: 'text.secondary' }}>
                                            {block.estadoType === 'reunion' ? 'En reunión' : block.estadoType === 'vacaciones' ? 'De vacaciones' : block.estadoType === 'fuera' ? 'Fuera de oficina' : 'Disponible'}
                                          </Typography>
                                        </Box>
                                      )}
                                      {block.type === 'social' && (
                                        <Box sx={{ display: 'flex', gap: 1, justifyContent: block.align === 'center' ? 'center' : block.align === 'right' ? 'flex-end' : 'flex-start' }}>
                                          <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#0A66C2' }}>
                                            {block.socialPlatform?.toUpperCase() || 'LINKEDIN'}
                                          </span>
                                        </Box>
                                      )}
                                    </Box>
                                  );
                                })}

                                {/* Botón rápido Canva-Style para añadir elementos locales */}
                                <Button
                                  size="small"
                                  onClick={() => handleAddBlockToColumn(col.id, 'text')}
                                  sx={{ mt: 'auto', alignSelf: 'center', fontSize: '9px', p: '1px 6px', textTransform: 'none', border: '1px dashed divider', borderRadius: '4px' }}
                                >
                                  + Bloque
                                </Button>
                              </Box>
                            ))}
                          </Box>
                        </Box>
                      ))
                    )}
                  </Box>
                </Box>

                {/* Utilidades de Inserción de Filas al final */}
                <Box sx={{ display: 'flex', gap: 1.0, flexWrap: 'wrap', justifyContent: 'center', bgcolor: 'action.hover', p: 1.5, borderRadius: '8px', border: '1.5px dashed divider' }}>
                  <Typography variant="caption" sx={{ display: 'block', width: '100%', textAlign: 'center', fontWeight: 'bold', color: 'text.secondary', mb: 0.5 }}>
                    ➕ Añadir Nueva Fila con Estructura de Columnas
                  </Typography>
                  <Button size="small" variant="outlined" onClick={() => handleAddRow(1)} sx={{ fontSize: '10.5px', textTransform: 'none', borderRadius: '4px' }}>
                    1 Columna (100%)
                  </Button>
                  <Button size="small" variant="outlined" onClick={() => handleAddRow(2)} sx={{ fontSize: '10.5px', textTransform: 'none', borderRadius: '4px' }}>
                    2 Columnas (50/50)
                  </Button>
                  <Button size="small" variant="outlined" onClick={() => handleAddRow(3)} sx={{ fontSize: '10.5px', textTransform: 'none', borderRadius: '4px' }}>
                    3 Columnas (33/33/33)
                  </Button>
                  <Button size="small" variant="outlined" onClick={() => handleAddRow(4)} sx={{ fontSize: '10.5px', textTransform: 'none', borderRadius: '4px' }}>
                    4 Columnas (25/25/25/25)
                  </Button>
                </Box>
              </Box>

              {/* PANEL DERECHO: Editor de Propiedades / Inspector Avanzado */}
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: '8px', border: '1px solid divider', bgcolor: 'background.paper', height: 'fit-content' }}>
                {renderPropertiesPanel()}

                {/* Herramientas de Importación/Exportación */}
                <Divider sx={{ my: 2 }} />
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', display: 'block', mb: 1 }}>
                  📁 Importar / Exportar Respaldo
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                  <Button size="small" variant="outlined" onClick={handleExportJSON} sx={{ fontSize: '9.5px', textTransform: 'none' }}>
                    Exportar JSON
                  </Button>
                  <Button size="small" variant="outlined" onClick={handleDuplicateSignature} sx={{ fontSize: '9.5px', textTransform: 'none' }}>
                    Duplicar Firma
                  </Button>
                </Box>
              </Paper>

            </Box>
          </Box>
        );

      case 'carpetas':
        return (
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5, fontSize: '15px' }}>
              Administrador de Carpetas
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Crea, reordena y personaliza las carpetas para organizar tu bandeja de entrada.
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Box component="form" onSubmit={handleCreateFolder} sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: 3, flexWrap: 'wrap' }}>
              <TextField
                label="Nombre de la Carpeta"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                size="small"
                sx={{ maxWith: 220 }}
                slotProps={{
                  input: { sx: { fontSize: '13px' } }
                }}
              />
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {PREDEFINED_COLORS.map((c) => (
                  <Box
                    key={c}
                    onClick={() => setNewFolderColor(c)}
                    sx={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      bgcolor: c,
                      cursor: 'pointer',
                      border: newFolderColor === c ? '2.5px solid #FFF' : '1px solid rgba(0,0,0,0.15)',
                      boxShadow: newFolderColor === c ? '0 0 4px rgba(0,0,0,0.5)' : 'none',
                      transition: 'transform 100ms',
                      '&:hover': { transform: 'scale(1.15)' }
                    }}
                  />
                ))}
              </Box>
              <Button
                type="submit"
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                sx={{ py: 0.8, fontSize: '12px', fontWeight: 'bold' }}
              >
                Crear Carpeta
              </Button>
            </Box>

            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, fontSize: '13px' }}>
              Carpetas Existentes ({folders.length})
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.0 }}>
              {folders.map((f) => (
                <Card key={f.id} variant="outlined" sx={{ borderRadius: '6px' }}>
                  <CardContent sx={{ p: '8px 12px !important', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.0 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: f.color }} />
                      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '12.5px' }}>
                        {f.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '10px' }}>
                        ID: {f.id}
                      </Typography>
                    </Box>
                    <IconButton size="small" color="error" onClick={() => deleteFolder(f.id)} sx={{ p: 0.4 }}>
                      <DeleteIcon sx={{ fontSize: '16px' }} />
                    </IconButton>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Box>
        );

      case 'reglas':
        return (
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5, fontSize: '15px' }}>
              Reglas Automáticas
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Crea filtros que se ejecutan automáticamente sobre tus correos recibidos.
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Box component="form" onSubmit={handleCreateRule} sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 1.5 }}>

                <FormControl size="small">
                  <InputLabel sx={{ fontSize: '12px' }}>Condición</InputLabel>
                  <Select
                    value={conditionField}
                    onChange={(e) => setConditionField(e.target.value as any)}
                    label="Condición"
                    sx={{ fontSize: '12.5px' }}
                  >
                    <MenuItem value="from">Remitente</MenuItem>
                    <MenuItem value="subject">Asunto</MenuItem>
                    <MenuItem value="hasAttachments">Tiene adjuntos</MenuItem>
                    <MenuItem value="read">Correo leído</MenuItem>
                    <MenuItem value="starred">Destacado</MenuItem>
                  </Select>
                </FormControl>

                {['from', 'subject'].includes(conditionField) ? (
                  <FormControl size="small">
                    <InputLabel sx={{ fontSize: '12px' }}>Operador</InputLabel>
                    <Select
                      value={conditionOperator}
                      onChange={(e) => setConditionOperator(e.target.value as any)}
                      label="Operador"
                      sx={{ fontSize: '12.5px' }}
                    >
                      <MenuItem value="contains">Contiene</MenuItem>
                      <MenuItem value="endsWith">Termina en</MenuItem>
                      <MenuItem value="startsWith">Empieza con</MenuItem>
                      <MenuItem value="equals">Es exactamente</MenuItem>
                    </Select>
                  </FormControl>
                ) : (
                  <FormControl size="small">
                    <InputLabel sx={{ fontSize: '12px' }}>Estado</InputLabel>
                    <Select
                      value={conditionOperator}
                      onChange={(e) => setConditionOperator(e.target.value as any)}
                      label="Estado"
                      sx={{ fontSize: '12.5px' }}
                    >
                      <MenuItem value="isTrue">Verdadero</MenuItem>
                      <MenuItem value="isFalse">Falso</MenuItem>
                    </Select>
                  </FormControl>
                )}

                {['from', 'subject'].includes(conditionField) && (
                  <TextField
                    label="Valor de búsqueda"
                    value={conditionValue}
                    onChange={(e) => setConditionValue(e.target.value)}
                    size="small"
                    placeholder="Ej. @pixel.com.pe"
                    sx={{ fontSize: '12.5px' }}
                  />
                )}

                <FormControl size="small">
                  <InputLabel sx={{ fontSize: '12px' }}>Acción</InputLabel>
                  <Select
                    value={actionType}
                    onChange={(e) => setActionType(e.target.value as any)}
                    label="Acción"
                    sx={{ fontSize: '12.5px' }}
                  >
                    <MenuItem value="moveToFolder">Mover a Carpeta</MenuItem>
                    <MenuItem value="archive">Archivar correo</MenuItem>
                    <MenuItem value="delete">Eliminar correo</MenuItem>
                    <MenuItem value="star">Marcar destacado</MenuItem>
                    <MenuItem value="markRead">Marcar como leído</MenuItem>
                  </Select>
                </FormControl>

                {actionType === 'moveToFolder' && (
                  <FormControl size="small">
                    <InputLabel sx={{ fontSize: '12px' }}>Carpeta Destino</InputLabel>
                    <Select
                      value={actionValue}
                      onChange={(e) => setActionValue(e.target.value)}
                      label="Carpeta Destino"
                      sx={{ fontSize: '12.5px' }}
                    >
                      {folders.map((f) => (
                        <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              </Box>

              <Button
                type="submit"
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                sx={{ alignSelf: 'flex-start', py: 0.8, fontSize: '12px', fontWeight: 'bold' }}
              >
                Crear Regla
              </Button>
            </Box>

            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, fontSize: '13px' }}>
              Reglas Creadas ({rules.length})
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.0 }}>
              {rules.length === 0 ? (
                <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic', fontSize: '12px' }}>
                  No se han creado reglas automáticas aún.
                </Typography>
              ) : (
                rules.map((rule) => {
                  const targetFolder = folders.find((f) => f.id === rule.actionValue);
                  return (
                    <Card key={rule.id} variant="outlined" sx={{ borderRadius: '6px' }}>
                      <CardContent sx={{ p: '8px 12px !important', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontSize: '12px', color: 'text.primary', fontWeight: 600 }}>
                            Si {rule.conditionField === 'from' ? 'el remitente' : rule.conditionField === 'subject' ? 'el asunto' : 'el correo'} {rule.conditionOperator === 'contains' ? 'contiene' : rule.conditionOperator === 'endsWith' ? 'termina en' : rule.conditionOperator === 'startsWith' ? 'empieza con' : rule.conditionOperator === 'equals' ? 'es exactamente' : 'es'} {rule.conditionValue && `"${rule.conditionValue}"`}
                          </Typography>
                          <Typography variant="caption" sx={{ fontSize: '11px', color: '#3B82F6', fontWeight: 600 }}>
                            → Acción: {rule.actionType === 'moveToFolder' ? `Mover a carpeta "${targetFolder ? targetFolder.name : rule.actionValue}"` : rule.actionType === 'archive' ? 'Archivar' : rule.actionType === 'delete' ? 'Eliminar' : rule.actionType === 'star' ? 'Destacar' : 'Marcar leído'}
                          </Typography>
                        </Box>
                        <IconButton size="small" color="error" onClick={() => deleteRule(rule.id)} sx={{ p: 0.4 }}>
                          <DeleteIcon sx={{ fontSize: '16px' }} />
                        </IconButton>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </Box>
          </Box>
        );

      default:
        return (
          <Box sx={{ py: 2, textAlign: 'center' }}>
            <SettingsIcon sx={{ fontSize: '36px', color: 'text.disabled', mb: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: '14.5px', color: 'text.primary', textTransform: 'capitalize' }}>
              Sección {activeSection}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: '12px' }}>
              Esta sección estará disponible en las próximas versiones premium de PixelMail.
            </Typography>
          </Box>
        );
    }
  };

  return (
    <Box sx={{ animation: 'fadeIn 200ms ease-in-out' }}>
      <Typography variant="h3" sx={{ fontWeight: 700, color: 'text.primary', letterSpacing: '-0.5px', fontSize: { xs: '22px', md: '26px' }, lineHeight: 1.2, mb: 2 }}>
        Configuración {savedSig && <span style={{ fontSize: '11px', color: '#10B981', marginLeft: '12px' }}>¡Firma guardada!</span>}
      </Typography>

      <Paper sx={{ display: 'flex', minHeight: 460, borderRadius: '8px', overflow: 'hidden', border: '1px solid divider', bgcolor: 'background.paper' }}>

        <Box sx={{ width: 160, borderRight: '1px solid', borderColor: 'divider', p: 1, bgcolor: 'action.hover' }}>
          <List sx={{ p: 0 }}>
            {[
              { id: 'firma', label: 'Firma', icon: <SignatureIcon /> },
              { id: 'reglas', label: 'Reglas', icon: <RuleIcon /> },
              { id: 'carpetas', label: 'Carpetas', icon: <FolderIcon /> },
              { id: 'general', label: 'General', icon: <SettingsIcon /> },
              { id: 'cuenta', label: 'Cuenta', icon: <AccountIcon /> },
              { id: 'apariencia', label: 'Apariencia', icon: <AppearanceIcon /> },
              { id: 'notificaciones', label: 'Notificaciones', icon: <NotificationsIcon /> },
              { id: 'seguridad', label: 'Seguridad', icon: <SecurityIcon /> }
            ].map((section) => {
              const isActive = activeSection === section.id;
              return (
                <ListItem key={section.id} disablePadding sx={{ mb: 0.2 }}>
                  <ListItemButton
                    selected={isActive}
                    onClick={() => setActiveSection(section.id as any)}
                    sx={{
                      py: 0.5,
                      px: 1.0,
                      borderRadius: '4px',
                      color: isActive ? '#3B82F6' : 'text.secondary',
                      bgcolor: isActive ? 'action.selected' : 'transparent',
                      '& svg': { fontSize: '15px' }
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 22, color: isActive ? '#3B82F6' : 'inherit' }}>
                      {section.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={section.label}
                      slotProps={{
                        primary: { fontSize: '11.5px', fontWeight: isActive ? 600 : 500 } as any
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </Box>

        <Box sx={{ flexGrow: 1, p: 2.5, minWidth: 0, overflowY: 'auto' }}>
          {renderSectionContent()}
        </Box>
      </Paper>
    </Box>
  );
};

export default Configuracion;
