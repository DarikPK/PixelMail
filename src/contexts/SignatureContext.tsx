import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { db } from '../config/firebase';
import {
  collection,
  query,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { ProjectManager } from '../components/signature/ProjectManager';
import { optimizeSignatureResourcesBeforeSave } from '../utils/imageOptimizer';

export interface Signature {
  id: string;
  name: string;
  type: 'visual' | 'html';
  html: string;
  originalHtml?: string;
  scale: number; // e.g. 0.8
  isActive: boolean;
  createdAt: any;
  updatedAt: any;
  thumbnail?: string;
  resources?: any[];
  settings?: any;
  version?: string;
}

export interface SignaturePreferences {
  includeInNewEmails: boolean;
  includeInReplies: boolean;
  includeInForwards: boolean;
  optimizationMode?: 'always' | 'size' | 'never';
  optimizationSizeLimit?: number; // bytes, e.g. 100000, 250000, 500000
}

interface SignatureContextType {
  signatures: Signature[];
  activeSignatureId: string | null;
  activeSignature: Signature | null;
  editingSignatureId: string | null;
  setEditingSignatureId: (id: string | null) => void;
  preferences: SignaturePreferences;
  loading: boolean;
  saveSignature: (name: string, type: 'visual' | 'html', html: string, originalHtml?: string, scale?: number, signatureId?: string) => Promise<string>;
  activateSignature: (id: string | null) => Promise<void>;
  duplicateSignature: (id: string) => Promise<void>;
  renameSignature: (id: string, newName: string) => Promise<void>;
  deleteSignature: (id: string) => Promise<void>;
  updatePreferences: (prefs: Partial<SignaturePreferences>) => Promise<void>;
}

const SignatureContext = createContext<SignatureContextType | undefined>(undefined);

export const SignatureProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [activeSignatureId, setActiveSignatureId] = useState<string | null>(null);
  const [editingSignatureId, setEditingSignatureId] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<SignaturePreferences>({
    includeInNewEmails: true,
    includeInReplies: true,
    includeInForwards: true,
    optimizationMode: 'size',
    optimizationSizeLimit: 250000
  });
  const [loading, setLoading] = useState(true);

  // Sincronizar firmas y preferencias del usuario
  useEffect(() => {
    if (!user) {
      setSignatures([]);
      setActiveSignatureId(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    // 1. Suscripción a firmas: users/{userId}/signatures
    const sigsRef = collection(db, 'users', user.uid, 'signatures');
    const sigsQuery = query(sigsRef);

    const unsubscribeSigs = onSnapshot(sigsQuery, async (snapshot) => {
      const sigsList: Signature[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        sigsList.push({
          id: doc.id,
          name: data.name || 'Sin nombre',
          type: data.type || 'visual',
          html: data.html || '',
          originalHtml: data.originalHtml || '',
          scale: data.scale ?? 0.8,
          isActive: data.isActive ?? false,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          thumbnail: data.thumbnail || '',
          resources: data.resources || [],
          settings: data.settings || {},
          version: data.version || '1.0'
        });
      });

      // Ordenar por fecha de última actualización
      sigsList.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

      // MIGRACIÓN AUTOMÁTICA
      if (sigsList.length === 0) {
        // Consultar el sistema antiguo en settings/{userId}
        try {
          const oldDocRef = doc(db, 'settings', user.uid);
          const oldDocSnap = await getDoc(oldDocRef);

          if (oldDocSnap.exists()) {
            const oldData = oldDocSnap.data();
            const oldHtml = oldData.signature || '';
            const oldStructure = oldData.signatureStructure || '';

            if (oldHtml && !oldHtml.includes('Saludos,\nDavid Lachira\nPixel')) {
              // Crear firma migrada en la nueva subcolección
              const newSigRef = doc(collection(db, 'users', user.uid, 'signatures'));
              const migratedSig: Omit<Signature, 'id' | 'createdAt' | 'updatedAt'> = {
                name: 'Mi Firma Profesional',
                type: 'visual',
                html: oldHtml,
                originalHtml: oldStructure,
                scale: 0.8,
                isActive: true
              };

              await setDoc(newSigRef, {
                ...migratedSig,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
              });

              // Establecer como activa en el doc del usuario
              const userRef = doc(db, 'users', user.uid);
              await updateDoc(userRef, {
                activeSignatureId: newSigRef.id,
                signaturePreferences: {
                  includeInNewEmails: true,
                  includeInReplies: true,
                  includeInForwards: true
                }
              });

              setActiveSignatureId(newSigRef.id);
              setEditingSignatureId(newSigRef.id);
              showToast({
                message: 'Migración exitosa',
                subtitle: 'Tu firma antigua fue migrada al nuevo sistema.',
                severity: 'success'
              });
              setLoading(false);
              return;
            }
          }
        } catch (err) {
          console.error("Error al migrar firma antigua:", err);
        }
      }

      // MIGRACIÓN DE PROYECTOS DESDE PROJECTMANAGER (LOCALSTORAGE ANTIGUO EN MEMORIA)
      try {
        const localProjects = ProjectManager.getAllProjects();
        if (localProjects.length > 0) {
          console.log("MIGRACIÓN: Se encontraron proyectos antiguos para migrar a Firestore.", localProjects.length);
          for (const proj of localProjects) {
            const exists = sigsList.some(s => s.name.toLowerCase().trim() === proj.name.toLowerCase().trim());
            if (!exists) {
              const newSigRef = doc(collection(db, 'users', user.uid, 'signatures'));
              await setDoc(newSigRef, {
                name: proj.name,
                type: 'visual',
                html: proj.rawHTML,
                originalHtml: JSON.stringify(proj.blocks),
                scale: 0.8,
                isActive: false,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
              });
              console.log("MIGRACIÓN: Proyecto migrado a Firestore:", proj.name);
            }
          }
          // Limpiar proyectos de memoria para que no se migren de nuevo
          localProjects.forEach(p => ProjectManager.deleteProject(p.id));
        }
      } catch (err) {
        console.error("Error durante la migración de ProjectManager a Firestore:", err);
      }

      setSignatures(sigsList);
      // Establecer editingSignatureId si no está definido y hay firmas disponibles
      if (sigsList.length > 0 && !editingSignatureId) {
        // Encontrar la activa si existe o la primera
        const active = sigsList.find(s => s.isActive);
        setEditingSignatureId(active ? active.id : sigsList[0].id);
      }
      setLoading(false);
    }, (err) => {
      console.error("Error subscribing to signatures:", err);
      setLoading(false);
    });

    // 2. Suscripción a preferencias del usuario: users/{userId}
    const userRef = doc(db, 'users', user.uid);
    const unsubscribeUser = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setActiveSignatureId(data.activeSignatureId || null);
        if (data.signaturePreferences) {
          setPreferences({
            includeInNewEmails: data.signaturePreferences.includeInNewEmails ?? true,
            includeInReplies: data.signaturePreferences.includeInReplies ?? true,
            includeInForwards: data.signaturePreferences.includeInForwards ?? true,
            optimizationMode: data.signaturePreferences.optimizationMode ?? 'size',
            optimizationSizeLimit: data.signaturePreferences.optimizationSizeLimit ?? 250000
          });
        }
      }
    });

    return () => {
      unsubscribeSigs();
      unsubscribeUser();
    };
  }, [user]);

  // Obtener firma activa computada
  const activeSignature = useMemo(() => {
    if (!activeSignatureId) return null;
    return signatures.find(s => s.id === activeSignatureId) || null;
  }, [signatures, activeSignatureId]);

  // Guardar/Crear firma
  const saveSignature = async (
    name: string,
    type: 'visual' | 'html',
    html: string,
    originalHtml?: string,
    scale: number = 0.8,
    signatureId?: string
  ): Promise<string> => {
    if (!user) throw new Error('No user authenticated');
    if (!name.trim()) throw new Error('El nombre de la firma es obligatorio.');

    // Validar si el nombre ya existe para otra firma
    const existing = signatures.find(s => s.name.toLowerCase().trim() === name.toLowerCase().trim() && s.id !== signatureId);
    if (existing) {
      throw new Error('DUPLICATE_NAME');
    }

    let finalId = signatureId;
    try {
      // Optimizar recursos e imágenes pesados / Base64 automáticamente antes de guardar
      const optimizedHtml = await optimizeSignatureResourcesBeforeSave(html, user.uid);

      const sigData = {
        name: name.trim(),
        type,
        html: optimizedHtml,
        originalHtml: originalHtml || '',
        scale,
        updatedAt: serverTimestamp()
      };

      if (signatureId) {
        // Actualizar firma existente
        const sigRef = doc(db, 'users', user.uid, 'signatures', signatureId);
        await updateDoc(sigRef, sigData);
      } else {
        // Crear nueva firma
        const sigRef = doc(collection(db, 'users', user.uid, 'signatures'));
        await setDoc(sigRef, {
          ...sigData,
          isActive: signatures.length === 0, // la primera firma creada es activa por defecto
          createdAt: serverTimestamp()
        });
        finalId = sigRef.id;

        if (signatures.length === 0) {
          // Actualizar el activeSignatureId del usuario
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, { activeSignatureId: finalId });
        }
      }
      return finalId!;
    } catch (err) {
      console.error("Error saving signature:", err);
      throw err;
    }
  };

  // Activar firma
  const activateSignature = async (id: string | null) => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { activeSignatureId: id });

      // Actualizar isActive en todas las firmas para consistencia en la subcolección
      for (const sig of signatures) {
        const sigRef = doc(db, 'users', user.uid, 'signatures', sig.id);
        await updateDoc(sigRef, { isActive: sig.id === id });
      }

      setActiveSignatureId(id);
    } catch (err) {
      console.error("Error activating signature:", err);
      throw err;
    }
  };

  // Duplicar firma
  const duplicateSignature = async (id: string) => {
    if (!user) return;
    const target = signatures.find(s => s.id === id);
    if (!target) return;

    // Generar un nombre único para el duplicado
    let baseName = `${target.name} (Copia)`;
    let finalName = baseName;
    let counter = 1;
    while (signatures.some(s => s.name.toLowerCase().trim() === finalName.toLowerCase().trim())) {
      finalName = `${baseName} ${counter}`;
      counter++;
    }

    try {
      const sigRef = doc(collection(db, 'users', user.uid, 'signatures'));
      await setDoc(sigRef, {
        name: finalName,
        type: target.type,
        html: target.html,
        originalHtml: target.originalHtml || '',
        scale: target.scale,
        isActive: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Error duplicating signature:", err);
      throw err;
    }
  };

  // Renombrar firma
  const renameSignature = async (id: string, newName: string) => {
    if (!user) return;
    if (!newName.trim()) throw new Error('El nombre no puede estar vacío');

    const existing = signatures.find(s => s.name.toLowerCase().trim() === newName.toLowerCase().trim() && s.id !== id);
    if (existing) {
      throw new Error('DUPLICATE_NAME');
    }

    try {
      const sigRef = doc(db, 'users', user.uid, 'signatures', id);
      await updateDoc(sigRef, {
        name: newName.trim(),
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Error renaming signature:", err);
      throw err;
    }
  };

  // Eliminar firma
  const deleteSignature = async (id: string) => {
    if (!user) return;
    try {
      const sigRef = doc(db, 'users', user.uid, 'signatures', id);
      await deleteDoc(sigRef);

      // Si la firma eliminada era la activa, buscar otra para activar o dejar vacía
      if (activeSignatureId === id) {
        const remaining = signatures.filter(s => s.id !== id);
        const nextActiveId = remaining.length > 0 ? remaining[0].id : null;
        await activateSignature(nextActiveId);
      }
    } catch (err) {
      console.error("Error deleting signature:", err);
      throw err;
    }
  };

  // Actualizar preferencias
  const updatePreferences = async (newPrefs: Partial<SignaturePreferences>) => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      const updatedPreferences = { ...preferences, ...newPrefs };
      await updateDoc(userRef, { signaturePreferences: updatedPreferences });
      setPreferences(updatedPreferences);
    } catch (err) {
      console.error("Error updating preferences:", err);
      throw err;
    }
  };

  return (
    <SignatureContext.Provider
      value={{
        signatures,
        activeSignatureId,
        activeSignature,
        editingSignatureId,
        setEditingSignatureId,
        preferences,
        loading,
        saveSignature,
        activateSignature,
        duplicateSignature,
        renameSignature,
        deleteSignature,
        updatePreferences
      }}
    >
      {children}
    </SignatureContext.Provider>
  );
};

export const useSignatures = () => {
  const context = useContext(SignatureContext);
  if (!context) {
    throw new Error('useSignatures debe usarse dentro de un SignatureProvider');
  }
  return context;
};
