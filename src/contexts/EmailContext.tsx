import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { db } from '../config/firebase';
import {
  collection,
  disableNetwork,
  doc,
  enableNetwork,
  onSnapshot,
  query,
  updateDoc,
  where,
  writeBatch,
  type FirestoreError
} from 'firebase/firestore';
import { useAuth } from './AuthContext';

export interface Attachment {
  id?: string;
  name: string;
  size: number;
  contentType?: string;
  contentDisposition?: string | null;
  contentId?: string | null;
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
  folderId?: string | null;
  recipients?: any;
  labels?: any;
  body?: string;
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
  actionValue: string;
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
  addFolder: (folder: Omit<Folder, 'id'>) => void;
  updateFolder: (folder: Folder) => void;
  deleteFolder: (id: string) => void;
  addRule: (rule: Omit<Rule, 'id'>) => void;
  updateRule: (rule: Rule) => void;
  deleteRule: (id: string) => void;
  selectedEmailIds: string[];
  setSelectedEmailIds: React.Dispatch<React.SetStateAction<string[]>>;
  bulkMoveToFolder: (folderId: string | null) => Promise<void>;
  bulkToggleStar: (star: boolean) => Promise<void>;
  bulkToggleArchive: (archive: boolean) => Promise<void>;
  bulkToggleRead: (read: boolean) => Promise<void>;
  bulkMoveToTrash: () => Promise<void>;
  bulkDeleteForever: () => Promise<void>;
  bulkRestore: () => Promise<void>;
  counts: {
    inbox: number;
    starred: number;
    sent: number;
    archived: number;
    deleted: number;
    folders: Record<string, number>;
  };
  storageBreakdown: StorageBreakdown;
  emailsPerPage: number;
  setEmailsPerPage: (val: number) => Promise<void>;
}

const EmailContext = createContext<EmailContextType | undefined>(undefined);

export const getStringBytes = (str: string): number => {
  if (!str) return 0;
  try {
    return new Blob([str]).size;
  } catch {
    return str.length;
  }
};

export const getEmbeddedImagesSize = (html: string): number => {
  if (!html) return 0;
  let size = 0;
  const matches = html.match(/src="data:image\/[^;]+;base64,([^"]+)"/g);
  if (matches) {
    matches.forEach((match) => {
      size += Math.round(match.length * 0.75);
    });
  }
  return size;
};

export const getEmailSizeBytes = (email: any): number => {
  if (email.sizeBytes || email.totalSizeBytes) {
    return email.sizeBytes || email.totalSizeBytes;
  }

  const textBytes =
    getStringBytes(email.subject || '') +
    getStringBytes(email.from || '') +
    getStringBytes(email.text || '') +
    getStringBytes(email.html || email.body || '') +
    120;

  let attachmentBytes = 0;
  if (Array.isArray(email.attachments)) {
    email.attachments.forEach((att: any) => {
      attachmentBytes += typeof att?.size === 'number' ? att.size : 0;
    });
  }

  const embeddedBytes = getEmbeddedImagesSize(email.html || email.body || '');
  return textBytes + attachmentBytes + embeddedBytes;
};

const toDate = (value: any): Date | null => {
  if (!value) return null;
  try {
    if (typeof value.toDate === 'function') return value.toDate();
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};

const normalizeRecipientArray = (value: any): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim());
  }
  if (typeof value === 'string' && value.trim()) {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }
  return [];
};

const normalizeAttachments = (value: any): Attachment[] => {
  if (!Array.isArray(value)) return [];
  return value
    .filter(Boolean)
    .map((att: any) => ({
      id: typeof att.id === 'string' ? att.id : undefined,
      name: typeof att.name === 'string' && att.name.trim()
        ? att.name
        : (typeof att.filename === 'string' && att.filename.trim() ? att.filename : 'Adjunto'),
      size: typeof att.size === 'number' && Number.isFinite(att.size) ? att.size : 0,
      contentType: typeof att.contentType === 'string'
        ? att.contentType
        : (typeof att.content_type === 'string' ? att.content_type : ''),
      contentDisposition: att.contentDisposition ?? att.content_disposition ?? null,
      contentId: att.contentId ?? att.content_id ?? null
    }));
};

