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
  Slider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormGroup,
  FormControlLabel,
  Switch,
  Chip
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
  CheckCircle as ActiveIcon,
  Visibility as PreviewIcon,
  ControlPointDuplicate as DuplicateIcon,
  BorderColor as EditIcon,
  Publish as ExportIcon,
  Smartphone as PhoneIcon,
  DesktopMac as DesktopIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useEmails } from '../contexts/EmailContext';
import type { Signature } from '../contexts/SignatureContext';
import { useSignatures } from '../contexts/SignatureContext';
import { useToast } from '../contexts/ToastContext';
import { usePwaUpdate } from '../contexts/PwaUpdateContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useCustomTheme } from '../contexts/ThemeContext';
import { SignatureHTMLEditor } from '../components/signature/SignatureHTMLEditor';
import { applyScaleToHTML } from '../utils/signatureScaler';
import { isRunningAsPWA } from '../utils/pwaHelper';

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
  widthPercent: number;
  blocks: Block[];
}

interface Row {
  id: string;
  columns: Column[];
}

export const PHONE_ICON_URL = 'https://firebasestorage.googleapis.com/v0/b/pixel-mail-a78f6.firebasestorage.app/o/public%2Fsignatures%2Fresources%2Fphone.png?alt=media';
export const EMAIL_ICON_URL = 'https://firebasestorage.googleapis.com/v0/b/pixel-mail-a78f6.firebasestorage.app/o/public%2Fsignatures%2Fresources%2Femail.png?alt=media';
export const WEB_ICON_URL = 'https://firebasestorage.googleapis.com/v0/b/pixel-mail-a78f6.firebasestorage.app/o/public%2Fsignatures%2Fresources%2Fweb.png?alt=media';
export const WHATSAPP_ICON_URL = 'https://firebasestorage.googleapis.com/v0/b/pixel-mail-a78f6.firebasestorage.app/o/public%2Fsignatures%2Fresources%2Fwhatsapp.png?alt=media';
export const CALENDAR_ICON_URL = 'https://firebasestorage.googleapis.com/v0/b/pixel-mail-a78f6.firebasestorage.app/o/public%2Fsignatures%2Fresources%2Fcalendar.png?alt=media';

