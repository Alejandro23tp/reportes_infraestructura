import { Component, OnInit, OnDestroy, HostBinding, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { NotificacionesService } from '../../services/notificaciones.service';

@Component({
  selector: 'app-notificacionesbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notificacionesbar.component.html',
  styleUrl: './notificacionesbar.component.scss'
})
export class NotificacionesbarComponent implements OnInit, OnDestroy {
  @ViewChild('alertSound') alertSound!: ElementRef<HTMLAudioElement>;
  
  // Control de visibilidad del menú de notificaciones
  mostrarHistorial = false;
  
  // Estado de la alerta actual
  alertaActiva = false;
  alertaTitulo = '';
  alertaMensaje = '';
  alertaUrgencia: 'bajo' | 'medio' | 'alto' | 'critico' = 'bajo';
  
  // Clave para almacenar en localStorage
  private readonly STORAGE_KEY = 'notificaciones_historial_bar';
  
  // Historial de notificaciones
  historialNotificaciones: Array<{
    id: string;
    titulo: string;
    mensaje: string;
    urgencia: 'bajo' | 'medio' | 'alto' | 'critico';
    fecha: Date;
    leida: boolean;
  }> = [];
  
  // Control de tamaño máximo del historial
  private readonly MAX_HISTORIAL = 50;
  
  // Subscripción a notificaciones
  private notificacionSub: Subscription | null = null;
  
  // Tiempos de parpadeo en ms según la urgencia
  private readonly tiemposParpadeo = {
    bajo: 1000,    // 1 segundo
    medio: 700,    // 0.7 segundos
    alto: 400,     // 0.4 segundos
    critico: 200   // 0.2 segundos
  };
  
  // Colores de fondo según la urgencia
  private readonly coloresFondo = {
    bajo: 'rgba(0, 123, 255, 0.1)',    // Azul suave
    medio: 'rgba(255, 193, 7, 0.2)',   // Amarillo
    alto: 'rgba(255, 152, 0, 0.3)',    // Naranja
    critico: 'rgba(244, 67, 54, 0.4)'  // Rojo
  };
  
  // Estado del parpadeo
  private intervaloParpadeo: any = null;
  
  constructor(
    private notificacionesService: NotificacionesService,
    private cdr: ChangeDetectorRef
  ) {}
  
  ngOnInit(): void {
    // Cargar notificaciones guardadas
    this.cargarNotificaciones();
    
    // Suscribirse a las notificaciones
    this.notificacionSub = this.notificacionesService.notificacionRecibida$
      .subscribe(notificacion => {
        this.mostrarAlerta(
          notificacion.titulo,
          notificacion.mensaje,
          notificacion.urgencia
        );
      });
  }
  
  ngOnDestroy(): void {
    // Limpiar suscripciones
    if (this.notificacionSub) {
      this.notificacionSub.unsubscribe();
    }
    this.detenerParpadeo();
  }
  
  private generarIdUnico(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
  
  private cargarNotificaciones(): void {
    try {
      const notificacionesGuardadas = localStorage.getItem(this.STORAGE_KEY);
      if (notificacionesGuardadas) {
        const notificaciones = JSON.parse(notificacionesGuardadas);
        // Convertir las fechas de string a objetos Date
        this.historialNotificaciones = notificaciones.map((n: any) => ({
          ...n,
          fecha: new Date(n.fecha)
        }));
      }
    } catch (error) {
      console.error('Error al cargar notificaciones:', error);
      this.historialNotificaciones = [];
    }
  }
  
  private guardarNotificaciones(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.historialNotificaciones));
    } catch (error) {
      console.error('Error al guardar notificaciones:', error);
    }
  }
  
  private agregarAlHistorial(id: string, titulo: string, mensaje: string, urgencia: 'bajo' | 'medio' | 'alto' | 'critico'): void {
    // Crear nueva notificación
    const nuevaNotificacion = {
      id,
      titulo,
      mensaje,
      urgencia,
      fecha: new Date(),
      leida: false
    };
    
    // Agregar al inicio del array
    this.historialNotificaciones.unshift(nuevaNotificacion);
    
    // Limitar el tamaño del historial
    if (this.historialNotificaciones.length > this.MAX_HISTORIAL) {
      this.historialNotificaciones = this.historialNotificaciones.slice(0, this.MAX_HISTORIAL);
    }
    
    // Guardar en localStorage
    this.guardarNotificaciones();
    
    // Forzar detección de cambios
    this.cdr.detectChanges();
  }
  
  marcarComoLeida(notificacionId: string): void {
    const notificacion = this.historialNotificaciones.find(n => n.id === notificacionId);
    if (notificacion) {
      notificacion.leida = true;
      this.guardarNotificaciones();
      this.cdr.detectChanges();
    }
  }
  
  marcarTodasComoLeidas(): void {
    this.historialNotificaciones.forEach(notif => notif.leida = true);
    this.guardarNotificaciones();
    this.cdr.detectChanges();
  }
  
  limpiarNotificaciones(): void {
    if (confirm('¿Estás seguro de que deseas eliminar todas las notificaciones?')) {
      this.historialNotificaciones = [];
      this.guardarNotificaciones();
      this.cdr.detectChanges();
    }
  }
  
  getNotificacionesNoLeidas(): number {
    return this.historialNotificaciones.filter(n => !n.leida).length;
  }
  
  private mostrarAlerta(titulo: string, mensaje: string, urgencia: 'bajo' | 'medio' | 'alto' | 'critico'): void {
    // Detener cualquier alerta anterior primero
    this.cerrarAlerta();
    
    // Crear ID único para la notificación
    const notificacionId = this.generarIdUnico();
    
    // Agregar al historial
    this.agregarAlHistorial(notificacionId, titulo, mensaje, urgencia);
    
    // Actualizar estado de la alerta
    this.alertaActiva = true;
    this.alertaTitulo = titulo;
    this.alertaMensaje = mensaje;
    this.alertaUrgencia = urgencia;
    
    // Reproducir sonido de alerta
    this.reproducirSonido();
    
    // Forzar la detección de cambios
    this.cdr.detectChanges();
    
    // Iniciar efecto de parpadeo
    this.iniciarParpadeo(urgencia);
    
    // Cerrar automáticamente después de 10 segundos
    setTimeout(() => {
      this.cerrarAlerta();
    }, 10000);
  }
  
  private reproducirSonido(): void {
    try {
      if (this.alertSound && this.alertSound.nativeElement) {
        this.alertSound.nativeElement.currentTime = 0;
        this.alertSound.nativeElement.play().catch(e => console.warn('No se pudo reproducir el sonido:', e));
      }
    } catch (error) {
      console.warn('Error al reproducir sonido:', error);
    }
  }
  
  private iniciarParpadeo(urgencia: 'bajo' | 'medio' | 'alto' | 'critico'): void {
    // Detener cualquier parpadeo anterior
    this.detenerParpadeo();
    
    // Obtener el tiempo de parpadeo según la urgencia
    const tiempoParpadeo = this.tiemposParpadeo[urgencia];
    
    // Iniciar el parpadeo
    this.intervaloParpadeo = setInterval(() => {
      // La lógica de parpadeo se maneja en el template con clases CSS
    }, tiempoParpadeo);
  }
  
  private detenerParpadeo(): void {
    if (this.intervaloParpadeo) {
      clearInterval(this.intervaloParpadeo);
      this.intervaloParpadeo = null;
    }
  }
  
  cerrarAlerta(): void {
    this.alertaActiva = false;
    this.detenerParpadeo();
    this.cdr.detectChanges();
  }
  
  // Método para probar notificaciones
  probarNotificacion(urgencia: 'bajo' | 'medio' | 'alto' | 'critico' = 'bajo'): void {
    this.mostrarAlerta(
      `Notificación de prueba (${urgencia})`,
      'Esta es una notificación de prueba para verificar el funcionamiento del sistema.',
      urgencia
    );
  }
}
