import React, { useState, useEffect } from 'react';
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
  CardContent
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
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useEmails } from '../contexts/EmailContext';
import Editor from '../components/Editor';
import { db } from '../config/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const PREDEFINED_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#10B981', '#6366F1'
];

const Configuracion = () => {
  const { user } = useAuth();
  const { folders, addFolder, deleteFolder, rules, addRule, deleteRule } = useEmails();

  // Signature editor state (existing functional logic unchanged)
  const defaultSignature = 'Saludos,\nDavid Lachira\nPixel';
  const [signature, setSignature] = useState('');
  const [loadingSig, setLoadingSig] = useState(true);
  const [savingSig, setSavingSig] = useState(false);
  const [savedSig, setSavedSig] = useState(false);

  // Active section in inner sidebar
  const [activeSection, setActiveSection] = useState<'general' | 'cuenta' | 'firma' | 'reglas' | 'carpetas' | 'apariencia' | 'notificaciones' | 'seguridad'>('firma');

  // Load signature (Firestore)
  useEffect(() => {
    const fetchSignature = async () => {
      if (!user) return;
      try {
        const docRef = doc(db, 'settings', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSignature(docSnap.data().signature);
        } else {
          setSignature(defaultSignature);
        }
      } catch (error) {
        console.error("Error al obtener la firma:", error);
        setSignature(defaultSignature);
      } finally {
        setLoadingSig(false);
      }
    };
    fetchSignature();
  }, [user]);

  // Save signature (Firestore)
  const handleSaveSignature = async () => {
    if (!user) return;
    setSavingSig(true);
    setSavedSig(false);
    try {
      await setDoc(doc(db, 'settings', user.uid), {
        userId: user.uid,
        signature: signature,
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

  // Form states for creating Folder
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

  // Form states for creating Rule
  const [conditionField, setConditionField] = useState<'from' | 'subject' | 'hasAttachments' | 'read' | 'starred'>('from');
  const [conditionOperator, setConditionOperator] = useState<'contains' | 'endsWith' | 'equals' | 'startsWith' | 'isTrue' | 'isFalse'>('contains');
  const [conditionValue, setConditionValue] = useState('');
  const [actionType, setActionType] = useState<'moveToFolder' | 'archive' | 'delete' | 'star' | 'markRead'>('moveToFolder');
  const [actionValue, setActionValue] = useState('');

  // Sincronizar operador correcto según la condición elegida
  useEffect(() => {
    if (conditionField === 'hasAttachments' || conditionField === 'read' || conditionField === 'starred') {
      setConditionOperator('isTrue');
    } else {
      setConditionOperator('contains');
    }
  }, [conditionField]);

  // Sincronizar valor de acción de carpeta por defecto
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

  // Render content of active section
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
        return (
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5, fontSize: '15px' }}>
              Firma del Correo
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Personaliza la firma que se agregará automáticamente al final de tus correos redactados.
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Editor
              content={signature}
              onChange={(html) => setSignature(html)}
            />

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Button
                variant="contained"
                onClick={handleSaveSignature}
                disabled={savingSig}
                size="small"
                startIcon={<SaveIcon sx={{ fontSize: '16px' }} />}
                sx={{
                  background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                  fontWeight: 'bold',
                  py: 0.8,
                  px: 2.0,
                  fontSize: '12px'
                }}
              >
                {savingSig ? 'Guardando...' : 'Guardar Firma'}
              </Button>
              {savedSig && (
                <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 'bold' }}>
                  ¡Firma guardada correctamente!
                </Typography>
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

            {/* Crear carpeta */}
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

            {/* Listado de carpetas creadas */}
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

            {/* Crear Regla */}
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

                {/* Operador dinámico según condición */}
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

                {/* Valor de la condición si aplica */}
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

                {/* Carpeta destino si la acción es moveToFolder */}
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

            {/* Listado de reglas */}
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
        // Secciones marcadas como Próximamente (General, Cuenta, Apariencia, Notificaciones, Seguridad)
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
        Configuración
      </Typography>

      <Paper sx={{ display: 'flex', minHeight: 460, borderRadius: '8px', overflow: 'hidden', border: '1px solid divider', bgcolor: 'background.paper' }}>

        {/* Menú lateral interno de Configuración */}
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

        {/* Panel de Contenido de la sección de Configuración */}
        <Box sx={{ flexGrow: 1, p: 2.5, minWidth: 0, overflowY: 'auto' }}>
          {renderSectionContent()}
        </Box>
      </Paper>
    </Box>
  );
};

export default Configuracion;
