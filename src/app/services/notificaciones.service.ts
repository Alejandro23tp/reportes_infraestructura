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
    
    // Initialize Firebase Messaging
    this.initializeMessaging();
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
      console.log('Mensaje recibido:', payload);
      // Aquí puedes manejar los mensajes en primer plano
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
          console.log('Nuevo token generado');
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
    
    const userAgent = navigator.userAgent;
    
    try {
      const response = await this.http.post(
        `${environment.urlApiImages}api/subscribe`,
        { 
          token,
          dispositivo_id: deviceId,
          dispositivo_nombre: userAgent,
          timestamp: new Date().toISOString()
        }
      ).toPromise();
      
      // Store the token in localStorage for future reference
      localStorage.setItem('fcm_token', token);
      return response;
    } catch (error) {
      console.error('Error in requestPermission:', error);
      throw error;
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
}
