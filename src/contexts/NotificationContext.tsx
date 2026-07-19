import React, { createContext, useContext, useState, useEffect } from 'react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { isSupported } from 'firebase/messaging';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

export interface UserNotificationPreferences {
  enabled: boolean;
  inboundEmail: boolean;
  outboundSuccess: boolean;
  outboundError: boolean;
  foregroundSystemNotification: boolean;
  sound: boolean;
  vibration: boolean;
  showSender: boolean;
  showSubject: boolean;
}

interface NotificationContextType {
  token: string | null;
  permission: NotificationPermission;
  isCompatible: boolean;
  loading: boolean;
  deviceRegistered: boolean;
  preferences: UserNotificationPreferences | null;
  requestPermission: () => Promise<string | null>;
  disableNotifications: () => Promise<void>;
  sendTestNotification: () => Promise<void>;
  updatePreferences: (prefs: Partial<UserNotificationPreferences>) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Generar o recuperar deviceId estable en este navegador
const getOrCreateDeviceId = (): string => {
  let devId = localStorage.getItem('pixelmail_device_id');
  if (!devId) {
    devId = 'dev_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    localStorage.setItem('pixelmail_device_id', devId);
  }
  return devId;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [isCompatible, setIsCompatible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deviceRegistered, setDeviceRegistered] = useState(false);

  // Preferencias con valores por defecto recomendados
  const [preferences, setPreferences] = useState<UserNotificationPreferences>({
    enabled: true,
    inboundEmail: true,
    outboundSuccess: false,
    outboundError: true,
    foregroundSystemNotification: false,
    sound: true,
    vibration: true,
    showSender: true,
    showSubject: true
  });

  const deviceId = getOrCreateDeviceId();

  // Validar compatibilidad al cargar
  useEffect(() => {
    isSupported().then((supported) => {
      setIsCompatible(supported && 'Notification' in window);
      setLoading(false);
    });
  }, []);

  // Escuchar mensajes en primer plano (onMessage)
  useEffect(() => {
    if (!isCompatible || !user) return;

    try {
      const messaging = getMessaging();
      const unsubscribe = onMessage(messaging, (payload) => {
        console.log('[FCM] Mensaje recibido en primer plano:', payload);

        const { title, body, data } = payload.notification ? {
          title: payload.notification.title || 'Pixel Mail',
          body: payload.notification.body || '',
          data: payload.data || {}
        } : {
          title: payload.data?.title || 'Pixel Mail',
          body: payload.data?.body || '',
          data: payload.data || {}
        };

        // Mostrar notificación tipo Toast con acciones integradas si las preferencias lo permiten
        if (preferences.enabled) {
          showToast({
            message: title,
            subtitle: body,
            severity: data?.type === 'outbound_error' ? 'error' : 'success',
            duration: 6000
          });
        }
      });

      return () => unsubscribe();
    } catch (e) {
      console.warn('[FCM] Error inicializando listener de primer plano:', e);
    }
  }, [isCompatible, user, preferences]);

  // Sincronizar dispositivo en Firestore al cambiar usuario o token
  const syncDeviceToFirestore = async (fcmToken: string) => {
    if (!user) return;
    try {
      const deviceRef = doc(db, 'users', user.uid, 'devices', deviceId);
      await setDoc(deviceRef, {
        deviceId,
        token: fcmToken,
        platform: navigator.platform || 'unknown',
        browser: navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Safari',
        userAgent: navigator.userAgent,
        deviceType: /Mobi|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
        pwaInstalled: window.matchMedia('(display-mode: standalone)').matches,
        notificationsEnabled: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastSeenAt: serverTimestamp(),
        tokenUpdatedAt: serverTimestamp(),
        appVersion: '9.7',
        active: true
      });
      setDeviceRegistered(true);
      console.log('[FCM] Dispositivo registrado en Firestore:', deviceId);
    } catch (e) {
      console.error('[FCM] Error registrando dispositivo en Firestore:', e);
    }
  };

  // Solicitar Permiso y obtener Token
  const requestPermission = async (): Promise<string | null> => {
    if (!isCompatible) return null;
    try {
      setLoading(true);
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm === 'granted') {
        const messaging = getMessaging();
        const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
        if (!vapidKey) {
          console.warn('[FCM] Clave VAPID no configurada en VITE_FIREBASE_VAPID_KEY');
        }

        const fcmToken = await getToken(messaging, { vapidKey });
        if (fcmToken) {
          setToken(fcmToken);
          localStorage.setItem('pixelmail_fcm_token', fcmToken);
          if (user) {
            await syncDeviceToFirestore(fcmToken);
          }
          setLoading(false);
          return fcmToken;
        }
      }
    } catch (e) {
      console.error('[FCM] Error solicitando permiso o token:', e);
    }
    setLoading(false);
    return null;
  };

