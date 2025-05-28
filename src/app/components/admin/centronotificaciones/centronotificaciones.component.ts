import { Component, OnInit, OnDestroy, computed } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';

import { Subscription } from 'rxjs';
import { CentronotificacionesService, Notificacion } from '../../../services/centronotificaciones.service';

@Component({
  selector: 'app-centronotificaciones',
  standalone: true,
  imports: [CommonModule, TitleCasePipe],
  templateUrl: './centronotificaciones.component.html',
  styleUrls: ['./centronotificaciones.component.scss']
})
export class CentronotificacionesComponent implements OnInit, OnDestroy {
  notificaciones: Notificacion[] = [];
  private subscriptions = new Subscription();
  
  // Computed properties for template
  notificacionesNoLeidas = computed(() => 
    this.notificaciones.filter(n => !n.leida)
  );
  
  contadorNoLeidas = computed(() => this.notificacionesNoLeidas().length);
  
  getClaseContador() {
    const contador = this.contadorNoLeidas();
    if (contador < 5) {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    } else if (contador < 10) {
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    } else {
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
    }
  }
  
  constructor(private notificacionService: CentronotificacionesService) {}

  ngOnInit() {
    this.subscriptions.add(
      this.notificacionService.obtenerNotificaciones().subscribe(notifs => {
        this.notificaciones = notifs;
      })
    );
  }

  marcarComoLeida(notificacion: Notificacion, event: Event) {
    event.stopPropagation();
    this.notificacionService.marcarComoLeida(notificacion.id);
  }

  marcarTodasComoLeidas() {
    this.notificacionService.marcarTodasComoLeidas();
  }

  eliminarTodasLasNotificaciones() {
    if (confirm('¿Estás seguro de que deseas eliminar todas las notificaciones?')) {
      this.notificacionService.eliminarTodasLasNotificaciones();
    }
  }

  getUrgenciaClass(urgencia: string): string {
    const clases: {[key: string]: string} = {
      'critico': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      'alta': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      'media': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      'baja': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
    };
    return clases[urgencia] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  }

  getUrgenciaIcon(urgencia: string): string {
    const iconos: {[key: string]: string} = {
      'critico': 'fas fa-exclamation-circle',
      'alta': 'fas fa-exclamation-triangle',
      'media': 'fas fa-info-circle',
      'baja': 'fas fa-info-circle'
    };
    return iconos[urgencia] || 'fas fa-bell';
  }

  getTimeAgo(fecha: Date | string): string {
    const fechaObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
    const segundos = Math.floor((new Date().getTime() - fechaObj.getTime()) / 1000);
    
    const intervalos = {
      'año': 31536000,
      'mes': 2592000,
      'semana': 604800,
      'día': 86400,
      'hora': 3600,
      'minuto': 60,
      'segundo': 1
    };
    
    for (const [unidad, segundosEnUnidad] of Object.entries(intervalos)) {
      const intervalo = Math.floor(segundos / segundosEnUnidad);
      if (intervalo >= 1) {
        return `Hace ${intervalo} ${unidad}${intervalo !== 1 ? 's' : ''}`;
      }
    }
    
    return 'Ahora mismo';
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }
}