const isTransientFirestoreError = (error: FirestoreError) => (
  !navigator.onLine || error.code === 'unavailable' || error.code === 'cancelled'
);

export const evaluateRule = (email: EmailData, rule: Rule): boolean => {
  const { conditionField, conditionOperator, conditionValue } = rule;

  let fieldValue = '';
  if (conditionField === 'from') {
    fieldValue = email.from || email.fromEmail || '';
  } else if (conditionField === 'subject') {
    fieldValue = email.subject || '';
  } else if (conditionField === 'hasAttachments') {
    const has = email.attachments.length > 0;
    return conditionOperator === 'isTrue' ? has : !has;
  } else if (conditionField === 'read') {
    return conditionOperator === 'isTrue' ? email.read : !email.read;
  } else if (conditionField === 'starred') {
    return conditionOperator === 'isTrue' ? email.starred : !email.starred;
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
  const [rawEmails, setRawEmails] = useState<EmailData[]>([]);
  const [loading, setLoading] = useState(true);

  const [emailsPerPage, setEmailsPerPageRaw] = useState<number>(() => {
    const saved = localStorage.getItem('pixelmail_emails_per_page');
    const parsed = parseInt(saved || '20', 10);
    return [10, 20, 30, 40].includes(parsed) ? parsed : 20;
  });

  // Firestore deja de insistir contra la red mientras el navegador reporta offline.
  // Al volver la conexión, los listeners se resincronizan automáticamente.
  useEffect(() => {
    const handleOffline = () => {
      void disableNetwork(db).catch(() => undefined);
    };

    const handleOnline = () => {
      void enableNetwork(db).catch((error) => {
        console.warn('[FIRESTORE] No se pudo reactivar la sincronización todavía.', error);
      });
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    if (!navigator.onLine) {
      handleOffline();
    }

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;

    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(
      userRef,
      { includeMetadataChanges: true },
      (snapshot) => {
        if (!snapshot.exists()) return;
        const data = snapshot.data();
        if (data.emailsPerPage !== undefined) {
          const val = parseInt(data.emailsPerPage, 10);
          if ([10, 20, 30, 40].includes(val)) {
            setEmailsPerPageRaw(val);
            localStorage.setItem('pixelmail_emails_per_page', String(val));
          }
        }
      },
      (error) => {
        if (isTransientFirestoreError(error)) {
          console.info('[EMAIL CONTEXT] Configuración temporalmente en caché por falta de red.');
          return;
        }
        console.error('[EMAIL CONTEXT] Error leyendo configuración del usuario:', error);
      }
    );

    return () => unsubscribe();
  }, [user, authLoading]);

  const setEmailsPerPage = async (val: number) => {
    const validatedVal = [10, 20, 30, 40].includes(val) ? val : 20;
    setEmailsPerPageRaw(validatedVal);
    localStorage.setItem('pixelmail_emails_per_page', String(validatedVal));

    if (!user) return;

    const userRef = doc(db, 'users', user.uid);
    const writePromise = updateDoc(userRef, { emailsPerPage: validatedVal });

    if (navigator.onLine) {
      try {
        await writePromise;
      } catch (error) {
        console.error('[EMAIL CONTEXT] Error guardando emailsPerPage en Firestore:', error);
      }
    } else {
      // Firestore mantendrá la escritura pendiente hasta recuperar la conexión.
      void writePromise.catch((error) => {
        console.warn('[EMAIL CONTEXT] No se pudo completar la preferencia pendiente.', error);
      });
    }
  };

  const [selectedEmailIds, setSelectedEmailIds] = useState<string[]>([]);

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

  const [activeNav, setActiveNav] = useState<string>('recibidos');
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedEmailIds([]);
  }, [activeNav, activeFolderId]);

  useEffect(() => {
    localStorage.setItem('pixelmail_folders', JSON.stringify(folders));
  }, [folders]);

  useEffect(() => {
    localStorage.setItem('pixelmail_rules', JSON.stringify(rules));
  }, [rules]);

  // Un único listener de correos alimenta Recibidos, Enviados, contadores y almacenamiento.
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setRawEmails([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const emailsQuery = query(
      collection(db, 'emails'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      emailsQuery,
      { includeMetadataChanges: true },
      (querySnapshot) => {
        const list: EmailData[] = [];

        querySnapshot.forEach((snapshotDoc) => {
          const data = snapshotDoc.data();
          const receivedAt =
            toDate(data.receivedAt) ||
            toDate(data.sentAt) ||
            toDate(data.createdAt) ||
            new Date(0);
          const createdAt =
            toDate(data.createdAt) ||
            toDate(data.sentAt) ||
            receivedAt;
          const html = typeof data.html === 'string'
            ? data.html
            : (typeof data.body === 'string' ? data.body : '');
          const body = typeof data.body === 'string' ? data.body : html;

          list.push({
            id: snapshotDoc.id,
            resendEmailId: data.resendEmailId || data.providerMessageId || snapshotDoc.id,
            from: data.from || '',
            fromName: data.fromName || '',
            fromEmail: data.fromEmail || data.from || '',
            to: normalizeRecipientArray(data.to),
            cc: normalizeRecipientArray(data.cc),
            bcc: normalizeRecipientArray(data.bcc),
            subject: data.subject || '(Sin asunto)',
            text: data.text || '',
            html,
            body,
            attachments: normalizeAttachments(data.attachments),
            receivedAt,
            createdAt,
            direction: data.direction || 'inbound',
            status: data.status || 'received',
            read: data.read ?? false,
            starred: data.starred ?? false,
            archived: data.archived ?? false,
            deleted: data.deleted ?? false,
            deletedAt: data.deletedAt,
            previousFolder: data.previousFolder ?? null,
            folderId: data.folderId ?? null,
            recipients: data.recipients,
            labels: data.labels
          });
        });

        list.sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime());
        setRawEmails(list);
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        if (isTransientFirestoreError(error)) {
          console.info('[EMAIL CONTEXT] Sincronización temporalmente pausada; se mantienen los correos locales.');
          return;
        }
        console.error('[EMAIL CONTEXT] Error leyendo correos:', error);
      }
    );

    return () => unsubscribe();
  }, [user, authLoading]);

  const emails: EmailData[] = useMemo(() => {
    return rawEmails.map((email) => {
      const emailCopy = { ...email };

      if (emailCopy.direction === 'inbound' && !emailCopy.deleted) {
        let assignedFolderId: string | null = emailCopy.folderId || null;
        for (const rule of rules) {
          if (evaluateRule(emailCopy, rule) && rule.actionType === 'moveToFolder') {
            assignedFolderId = rule.actionValue;
          }
        }
        emailCopy.folderId = assignedFolderId;
      } else {
        emailCopy.folderId = null;
      }

      return emailCopy;
    });
  }, [rawEmails, rules]);

  const counts = useMemo(() => {
    let inbox = 0;
    let starred = 0;
    let sent = 0;
    let archived = 0;
    let deleted = 0;
    const folderCounts: Record<string, number> = {};

    folders.forEach((folder) => {
      folderCounts[folder.id] = 0;
    });

    emails.forEach((email) => {
      if (email.deleted) {
        deleted++;
        return;
      }

      if (email.direction === 'inbound') {
        if (email.folderId) {
          if (folderCounts[email.folderId] !== undefined) {
            folderCounts[email.folderId]++;
          }
        } else if (!email.archived) {
          inbox++;
        }

        if (email.starred) starred++;
        if (email.archived) archived++;
      } else {
        sent++;
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

  const storageBreakdown: StorageBreakdown = useMemo(() => {
    let receivedBytes = 0;
    let sentBytes = 0;
    let attachmentsBytes = 0;
    let embeddedBytes = 0;
    let trashBytes = 0;
    let othersBytes = 0;

    emails.forEach((email) => {
      const bytes = getEmailSizeBytes(email);

      if (email.deleted) {
        trashBytes += bytes;
        return;
      }

      const embed = getEmbeddedImagesSize(email.html || email.body || '');
      embeddedBytes += embed;

      let attBytes = 0;
      email.attachments.forEach((att) => {
        attBytes += att.size || 0;
      });
      attachmentsBytes += attBytes;

      const netBytes = Math.max(0, bytes - embed - attBytes);
      if (email.direction === 'inbound') {
        receivedBytes += netBytes;
      } else {
        sentBytes += netBytes;
      }
    });

    othersBytes = emails.length > 0 ? emails.length * 512 : 200000;

    const totalBytes = receivedBytes + sentBytes + attachmentsBytes + embeddedBytes + trashBytes + othersBytes;
    const limitBytes = 10 * 1024 * 1024 * 1024;
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

  const executeBatchUpdate = async (updateFields: any, successMessage: string) => {
    if (selectedEmailIds.length === 0) return;
    const batch = writeBatch(db);

    selectedEmailIds.forEach((id) => {
      batch.update(doc(db, 'emails', id), updateFields);
    });

    try {
      await batch.commit();
      console.info(`[BULK ACTION] ${successMessage}`);
      setSelectedEmailIds([]);
    } catch (error) {
      console.error('[BULK ACTION] Error ejecutando la acción masiva:', error);
      alert('Error al procesar la acción masiva en el servidor. La interfaz se sincronizará automáticamente.');
      throw error;
    }
  };

  const bulkMoveToFolder = async (folderId: string | null) => {
    await executeBatchUpdate(
      { folderId, archived: false },
      `Correos movidos a la carpeta: ${folderId || 'Recibidos'}`
    );
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
    const batch = writeBatch(db);
    selectedEmailIds.forEach((id) => {
      const email = emails.find((item) => item.id === id);
      const isSent = email ? email.direction !== 'inbound' : false;
      const prev = isSent ? 'sent' : (email?.archived ? 'archived' : (email?.folderId || 'inbox'));

      batch.update(doc(db, 'emails', id), {
        deleted: true,
        deletedAt: new Date(),
        previousFolder: prev
      });
    });

    try {
      await batch.commit();
      setSelectedEmailIds([]);
    } catch (error) {
      console.error('Error bulk moving to trash:', error);
      throw error;
    }
  };

  const bulkDeleteForever = async () => {
    const confirmMessage = `¿Eliminar definitivamente estos ${selectedEmailIds.length} correos?\n\nEsta acción no se puede deshacer y también eliminará sus adjuntos correspondientes.`;
    if (!window.confirm(confirmMessage)) return;

    const batch = writeBatch(db);
    selectedEmailIds.forEach((id) => {
      batch.delete(doc(db, 'emails', id));
    });

    try {
      await batch.commit();
      setSelectedEmailIds([]);
    } catch (error) {
      console.error('Error bulk deleting forever:', error);
      throw error;
    }
  };

  const bulkRestore = async () => {
    const batch = writeBatch(db);
    selectedEmailIds.forEach((id) => {
      const email = emails.find((item) => item.id === id);
      const prev = email?.previousFolder || 'inbox';
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
    });

    try {
      await batch.commit();
      setSelectedEmailIds([]);
    } catch (error) {
      console.error('Error bulk restoring:', error);
      throw error;
    }
  };

  const addFolder = (folder: Omit<Folder, 'id'>) => {
    const id = folder.name.toLowerCase().trim().replace(/\s+/g, '-');
    setFolders((prev) => [...prev, { ...folder, id }]);
  };

  const updateFolder = (updated: Folder) => {
    setFolders((prev) => prev.map((folder) => (folder.id === updated.id ? updated : folder)));
  };

  const deleteFolder = (id: string) => {
    setFolders((prev) => prev.filter((folder) => folder.id !== id));
    setRules((prev) => prev.filter((rule) => !(rule.actionType === 'moveToFolder' && rule.actionValue === id)));
    if (activeFolderId === id) {
      setActiveFolderId(null);
      setActiveNav('recibidos');
    }
  };

  const addRule = (rule: Omit<Rule, 'id'>) => {
    const id = Date.now().toString();
    setRules((prev) => [...prev, { ...rule, id }]);
  };

  const updateRule = (updated: Rule) => {
    setRules((prev) => prev.map((rule) => (rule.id === updated.id ? updated : rule)));
  };

  const deleteRule = (id: string) => {
    setRules((prev) => prev.filter((rule) => rule.id !== id));
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
        storageBreakdown,
        emailsPerPage,
        setEmailsPerPage
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