  // Desactivar notificaciones para este dispositivo
  const disableNotifications = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const deviceRef = doc(db, 'users', user.uid, 'devices', deviceId);
      // Desactivar lógicamente en Firestore
      await updateDoc(deviceRef, {
        active: false,
        notificationsEnabled: false,
        updatedAt: serverTimestamp()
      });
      setToken(null);
      setDeviceRegistered(false);
      localStorage.removeItem('pixelmail_fcm_token');
      console.log('[FCM] Dispositivo desactivado en este dispositivo.');
    } catch (e) {
      console.error('[FCM] Error desactivando dispositivo:', e);
    } finally {
      setLoading(false);
    }
  };

  // Sincronizar preferencias del usuario en Firestore (en users/{userId})
  const updatePreferences = async (newPrefs: Partial<UserNotificationPreferences>) => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      const updated = { ...preferences, ...newPrefs };
      await setDoc(userRef, { notifications: updated }, { merge: true });
      setPreferences(updated);
      showToast({ message: 'Preferencias de notificaciones actualizadas', severity: 'success' });
    } catch (e) {
      console.error('[FCM] Error guardando preferencias:', e);
    }
  };

  // Cargar preferencias iniciales del usuario
  useEffect(() => {
    if (!user) return;
    // Intentar leer preferencias desde Firestore
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.notifications) {
          setPreferences(data.notifications);
        }
      }
    });

    // Auto-recuperar token si el permiso ya estaba otorgado
    if (isCompatible && Notification.permission === 'granted') {
      const savedToken = localStorage.getItem('pixelmail_fcm_token');
      if (savedToken) {
        setToken(savedToken);
        syncDeviceToFirestore(savedToken);
      } else {
        // Solicitar token silenciosamente
        requestPermission();
      }
    }

    return () => unsubscribe();
  }, [user, isCompatible]);

  // Enviar notificación de prueba
  const sendTestNotification = async () => {
    if (!user || !token) {
      alert('Debes activar las notificaciones en este dispositivo primero.');
      return;
    }

    try {
      showToast({ message: 'Enviando notificación de prueba...', severity: 'info' });
      const idToken = await user.getIdToken();
      // Llamar al backend de pruebas de notificaciones
      const response = await fetch(`${import.meta.env.VITE_SEND_EMAIL_URL.replace('/sendEmail', '/sendTestPush')}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ token })
      });

      if (response.ok) {
        console.log('[FCM] Push de prueba solicitado con éxito');
      } else {
        const errData = await response.json();
        throw new Error(errData.error || 'Error en el servidor');
      }
    } catch (e: any) {
      alert('Error enviando push de prueba: ' + e.message);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        token,
        permission,
        isCompatible,
        loading,
        deviceRegistered,
        preferences,
        requestPermission,
        disableNotifications,
        sendTestNotification,
        updatePreferences
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications debe ser usado dentro de un NotificationProvider');
  }
  return context;
};

// Listener local de Firestore para auto-recuperar preferencias silenciosamente
import { onSnapshot } from 'firebase/firestore';
