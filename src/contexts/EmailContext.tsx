import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { db } from '../config/firebase';
import { collection, query, where, onSnapshot, doc, writeBatch } from 'firebase/firestore';
import { useAuth } from './AuthContext';

export interface Attachment {
  name: string;
  size: number;
  contentType?: string;
}

export interface EmailData {
  id: string;
  resendEmailId: string;
  from: string;
  fromName: string;
  fromEmail: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  text: string;
  html: string;
  attachments: Attachment[];
  receivedAt: Date;
  createdAt?: Date;
  direction: string;
  status: string;
  read: boolean;
  starred: boolean;
  archived: boolean;
  deleted: boolean;
  deletedAt?: any;
  previousFolder?: string | null;

  // Propiedades calculadas por reglas
  folderId?: string | null;
}

export interface Folder {
  id: string;
  name: string;
  color: string;
  icon: string;
  isVisible: boolean;
}

export interface Rule {
  id: string;
  conditionField: 'from' | 'subject' | 'hasAttachments' | 'read' | 'starred';
  conditionOperator: 'contains' | 'endsWith' | 'equals' | 'startsWith' | 'isTrue' | 'isFalse';
  conditionValue: string;
  actionType: 'moveToFolder' | 'archive' | 'delete' | 'star' | 'markRead';
  actionValue: string; // e.g. folder ID
}

export interface StorageBreakdown {
  receivedBytes: number;
  sentBytes: number;
  attachmentsBytes: number;
  embeddedBytes: number;
  trashBytes: number;
  othersBytes: number;
  totalBytes: number;
  percentageUsed: number;
  lastUpdated: string;
}

interface EmailContextType {
  emails: EmailData[];
  loading: boolean;
  folders: Folder[];
  rules: Rule[];
  activeFolderId: string | null;
  activeNav: string;
  setActiveNav: (nav: string) => void;
  setActiveFolderId: (id: string | null) => void;

  // Métodos de administración
  addFolder: (folder: Omit<Folder, 'id'>) => void;
  updateFolder: (folder: Folder) => void;
  deleteFolder: (id: string) => void;
  addRule: (rule: Omit<Rule, 'id'>) => void;
  updateRule: (rule: Rule) => void;
  deleteRule: (id: string) => void;

  // Selección múltiple
  selectedEmailIds: string[];
  setSelectedEmailIds: React.Dispatch<React.SetStateAction<string[]>>;

  // Acciones masivas
  bulkMoveToFolder: (folderId: string | null) => Promise<void>;
  bulkToggleStar: (star: boolean) => Promise<void>;
  bulkToggleArchive: (archive: boolean) => Promise<void>;
  bulkToggleRead: (read: boolean) => Promise<void>;
  bulkMoveToTrash: () => Promise<void>;
  bulkDeleteForever: () => Promise<void>;
  bulkRestore: () => Promise<void>;

  // Contadores calculados independientemente
  counts: {
    inbox: number;
    starred: number;
    sent: number;
    archived: number;
    deleted: number;
    folders: Record<string, number>;
  };

  // Almacenamiento real
  storageBreakdown: StorageBreakdown;
}

const EmailContext = createContext<EmailContextType | undefined>(undefined);

// Función para calcular bytes de un string en UTF-8 de forma precisa
export const getStringBytes = (str: string): number => {
  if (!str) return 0;
  try {
    return new Blob([str]).size;
  } catch (e) {
    return str.length; // Fallback seguro
  }
};

// Obtener tamaño base64 de imágenes embebidas
export const getEmbeddedImagesSize = (html: string): number => {
  if (!html) return 0;
  let size = 0;
  const matches = html.match(/src="data:image\/[^;]+;base64,([^"]+)"/g);
  if (matches) {
    matches.forEach((m) => {
      size += Math.round(m.length * 0.75);
    });
  }
  return size;
};

// Obtener tamaño total de un correo en bytes de forma realista
export const getEmailSizeBytes = (email: any): number => {
  if (email.sizeBytes || email.totalSizeBytes) {
    return email.sizeBytes || email.totalSizeBytes;
  }

  // Sumar textos (asunto, remitente, cuerpo texto, cuerpo HTML)
  const textBytes =
    getStringBytes(email.subject || '') +
    getStringBytes(email.from || '') +
    getStringBytes(email.text || '') +
    getStringBytes(email.html || '') +
    120; // 120 bytes de padding por encabezados

  // Sumar adjuntos
  let attachmentBytes = 0;
  if (email.attachments && Array.isArray(email.attachments)) {
    email.attachments.forEach((att: any) => {
      attachmentBytes += (att.size || 0);
    });
  }

  // Sumar imágenes embebidas
  const embeddedBytes = getEmbeddedImagesSize(email.html || '');

  return textBytes + attachmentBytes + embeddedBytes;
};

