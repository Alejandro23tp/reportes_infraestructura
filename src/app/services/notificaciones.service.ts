import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, from, Subject } from 'rxjs';
import { map, catchError, takeUntil, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { getMessaging, getToken, onMessage, deleteToken, isSupported, Messaging } from '@angular/fire/messaging';
import { initializeApp } from '@angular/fire/app';
import { AuthService } from './auth.service';

interface Device {
  dispositivo_id: string;
  ultimo_uso: string;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class NotificacionesService implements OnDestroy {
  private devices$ = new BehaviorSubject<Device[]>([]);
  private currentDeviceId: string;
  private messaging: Messaging | null = null;
  private tokenRefreshInProgress = false;
  private destroy$ = new Subject<void>();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    this.currentDeviceId = localStorage.getItem('device_id') || this.generateDeviceId();
    localStorage.setItem('device_id', this.currentDeviceId);
    
    // Inicializar Firebase Messaging
    this.initializeMessaging();
    
    // Verificar el token al iniciar
    this.initializeToken();
  }

  private async initializeToken() {
    try {
      const token = await this.getFCMToken();
      if (token) {
        await this.updateServerToken(token);
      }
    } catch (error) {
      console.error('Error al inicializar el token FCM:', error);
    }
  }

  private async initializeMessaging() {
    try {
      const isSupportedResult = await isSupported();
      if (isSupportedResult) {
        this.messaging = getMessaging();
        this.setupTokenRefreshListener();
        this.checkAndUpdateToken();
      }
    } catch (error) {
      console.error('Firebase Messaging is not supported', error);
    }
  }

  private setupTokenRefreshListener() {
    if (!this.messaging) return;

    // Escuchar mensajes entrantes
    onMessage(this.messaging, (payload) => {
      console.log('Mensaje recibido en servicio:', payload);
      this.mostrarNotificacionNativa(payload);
    });

    // Verificar el token al iniciar
    this.checkAndUpdateToken();
    
    // Usar el evento 'onMessage' para detectar cambios en el token
    // Firebase automáticamente maneja la actualización del token
    // y lo notifica a través de este evento
    
    // También podemos usar un observer para detectar cambios en el estado del token
    const observer = {
      next: (token: string | null) => {
        if (token) {
          console.log('Token FCM obtenido');
          this.updateServerToken(token);
        }
      },
      error: (error: any) => {
        console.error('Error en el observador de token:', error);
      },
      complete: () => {}
    };
    
    // Obtener y observar el token
    getToken(this.messaging, { vapidKey: environment.vapidKey })
      .then(observer.next)
      .catch(observer.error);
  }

  private async checkAndUpdateToken() {
    try {
      const token = await this.getFCMToken();
      if (token) {
        await this.updateServerToken(token);
      }
    } catch (error) {
      console.error('Error checking/updating FCM token:', error);
    }
  }

  private async getFCMToken(): Promise<string | null> {
    if (!this.messaging) return null;
    
    try {
      const currentToken = await getToken(this.messaging, {
        vapidKey: environment.vapidKey
      });
      return currentToken;
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  private async updateServerToken(token: string): Promise<void> {
    if (!this.authService.isAuthenticated()) return;
    
    try {
      await this.requestPermission(token, this.currentDeviceId);
      console.log('FCM token updated on server');
    } catch (error) {
      console.error('Error updating FCM token on server:', error);
    }
  }

  private generateDeviceId(): string {
    return 'device_' + Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  getCurrentDeviceId(): string {
    return this.currentDeviceId;
  }

  loadDevices() {
    return this.http.get<{dispositivos: Device[]}>(`${environment.urlApiImages}api/lista-dispositivos`).pipe(
      map(response => {
        this.devices$.next(response.dispositivos || []);
        return response.dispositivos || [];
      }),
      catchError(error => {
        console.error('Error al cargar dispositivos:', error);
        return of([]);
      })
    );
  }

  getDevices(): Observable<Device[]> {
    return this.devices$.asObservable();
  }

  checkNotificationStatus(): Observable<{isEnabled: boolean; message: string}> {
    return this.http.get<{
      success: boolean;
      notifications_enabled: boolean;
      fcm_token: boolean;
      message?: string;
    }>(`${environment.urlApiImages}api/notificaciones/status`, {
      params: {
        dispositivo_id: this.currentDeviceId
      }
    }).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message || 'Error al verificar el estado de notificaciones');
        }
        
        return {
          isEnabled: response.fcm_token,
          message: response.fcm_token
            ? 'Notificaciones activas en este dispositivo'
            : 'Activar notificaciones en este dispositivo'
        };
      }),
      catchError((error) => {
        console.error('Error en checkNotificationStatus:', error);
        return of({
          isEnabled: false,
          message: error.error?.message || 'Error al verificar el estado de notificaciones'
        });
      })
    );
  }

  async requestPermission(token: string, deviceId: string): Promise<any> {
    if (!token) {
      throw new Error('No FCM token provided');
    }
    try {
      if (!this.messaging) {
        console.error('Firebase Messaging no está disponible');
        return false;
      }

      // Solicitar permiso para notificaciones
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('Permiso de notificación denegado');
        return false;
      }

      // Obtener el token FCM
      const fcmToken = await getToken(this.messaging, {
        vapidKey: environment.vapidKey
      });

      if (!fcmToken) {
        console.error('No se pudo obtener el token FCM');
        return false;
      }

      console.log('Token FCM obtenido:', fcmToken ? '***' + fcmToken.substring(fcmToken.length - 8) : 'null');
      
      // Registrar el token en el servidor
      const deviceId = this.getCurrentDeviceId();
      const userAgent = navigator.userAgent;
      const response = await this.http.post<any>(
        `${environment.urlApiImages}api/subscribe`,
        { 
          token: fcmToken, 
          dispositivo_id: deviceId,
          dispositivo_nombre: userAgent,
          timestamp: new Date().toISOString()
        }
      ).toPromise();
      
      if (response && response.success) {
        localStorage.setItem('fcm_token', fcmToken);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error al suscribirse a notificaciones:', error);
      return false;
    }
  }

  async unsubscribe(deviceId: string): Promise<any> {
    // Delete the FCM token from the client
    if (this.messaging) {
      try {
        await deleteToken(this.messaging);
        console.log('FCM token deleted from client');
      } catch (error) {
        console.error('Error deleting FCM token:', error);
      }
    }

    // Notify the server to remove the token
    return this.http.post(
      `${environment.urlApiImages}api/unsubscribe`,
      { 
        dispositivo_id: deviceId,
        timestamp: new Date().toISOString()
      }
    ).toPromise();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private extraerUrgencia(cuerpo: string): 'baja' | 'media' | 'alta' | 'critico' {
    const cuerpoLower = cuerpo.toLowerCase();
    if (cuerpoLower.includes('crítico') || cuerpoLower.includes('critico')) return 'critico';
    if (cuerpoLower.includes('alta')) return 'alta';
    if (cuerpoLower.includes('media')) return 'media';
    return 'baja';
  }

      // Configurar el listener de mensajes
  private mostrarNotificacionNativa(payload: any) {
        console.log('Mensaje recibido:', payload);
        
        const notificacion = {
          titulo: payload.notification?.title || 'Nueva notificación',
          mensaje: payload.notification?.body || 'Tienes una nueva notificación',
          urgencia: this.extraerUrgencia(payload.notification?.body || '')
        };
        
        // Mostrar notificación nativa si está permitido
        if (payload.notification && Notification.permission === 'granted') {
          // Verificar si el navegador está en segundo plano
          const isBackground = document.visibilityState !== 'visible';
          
          // Configuración común para la notificación
          const notificationOptions: NotificationOptions = {
            body: notificacion.mensaje,
            // Hacer que la notificación sea persistente
            requireInteraction: true, // La notificación no se cierra automáticamente
            // Agregar un tag único para agrupar notificaciones similares
            tag: 'notificacion-' + Date.now(),
            // icon: '/assets/icons/icon-192x192.png'
          };
          
          // Mostrar notificación
          const notification = new Notification(notificacion.titulo, notificationOptions);
          
          // Manejar clic en la notificación
          notification.onclick = (event) => {
            event.preventDefault();
            window.focus();
            notification.close();
          };
          
          // Opcional: Cerrar la notificación después de un tiempo más largo (30 segundos)
          // solo como medida de seguridad para evitar notificaciones huérfanas
          setTimeout(() => {
            try {
              notification.close();
            } catch (e) {
              console.log('No se pudo cerrar la notificación:', e);
            }
          }, 30000);
        }
      }

  checkNotificationPermission(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!("Notification" in window)) {
        resolve(false);
        return;
      }
      
      if (Notification.permission === "granted") {
        resolve(true);
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
          resolve(permission === "granted");
        });
      } else {
        resolve(false);
      }
    });
  }
}
