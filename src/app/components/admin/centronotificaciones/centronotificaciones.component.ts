import { Component, OnInit, OnDestroy, HostBinding, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { NotificacionesService } from '../../../services/notificaciones.service';

@Component({
  selector: 'app-centronotificaciones',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './centronotificaciones.component.html',
  styleUrls: ['./centronotificaciones.component.scss']
})
export class CentronotificacionesComponent implements OnInit, OnDestroy {
  @HostBinding('class') class = 'h-100';
  @ViewChild('alertSound') alertSound!: ElementRef<HTMLAudioElement>;
  
  // Estado de la alerta actual
  alertaActiva = false;
  alertaTitulo = '';
  alertaMensaje = '';
  alertaUrgencia: 'bajo' | 'medio' | 'alto' | 'critico' = 'bajo';
  
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
    
    // Forzar detección de cambios
    this.cdr.detectChanges();
  }
  
  marcarComoLeida(notificacionId: string): void {
    const notificacion = this.historialNotificaciones.find(n => n.id === notificacionId);
    if (notificacion) {
      notificacion.leida = true;
      this.cdr.detectChanges();
    }
  }
  
  marcarTodasComoLeidas(): void {
    this.historialNotificaciones.forEach(notif => notif.leida = true);
    this.cdr.detectChanges();
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
    
    // Pequeño retraso para asegurar que la UI se actualice correctamente
    setTimeout(() => {
      // Actualizar estado de la alerta
      this.alertaActiva = true;
      this.alertaTitulo = titulo;
      this.alertaMensaje = mensaje;
      this.alertaUrgencia = urgencia;
      
      // Reproducir sonido de alerta
      this.reproducirSonido();
      
      // Forzar la detección de cambios inmediatamente
      this.cdr.detectChanges();
      
      // Iniciar efecto de parpadeo
      this.iniciarParpadeo(urgencia);
      
      // Cerrar automáticamente después de 10 segundos
      setTimeout(() => {
        this.cerrarAlerta();
      }, 10000);
    }, 10); // Un pequeño retraso de 10ms
  }
  
  cerrarAlerta(): void {
    if (this.alertaActiva) {
      this.alertaActiva = false;
      this.detenerParpadeo();
      
      // Forzar detección de cambios después de cerrar la alerta
      this.cdr.detectChanges();
    }
  }
  
  private reproducirSonido(): void {
    // Verificar si el elemento de audio está disponible
    if (this.alertSound && this.alertSound.nativeElement) {
      const audio = this.alertSound.nativeElement;
      // Reiniciar el audio en caso de que ya esté reproduciéndose
      audio.pause();
      audio.currentTime = 0;
      // Reproducir el sonido
      audio.play().catch(error => {
        console.error('Error al reproducir el sonido de alerta:', error);
      });
    }
  }
  
  private iniciarParpadeo(urgencia: 'bajo' | 'medio' | 'alto' | 'critico'): void {
    // Detener cualquier parpadeo anterior
    this.detenerParpadeo();
    
    // Configurar el parpadeo según la urgencia
    const intervalo = this.tiemposParpadeo[urgencia];
    let parpadeoActivo = false;
    
    this.intervaloParpadeo = setInterval(() => {
      parpadeoActivo = !parpadeoActivo;
      document.body.style.transition = 'background-color 0.3s';
      document.body.style.backgroundColor = parpadeoActivo 
        ? this.coloresFondo[urgencia] 
        : '';
      
      // Forzar detección de cambios en cada intervalo
      this.cdr.detectChanges();
    }, intervalo);
  }
  
  private detenerParpadeo(): void {
    if (this.intervaloParpadeo) {
      clearInterval(this.intervaloParpadeo);
      this.intervaloParpadeo = null;
      document.body.style.backgroundColor = '';
      document.body.style.transition = '';
    }
  }
}