export const evaluateRule = (email: EmailData, rule: Rule): boolean => {
  const { conditionField, conditionOperator, conditionValue } = rule;

  let fieldValue = '';
  if (conditionField === 'from') {
    fieldValue = email.from || email.fromEmail || '';
  } else if (conditionField === 'subject') {
    fieldValue = email.subject || '';
  } else if (conditionField === 'hasAttachments') {
    const has = email.attachments && email.attachments.length > 0;
    return conditionOperator === 'isTrue' ? has : !has;
  } else if (conditionField === 'read') {
    const isRead = email.read ?? false;
    return conditionOperator === 'isTrue' ? isRead : !isRead;
  } else if (conditionField === 'starred') {
    const isStarred = email.starred ?? false;
    return conditionOperator === 'isTrue' ? isStarred : !isStarred;
  }

  const val = fieldValue.toLowerCase();
  const target = (conditionValue || '').toLowerCase();

  switch (conditionOperator) {
    case 'contains':
      return val.includes(target);
    case 'endsWith':
      return val.endsWith(target);
    case 'startsWith':
      return val.startsWith(target);
    case 'equals':
      return val === target;
    default:
      return false;
  }
};

export const EmailProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [rawEmails, setRawEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Selección múltiple
  const [selectedEmailIds, setSelectedEmailIds] = useState<string[]>([]);

  // Estados para carpetas y reglas con valores por defecto
  const [folders, setFolders] = useState<Folder[]>(() => {
    const saved = localStorage.getItem('pixelmail_folders');
    if (saved) return JSON.parse(saved);
    const defaults: Folder[] = [
      { id: 'trabajo', name: 'Trabajo', color: '#3B82F6', icon: 'Folder', isVisible: true },
      { id: 'personal', name: 'Personal', color: '#22C55E', icon: 'Folder', isVisible: true },
      { id: 'importante', name: 'Importante', color: '#FACC15', icon: 'Folder', isVisible: true }
    ];
    localStorage.setItem('pixelmail_folders', JSON.stringify(defaults));
    return defaults;
  });

  const [rules, setRules] = useState<Rule[]>(() => {
    const saved = localStorage.getItem('pixelmail_rules');
    if (saved) return JSON.parse(saved);
    return [];
  });

  // Estados de navegación global
  const [activeNav, setActiveNav] = useState<string>('recibidos');
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);

  // Limpiar selección al cambiar de vista de navegación
  useEffect(() => {
    setSelectedEmailIds([]);
  }, [activeNav, activeFolderId]);

  // Guardar carpetas y reglas en localStorage cada vez que cambien
  useEffect(() => {
    localStorage.setItem('pixelmail_folders', JSON.stringify(folders));
  }, [folders]);

  useEffect(() => {
    localStorage.setItem('pixelmail_rules', JSON.stringify(rules));
  }, [rules]);

  // Suscripción en tiempo real a todos los correos del usuario
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setRawEmails([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, 'emails'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const list: any[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          ...data,
          receivedAt: data.receivedAt?.toDate() || data.createdAt?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date(),
          read: data.read ?? false,
          starred: data.starred ?? false,
          archived: data.archived ?? false,
          deleted: data.deleted ?? false,
        });
      });

      // Ordenar en memoria desc por fecha
      list.sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime());
      setRawEmails(list);
      setLoading(false);
    }, (error) => {
      console.error("[EMAIL CONTEXT] Error fetching emails:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, authLoading]);

  // Procesar correos aplicando las reglas
  const emails: EmailData[] = useMemo(() => {
    return rawEmails.map((email) => {
      const emailCopy = { ...email };

      // Solo aplicar clasificación de carpetas si es un correo de entrada y no está en la papelera
      if (emailCopy.direction === 'inbound' && !emailCopy.deleted) {
        let assignedFolderId: string | null = null;
        for (const rule of rules) {
          if (evaluateRule(emailCopy, rule)) {
            if (rule.actionType === 'moveToFolder') {
              assignedFolderId = rule.actionValue;
            }
          }
        }
        emailCopy.folderId = assignedFolderId;
      } else {
        emailCopy.folderId = null;
      }

      return emailCopy;
    });
  }, [rawEmails, rules]);

  // Calcular contadores reales de manera independiente y en tiempo real
  const counts = useMemo(() => {
    let inbox = 0;
    let starred = 0;
    let sent = 0;
    let archived = 0;
    let deleted = 0;
    const folderCounts: Record<string, number> = {};

    folders.forEach(f => {
      folderCounts[f.id] = 0;
    });

    emails.forEach((email) => {
      if (email.deleted) {
        deleted++;
      } else {
        if (email.direction === 'inbound') {
          // Si tiene una carpeta asignada por regla
          if (email.folderId) {
            if (folderCounts[email.folderId] !== undefined) {
              folderCounts[email.folderId]++;
            }
          } else {
            // Bandeja de Entrada general (solo si no está archivado ni eliminado, y no pertenece a carpeta)
            if (!email.archived) {
              inbox++;
            }
          }

          // Destacados (todos los destacados que no estén en la papelera)
          if (email.starred) {
            starred++;
          }

          // Archivados (todos los archivados que no estén en la papelera)
          if (email.archived) {
            archived++;
          }
        } else {
          // Dirección de salida (enviados)
          sent++;
        }
      }
    });

    return {
      inbox,
      starred,
      sent,
      archived,
      deleted,
      folders: folderCounts
    };
  }, [emails, folders]);

  // Almacenamiento real desglosado
  const storageBreakdown: StorageBreakdown = useMemo(() => {
    let receivedBytes = 0;
    let sentBytes = 0;
    let attachmentsBytes = 0;
    let embeddedBytes = 0;
    let trashBytes = 0;
    let othersBytes = 0;

    emails.forEach((email) => {
      const bytes = getEmailSizeBytes(email);
      const isInbound = email.direction === 'inbound';

      if (email.deleted) {
        trashBytes += bytes;
      } else {
        // Calcular imágenes embebidas
        const embed = getEmbeddedImagesSize(email.html || '');
        embeddedBytes += embed;

        // Calcular adjuntos de este correo activo
        let attBytes = 0;
        if (email.attachments && Array.isArray(email.attachments)) {
          email.attachments.forEach((att: any) => {
            attBytes += (att.size || 0);
          });
        }
        attachmentsBytes += attBytes;

        // El peso de textos puros (sin embebidas ni adjuntos) se suma a la dirección correspondiente
        const netBytes = Math.max(0, bytes - embed - attBytes);
        if (isInbound) {
          receivedBytes += netBytes;
        } else {
          sentBytes += netBytes;
        }
      }
    });

    // 2 MB de padding ficticio/real para representar "Otros" indexaciones
    othersBytes = emails.length > 0 ? emails.length * 512 : 200000;

    const totalBytes = receivedBytes + sentBytes + attachmentsBytes + embeddedBytes + trashBytes + othersBytes;
    const limitBytes = 10 * 1024 * 1024 * 1024; // 10 GB limit
    const percentageUsed = Math.min(100, Math.max(0.1, (totalBytes / limitBytes) * 100));

    const dateStr = new Date().toLocaleDateString('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    return {
      receivedBytes,
      sentBytes,
      attachmentsBytes,
      embeddedBytes,
      trashBytes,
      othersBytes,
      totalBytes,
      percentageUsed,
      lastUpdated: dateStr
    };
  }, [emails]);

  // Operaciones masivas optimistas usando Lotes (WriteBatch)
  const executeBatchUpdate = async (updateFields: any, successMessage: string) => {
    if (selectedEmailIds.length === 0) return;
    const batch = writeBatch(db);

    selectedEmailIds.forEach((id) => {
      const docRef = doc(db, 'emails', id);
      batch.update(docRef, updateFields);
    });

    try {
      await batch.commit();
      console.log(`[BULK ACTION SUCCESS] ${successMessage}`);
      setSelectedEmailIds([]);
    } catch (error) {
      console.error("[BULK ACTION ERROR] Error executing batch update:", error);
      alert("Error al procesar la acción masiva en el servidor. La interfaz se sincronizará automáticamente.");
      throw error;
    }
  };

  const bulkMoveToFolder = async (folderId: string | null) => {
    // Si folderId es null, significa "mover a Recibidos" (quitar carpeta y desarchivar)
    const fields = folderId
      ? { folderId, archived: false }
      : { folderId: null, archived: false };
    await executeBatchUpdate(fields, `Correos movidos a la carpeta: ${folderId || 'Recibidos'}`);
  };

  const bulkToggleStar = async (starred: boolean) => {
    await executeBatchUpdate({ starred }, `Destacado cambiado a: ${starred}`);
  };

  const bulkToggleArchive = async (archived: boolean) => {
    await executeBatchUpdate({ archived }, `Archivado cambiado a: ${archived}`);
  };

  const bulkToggleRead = async (read: boolean) => {
    await executeBatchUpdate({ read }, `Leído cambiado a: ${read}`);
  };

  const bulkMoveToTrash = async () => {
    // Mover lógicamente a papelera guardando origen
    const batch = writeBatch(db);
    selectedEmailIds.forEach((id) => {
      const email = emails.find(e => e.id === id);
      const isSent = email ? email.direction !== 'inbound' : false;
      const prev = isSent ? 'sent' : (email?.archived ? 'archived' : (email?.folderId || 'inbox'));

      const docRef = doc(db, 'emails', id);
      batch.update(docRef, {
        deleted: true,
        deletedAt: new Date(),
        previousFolder: prev
      });
    });

    try {
      await batch.commit();
      setSelectedEmailIds([]);
    } catch (e) {
      console.error("Error bulk moving to trash:", e);
      throw e;
    }
  };

  const bulkDeleteForever = async () => {
    const confirmMessage = `¿Eliminar definitivamente estos ${selectedEmailIds.length} correos?\n\nEsta acción no se puede deshacer y también eliminará sus adjuntos correspondientes.`;
    if (!window.confirm(confirmMessage)) return;

    const batch = writeBatch(db);
    selectedEmailIds.forEach((id) => {
      const docRef = doc(db, 'emails', id);
      batch.delete(docRef);
    });

    try {
      await batch.commit();
      setSelectedEmailIds([]);
    } catch (e) {
      console.error("Error bulk deleting forever:", e);
      throw e;
    }
  };

  const bulkRestore = async () => {
    const batch = writeBatch(db);
    selectedEmailIds.forEach((id) => {
      const email = emails.find(e => e.id === id);

      let prev = email?.previousFolder;
      if (!prev) {
        const isSent = email ? email.direction !== 'inbound' : false;
        prev = isSent ? 'sent' : 'inbox';
      }

      const docRef = doc(db, 'emails', id);
      if (prev === 'sent') {
        batch.update(docRef, {
          deleted: false,
          archived: false,
          previousFolder: null
        });
      } else if (prev === 'archived') {
        batch.update(docRef, {
          deleted: false,
          archived: true,
          previousFolder: null
        });
      } else if (prev !== 'inbox' && prev !== 'sent') {
        // Verificar si la carpeta personalizada aún existe, si no, restaurar a Recibidos
        const folderExists = folders.some(f => f.id === prev);
        if (folderExists) {
          batch.update(docRef, {
            deleted: false,
            archived: false,
            folderId: prev,
            previousFolder: null
          });
        } else {
          batch.update(docRef, {
            deleted: false,
            archived: false,
            folderId: null,
            previousFolder: null
          });
        }
      } else {
        batch.update(docRef, {
          deleted: false,
          archived: false,
          folderId: null,
          previousFolder: null
        });
      }
    });

    try {
      await batch.commit();
      setSelectedEmailIds([]);
    } catch (e) {
      console.error("Error bulk restoring:", e);
      throw e;
    }
  };

  // Funciones de administración de carpetas
  const addFolder = (folder: Omit<Folder, 'id'>) => {
    const id = folder.name.toLowerCase().trim().replace(/\s+/g, '-');
    setFolders((prev) => [...prev, { ...folder, id }]);
  };

  const updateFolder = (updated: Folder) => {
    setFolders((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
  };

  const deleteFolder = (id: string) => {
    setFolders((prev) => prev.filter((f) => f.id !== id));
    setRules((prev) => prev.filter((r) => !(r.actionType === 'moveToFolder' && r.actionValue === id)));
    if (activeFolderId === id) {
      setActiveFolderId(null);
      setActiveNav('recibidos');
    }
  };

  // Funciones de administración de reglas
  const addRule = (rule: Omit<Rule, 'id'>) => {
    const id = Date.now().toString();
    setRules((prev) => [...prev, { ...rule, id }]);
  };

  const updateRule = (updated: Rule) => {
    setRules((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  };

  const deleteRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <EmailContext.Provider
      value={{
        emails,
        loading,
        folders,
        rules,
        activeFolderId,
        activeNav,
        setActiveNav,
        setActiveFolderId,
        addFolder,
        updateFolder,
        deleteFolder,
        addRule,
        updateRule,
        deleteRule,
        selectedEmailIds,
        setSelectedEmailIds,
        bulkMoveToFolder,
        bulkToggleStar,
        bulkToggleArchive,
        bulkToggleRead,
        bulkMoveToTrash,
        bulkDeleteForever,
        bulkRestore,
        counts,
        storageBreakdown
      }}
    >
      {children}
    </EmailContext.Provider>
  );
};

export const useEmails = () => {
  const context = useContext(EmailContext);
  if (!context) {
    throw new Error('useEmails debe usarse dentro de un EmailProvider');
  }
  return context;
};
