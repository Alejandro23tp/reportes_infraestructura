importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAalDt7642tucb7dqv22IjIiUvvkqPc-cs",
  authDomain: "reportescomunitarios-93442.firebaseapp.com",
  projectId: "reportescomunitarios-93442",
  storageBucket: "reportescomunitarios-93442.firebasestorage.app",
  messagingSenderId: "1014646354166",
  appId: "1:1014646354166:web:16b5fe261e7ad677247cd7"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload);

  // Leer los datos del payload usando payload.notification
  const notificationTitle = payload.notification?.title || 'Notificación';
  const notificationBody = payload.notification?.body || 'Cuerpo de la notificación';

  // Generar un messageId único si no está presente (aunque con withNotification no lo enviamos explícitamente)
  const messageId = payload.messageId || payload.fcm?.messageId || Date.now().toString();

  // Verificar si ya existe una notificación con el mismo ID
  self.registration.getNotifications().then(notifications => {
    const existingNotification = notifications.find(notification => 
      notification.data && notification.data.messageId === messageId
    );

    if (!existingNotification) {
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