// Compilador de Estructura de Firma JSON a Tabla HTML inline (Optimizado para evitar deformaciones en Gmail/Outlook)
export const generateHTMLFromStructure = (rows: Row[]): string => {
  let html = `<table cellpadding="0" cellspacing="0" border="0" width="560" style="width: 560px; max-width: 560px; table-layout: fixed; font-family: Arial, Helvetica, sans-serif; border-collapse: collapse;">`;

  (rows ?? []).forEach((row) => {
    if (!row) return;
    html += `<tr><td style="padding: 0;"><table cellpadding="0" cellspacing="0" border="0" width="560" style="width: 560px; max-width: 560px; table-layout: fixed; border-collapse: collapse;"><tr>`;

    (row.columns ?? []).forEach((col) => {
      if (!col) return;
      // logo: 135 px, info: 255 px, qr: 140 px, separaciones: 30 px
      let colWidthPx = 255;
      if (col.widthPercent === 24) colWidthPx = 135;
      else if (col.widthPercent === 30) colWidthPx = 140;
      else if (col.widthPercent === 46) colWidthPx = 255;
      else {
        colWidthPx = Math.round(560 * ((col.widthPercent || 100) / 100));
      }

      html += `<td valign="top" width="${colWidthPx}" style="width: ${colWidthPx}px; max-width: ${colWidthPx}px; padding: 6px; box-sizing: border-box; table-layout: fixed; vertical-align: top; word-break: normal; overflow-wrap: normal; hyphens: none;">`;

      (col.blocks ?? []).forEach((block) => {
        if (!block) return;
        const alignStyle = block.align ? `text-align: ${block.align};` : '';
        const paddingStyle = block.padding ? `padding: ${block.padding};` : 'padding: 2px 0;';
        const marginStyle = block.margin ? `margin: ${block.margin};` : '';

        html += `<div style="${alignStyle} ${paddingStyle} ${marginStyle}">`;

        let cleanContent = (block.content || '').replace(/[📱☎✉🌐🛡🛡◎●◉▣]/g, '').trim();

        switch (block.type) {
          case 'name':
            html += `<div style="font-family: Arial, Helvetica, sans-serif; font-size: 16px; font-weight: 700; color: #1E293B; word-break: normal; overflow-wrap: normal; hyphens: none; white-space: normal; line-height: 1.2;">${cleanContent}</div>`;
            break;
          case 'cargo':
            html += `<div style="font-family: Arial, Helvetica, sans-serif; font-size: 12px; font-weight: 500; color: #64748B; word-break: normal; overflow-wrap: normal; hyphens: none; white-space: normal; line-height: 1.2;">${cleanContent}</div>`;
            break;
          case 'text':
            html += `<div style="font-family: Arial, Helvetica, sans-serif; font-size: 11px; font-weight: 400; color: #475569; word-break: normal; overflow-wrap: normal; hyphens: none; white-space: normal; line-height: 1.2;">${cleanContent}</div>`;
            break;
          case 'link': {
            let iconTag = '';
            if (block.id === 'b-tel') {
              iconTag = `<img src="${PHONE_ICON_URL}" width="14" height="14" style="vertical-align: middle; margin-right: 6px; width: 14px; height: 14px; display: inline-block;" valign="middle">`;
            } else if (block.id === 'b-email') {
              iconTag = `<img src="${EMAIL_ICON_URL}" width="14" height="14" style="vertical-align: middle; margin-right: 6px; width: 14px; height: 14px; display: inline-block;" valign="middle">`;
            } else if (block.id === 'b-web') {
              iconTag = `<img src="${WEB_ICON_URL}" width="14" height="14" style="vertical-align: middle; margin-right: 6px; width: 14px; height: 14px; display: inline-block;" valign="middle">`;
            } else if (block.id === 'b-link-wa') {
              iconTag = `<img src="${WHATSAPP_ICON_URL}" width="14" height="14" style="vertical-align: middle; margin-right: 6px; width: 14px; height: 14px; display: inline-block;" valign="middle">`;
            } else if (block.id === 'b-link-meet') {
              iconTag = `<img src="${CALENDAR_ICON_URL}" width="14" height="14" style="vertical-align: middle; margin-right: 6px; width: 14px; height: 14px; display: inline-block;" valign="middle">`;
            }
            html += `<a href="${block.href || '#'}" style="font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: ${block.color || '#3B82F6'}; text-decoration: none; font-weight: 500; display: inline-block; vertical-align: middle; line-height: 14px;">${iconTag}${cleanContent}</a>`;
            break;
          }
          case 'button':
            html += `<a href="${block.href || '#'}" style="display: inline-block; background-color: ${block.buttonColor || '#3B82F6'}; color: #FFFFFF; font-family: Arial, Helvetica, sans-serif; font-size: 11px; font-weight: 600; text-decoration: none; padding: 4px 8px; border-radius: 4px; text-align: center;">${cleanContent}</a>`;
            break;
          case 'separator':
            html += `<div style="border-top: 1px solid ${block.color || '#CBD5E1'}; height: 1px; width: 100%;"></div>`;
            break;
          case 'espaciador':
            html += `<div style="height: ${block.height || '6px'};"></div>`;
            break;
          case 'gif':
            html += `<div style="border: 1px dashed #3B82F6; padding: 6px; text-align: center; border-radius: 4px; font-size: 10px; color: #3B82F6; font-weight: bold; background-color: rgba(59,130,246,0.02);">${cleanContent}</div>`;
            break;
          case 'qr':
            html += `<div style="border: 1px dashed #10B981; padding: 6px; text-align: center; border-radius: 4px; font-size: 10px; color: #10B981; font-weight: bold; background-color: rgba(16,185,129,0.02);">${cleanContent}</div>`;
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

const getDavidSignatureTemplate = (): Row[] => [
  {
    id: 'row-1',
    columns: [
      {
        id: 'col-1-1',
        widthPercent: 24, // logo: 135 px / 560 px
        blocks: [
          { id: 'b-gif-1', type: 'gif', content: 'Aquí irá el logo Pixel' }
        ]
      },
      {
        id: 'col-1-2',
        widthPercent: 46, // info: 255 px / 560 px
        blocks: [
          { id: 'b-name', type: 'name', content: 'David Lachira S.', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '16px', fontWeight: '700', color: '#1E293B' },
          { id: 'b-cargo', type: 'cargo', content: 'Asesor de Negocios', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '12px', fontWeight: '500', color: '#64748B' },
          { id: 'b-space-1', type: 'espaciador', content: '', height: '6px' },
          { id: 'b-tel', type: 'link', content: '+51 930 653 718', href: 'tel:+51930653718', color: '#3B82F6' },
          { id: 'b-space-tel', type: 'espaciador', content: '', height: '4px' },
          { id: 'b-email', type: 'link', content: 'david.lachira@pixel.com.pe', href: 'mailto:david.lachira@pixel.com.pe', color: '#3B82F6' },
          { id: 'b-space-email', type: 'espaciador', content: '', height: '4px' },
          { id: 'b-web', type: 'link', content: 'pixel.com.pe', href: 'https://pixel.com.pe', color: '#3B82F6' },
          { id: 'b-space-links', type: 'espaciador', content: '', height: '8px' },
          { id: 'b-link-wa', type: 'link', content: 'WhatsApp', href: 'https://wa.me/51930653718', color: '#10B981' },
          { id: 'b-space-wa', type: 'espaciador', content: '', height: '4px' },
          { id: 'b-link-meet', type: 'link', content: 'Agendar reunión', href: '#', color: '#3B82F6' }
        ]
      },
      {
        id: 'col-1-3',
        widthPercent: 30, // QR: 140 px / 560 px (paddings y separaciones = 560 px total)
        blocks: [
          { id: 'b-qr', type: 'qr', content: 'Aquí irá el QR' },
          { id: 'b-text-qr', type: 'text', content: 'Escríbeme por WhatsApp', align: 'center', color: '#64748B', fontSize: '11px' }
        ]
      }
    ]
  }
];

const Configuracion = () => {
  const { user } = useAuth();
  const { folders, addFolder, deleteFolder, rules, addRule, deleteRule, emailsPerPage, setEmailsPerPage } = useEmails();
  const { showToast } = useToast();
  const { setSafetyState } = usePwaUpdate();
  const { mode } = useCustomTheme();

  // Destructurar el proveedor de notificaciones push
  const {
    token,
    permission,
    isCompatible,
    preferences: notifPreferences,
    requestPermission,
    disableNotifications,
    sendTestNotification,
    updatePreferences: notifUpdatePreferences
  } = useNotifications();

  // Custom context de firmas
  const {
    signatures,
    activeSignatureId,
    activeSignature,
    editingSignatureId,
    setEditingSignatureId,
    preferences,
    loading: sigsLoading,
    saveSignature,
    activateSignature,
    duplicateSignature,
    renameSignature,
    deleteSignature,
    updatePreferences
  } = useSignatures();

  // Navigation sidebar interna
  const [activeSection, setActiveSection] = useState<'general' | 'cuenta' | 'firma' | 'firmas' | 'reglas' | 'carpetas' | 'apariencia' | 'notificaciones' | 'seguridad' | 'acerca'>('firma');

  // Sincronizar el estado de edición de firmas con el contexto de PWA Update
  useEffect(() => {
    const isEditing = activeSection === 'firma' || activeSection === 'firmas';
    setSafetyState({ isSignatureEditing: isEditing });
    return () => {
      setSafetyState({ isSignatureEditing: false, hasUnsavedChanges: false });
    };
  }, [activeSection]);

  // Firma visual / builder state
  const [rows, setRows] = useState<Row[]>([]);
  const [savingSig, setSavingSig] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Propiedades del bloque seleccionado
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  // Pestañas de Vista Previa
  const [previewTab, setPreviewTab] = useState(0);

  // Selector del modo del Editor de Firmas (visual vs avanzado/importador)
  const [editorMode, setEditorMode] = useState<'visual' | 'html'>('visual');

  // Escala seleccionada para la firma actual
  const [sigScale, setSigScale] = useState<number>(0.8);

  // Modales y Dialogs para administración
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newSigName, setNewSigName] = useState('');
  const [newSigType, setNewSigType] = useState<'visual' | 'html'>('visual');

  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameTargetId, setRenameTargetId] = useState('');
  const [renameValue, setRenameValue] = useState('');

  const [activeConfirmOpen, setActiveConfirmOpen] = useState(false);
  const [pendingActiveId, setPendingActiveId] = useState<string | null>(null);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState('');

  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewTargetSig, setPreviewTargetSig] = useState<Signature | null>(null);

  // Encontrar la firma en edición
  const editingSignature = useMemo(() => {
    return signatures.find(s => s.id === editingSignatureId) || null;
  }, [signatures, editingSignatureId]);

  // Cargar firma en el constructor cuando cambie la firma seleccionada
  useEffect(() => {
    if (!editingSignature) return;
    setEditorMode(editingSignature.type);
    setSigScale(editingSignature.scale || 0.8);

    if (editingSignature.type === 'visual') {
      try {
        if (editingSignature.originalHtml) {
          setRows(JSON.parse(editingSignature.originalHtml));
        } else {
          // Si está vacío, cargar plantilla por defecto
          if (user?.email && user.email.toLowerCase().includes('david.lachira')) {
            setRows(getDavidSignatureTemplate());
          } else {
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
      } catch (e) {
        console.error("Error al cargar la estructura visual:", e);
        setRows([]);
      }
    }
  }, [editingSignatureId, editingSignature?.originalHtml]);

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

  // Guardar firma en el nuevo sistema
  const handleSaveSignature = async () => {
    if (!user || !editingSignatureId || !editingSignature) return;
    setSavingSig(true);

    const finalHTML = generateHTMLFromStructure(rows);
    const finalStructureJSON = JSON.stringify(rows);

    try {
      await saveSignature(
        editingSignature.name,
        'visual',
        finalHTML,
        finalStructureJSON,
        sigScale,
        editingSignatureId
      );

      const isActive = activeSignatureId === editingSignatureId;
      showToast({
        message: 'Firma guardada correctamente',
        subtitle: `“${editingSignature.name}” ya está disponible para utilizarse.${isActive ? ' Esta es tu firma activa.' : ''}`,
        severity: 'success',
        duration: 4000
      });
    } catch (error: any) {
      console.error("Error al guardar la firma:", error);
      showToast({
        message: 'No se pudo guardar la firma',
        subtitle: error.message === 'DUPLICATE_NAME' ? 'Ya existe una firma con este nombre.' : error.message,
        severity: 'error'
      });
    } finally {
      setSavingSig(false);
    }
  };

  // Acciones Rápidas del Selector de Firma en el Editor
  const handleFastAction = async (action: string) => {
    console.log("SIGNATURE CREATE CLICK", { action });
    try {
      if (action === 'new') {
        setNewSigName('Mi Firma Profesional');
        setNewSigType('visual');
        setCreateDialogOpen(true);
        return;
      }

      // Otras acciones requieren que exista editingSignature
      if (!editingSignature) {
        console.warn("No hay firma seleccionada para la acción:", action);
        return;
      }

      if (action === 'active') {
        await activateSignature(editingSignatureId || null);
        showToast({
          message: 'Firma activa actualizada',
          subtitle: `“${editingSignature.name}” ahora es tu firma activa.`,
          severity: 'success'
        });
      } else if (action === 'duplicate') {
        await duplicateSignature(editingSignatureId || '');
        showToast({
          message: 'Firma duplicada correctamente',
          subtitle: `Copia de “${editingSignature.name}” disponible.`,
          severity: 'success'
        });
      } else if (action === 'rename') {
        setRenameTargetId(editingSignatureId || '');
        setRenameValue(editingSignature.name);
        setRenameDialogOpen(true);
      }
    } catch (err: any) {
      showToast({
        message: 'Error en acción rápida',
        subtitle: err.message,
        severity: 'error'
      });
    }
  };

  // Diálogo para crear firma
  const handleCreateSignatureSubmit = async () => {
    if (!newSigName.trim()) {
      showToast({ message: 'El nombre es obligatorio.', severity: 'error' });
      return;
    }

    console.log("SIGNATURE CREATE START", { name: newSigName, type: newSigType });
    setIsCreating(true);

    try {
      const defaultHtml = `<table cellpadding="0" cellspacing="0" border="0" style="font-family: 'Inter', sans-serif;"><tr><td><strong>Nueva Firma</strong></td></tr></table>`;
      const defaultStructure = JSON.stringify([
        {
          id: 'row-' + Date.now(),
          columns: [
            {
              id: 'col-' + Date.now(),
              widthPercent: 100,
              blocks: [{ id: 'b-' + Date.now(), type: 'name', content: 'Tu Nombre' }]
            }
          ]
        }
      ]);

      const newId = await saveSignature(
        newSigName,
        newSigType,
        defaultHtml,
        newSigType === 'visual' ? defaultStructure : defaultHtml,
        0.8
      );

      console.log("SIGNATURE CREATE SUCCESS", { newId });
      setEditingSignatureId(newId);
      setCreateDialogOpen(false);
      showToast({
        message: 'Firma creada correctamente',
        subtitle: `“${newSigName}” ya está lista para editar.`,
        severity: 'success'
      });
    } catch (err: any) {
      console.error("SIGNATURE CREATE ERROR", err);
      showToast({
        message: 'No se pudo crear la firma',
        subtitle: err.message === 'DUPLICATE_NAME' ? 'Ya existe una firma con este nombre.' : err.message,
        severity: 'error'
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Diálogo para renombrar firma
  const handleRenameSubmit = async () => {
    if (!renameValue.trim()) return;
    try {
      await renameSignature(renameTargetId, renameValue);
      setRenameDialogOpen(false);
      showToast({
        message: 'Firma renombrada con éxito',
        subtitle: `Nombre cambiado a “${renameValue}”.`,
        severity: 'success'
      });
    } catch (err: any) {
      showToast({
        message: 'Error al renombrar',
        subtitle: err.message === 'DUPLICATE_NAME' ? 'Ya existe una firma con este nombre.' : err.message,
        severity: 'error'
      });
    }
  };

  // Confirmar cambio de firma vigente
  const handleActiveChangeConfirm = async () => {
    if (!pendingActiveId) return;
    try {
      const target = signatures.find(s => s.id === pendingActiveId);
      await activateSignature(pendingActiveId);
      setActiveConfirmOpen(false);
      setPendingActiveId(null);
      showToast({
        message: 'Firma activa actualizada',
        subtitle: target ? `“${target.name}” ya está configurada como activa.` : 'Configuración persistida correctamente.',
        severity: 'success'
      });
    } catch (err: any) {
      showToast({
        message: 'No se pudo actualizar la firma activa',
        subtitle: err.message,
        severity: 'error'
      });
    }
  };

  // Confirmar eliminación de firma
  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    try {
      const target = signatures.find(s => s.id === deleteTargetId);

      await deleteSignature(deleteTargetId);
      setDeleteConfirmOpen(false);
      setDeleteTargetId('');

      showToast({
        message: 'Firma eliminada correctamente',
        subtitle: target ? `“${target.name}” ha sido eliminada.` : '',
        severity: 'success'
      });
    } catch (err: any) {
      showToast({
        message: 'Error al eliminar',
        subtitle: err.message,
        severity: 'error'
      });
    }
  };

  // Duplicar desde la administración
  const handleAdminDuplicate = async (id: string, name: string) => {
    try {
      await duplicateSignature(id);
      showToast({
        message: 'Firma duplicada correctamente',
        subtitle: `Se creó una copia de “${name}” con éxito.`,
        severity: 'success'
      });
    } catch (err: any) {
      showToast({ message: 'Error al duplicar', subtitle: err.message, severity: 'error' });
    }
  };

  // Exportar HTML de firma desde administración
  const handleAdminExportHTML = (sig: Signature) => {
    const scaledHtml = applyScaleToHTML(sig.html, sig.scale || 0.8);
    navigator.clipboard.writeText(scaledHtml);
    showToast({
      message: 'Firma copiada al portapapeles',
      subtitle: `HTML de “${sig.name}” listo para pegar.`,
      severity: 'success'
    });
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

  const handleCopyHTML = () => {
    const html = generateHTMLFromStructure(rows);
    const scaled = applyScaleToHTML(html, sigScale);
    navigator.clipboard.writeText(scaled);
    showToast({
      message: 'HTML copiado al portapapeles',
      subtitle: 'La firma escalada está lista para usarse.',
      severity: 'success'
    });
  };

  const handleDownloadHTML = () => {
    const html = generateHTMLFromStructure(rows);
    const scaled = applyScaleToHTML(html, sigScale);
    const element = document.createElement("a");
    const file = new Blob([scaled], { type: 'text/html' });
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

  // Sincronizar cambios sin guardar en los inputs de formularios
  useEffect(() => {
    const hasUnsavedInputs = Boolean(newFolderName.trim() || conditionValue.trim());
    setSafetyState({ hasUnsavedChanges: hasUnsavedInputs });
  }, [newFolderName, conditionValue]);
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
        if (sigsLoading) {
          return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={30} />
            </Box>
          );
        }

        if (!editingSignature) {
          return (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                No tienes ninguna firma seleccionada para editar.
              </Typography>
              <Button
                type="button"
                variant="contained"
                onClick={() => handleFastAction('new')}
                sx={{ mt: 2, textTransform: 'none' }}
                disabled={isCreating}
                startIcon={isCreating ? <CircularProgress size={14} color="inherit" /> : <AddIcon />}
              >
                {isCreating ? 'Creando firma...' : 'Crear firma'}
              </Button>
            </Box>
          );
        }

        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

            {/* SELECTOR RÁPIDO EN EL EDITOR */}
            <Box sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              bgcolor: 'action.hover',
              p: 1.5,
              borderRadius: '12px',
              border: '1px solid',
              borderColor: 'divider',
              flexWrap: 'wrap',
              gap: 2
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '13px' }}>
                  Firma actual:
                </Typography>
                <Select
                  value={editingSignatureId || ''}
                  onChange={(e) => setEditingSignatureId(e.target.value)}
                  size="small"
                  sx={{ minWidth: 200, height: 32, fontSize: '12.5px' }}
                >
                  {signatures.map(s => (
                    <MenuItem key={s.id} value={s.id} sx={{ fontSize: '12.5px' }}>
                      {s.name} {s.id === activeSignatureId ? '(Activa)' : ''}
                    </MenuItem>
                  ))}
                </Select>
              </Box>

              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                <Tooltip title="Establecer como activa">
                  <span>
                    <IconButton
                      size="small"
                      color={editingSignatureId === activeSignatureId ? "success" : "default"}
                      onClick={() => handleFastAction('active')}
                      disabled={editingSignatureId === activeSignatureId}
                    >
                      <ActiveIcon sx={{ fontSize: '18px' }} />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Crear nueva firma">
                  <IconButton size="small" onClick={() => handleFastAction('new')}>
                    <AddIcon sx={{ fontSize: '18px' }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Duplicar firma actual">
                  <IconButton size="small" onClick={() => handleFastAction('duplicate')}>
                    <DuplicateIcon sx={{ fontSize: '18px' }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Renombrar firma actual">
                  <IconButton size="small" onClick={() => handleFastAction('rename')}>
                    <EditIcon sx={{ fontSize: '18px' }} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            {/* Selector de Modo del Editor de Firmas */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'action.hover', p: 1.2, borderRadius: '8px', border: '1px solid divider', flexWrap: 'wrap', gap: 1.5 }}>
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
                onChange={(_, val) => {
                  setEditorMode(val);
                }}
                sx={{
                  minHeight: '28px',
                  '& .MuiTabs-indicator': { bgcolor: '#3B82F6' }
                }}
              >
                <Tab value="visual" label="Constructor Visual Pixel" sx={{ fontSize: '10.5px', minHeight: '28px', py: 0.5, textTransform: 'none', fontWeight: 'bold' }} />
                <Tab value="html" label="Editor de Firma HTML (Avanzado)" sx={{ fontSize: '10.5px', minHeight: '28px', py: 0.5, textTransform: 'none', fontWeight: 'bold' }} />
              </Tabs>
            </Box>

            {/* TAMAÑO DE LA FIRMA EN LOS CORREOS */}
            <Box sx={{ p: 2, border: '1px solid divider', borderRadius: '8px', bgcolor: 'background.paper' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '13px', mb: 1 }}>
                Tamaño en el correo (Escala completa)
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {[0.5, 0.6, 0.7, 0.8, 0.9, 1.0].map((sc) => (
                    <Button
                      key={sc}
                      size="small"
                      variant={sigScale === sc ? "contained" : "outlined"}
                      onClick={() => setSigScale(sc)}
                      sx={{ fontSize: '11px', minWidth: '55px', height: '28px' }}
                    >
                      {Math.round(sc * 100)} %
                    </Button>
                  ))}
                </Box>
                <Divider orientation="vertical" flexItem />
                <Box sx={{ flexGrow: 1, minWidth: '150px' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                    Escala personalizada: {Math.round(sigScale * 100)} %
                  </Typography>
                  <Slider
                    value={sigScale * 100}
                    onChange={(_, val) => setSigScale((val as number) / 100)}
                    min={50}
                    max={100}
                    step={1}
                    size="small"
                  />
                </Box>
              </Box>
            </Box>

            {editorMode === 'html' ? (
              <SignatureHTMLEditor
                onSaveToFirebase={async (html, structureJSON) => {
                  setSavingSig(true);
                  try {
                    await saveSignature(
                      editingSignature.name,
                      'html',
                      html,
                      structureJSON,
                      sigScale,
                      editingSignatureId || undefined
                    );
                    showToast({
                      message: 'Firma guardada correctamente',
                      subtitle: `“${editingSignature.name}” ya está disponible para utilizarse.${activeSignatureId === editingSignatureId ? ' Esta es tu firma activa.' : ''}`,
                      severity: 'success',
                      duration: 4000
                    });
                  } catch (err: any) {
                    showToast({
                      message: 'No se pudo guardar la firma',
                      subtitle: err.message === 'DUPLICATE_NAME' ? 'Ya existe una firma con este nombre.' : err.message,
                      severity: 'error'
                    });
                  } finally {
                    setSavingSig(false);
                  }
                }}
                initialStructureJSON={editingSignature?.originalHtml || undefined}
                initialHTML={editingSignature?.html || undefined}
                saving={savingSig}
                initialName={editingSignature.name}
              />
            ) : (
              // Constructor Visual Estándar por defecto
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: '14.5px', color: 'text.primary' }}>
                      Firma HTML Profesional (Constructor Visual)
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Arrastra, edita y organiza bloques. El sistema generará tablas inline 100% compatibles.
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1.0, flexWrap: 'wrap' }}>
                    <Button size="small" variant="outlined" startIcon={<CopyIcon />} onClick={handleCopyHTML} sx={{ fontSize: '11px', textTransform: 'none', height: '30px' }}>
                      Copiar HTML
                    </Button>
                    <Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={handleDownloadHTML} sx={{ fontSize: '11px', textTransform: 'none', height: '30px' }}>
                      Descargar HTML
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={savingSig ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
                      onClick={handleSaveSignature}
                      disabled={savingSig}
                      sx={{ fontSize: '11px', textTransform: 'none', height: '30px', background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)' }}
                    >
                      {savingSig ? 'Guardando firma...' : 'Guardar Firma'}
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
                        { label: 'Espaciador', type: 'espaciador' }
                      ].map((el) => (
                        <Button
                          key={el.label}
                          onClick={() => {
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

                  {/* PANEL CENTRAL: Lienzo interactivo y previsualización de escala */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

                    <Box sx={{ borderBottom: '1px solid divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Tabs value={previewTab} onChange={(_, v) => setPreviewTab(v)} sx={{ minHeight: '32px' }}>
                        <Tab label="Lienzo de Firma" sx={{ fontSize: '11px', minHeight: '32px', textTransform: 'none' }} />
                        <Tab label="Previsualización de Escala" sx={{ fontSize: '11px', minHeight: '32px', textTransform: 'none' }} />
                      </Tabs>
                    </Box>

                    {previewTab === 0 ? (
                      <Paper variant="outlined" sx={{ p: 2, borderRadius: '8px', border: '1px dashed #3B82F6', bgcolor: 'action.hover', position: 'relative' }}>
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
                                  <IconButton size="small" onClick={() => handleMoveRow(row.id, 'up')} sx={{ p: 0.2 }}><MoveUpIcon sx={{ fontSize: '14px' }} /></IconButton>
                                  <IconButton size="small" onClick={() => handleMoveRow(row.id, 'down')} sx={{ p: 0.2 }}><MoveDownIcon sx={{ fontSize: '14px' }} /></IconButton>
                                  <IconButton size="small" onClick={() => handleDuplicateRow(row.id)} sx={{ p: 0.2 }}><AddIcon sx={{ fontSize: '14px' }} /></IconButton>
                                  <IconButton size="small" color="error" onClick={() => handleDeleteRow(row.id)} sx={{ p: 0.2 }}><DeleteIcon sx={{ fontSize: '14px' }} /></IconButton>
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

                                            {/* Elementos */}
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

                        {/* Agregar Fila */}
                        <Box sx={{ display: 'flex', gap: 1.0, flexWrap: 'wrap', justifyContent: 'center', mt: 2 }}>
                          <Button size="small" variant="outlined" onClick={() => handleAddRow(1)} sx={{ fontSize: '11px', textTransform: 'none' }}>+ Fila (1 Columna)</Button>
                          <Button size="small" variant="outlined" onClick={() => handleAddRow(2)} sx={{ fontSize: '11px', textTransform: 'none' }}>+ Fila (2 Cols)</Button>
                          <Button size="small" variant="outlined" onClick={() => handleAddRow(3)} sx={{ fontSize: '11px', textTransform: 'none' }}>+ Fila (3 Cols)</Button>
                        </Box>
                      </Paper>
                    ) : (
                      // Previsualización real escalada
                      <Paper variant="outlined" sx={{ p: 2, borderRadius: '8px', bgcolor: 'background.paper', display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                          Esta es una vista previa real escalada al <strong>{Math.round(sigScale * 100)} %</strong> manteniendo todas las proporciones sin romper compatibilidad.
                        </Typography>
                        <Box sx={{ border: '1px solid divider', p: 2, borderRadius: '6px', overflow: 'auto', bgcolor: '#FFFFFF', color: '#000000' }}>
                          <div dangerouslySetInnerHTML={{ __html: applyScaleToHTML(generateHTMLFromStructure(rows), sigScale) }} />
                        </Box>
                      </Paper>
                    )}
                  </Box>

                  {/* PANEL DERECHO: Editor de Propiedades del elemento activo */}
                  <Paper variant="outlined" sx={{ p: 1.5, borderRadius: '8px', border: '1px solid divider', bgcolor: 'background.paper', height: 'fit-content' }}>
                    {renderPropertiesPanel()}
                  </Paper>

                </Box>
              </Box>
            )}
          </Box>
        );

      case 'firmas':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

            {/* SELECTOR DESPLEGABLE SUPERIOR: FIRMA VIGENTE */}
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: '12px', border: '1px solid divider', bgcolor: 'background.paper' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'text.primary', mb: 0.5 }}>
                Firma vigente
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Esta es la firma predeterminada que se insertará al redactar un correo. Puedes cambiarla cuando desees.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <FormControl size="small" sx={{ minWidth: 250 }}>
                  <Select
                    value={activeSignatureId || 'none'}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'none') {
                        setPendingActiveId(null);
                        activateSignature(null);
                        showToast({ message: 'Firma retirada del correo', severity: 'success' });
                      } else {
                        setPendingActiveId(val);
                        setActiveConfirmOpen(true);
                      }
                    }}
                    sx={{ fontSize: '13px' }}
                  >
                    <MenuItem value="none" sx={{ fontSize: '13px' }}><em>Sin firma activa</em></MenuItem>
                    {signatures.map(s => (
                      <MenuItem key={s.id} value={s.id} sx={{ fontSize: '13px' }}>{s.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {activeSignature && (
                  <Chip
                    icon={<ActiveIcon style={{ color: '#10B981' }} />}
                    label="Firma activa actual"
                    variant="outlined"
                    color="success"
                    sx={{ height: 32, fontSize: '12px', fontWeight: 'bold' }}
                  />
                )}
              </Box>
            </Paper>

            {/* PREFERENCIAS DE FIRMA */}
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: '12px', border: '1px solid divider', bgcolor: 'background.paper' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1.5 }}>
                Preferencias de Inserción
              </Typography>
              <FormGroup row sx={{ gap: 3 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.includeInNewEmails}
                      onChange={(e) => updatePreferences({ includeInNewEmails: e.target.checked })}
                    />
                  }
                  label="Correos nuevos"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.includeInReplies}
                      onChange={(e) => updatePreferences({ includeInReplies: e.target.checked })}
                    />
                  }
                  label="Respuestas"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.includeInForwards}
                      onChange={(e) => updatePreferences({ includeInForwards: e.target.checked })}
                    />
                  }
                  label="Reenvíos"
                />
              </FormGroup>
            </Paper>

            {/* OPTIMIZACIÓN AUTOMÁTICA DE RECURSOS */}
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: '12px', border: '1px solid divider', bgcolor: 'background.paper' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                Optimización automática de imágenes
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                Pixel Mail analiza y optimiza automáticamente las imágenes de tu firma (reducir resolución, limpiar metadatos, comprimir sin pérdida de calidad) antes de guardarlas.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2.5, alignItems: 'center', flexWrap: 'wrap' }}>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel>Modo de Optimización</InputLabel>
                  <Select
                    value={preferences.optimizationMode || 'size'}
                    onChange={(e) => updatePreferences({ optimizationMode: e.target.value as any })}
                    label="Modo de Optimización"
                  >
                    <MenuItem value="always">Siempre optimizar</MenuItem>
                    <MenuItem value="size">Optimizar por tamaño de archivo</MenuItem>
                    <MenuItem value="never">Nunca optimizar</MenuItem>
                  </Select>
                </FormControl>

                {(preferences.optimizationMode === 'size' || !preferences.optimizationMode) && (
                  <FormControl size="small" sx={{ minWidth: 200 }}>
                    <InputLabel>Optimizar solo archivos mayores a</InputLabel>
                    <Select
                      value={preferences.optimizationSizeLimit || 250000}
                      onChange={(e) => updatePreferences({ optimizationSizeLimit: Number(e.target.value) })}
                      label="Optimizar solo archivos mayores a"
                    >
                      <MenuItem value={100000}>100 KB</MenuItem>
                      <MenuItem value={250000}>250 KB (Recomendado)</MenuItem>
                      <MenuItem value={500000}>500 KB</MenuItem>
                    </Select>
                  </FormControl>
                )}
              </Box>
            </Paper>

            {/* LISTADO DE FIRMAS */}
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                  Todas tus firmas ({signatures.length})
                </Typography>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => handleFastAction('new')}
                  sx={{ textTransform: 'none', background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)' }}
                >
                  Agregar nueva firma
                </Button>
              </Box>

              {signatures.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center', border: '1px dashed divider' }}>
                  <Typography variant="body2" color="text.secondary">
                    No tienes firmas guardadas. ¡Crea una para comenzar!
                  </Typography>
                </Paper>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {signatures.map((sig) => {
                    const isActive = sig.id === activeSignatureId;
                    const isVisual = sig.type === 'visual';

                    return (
                      <Card
                        key={sig.id}
                        variant="outlined"
                        sx={{
                          borderRadius: '12px',
                          border: isActive ? '2px solid #10B981' : '1px solid divider',
                          boxShadow: isActive ? '0 4px 12px rgba(16, 185, 129, 0.1)' : 'none',
                          transition: 'all 120ms'
                        }}
                      >
                        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
                            <Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: '15px' }}>
                                  {sig.name}
                                </Typography>
                                {isActive && (
                                  <Chip
                                    size="small"
                                    icon={<ActiveIcon />}
                                    label="Activa"
                                    color="success"
                                    sx={{ height: 20, fontSize: '10px', fontWeight: 'bold' }}
                                  />
                                )}
                                <Chip
                                  size="small"
                                  label={isVisual ? 'Firma Visual' : 'Firma HTML'}
                                  color="primary"
                                  variant="outlined"
                                  sx={{ height: 20, fontSize: '10px' }}
                                />
                              </Box>

                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                Modificada: {new Date(sig.updatedAt).toLocaleString()}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 'bold' }}>
                                Escala en correo: {Math.round(sig.scale * 100)}%
                              </Typography>
                            </Box>

                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                              {!isActive && (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="success"
                                  startIcon={<ActiveIcon />}
                                  onClick={() => {
                                    setPendingActiveId(sig.id);
                                    setActiveConfirmOpen(true);
                                  }}
                                  sx={{ textTransform: 'none', fontSize: '11px' }}
                                >
                                  Activar
                                </Button>
                              )}
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<EditIcon />}
                                onClick={() => {
                                  setEditingSignatureId(sig.id);
                                  setActiveSection('firma');
                                }}
                                sx={{ textTransform: 'none', fontSize: '11px' }}
                              >
                                Editar
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<DuplicateIcon />}
                                onClick={() => handleAdminDuplicate(sig.id, sig.name)}
                                sx={{ textTransform: 'none', fontSize: '11px' }}
                              >
                                Duplicar
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<EditIcon />}
                                onClick={() => {
                                  setRenameTargetId(sig.id);
                                  setRenameValue(sig.name);
                                  setRenameDialogOpen(true);
                                }}
                                sx={{ textTransform: 'none', fontSize: '11px' }}
                              >
                                Renombrar
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<PreviewIcon />}
                                onClick={() => {
                                  setPreviewTargetSig(sig);
                                  setPreviewModalOpen(true);
                                }}
                                sx={{ textTransform: 'none', fontSize: '11px' }}
                              >
                                Vista previa
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<ExportIcon />}
                                onClick={() => handleAdminExportHTML(sig)}
                                sx={{ textTransform: 'none', fontSize: '11px' }}
                              >
                                Exportar HTML
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                startIcon={<DeleteIcon />}
                                onClick={() => {
                                  setDeleteTargetId(sig.id);
                                  setDeleteConfirmOpen(true);
                                }}
                                sx={{ textTransform: 'none', fontSize: '11px' }}
                              >
                                Eliminar
                              </Button>
                            </Box>
                          </Box>

                          <Divider sx={{ my: 1.5 }} />

                          {/* Miniatura de la firma real renderizada */}
                          <Box sx={{
                            p: 1.5,
                            border: '1px solid divider',
                            borderRadius: '8px',
                            bgcolor: '#FFFFFF',
                            color: '#000000',
                            overflowX: 'auto',
                            maxHeight: 150
                          }}>
                            <div dangerouslySetInnerHTML={{ __html: applyScaleToHTML(sig.html, sig.scale || 0.8) }} />
                          </Box>
                        </CardContent>
                      </Card>
                    );
                  })}
                </Box>
              )}
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

      case 'notificaciones': {
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5, fontSize: '15px' }}>
              Configuración de Notificaciones Push
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Mantente al tanto de tus correos en tiempo real mediante notificaciones push de Firebase.
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {/* ESTADO DE NOTIFICACIONES */}
            <Card variant="outlined" sx={{ borderRadius: '12px', p: 2.5, mb: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center', gap: 1.0 }}>
                Estado del Dispositivo
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.0 }}>
                  <Typography variant="body2">Soporte del Navegador:</Typography>
                  <Chip
                    label={isCompatible ? "Soportado" : "No Compatible"}
                    color={isCompatible ? "success" : "error"}
                    size="small"
                  />
                </Box>
                <Divider />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.0 }}>
                  <Typography variant="body2">Permiso de Notificaciones:</Typography>
                  <Chip
                    label={permission === 'granted' ? "Activado" : permission === 'denied' ? "Bloqueado" : "No Solicitado"}
                    color={permission === 'granted' ? "success" : permission === 'denied' ? "error" : "warning"}
                    size="small"
                  />
                </Box>
                <Divider />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.0 }}>
                  <Typography variant="body2">Registro del Token:</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: { xs: '180px', sm: '320px' } }}>
                    {token ? `${token.substring(0, 20)}...` : 'No Registrado'}
                  </Typography>
                </Box>

                {permission === 'denied' && (
                  <Box sx={{ mt: 1.0, p: 1.5, bgcolor: 'error.light', borderRadius: '8px', border: '1px solid', borderColor: 'error.main' }}>
                    <Typography variant="caption" color="error.dark" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5 }}>
                      ⚠️ Las notificaciones están bloqueadas en tu navegador
                    </Typography>
                    <Typography variant="caption" color="error.dark" sx={{ display: 'block' }}>
                      Para activarlas, por favor toca el icono del candado o la configuración del sitio a la izquierda de la barra de direcciones de Chrome/Safari y cambia el permiso de Notificaciones a "Permitir".
                    </Typography>
                  </Box>
                )}

                <Box sx={{ mt: 1.5, display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                  {permission !== 'granted' && permission !== 'denied' && (
                    <Button
                      variant="contained"
                      onClick={requestPermission}
                      startIcon={<NotificationsIcon />}
                      sx={{ textTransform: 'none', fontWeight: 'bold' }}
                    >
                      Activar notificaciones
                    </Button>
                  )}
                  {permission === 'granted' && token && (
                    <>
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={disableNotifications}
                        sx={{ textTransform: 'none' }}
                      >
                        Desactivar notificaciones en este dispositivo
                      </Button>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={sendTestNotification}
                        sx={{ textTransform: 'none', fontWeight: 'bold' }}
                      >
                        Enviar notificación de prueba
                      </Button>
                    </>
                  )}
                </Box>
              </Box>
            </Card>

            {/* PREFERENCIAS DE NOTIFICACIÓN */}
            {permission === 'granted' && notifPreferences && (
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: '12px', border: '1px solid divider', bgcolor: 'background.paper' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 2 }}>
                  Preferencias de Notificaciones
                </Typography>
                <FormGroup sx={{ gap: 2 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={notifPreferences.enabled}
                        onChange={(e) => notifUpdatePreferences({ enabled: e.target.checked })}
                        color="primary"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Notificaciones Push Activas</Typography>
                        <Typography variant="caption" color="text.secondary">Habilita o deshabilita globalmente el envío de notificaciones.</Typography>
                      </Box>
                    }
                  />
                  <Divider />

                  <FormControlLabel
                    disabled={!notifPreferences.enabled}
                    control={
                      <Switch
                        checked={notifPreferences.inboundEmail}
                        onChange={(e) => notifUpdatePreferences({ inboundEmail: e.target.checked })}
                        color="primary"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Correos Recibidos</Typography>
                        <Typography variant="caption" color="text.secondary">Notificarme al recibir un nuevo correo electrónico.</Typography>
                      </Box>
                    }
                  />

                  <FormControlLabel
                    disabled={!notifPreferences.enabled}
                    control={
                      <Switch
                        checked={notifPreferences.outboundSuccess}
                        onChange={(e) => notifUpdatePreferences({ outboundSuccess: e.target.checked })}
                        color="primary"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Envíos Exitosos</Typography>
                        <Typography variant="caption" color="text.secondary">Notificarme cuando un correo se envíe de manera correcta.</Typography>
                      </Box>
                    }
                  />

                  <FormControlLabel
                    disabled={!notifPreferences.enabled}
                    control={
                      <Switch
                        checked={notifPreferences.outboundError}
                        onChange={(e) => notifUpdatePreferences({ outboundError: e.target.checked })}
                        color="primary"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Errores de Envío</Typography>
                        <Typography variant="caption" color="text.secondary">Notificarme con una alerta persistente si falla el envío de un correo.</Typography>
                      </Box>
                    }
                  />
                  <Divider />

                  <FormControlLabel
                    disabled={!notifPreferences.enabled}
                    control={
                      <Switch
                        checked={notifPreferences.showSender}
                        onChange={(e) => notifUpdatePreferences({ showSender: e.target.checked })}
                        color="primary"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Mostrar Remitente</Typography>
                        <Typography variant="caption" color="text.secondary">Mostrar nombre y dirección del remitente en la pantalla de bloqueo.</Typography>
                      </Box>
                    }
                  />

                  <FormControlLabel
                    disabled={!notifPreferences.enabled}
                    control={
                      <Switch
                        checked={notifPreferences.showSubject}
                        onChange={(e) => notifUpdatePreferences({ showSubject: e.target.checked })}
                        color="primary"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Mostrar Asunto</Typography>
                        <Typography variant="caption" color="text.secondary">Mostrar el título del asunto del correo en el aviso push.</Typography>
                      </Box>
                    }
                  />
                  <Divider />

                  <FormControlLabel
                    disabled={!notifPreferences.enabled}
                    control={
                      <Switch
                        checked={notifPreferences.sound}
                        onChange={(e) => notifUpdatePreferences({ sound: e.target.checked })}
                        color="primary"
                      />
                    }
                    label="Reproducir sonido de notificación"
                  />

                  <FormControlLabel
                    disabled={!notifPreferences.enabled}
                    control={
                      <Switch
                        checked={notifPreferences.vibration}
                        onChange={(e) => notifUpdatePreferences({ vibration: e.target.checked })}
                        color="primary"
                      />
                    }
                    label="Vibración de alerta push"
                  />
                </FormGroup>
              </Paper>
            )}
          </Box>
        );
      }

      case 'general':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5, fontSize: '15px' }}>
              Configuración General
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Personaliza tu experiencia de lectura y organización de Pixel Mail.
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: '12px', border: '1px solid divider', bgcolor: 'background.paper' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                Cantidad de correos por página
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                Define cuántos correos se muestran en cada página de la bandeja.
              </Typography>

              <FormControl size="small" sx={{ minWidth: 200 }}>
                <Select
                  value={emailsPerPage}
                  onChange={(e) => setEmailsPerPage(Number(e.target.value))}
                  sx={{ fontSize: '13px' }}
                >
                  <MenuItem value={10} sx={{ fontSize: '13px' }}>10 correos</MenuItem>
                  <MenuItem value={20} sx={{ fontSize: '13px' }}>20 correos</MenuItem>
                  <MenuItem value={30} sx={{ fontSize: '13px' }}>30 correos</MenuItem>
                  <MenuItem value={40} sx={{ fontSize: '13px' }}>40 correos</MenuItem>
                </Select>
              </FormControl>
            </Paper>
          </Box>
        );

      case 'acerca':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5, fontSize: '15px' }}>
              Acerca de Pixel Mail
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Información de versión y estado de la aplicación.
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Card variant="outlined" sx={{ borderRadius: '12px', p: 2.5 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    Versión actual de Pixel Mail
                  </Typography>
                  <Chip label="v10.2" color="primary" size="small" sx={{ fontWeight: 'bold', fontSize: '11px' }} />
                </Box>
                <Divider />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2">
                    Canal de distribución
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '12.5px' }}>
                    PWA Estable (Trusted Web Activity ready)
                  </Typography>
                </Box>
                <Divider />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2">
                    Tecnología base
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '12.5px' }}>
                    React + TypeScript + Vite + MUI
                  </Typography>
                </Box>
              </Box>
            </Card>
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
        Configuración de Firmas
      </Typography>

      <Paper sx={{ display: 'flex', minHeight: 460, borderRadius: '8px', overflow: 'hidden', border: '1px solid divider', bgcolor: 'background.paper' }}>

        <Box sx={{ width: 160, borderRight: '1px solid', borderColor: 'divider', p: 1, bgcolor: 'action.hover' }}>
          <List sx={{ p: 0 }}>
            {[
              { id: 'firma', label: 'Firma (Editor)', icon: <SignatureIcon /> },
              { id: 'firmas', label: 'Firmas (Admin)', icon: <SignatureIcon /> },
              { id: 'reglas', label: 'Reglas', icon: <RuleIcon /> },
              { id: 'carpetas', label: 'Carpetas', icon: <FolderIcon /> },
              { id: 'general', label: 'General', icon: <SettingsIcon /> },
              { id: 'cuenta', label: 'Cuenta', icon: <AccountIcon /> },
              { id: 'apariencia', label: 'Apariencia', icon: <AppearanceIcon /> },
              ...(isRunningAsPWA() ? [{ id: 'notificaciones', label: 'Notificaciones', icon: <NotificationsIcon /> }] : []),
              { id: 'seguridad', label: 'Seguridad', icon: <SecurityIcon /> },
              { id: 'acerca', label: 'Acerca de', icon: <SettingsIcon /> }
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

        <Box sx={{ flexGrow: 1, p: 2.5, minWidth: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ flexGrow: 1 }}>
            {renderSectionContent()}
          </Box>

          {/* Banner informativo de instalación en PWA al final de configuración si no está instalada */}
          {!isRunningAsPWA() && (
            <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Paper
                variant="outlined"
                sx={{
                  p: 2.0,
                  borderRadius: '12px',
                  borderColor: '#3B82F6',
                  bgcolor: mode === 'dark' ? 'rgba(59, 130, 246, 0.05)' : 'rgba(59, 130, 246, 0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.0
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1.0, fontSize: '13px' }}>
                  <NotificationsIcon sx={{ fontSize: '18px' }} />
                  Notificaciones push disponibles en la App
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '11px', lineHeight: 1.3 }}>
                  Las notificaciones push están disponibles únicamente cuando Pixel Mail está instalado como aplicación en este dispositivo.
                </Typography>

                <Box sx={{ mt: 1.0 }}>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => {
                      const installBtn = document.querySelector('[aria-label="Instalar Pixel Mail"]');
                      if (installBtn) {
                        (installBtn as any).click();
                      } else {
                        alert("Instrucciones de Instalación:\n\n1. Chrome/Android: Toca los tres puntos de opciones arriba a la derecha y selecciona 'Instalar aplicación' o 'Agregar a la pantalla de inicio'.\n\n2. Safari/iOS: Toca el botón Compartir y selecciona 'Agregar a pantalla de inicio'.");
                      }
                    }}
                    startIcon={<NotificationsIcon sx={{ fontSize: '15px' }} />}
                    sx={{ textTransform: 'none', fontWeight: 'bold', background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)', height: '32px', fontSize: '11px' }}
                  >
                    Instalar Pixel Mail
                  </Button>
                </Box>
              </Paper>
            </Box>
          )}
        </Box>
      </Paper>

      {/* DIÁLOGO: CREAR NUEVA FIRMA */}
      <Dialog open={createDialogOpen} onClose={() => !isCreating && setCreateDialogOpen(false)}>
        <DialogTitle sx={{ fontWeight: 'bold', fontSize: '15px' }}>Nueva firma</DialogTitle>
        <DialogContent sx={{ minWidth: '320px', display: 'flex', flexDirection: 'column', gap: 2, pt: '10px !important' }}>
          <TextField
            autoFocus
            label="Nombre de la firma"
            size="small"
            fullWidth
            value={newSigName}
            onChange={(e) => setNewSigName(e.target.value)}
            disabled={isCreating}
          />
          <FormControl size="small" fullWidth disabled={isCreating}>
            <InputLabel>Modo de firma</InputLabel>
            <Select
              value={newSigType}
              onChange={(e) => setNewSigType(e.target.value as 'visual' | 'html')}
              label="Modo de firma"
            >
              <MenuItem value="visual">Constructor Visual Pixel</MenuItem>
              <MenuItem value="html">Editor de Firma HTML (Avanzado)</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button type="button" onClick={() => setCreateDialogOpen(false)} size="small" disabled={isCreating}>Cancelar</Button>
          <Button
            type="button"
            onClick={handleCreateSignatureSubmit}
            variant="contained"
            size="small"
            disabled={isCreating}
            startIcon={isCreating ? <CircularProgress size={14} color="inherit" /> : null}
          >
            {isCreating ? 'Creando...' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIÁLOGO: RENOMBRAR FIRMA */}
      <Dialog open={renameDialogOpen} onClose={() => setRenameDialogOpen(false)}>
        <DialogTitle sx={{ fontWeight: 'bold', fontSize: '15px' }}>Renombrar firma</DialogTitle>
        <DialogContent sx={{ minWidth: '300px', pt: '10px !important' }}>
          <TextField
            autoFocus
            label="Nuevo nombre"
            size="small"
            fullWidth
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameDialogOpen(false)} size="small">Cancelar</Button>
          <Button onClick={handleRenameSubmit} variant="contained" size="small">Guardar</Button>
        </DialogActions>
      </Dialog>

      {/* DIÁLOGO: CONFIRMAR FIRMA ACTIVA */}
      <Dialog open={activeConfirmOpen} onClose={() => { setActiveConfirmOpen(false); setPendingActiveId(null); }}>
        <DialogTitle sx={{ fontWeight: 'bold', fontSize: '15px' }}>Actualizar firma activa</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            ¿Estás seguro de que deseas establecer esta firma como vigente para todos tus correos?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setActiveConfirmOpen(false); setPendingActiveId(null); }} size="small">Cancelar</Button>
          <Button onClick={handleActiveChangeConfirm} variant="contained" color="success" size="small">Confirmar</Button>
        </DialogActions>
      </Dialog>

      {/* DIÁLOGO: ELIMINAR FIRMA */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle sx={{ fontWeight: 'bold', fontSize: '15px' }}>¿Deseas eliminar esta firma?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Esta acción no se puede deshacer. Si es tu firma activa, se te aconsejará activar otra firma.
          </Typography>
          {activeSignatureId === deleteTargetId && (
            <Box sx={{ mt: 2, p: 1.5, bgcolor: 'warning.light', borderRadius: '6px', border: '1px solid', borderColor: 'warning.main' }}>
              <Typography variant="caption" color="warning.dark" sx={{ fontWeight: 'bold', display: 'block' }}>
                ⚠️ ATENCIÓN: Esta es tu firma activa.
              </Typography>
              <Typography variant="caption" color="warning.dark" sx={{ display: 'block', mt: 0.5 }}>
                Al eliminarla, tus correos se redactarán sin firma predeterminada hasta que elijas una nueva.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)} size="small">Cancelar</Button>
          <Button onClick={handleDeleteConfirm} variant="contained" color="error" size="small">Eliminar firma</Button>
        </DialogActions>
      </Dialog>

      {/* DIÁLOGO: VISTA PREVIA MULTIDISPOSITIVO */}
      <Dialog open={previewModalOpen} onClose={() => setPreviewModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', fontSize: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Así se verá en tus correos — {previewTargetSig?.name}</span>
          <Chip label={`Escala: ${previewTargetSig ? Math.round(previewTargetSig.scale * 100) : 80}%`} variant="outlined" size="small" />
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: '15px !important' }}>
          {previewTargetSig && (
            <>
              {/* VISTAS 100% Y ESCALADAS */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>Firma a 100%</Typography>
                  <Box sx={{ p: 1.5, border: '1px solid divider', borderRadius: '6px', overflow: 'auto', bgcolor: '#FFF', color: '#000' }}>
                    <div dangerouslySetInnerHTML={{ __html: previewTargetSig.html }} />
                  </Box>
                </Paper>
                <Paper variant="outlined" sx={{ p: 2, borderColor: '#10B981' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#10B981', mb: 1 }}>Firma a {Math.round(previewTargetSig.scale * 100)}% (Escala Seleccionada)</Typography>
                  <Box sx={{ p: 1.5, border: '1px solid #10B981', borderRadius: '6px', overflow: 'auto', bgcolor: '#FFF', color: '#000' }}>
                    <div dangerouslySetInnerHTML={{ __html: applyScaleToHTML(previewTargetSig.html, previewTargetSig.scale || 0.8) }} />
                  </Box>
                </Paper>
              </Box>

              {/* VISTAS ESCRITORIO, MÓVIL, OUTLOOK Y GMAIL */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <DesktopIcon fontSize="small" /> Vista Escritorio (Gmail / Apple Mail)
                  </Typography>
                  <Box sx={{ p: 2, border: '1px solid divider', borderRadius: '6px', bgcolor: '#F8FAFC', color: '#0F172A', minHeight: '180px' }}>
                    <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary', mb: 2 }}>
                      Estimado cliente, adjunto la información solicitada en la reunión...
                    </Typography>
                    <Divider sx={{ my: 1.5 }} />
                    <div dangerouslySetInnerHTML={{ __html: applyScaleToHTML(previewTargetSig.html, previewTargetSig.scale || 0.8) }} />
                  </Box>
                </Paper>

                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <PhoneIcon fontSize="small" /> Vista Móvil (iOS / Android)
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'center', bgcolor: '#FAFAFA', p: 1, borderRadius: '8px' }}>
                    <Box sx={{ width: '320px', p: 2, border: '1px solid divider', borderRadius: '12px', bgcolor: '#FFFFFF', color: '#0F172A', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                      <Typography variant="caption" sx={{ fontStyle: 'italic', color: 'text.secondary', display: 'block', mb: 2 }}>
                        Hola, te envío mi contacto para la llamada...
                      </Typography>
                      <Divider sx={{ my: 1 }} />
                      <div style={{ transform: 'scale(0.9)', transformOrigin: 'top left', overflowX: 'auto' }} dangerouslySetInnerHTML={{ __html: applyScaleToHTML(previewTargetSig.html, previewTargetSig.scale || 0.8) }} />
                    </Box>
                  </Box>
                </Paper>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>Vista Outlook Desktop Client</Typography>
                  <Box sx={{ p: 2, border: '1px solid divider', borderRadius: '6px', bgcolor: '#FFF', color: '#000', fontSize: '13px', fontFamily: '"Segoe UI", sans-serif' }}>
                    <div style={{ color: '#0078D4', fontWeight: 'bold', marginBottom: '8px' }}>Mensaje nuevo</div>
                    <div dangerouslySetInnerHTML={{ __html: applyScaleToHTML(previewTargetSig.html, previewTargetSig.scale || 0.8) }} />
                  </Box>
                </Paper>

                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>Vista Gmail Web App</Typography>
                  <Box sx={{ p: 2, border: '1px solid divider', borderRadius: '6px', bgcolor: '#FFF', color: '#222', fontSize: '14px', fontFamily: 'Roboto, sans-serif' }}>
                    <div style={{ fontWeight: 'bold', color: '#202124', marginBottom: '10px' }}>Re: Consulta de Servicios</div>
                    <div dangerouslySetInnerHTML={{ __html: applyScaleToHTML(previewTargetSig.html, previewTargetSig.scale || 0.8) }} />
                  </Box>
                </Paper>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewModalOpen(false)} variant="contained" size="small">Cerrar</Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default Configuracion;
