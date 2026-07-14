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
  Tooltip
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
  Email as EmailIcon,
  ArrowUpward as MoveUpIcon,
  ArrowDownward as MoveDownIcon,
  Layers as BlockIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useEmails } from '../contexts/EmailContext';
import { db } from '../config/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { SignatureHTMLEditor } from '../components/signature/SignatureHTMLEditor';

const PREDEFINED_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#6366F1'
];

interface Block {
  id: string;
  type: 'text' | 'name' | 'cargo' | 'link' | 'gif' | 'qr' | 'button' | 'separator' | 'espaciador';
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
        const alignStyle = block.align ? `text-align: ${block.align};` : '';
        const paddingStyle = block.padding ? `padding: ${block.padding};` : 'padding: 4px 0;';
        const marginStyle = block.margin ? `margin: ${block.margin};` : '';

        html += `<div style="${alignStyle} ${paddingStyle} ${marginStyle}">`;

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
            html += `<div style="border: 2px dashed #3B82F6; padding: 12px; text-align: center; border-radius: 6px; font-size: 11px; color: #3B82F6; font-weight: bold; background-color: rgba(59,130,246,0.05);">${block.content}</div>`;
            break;
          case 'qr':
            html += `<div style="border: 2px dashed #10B981; padding: 12px; text-align: center; border-radius: 6px; font-size: 11px; color: #10B981; font-weight: bold; background-color: rgba(16,185,129,0.05);">${block.content}</div>`;
            break;
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

// Plantilla inicial para el usuario David Lachira S.
const getDavidSignatureTemplate = (): Row[] => [
  {
    id: 'row-1',
    columns: [
      {
        id: 'col-1-1',
        widthPercent: 22,
        blocks: [
          { id: 'b-gif-1', type: 'gif', content: 'Aquí irá el GIF del logo Pixel' },
          { id: 'b-sep-1', type: 'separator', content: '', color: '#3B82F6' }
        ]
      },
      {
        id: 'col-1-2',
        widthPercent: 56,
        blocks: [
          { id: 'b-name', type: 'name', content: 'David Lachira S.', fontFamily: 'Inter', fontSize: '22px', fontWeight: '700', color: '#1E293B' },
          { id: 'b-cargo', type: 'cargo', content: 'Asesor de Negocios', fontFamily: 'Inter', fontSize: '15px', fontWeight: '500', color: '#64748B' },
          { id: 'b-space-1', type: 'espaciador', content: '', height: '8px' },
          { id: 'b-tel', type: 'link', content: '📱 +51 930 653 718', href: 'tel:+51930653718', color: '#3B82F6' },
          { id: 'b-space-tel', type: 'espaciador', content: '', height: '4px' },
          { id: 'b-email', type: 'link', content: '✉ david.lachira@pixel.com.pe', href: 'mailto:david.lachira@pixel.com.pe', color: '#3B82F6' },
          { id: 'b-space-email', type: 'espaciador', content: '', height: '4px' },
          { id: 'b-web', type: 'link', content: '🌐 pixel.com.pe', href: 'https://pixel.com.pe', color: '#3B82F6' },
          { id: 'b-space-2', type: 'espaciador', content: '', height: '8px' },
          { id: 'b-frase', type: 'text', content: 'Impulsamos el crecimiento de tu empresa con soluciones financieras.', fontFamily: 'Inter', fontSize: '13px', color: '#64748B' }
        ]
      },
      {
        id: 'col-1-3',
        widthPercent: 22,
        blocks: [
          { id: 'b-qr', type: 'qr', content: 'Aquí irá el QR' },
          { id: 'b-text-qr', type: 'text', content: 'Escanéame', align: 'center', color: '#64748B' }
        ]
      }
    ]
  },
  {
    id: 'row-2',
    columns: [
      {
        id: 'col-2-1',
        widthPercent: 33,
        blocks: [
          { id: 'b-btn-wa', type: 'button', content: 'WhatsApp', buttonColor: '#22C55E', href: '#', borderRadius: '4px' }
        ]
      },
      {
        id: 'col-2-2',
        widthPercent: 34,
        blocks: [
          { id: 'b-btn-meet', type: 'button', content: 'Agendar reunión', buttonColor: '#3B82F6', href: '#', borderRadius: '4px' }
        ]
      },
      {
        id: 'col-2-3',
        widthPercent: 33,
        blocks: [
          { id: 'b-btn-web', type: 'button', content: 'Visitar sitio web', buttonColor: '#1E293B', href: 'https://pixel.com.pe', borderRadius: '4px' }
        ]
      }
    ]
  },
  {
    id: 'row-3',
    columns: [
      {
        id: 'col-3-1',
        widthPercent: 100,
        blocks: [
          { id: 'b-disclaimer', type: 'text', content: 'Este mensaje y sus anexos contienen información confidencial dirigida exclusivamente al destinatario.', fontSize: '11px', color: '#64748B' }
        ]
      }
    ]
  }
];

const Configuracion = () => {
  const { user } = useAuth();
  const { folders, addFolder, deleteFolder, rules, addRule, deleteRule } = useEmails();

  // Navigation sidebar interna
  const [activeSection, setActiveSection] = useState<'general' | 'cuenta' | 'firma' | 'reglas' | 'carpetas' | 'apariencia' | 'notificaciones' | 'seguridad'>('firma');

  // Firma visual / builder state
  const [rows, setRows] = useState<Row[]>([]);
  const [loadingSig, setLoadingSig] = useState(true);
  const [savingSig, setSavingSig] = useState(false);
  const [savedSig, setSavedSig] = useState(false);

  // Propiedades del bloque seleccionado
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  // Pestañas de Vista Previa
  const [previewTab, setPreviewTab] = useState(0);

  // Selector del modo del Editor de Firmas (visual vs avanzado/importador)
  const [editorMode, setEditorMode] = useState<'visual' | 'html'>('visual');

  // Cargar firma
  useEffect(() => {
    const fetchSignature = async () => {
      if (!user) return;
      try {
        const docRef = doc(db, 'settings', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().signatureStructure) {
          setRows(JSON.parse(docSnap.data().signatureStructure));
        } else {
          // Si es el usuario específico, cargar su firma
          if (user.email && user.email.toLowerCase().includes('david.lachira')) {
            setRows(getDavidSignatureTemplate());
          } else {
            // Firma inicial básica por defecto para otros usuarios
            setRows([
              {
                id: 'row-default-1',
                columns: [
                  {
                    id: 'col-default-1-1',
                    widthPercent: 100,
                    blocks: [
                      { id: 'b-default-name', type: 'name', content: 'Tu Nombre' },
                      { id: 'b-default-cargo', type: 'cargo', content: 'Tu Cargo' }
                    ]
                  }
                ]
              }
            ]);
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
      columns: target.columns.map((col, idx) => ({
        id: `col-${Date.now()}-${idx}`,
        widthPercent: col.widthPercent,
        blocks: col.blocks.map((b, bIdx) => ({
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

  // Agregar bloques al lienzo
  const handleAddBlockToColumn = (colId: string, type: Block['type']) => {
    const newBlock: Block = {
      id: 'b-' + Date.now() + Math.random().toString(36).substr(2, 4),
      type,
      content: type === 'name' ? 'Nuevo Nombre' : type === 'cargo' ? 'Nuevo Cargo' : type === 'button' ? 'Botón' : type === 'separator' ? '' : type === 'espaciador' ? '' : type === 'gif' ? 'GIF del logo Pixel' : type === 'qr' ? 'Código QR' : 'Nuevo Texto'
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

  // Renderizar las propiedades del bloque seleccionado en el panel derecho
  const renderPropertiesPanel = () => {
    if (!selectedBlock) {
      return (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <BlockIcon sx={{ fontSize: '32px', color: 'text.disabled', mb: 1 }} />
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '12px' }}>
            Selecciona un bloque del lienzo para editar sus propiedades.
          </Typography>
        </Box>
      );
    }

    const isTextLike = ['text', 'name', 'cargo', 'link', 'button'].includes(selectedBlock.type);

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '12.5px', color: 'text.primary' }}>
          Propiedades: {selectedBlock.type.toUpperCase()}
        </Typography>
        <Divider />

        {/* Campo Contenido */}
        {['text', 'name', 'cargo', 'link', 'button', 'gif', 'qr'].includes(selectedBlock.type) && (
          <TextField
            label="Contenido"
            size="small"
            fullWidth
            value={selectedBlock.content}
            onChange={(e) => updateSelectedBlock({ content: e.target.value })}
            slotProps={{ input: { sx: { fontSize: '12.5px' } } }}
          />
        )}

        {/* Campos específicos de Enlaces y Botones */}
        {['link', 'button'].includes(selectedBlock.type) && (
          <TextField
            label="Enlace (URL)"
            size="small"
            fullWidth
            value={selectedBlock.href || ''}
            onChange={(e) => updateSelectedBlock({ href: e.target.value })}
            slotProps={{ input: { sx: { fontSize: '12.5px' } } }}
          />
        )}

        {/* Selector de color de botón */}
        {selectedBlock.type === 'button' && (
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              Color del Botón
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {PREDEFINED_COLORS.map(c => (
                <Box
                  key={c}
                  onClick={() => updateSelectedBlock({ buttonColor: c })}
                  sx={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    bgcolor: c,
                    cursor: 'pointer',
                    border: selectedBlock.buttonColor === c ? '2px solid #FFF' : '1px solid rgba(0,0,0,0.1)'
                  }}
                />
              ))}
            </Box>
          </Box>
        )}

        {/* Atributos de Texto */}
        {isTextLike && (
          <>
            <FormControl size="small" fullWidth>
              <InputLabel sx={{ fontSize: '11px' }}>Fuente</InputLabel>
              <Select
                value={selectedBlock.fontFamily || 'Inter'}
                onChange={(e) => updateSelectedBlock({ fontFamily: e.target.value })}
                label="Fuente"
                sx={{ fontSize: '12px' }}
              >
                <MenuItem value="Inter">Inter</MenuItem>
                <MenuItem value="Roboto">Roboto</MenuItem>
                <MenuItem value="Arial">Arial</MenuItem>
                <MenuItem value="Courier New">Courier New</MenuItem>
                <MenuItem value="Georgia">Georgia</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Tamaño de Letra"
              size="small"
              fullWidth
              value={selectedBlock.fontSize || ''}
              placeholder="Ej: 14px, 22px"
              onChange={(e) => updateSelectedBlock({ fontSize: e.target.value })}
              slotProps={{ input: { sx: { fontSize: '12.5px' } } }}
            />

            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Color del Texto
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {['#1E293B', '#64748B', '#3B82F6', '#EF4444', '#10B981', '#FFFFFF'].map(c => (
                  <Box
                    key={c}
                    onClick={() => updateSelectedBlock({ color: c })}
                    sx={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      bgcolor: c,
                      cursor: 'pointer',
                      border: selectedBlock.color === c ? '2px solid #3B82F6' : '1px solid rgba(0,0,0,0.1)'
                    }}
                  />
                ))}
              </Box>
            </Box>

            <FormControl size="small" fullWidth>
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
          </>
        )}

        {/* Atributos de Separador */}
        {selectedBlock.type === 'separator' && (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {PREDEFINED_COLORS.map(c => (
              <Box
                key={c}
                onClick={() => updateSelectedBlock({ color: c })}
                sx={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  bgcolor: c,
                  cursor: 'pointer',
                  border: selectedBlock.color === c ? '2px solid #FFF' : '1px solid rgba(0,0,0,0.1)'
                }}
              />
            ))}
          </Box>
        )}

        {/* Atributos de Espaciador */}
        {selectedBlock.type === 'espaciador' && (
          <TextField
            label="Alto (height)"
            size="small"
            fullWidth
            value={selectedBlock.height || ''}
            placeholder="Ej: 12px, 20px"
            onChange={(e) => updateSelectedBlock({ height: e.target.value })}
            slotProps={{ input: { sx: { fontSize: '12.5px' } } }}
          />
        )}

        <Button
          size="small"
          variant="outlined"
          color="error"
          onClick={() => handleDeleteBlock(selectedBlock.id)}
          startIcon={<DeleteIcon />}
          sx={{ mt: 1, fontSize: '11px', textTransform: 'none' }}
        >
          Eliminar Bloque
        </Button>
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

        // Si el usuario selecciona el editor HTML avanzado, renderizar el SignatureHTMLEditor
        if (editorMode === 'html') {
          return (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Selector de Modo del Editor de Firmas */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'action.hover', p: 1.2, borderRadius: '8px', border: '1px solid divider', mb: 1, flexWrap: 'wrap', gap: 1.5 }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '13px' }}>
                    Modo de Edición de Firmas
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Alterna entre el creador visual estándar y el importador/editor de firmas HTML profesional.
                  </Typography>
                </Box>

                <Tabs
                  value={editorMode}
                  onChange={(_, val) => setEditorMode(val)}
                  sx={{
                    minHeight: '28px',
                    '& .MuiTabs-indicator': { bgcolor: '#3B82F6' }
                  }}
                >
                  <Tab value="visual" label="Constructor Visual Pixel" sx={{ fontSize: '10.5px', minHeight: '28px', py: 0.5, textTransform: 'none', fontWeight: 'bold' }} />
                  <Tab value="html" label="Editor de Firma HTML (Avanzado)" sx={{ fontSize: '10.5px', minHeight: '28px', py: 0.5, textTransform: 'none', fontWeight: 'bold' }} />
                </Tabs>
              </Box>

              <SignatureHTMLEditor
                onSaveToFirebase={async (html, structureJSON) => {
                  if (!user) return;
                  try {
                    await setDoc(doc(db, 'settings', user.uid), {
                      userId: user.uid,
                      signature: html,
                      signatureStructure: structureJSON,
                      updatedAt: serverTimestamp()
                    });
                  } catch (err) {
                    console.error("Error al guardar desde el Editor HTML:", err);
                  }
                }}
                initialStructureJSON={(() => {
                  try {
                    return JSON.stringify(rows);
                  } catch (e) {
                    return undefined;
                  }
                })()}
                saving={savingSig}
              />
            </Box>
          );
        }

        // Constructor Visual Estándar por defecto
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Selector de Modo del Editor de Firmas en el Constructor Visual */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'action.hover', p: 1.2, borderRadius: '8px', border: '1px solid divider', mb: 1, flexWrap: 'wrap', gap: 1.5 }}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '13px' }}>
                  Modo de Edición de Firmas
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Alterna entre el creador visual estándar y el importador/editor de firmas HTML profesional.
                </Typography>
              </Box>

              <Tabs
                value={editorMode}
                onChange={(_, val) => setEditorMode(val)}
                sx={{
                  minHeight: '28px',
                  '& .MuiTabs-indicator': { bgcolor: '#3B82F6' }
                }}
              >
                <Tab value="visual" label="Constructor Visual Pixel" sx={{ fontSize: '10.5px', minHeight: '28px', py: 0.5, textTransform: 'none', fontWeight: 'bold' }} />
                <Tab value="html" label="Editor de Firma HTML (Avanzado)" sx={{ fontSize: '10.5px', minHeight: '28px', py: 0.5, textTransform: 'none', fontWeight: 'bold' }} />
              </Tabs>
            </Box>

            {/* Header del Editor de Firma */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: '14.5px', color: 'text.primary' }}>
                  Firma HTML Profesional
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Arrastra, edita y organiza bloques. El sistema generará tablas inline 100% compatibles.
                </Typography>
              </Box>

              {/* Botones de acción del lienzo */}
              <Box sx={{ display: 'flex', gap: 1.0, flexWrap: 'wrap' }}>
                <Button size="small" variant="outlined" startIcon={<CopyIcon />} onClick={handleCopyHTML} sx={{ fontSize: '11px', textTransform: 'none', height: '30px' }}>
                  Copiar HTML
                </Button>
                <Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={handleDownloadHTML} sx={{ fontSize: '11px', textTransform: 'none', height: '30px' }}>
                  Descargar HTML
                </Button>
                <Button size="small" variant="contained" startIcon={<SaveIcon />} onClick={handleSaveSignature} disabled={savingSig} sx={{ fontSize: '11px', textTransform: 'none', height: '30px', background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)' }}>
                  {savingSig ? 'Guardando...' : 'Guardar Firma'}
                </Button>
              </Box>
            </Box>

            <Divider />

            {/* Estructura dividida en 3 paneles */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '180px 1fr 200px' }, gap: 2 }}>

