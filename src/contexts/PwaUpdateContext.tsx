import React, { createContext, useContext, useState, useEffect } from 'react';
import { registerSW } from 'virtual:pwa-register';

export type UpdateSafetyState = {
  isComposing: boolean;
  isSignatureEditing: boolean;
  hasUnsavedChanges: boolean;
  isUploading: boolean;
  isSending: boolean;
  isSavingDraft: boolean;
};

interface PwaUpdateContextType {
  safetyState: UpdateSafetyState;
  setSafetyState: (updater: Partial<UpdateSafetyState> | ((prev: UpdateSafetyState) => UpdateSafetyState)) => void;
  updatePending: boolean;
  showSuccessToast: boolean;
  setShowSuccessToast: (show: boolean) => void;
}

const PwaUpdateContext = createContext<PwaUpdateContextType | undefined>(undefined);

// Garantizar que la recarga solo ocurra exactamente una vez
let hasReloadedForUpdate = false;

export const PwaUpdateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [safetyState, setSafetyStateRaw] = useState<UpdateSafetyState>({
    isComposing: false,
    isSignatureEditing: false,
    hasUnsavedChanges: false,
    isUploading: false,
    isSending: false,
    isSavingDraft: false,
  });

  const [updatePending, setUpdatePending] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  const setSafetyState = (
    updater: Partial<UpdateSafetyState> | ((prev: UpdateSafetyState) => UpdateSafetyState)
  ) => {
    setSafetyStateRaw((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      return next;
    });
  };

  // Verificar si el estado actual es seguro para actualizar
  const isSafeToUpdate = () => {
    return (
      !safetyState.isComposing &&
      !safetyState.isSignatureEditing &&
      !safetyState.hasUnsavedChanges &&
      !safetyState.isUploading &&
      !safetyState.isSending &&
      !safetyState.isSavingDraft
    );
  };

  useEffect(() => {
    // Registrar el Service Worker desde el punto de entrada mediante virtual:pwa-register
    registerSW({
      immediate: true,
      onRegisteredSW(swUrl, registration) {
        console.log('[PWA] Service Worker registrado:', swUrl);
        if (registration) {
          setSwRegistration(registration);

          // Verificar periódicamente si hay actualizaciones
          setInterval(() => {
            registration.update().catch(err => console.error('[PWA] Error actualizando:', err));
          }, 60 * 1000); // Cada minuto
        }
      },
      onRegisterError(error) {
        console.error('[PWA] Error de Service Worker:', error);
      }
    });

    // Agregar el listener controllerchange para recargar exactamente una vez
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const handleControllerChange = () => {
        if (hasReloadedForUpdate) return;
        hasReloadedForUpdate = true;

        // Guardar bandera en sessionStorage para mostrar mensaje de éxito tras recargar
        sessionStorage.setItem('pixelmail_just_updated', 'true');
        console.log('[PWA] Nueva versión activada. Recargando página...');
        window.location.reload();
      };

      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
      return () => {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      };
    }
  }, []);

  // Mostrar aviso de éxito si acaba de actualizarse
  useEffect(() => {
    if (sessionStorage.getItem('pixelmail_just_updated') === 'true') {
      sessionStorage.removeItem('pixelmail_just_updated');
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 5000);
    }
  }, []);

  // Escuchar cuando el Service Worker tiene una versión en waiting
  useEffect(() => {
    if (!swRegistration) return;

    const checkWaitingSW = () => {
      const waiting = swRegistration.waiting;
      if (waiting) {
        setUpdatePending(true);

        if (isSafeToUpdate()) {
          console.log('[PWA] Estado seguro. Activando Service Worker inmediatamente...');
          waiting.postMessage({ type: 'SKIP_WAITING' });
        } else {
          console.log('[PWA] Actualización aplazada debido a cambios sin guardar o redacción activa.');
        }
      }
    };

    // Escuchar el evento updatefound
    swRegistration.addEventListener('updatefound', () => {
      const installing = swRegistration.installing;
      if (installing) {
        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed') {
            checkWaitingSW();
          }
        });
      }
    });

    // Verificar el estado inicial
    checkWaitingSW();
  }, [swRegistration, safetyState]);

  return (
    <PwaUpdateContext.Provider value={{ safetyState, setSafetyState, updatePending, showSuccessToast, setShowSuccessToast }}>
      {children}
    </PwaUpdateContext.Provider>
  );
};

export const usePwaUpdate = () => {
  const context = useContext(PwaUpdateContext);
  if (!context) {
    throw new Error('usePwaUpdate debe ser usado dentro de un PwaUpdateProvider');
  }
  return context;
};
