// Service Worker de Firebase Cloud Messaging para Pixel Mail
importScripts('https://www.gstatic.com/firebasejs/9.15.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.15.0/firebase-messaging-compat.js');

// Inicializar Firebase Compat en el Service Worker
firebase.initializeApp({
  apiKey: "AIzaSyDFAlVGtPnhE9_Vgc6OX1I3djPNDRnQWjg",
  authDomain: "pixel-mail-a78f6.firebaseapp.com",
  projectId: "pixel-mail-a78f6",
  storageBucket: "pixel-mail-a78f6.firebasestorage.app",
  messagingSenderId: "477387842345",
  appId: "1:477387842345:web:86815c2ba143575df18d38"
});

const messaging = firebase.messaging();

// Manejar mensajes recibidos en segundo plano (Background Message)
messaging.onBackgroundMessage((payload) => {
  console.log('[FCM SW] Mensaje recibido en segundo plano:', payload);

  const title = payload.notification?.title || payload.data?.title || 'Pixel Mail';
  const body = payload.notification?.body || payload.data?.body || 'Abre la aplicación para ver los detalles.';
  const emailId = payload.data?.emailId || '';
  const type = payload.data?.type || 'inbound_email';

  // Generar un tag consistente según las especificaciones
  let tag = 'pixelmail-general';
  if (emailId) {
    if (type === 'inbound_email') {
      tag = 'inbound-email-' + emailId;
    } else if (type === 'outbound_success') {
      tag = 'outbound-success-' + emailId;
    } else if (type === 'outbound_error') {
      tag = 'outbound-error-' + emailId;
    }
  }

  const notificationOptions = {
    body: body,
    icon: '/pwa-192x192.png',
    badge: '/favicon.svg', // Icono monocromático compatible
    tag: tag,
    data: {
      type: type,
      emailId: emailId,
      userId: payload.data?.userId || '',
      route: payload.data?.route || '/recibidos'
    },
    vibrate: [200, 100, 200],
    requireInteraction: type === 'outbound_error' // Persistente si es un error de envío
  };

  // Evitar duplicaciones por emailId usando la lista de notificaciones activas del registro
  return self.registration.getNotifications().then((notifications) => {
    const isDuplicate = notifications.some(n => n.tag === tag);
    if (isDuplicate) {
      console.log('[FCM SW] Evitando notificación duplicada para el tag:', tag);
      return;
    }
    return self.registration.showNotification(title, notificationOptions);
  });
});

// Manejar clic en las notificaciones recibidas
self.addEventListener('notificationclick', (event) => {
  console.log('[FCM SW] Clic en notificación detectado:', event);

  event.notification.close(); // Cerrar la notificación inmediatamente

  const data = event.notification.data || {};
  const emailId = data.emailId;
  const type = data.type;

  // Construir la ruta interna de Pixel Mail de forma segura sin aceptar URLs externas arbitrarias
  let targetRoute = '/recibidos';
  if (emailId) {
    if (type === 'inbound_email') {
      targetRoute = `/recibidos?open=${emailId}`;
    } else if (type === 'outbound_success') {
      targetRoute = `/enviados`; // o bandeja enviados
    } else if (type === 'outbound_error') {
      targetRoute = `/redactar?replyTo=${emailId}`; // Abrir borrador fallido
    }
  }

  // Buscar una ventana existente de Pixel Mail, enfocarla y navegar
  const promiseChain = clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then((windowClients) => {
    let matchingClient = null;

    for (let i = 0; i < windowClients.length; i++) {
      const windowClient = windowClients[i];
      if (windowClient.url.includes('mail.pixel.com.pe') || windowClient.url.includes('localhost')) {
        matchingClient = windowClient;
        break;
      }
    }

    if (matchingClient) {
      // Reutilizar pestaña existente y navegar de forma segura
      return matchingClient.focus().then((focusedClient) => {
        return focusedClient.navigate(targetRoute);
      });
    } else {
      // Abrir una nueva pestaña bajo nuestro origen seguro de mail.pixel.com.pe
      const origin = self.location.origin;
      return clients.openWindow(origin + targetRoute);
    }
  });

  event.waitUntil(promiseChain);
});
