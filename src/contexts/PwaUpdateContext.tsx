import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
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

const UPDATE_CHECK_INTERVAL_MS = 15 * 60 * 1000;

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
  const updateSWRef = useRef<((reloadPage?: boolean) => Promise<void>) | null>(null);
  const activatingRef = useRef(false);

  const setSafetyState = (
    updater: Partial<UpdateSafetyState> | ((prev: UpdateSafetyState) => UpdateSafetyState)
  ) => {
    setSafetyStateRaw((prev) => (
      typeof updater === 'function' ? updater(prev) : { ...prev, ...updater }
    ));
  };

  const isSafeToUpdate = () => (
    !safetyState.isComposing &&
    !safetyState.isSignatureEditing &&
    !safetyState.hasUnsavedChanges &&
    !safetyState.isUploading &&
    !safetyState.isSending &&
    !safetyState.isSavingDraft
  );

  useEffect(() => {
    let intervalId: number | null = null;
    let onlineHandler: (() => void) | null = null;
    let visibilityHandler: (() => void) | null = null;
    let registrationRef: ServiceWorkerRegistration | undefined;
    let checkingUpdate = false;

    const checkForUpdate = async () => {
      if (!registrationRef || checkingUpdate) return;
      if (!navigator.onLine || document.visibilityState === 'hidden') return;

      checkingUpdate = true;
      try {
        await registrationRef.update();
      } catch (error) {
        // Una pérdida temporal de red no es un error de la aplicación.
        if (navigator.onLine) {
          console.warn('[PWA] No se pudo comprobar una actualización en este momento.', error);
        }
      } finally {
        checkingUpdate = false;
      }
    };

    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        setUpdatePending(true);
      },
      onOfflineReady() {
        console.info('[PWA] Pixel Mail está listo para abrirse sin conexión.');
      },
      onRegisteredSW(swUrl, registration) {
        registrationRef = registration;
        console.info('[PWA] Service Worker registrado:', swUrl);

        if (!registration) return;

        onlineHandler = () => {
          void checkForUpdate();
        };
        visibilityHandler = () => {
          if (document.visibilityState === 'visible') {
            void checkForUpdate();
          }
        };

        window.addEventListener('online', onlineHandler);
        document.addEventListener('visibilitychange', visibilityHandler);

        intervalId = window.setInterval(() => {
          void checkForUpdate();
        }, UPDATE_CHECK_INTERVAL_MS);
      },
      onRegisterError(error) {
        if (navigator.onLine) {
          console.warn('[PWA] No se pudo registrar el Service Worker.', error);
        } else {
          console.info('[PWA] Registro del Service Worker aplazado hasta recuperar conexión.');
        }
      }
    });

    updateSWRef.current = updateSW;

    return () => {
      updateSWRef.current = null;
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
      if (onlineHandler) {
        window.removeEventListener('online', onlineHandler);
      }
      if (visibilityHandler) {
        document.removeEventListener('visibilitychange', visibilityHandler);
      }
    };
  }, []);

  useEffect(() => {
    if (!updatePending || !isSafeToUpdate()) return;
    if (!updateSWRef.current || activatingRef.current) return;

    activatingRef.current = true;
    sessionStorage.setItem('pixelmail_just_updated', 'true');

    updateSWRef.current(true)
      .catch((error) => {
        sessionStorage.removeItem('pixelmail_just_updated');
        activatingRef.current = false;
        if (navigator.onLine) {
          console.warn('[PWA] La actualización quedó pendiente y se reintentará más adelante.', error);
        }
      });
  }, [updatePending, safetyState]);

  useEffect(() => {
    if (sessionStorage.getItem('pixelmail_just_updated') !== 'true') return;

    sessionStorage.removeItem('pixelmail_just_updated');
    setShowSuccessToast(true);
    const timeoutId = window.setTimeout(() => setShowSuccessToast(false), 5000);

    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <PwaUpdateContext.Provider
      value={{ safetyState, setSafetyState, updatePending, showSuccessToast, setShowSuccessToast }}
    >
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