              {/* PANEL IZQUIERDO: Biblioteca de Elementos */}
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: '8px', border: '1px solid divider', bgcolor: 'background.paper', height: 'fit-content' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, fontSize: '12px', color: 'text.primary' }}>
                  Biblioteca
                </Typography>
                <Divider sx={{ mb: 1 }} />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5, fontSize: '10px' }}>
                  Inserta elementos en tus columnas haciendo clic en ellos:
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {[
                    { label: 'Nombre', type: 'name' },
                    { label: 'Cargo', type: 'cargo' },
                    { label: 'Texto libre', type: 'text' },
                    { label: 'Enlace web', type: 'link' },
                    { label: 'GIF Logo', type: 'gif' },
                    { label: 'Código QR', type: 'qr' },
                    { label: 'Botón', type: 'button' },
                    { label: 'Separador', type: 'separator' },
                    { label: 'Espaciador', type: 'espaciador' },
                    { label: 'Banner (Futuro)', type: 'text', disabled: true },
                    { label: 'Iconos (Futuro)', type: 'text', disabled: true }
                  ].map((el) => (
                    <Button
                      key={el.label}
                      disabled={el.disabled}
                      onClick={() => {
                        // Insertar en la primera columna de la primera fila si no hay ninguna columna seleccionada
                        if (rows.length > 0 && rows[0].columns.length > 0) {
                          handleAddBlockToColumn(rows[0].columns[0].id, el.type as any);
                        } else {
                          alert('Por favor, agrega una fila al lienzo primero.');
                        }
                      }}
                      sx={{
                        justifyContent: 'flex-start',
                        py: 0.5,
                        px: 1.0,
                        fontSize: '11px',
                        textTransform: 'none',
                        border: '1px solid divider',
                        borderRadius: '4px',
                        bgcolor: 'action.hover',
                        '&:hover': { bgcolor: 'action.selected' }
                      }}
                    >
                      + {el.label}
                    </Button>
                  ))}
                </Box>
              </Paper>

              {/* PANEL CENTRAL: Lienzo interactivo y previsualización */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

                {/* Pestañas de previsualización */}
                <Box sx={{ borderBottom: '1px solid divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Tabs value={previewTab} onChange={(_, v) => setPreviewTab(v)} sx={{ minHeight: '32px' }}>
                    <Tab label="Escritorio" sx={{ fontSize: '11px', minHeight: '32px', textTransform: 'none' }} />
                    <Tab label="Móvil" sx={{ fontSize: '11px', minHeight: '32px', textTransform: 'none' }} />
                    <Tab label="Outlook" sx={{ fontSize: '11px', minHeight: '32px', textTransform: 'none' }} />
                  </Tabs>

                  {/* Botón de Enviar Correo de Prueba (inactivo/preparado) */}
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<EmailIcon />}
                    disabled
                    sx={{ fontSize: '10.5px', textTransform: 'none', height: '26px' }}
                  >
                    Enviar prueba
                  </Button>
                </Box>

                {/* Lienzo de Firma */}
                <Paper variant="outlined" sx={{ p: 2, borderRadius: '8px', border: '1px dashed #3B82F6', bgcolor: 'action.hover', position: 'relative' }}>

                  {/* Filas */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {rows.length === 0 ? (
                      <Box sx={{ py: 4, textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary">
                          El lienzo está vacío. Agrega una fila abajo para comenzar a diseñar.
                        </Typography>
                      </Box>
                    ) : (
                      rows.map((row) => (
                        <Box
                          key={row.id}
                          onClick={() => setSelectedRowId(row.id)}
                          sx={{
                            border: `1.5px solid ${selectedRowId === row.id ? '#3B82F6' : 'divider'}`,
                            borderRadius: '6px',
                            p: 1.0,
                            position: 'relative',
                            bgcolor: 'background.paper',
                            '&:hover .row-controls': { opacity: 1 }
                          }}
                        >
                          {/* Controles de Fila */}
                          <Box
                            className="row-controls"
                            sx={{
                              position: 'absolute',
                              right: 6,
                              top: -12,
                              display: 'flex',
                              gap: 0.2,
                              opacity: 0,
                              transition: 'opacity 120ms',
                              bgcolor: 'background.paper',
                              border: '1px solid divider',
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
                              <IconButton size="small" onClick={() => handleDuplicateRow(row.id)} sx={{ p: 0.2 }}><AddIcon sx={{ fontSize: '14px' }} /></IconButton>
                            </Tooltip>
                            <Tooltip title="Eliminar fila">
                              <IconButton size="small" color="error" onClick={() => handleDeleteRow(row.id)} sx={{ p: 0.2 }}><DeleteIcon sx={{ fontSize: '14px' }} /></IconButton>
                            </Tooltip>
                          </Box>

                          {/* Columnas */}
                          <Box sx={{ display: 'flex', gap: 1.5, width: '100%' }}>
                            {row.columns.map((col) => (
                              <Box
                                key={col.id}
                                sx={{
                                  width: `${col.widthPercent}%`,
                                  border: '1px dashed divider',
                                  borderRadius: '4px',
                                  p: 1,
                                  minHeight: '60px',
                                  position: 'relative',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 0.8
                                }}
                              >
                                {/* Bloques */}
                                {col.blocks.map((block) => {
                                  const isSelected = selectedBlockId === block.id;
                                  return (
                                    <Box
                                      key={block.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedBlockId(block.id);
                                      }}
                                      sx={{
                                        border: `1px solid ${isSelected ? '#3B82F6' : 'transparent'}`,
                                        borderRadius: '4px',
                                        p: '4px 6px',
                                        position: 'relative',
                                        bgcolor: isSelected ? 'action.selected' : 'transparent',
                                        cursor: 'pointer',
                                        '&:hover .block-controls': { opacity: 1 }
                                      }}
                                    >
                                      {/* Controles del Bloque */}
                                      <Box
                                        className="block-controls"
                                        sx={{
                                          position: 'absolute',
                                          right: 2,
                                          top: -8,
                                          display: 'flex',
                                          gap: 0.2,
                                          opacity: 0,
                                          transition: 'opacity 120ms',
                                          bgcolor: 'background.paper',
                                          border: '1px solid divider',
                                          borderRadius: '3px',
                                          px: 0.3,
                                          zIndex: 10
                                        }}
                                      >
                                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDuplicateBlock(block.id); }} sx={{ p: 0.1 }}><CopyIcon sx={{ fontSize: '11px' }} /></IconButton>
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
                                        <Typography variant="body2" sx={{ fontFamily: block.fontFamily || 'Inter', fontSize: block.fontSize || '12px', color: block.color || '#3B82F6', textAlign: block.align || 'left', textDecoration: 'underline' }}>
                                          {block.content}
                                        </Typography>
                                      )}
                                      {block.type === 'button' && (
                                        <Box sx={{ textAlign: block.align || 'left' }}>
                                          <Button size="small" sx={{ bgcolor: block.buttonColor || '#3B82F6', color: '#FFF', fontSize: '11px', textTransform: 'none', py: 0.3, px: 1.2, borderRadius: block.borderRadius || '4px' }}>
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
                                        <Box sx={{ border: '1.5px dashed #3B82F6', borderRadius: '4px', p: 1, textAlign: 'center', bgcolor: 'rgba(59,130,246,0.05)' }}>
                                          <Typography variant="caption" sx={{ color: '#3B82F6', fontWeight: 'bold', fontSize: '10.5px' }}>
                                            {block.content}
                                          </Typography>
                                        </Box>
                                      )}
                                      {block.type === 'qr' && (
                                        <Box sx={{ border: '1.5px dashed #10B981', borderRadius: '4px', p: 1, textAlign: 'center', bgcolor: 'rgba(16,185,129,0.05)' }}>
                                          <Typography variant="caption" sx={{ color: '#10B981', fontWeight: 'bold', fontSize: '10.5px' }}>
                                            {block.content}
                                          </Typography>
                                        </Box>
                                      )}
                                    </Box>
                                  );
                                })}

                                {/* Botón rápido para agregar bloque a esta columna */}
                                <Button
                                  size="small"
                                  onClick={() => handleAddBlockToColumn(col.id, 'text')}
                                  sx={{ mt: 'auto', alignSelf: 'center', fontSize: '10px', p: '2px 6px', textTransform: 'none', border: '1px dashed divider' }}
                                >
                                  + Añadir
                                </Button>
                              </Box>
                            ))}
                          </Box>
                        </Box>
                      ))
                    )}
                  </Box>
                </Paper>

                {/* Controles para agregar filas al final */}
                <Box sx={{ display: 'flex', gap: 1.0, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <Button size="small" variant="outlined" onClick={() => handleAddRow(1)} sx={{ fontSize: '11px', textTransform: 'none' }}>
                    + Fila (1 Columna)
                  </Button>
                  <Button size="small" variant="outlined" onClick={() => handleAddRow(2)} sx={{ fontSize: '11px', textTransform: 'none' }}>
                    + Fila (2 Columnas)
                  </Button>
                  <Button size="small" variant="outlined" onClick={() => handleAddRow(3)} sx={{ fontSize: '11px', textTransform: 'none' }}>
                    + Fila (3 Columnas)
                  </Button>
                  <Button size="small" variant="outlined" onClick={() => handleAddRow(4)} sx={{ fontSize: '11px', textTransform: 'none' }}>
                    + Fila (4 Columnas)
                  </Button>
                </Box>
              </Box>

              {/* PANEL DERECHO: Editor de Propiedades del elemento activo */}
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: '8px', border: '1px solid divider', bgcolor: 'background.paper' }}>
                {renderPropertiesPanel()}
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
