import { UAParser } from 'ua-parser-js';
import { Component, OnInit } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { getMessaging, getToken, Messaging } from '@angular/fire/messaging';
import { NotificacionesService } from '../../services/notificaciones.service';
import { environment } from '../../../environments/environment';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Injector } from '@angular/core';

interface Device {
  dispositivo_id: string;
  ultimo_uso: string;
  [key: string]: any;
}

@Component({
  selector: 'app-ajustes',
  imports: [
    CommonModule,
    FormsModule,
  ],
  templateUrl: './ajustes.component.html',
  styleUrl: './ajustes.component.scss'
})
export class AjustesComponent implements OnInit {
  isLoggedIn$: Observable<boolean>;
  notificationStatus$: Observable<{ isEnabled: boolean; message: string }>;
  devices$ = new BehaviorSubject<Device[]>([]);
  loading = false;
  error: string | null = null;
  private messaging: Messaging;

  constructor(
    private authService: AuthService,
    private notificacionesService: NotificacionesService,
    private injector: Injector
  ) {
    this.isLoggedIn$ = this.authService.isAuthenticated();
    this.notificationStatus$ = this.notificacionesService.checkNotificationStatus();
    // Inicializar messaging correctamente
    this.messaging = getMessaging();
  }

  ngOnInit() {
    this.loadDevices();
  }

  loadDevices() {
    this.loading = true;
    this.error = null;
    
    this.notificacionesService.loadDevices().subscribe({
      next: (dispositivos) => {
        this.devices$.next(dispositivos);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar dispositivos:', err);
        this.error = 'Error al cargar los dispositivos';
        this.loading = false;
      }
    });
  }

  isCurrentDevice(device: Device): boolean {
    return device['dispositivo_id'] === this.getCurrentDeviceId();
  }

  getCurrentDeviceId(): string {
    return this.notificacionesService.getCurrentDeviceId();
  }

  async requestPermission() {
    this.loading = true;
    this.error = null;
    
    try {
      console.log('Iniciando solicitud de permiso...');
      
      const token = this.authService.getToken();
      const isLoggedIn = !!token;
      console.log('Estado de autenticación (desde token):', isLoggedIn);
      
      if (!isLoggedIn) {
        this.error = 'Debe iniciar sesión para activar notificaciones';
        this.loading = false;
        console.error('Error de autenticación: No hay token de autenticación');
        return;
      }

      console.log('Solicitando token FCM...');
      const fcmToken = await getToken(this.messaging, { 
        vapidKey: environment.vapidKey 
      }).catch(err => {
        console.error('Error al obtener token FCM:', err);
        throw err;
      });
      
      console.log('Token FCM obtenido:', fcmToken ? '***' + fcmToken.substring(fcmToken.length - 8) : 'null');
      
      if (!fcmToken) {
        throw new Error('No se pudo obtener el token FCM');
      }

      const deviceId = this.notificacionesService.getCurrentDeviceId();
      await this.notificacionesService.requestPermission(fcmToken, deviceId);
      
      // Actualizar el estado
      this.notificationStatus$ = this.notificacionesService.checkNotificationStatus();
      await this.loadDevices();
      
    } catch (error: any) {
      console.error('Error completo al activar notificaciones:', error);
      const errorMessage = error?.error?.message || error?.message;
      this.error = 'Error al activar notificaciones. ' + 
        (errorMessage || 'Por favor, intente nuevamente.');
    } finally {
      this.loading = false;
    }
  }

  async unsubscribe(deviceId: string) {
    if (!confirm('¿Está seguro de que desea desactivar las notificaciones en este dispositivo?')) {
      return;
    }

    this.loading = true;
    this.error = null;

    try {
      await this.notificacionesService.unsubscribe(deviceId).toPromise();
      
      // Actualizar el estado
      this.notificationStatus$ = this.notificacionesService.checkNotificationStatus();
      this.loadDevices();
    } catch (error) {
      console.error('Error al desactivar notificaciones:', error);
      this.error = 'Error al desactivar las notificaciones. Por favor, intente nuevamente.';
    } finally {
      this.loading = false;
    }
  }

  getDeviceInfo(device: any): string {
    // Usar dispositivo_nombre como User-Agent
    const ua = device.dispositivo_nombre || '';
    
    // Si no hay User-Agent, mostrar un nombre genérico
    if (!ua) {
      if (this.isCurrentDevice(device)) {
        return 'Este dispositivo';
      }
      return `Dispositivo ${device['dispositivo_id'].substring(0, 6)}...`;
    }
    
    const parser = new UAParser(ua);
    const result = parser.getResult();
    
    // Tipo de dispositivo
    let tipo = 'PC';
    if (result.device.type === 'mobile') tipo = 'Teléfono';
    else if (result.device.type === 'tablet') tipo = 'Tablet';
    
    // Marca y modelo
    let marca = 'Desconocido';
    
    // Para dispositivos móviles, priorizar el vendor del dispositivo
    if (result.device.vendor) {
      marca = result.device.vendor;
    } 
    // Para PCs, usar el nombre del navegador
    else if (result.browser && result.browser.name) {
      marca = result.browser.name;
    }
    
    const modelo = result.device.model ? ` ${result.device.model}` : '';
    
    // Sistema operativo
    const so = result.os.name ? ` - ${result.os.name}` : '';
    
    return `${tipo} - ${marca}${modelo}${so}`;
  }
}
