importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload);

  // Leer los datos del payload usando payload.data
  const notificationTitle = payload.data?.title || 'Notificación';
  const notificationBody = payload.data?.body || 'Cuerpo de la notificación';
  const messageId = payload.data?.messageId || '';

  // Verificar si ya existe una notificación con el mismo ID
  self.registration.getNotifications().then(notifications => {
    const existingNotification = notifications.find(notification => 
      notification.data && notification.data.messageId === messageId
    );

    if (!existingNotification && messageId) {
      const notificationOptions = {
        body: notificationBody,
        icon: '/assets/icons/icon-72x72.png',
        data: {
          messageId: messageId
        }
      };

      return self.registration.showNotification(notificationTitle, notificationOptions);
    } else {
      console.log('Notificación duplicada evitada:', messageId);
    }
  });
});