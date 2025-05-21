import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

interface Device {
  dispositivo_id: string;
  ultimo_uso: string;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class NotificacionesService {
  private devices$ = new BehaviorSubject<Device[]>([]);
  private currentDeviceId: string;

  constructor(private http: HttpClient) {
    this.currentDeviceId = localStorage.getItem('device_id') || this.generateDeviceId();
    localStorage.setItem('device_id', this.currentDeviceId);
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
    // Obtener el User-Agent actual del navegador
    const userAgent = navigator.userAgent;
    
    return this.http.post(
      `${environment.urlApiImages}api/subscribe`,
      { 
        token,
        dispositivo_id: deviceId,
        dispositivo_nombre: userAgent // Enviar el User-Agent como nombre del dispositivo
      }
    ).toPromise();
  }

  unsubscribe(deviceId: string): Observable<any> {
    return this.http.post(
      `${environment.urlApiImages}api/unsubscribe`,
      { dispositivo_id: deviceId }
    );
  }
}
