import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { db } from '../config/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
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

interface EmailContextType {
  emails: EmailData[];
  loading: boolean;
  folders: Folder[];
  rules: Rule[];
  activeFolderId: string | null; // null si estamos en Inbox, Starred, etc.
  activeNav: string; // 'recibidos' | 'destacados' | 'enviados' | 'archivados' | 'eliminados' | 'folder'
  setActiveNav: (nav: string) => void;
  setActiveFolderId: (id: string | null) => void;

  // Métodos de administración
  addFolder: (folder: Omit<Folder, 'id'>) => void;
  updateFolder: (folder: Folder) => void;
  deleteFolder: (id: string) => void;
  addRule: (rule: Omit<Rule, 'id'>) => void;
  updateRule: (rule: Rule) => void;
  deleteRule: (id: string) => void;

  // Contadores calculados independientemente
  counts: {
    inbox: number;
    starred: number;
    sent: number;
    archived: number;
    deleted: number;
    folders: Record<string, number>;
  };
}

const EmailContext = createContext<EmailContextType | undefined>(undefined);

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

    // Inicializar contadores de carpetas
    folders.forEach(f => {
      folderCounts[f.id] = 0;
    });

    emails.forEach((email) => {
      if (email.direction === 'inbound') {
        if (email.deleted) {
          deleted++;
        } else {
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
        }
      } else {
        // Dirección de salida (enviados)
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
    // Eliminar también las reglas asociadas a esta carpeta
    setRules((prev) => prev.filter((r) => !(r.actionType === 'moveToFolder' && r.actionValue === id)));
    // Si la carpeta borrada estaba activa, volver a recibidos
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
        counts
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
