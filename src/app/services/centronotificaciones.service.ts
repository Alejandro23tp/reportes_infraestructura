import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Notificacion {
  id: string;
  titulo: string;
  mensaje: string;
  fecha: Date;
  urgencia: 'baja' | 'media' | 'alta' | 'critico';
  leida: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CentronotificacionesService {
 private notificaciones: Notificacion[] = [];
  private notificaciones$ = new BehaviorSubject<Notificacion[]>([]);
  private alertaActiva = new BehaviorSubject<boolean>(false);

  constructor() {
    this.cargarNotificaciones();
  }

  obtenerNotificaciones() {
    return this.notificaciones$.asObservable();
  }

  obtenerAlertaActiva() {
    return this.alertaActiva.asObservable();
  }

  agregarNotificacion(notificacion: Omit<Notificacion, 'id' | 'fecha' | 'leida'>) {
    const nuevaNotificacion: Notificacion = {
      ...notificacion,
      id: Date.now().toString(),
      fecha: new Date(),
      leida: false
    };

    this.notificaciones.unshift(nuevaNotificacion);
    this.guardarNotificaciones();

    if (['alta', 'critico'].includes(notificacion.urgencia)) {
      this.activarAlerta();
    }
  }

  marcarComoLeida(id: string) {
    const notificacion = this.notificaciones.find(n => n.id === id);
    if (notificacion) {
      notificacion.leida = true;
      this.guardarNotificaciones();
    }
  }

  private activarAlerta() {
    this.alertaActiva.next(true);
    setTimeout(() => this.alertaActiva.next(false), 10000);
  }

  private guardarNotificaciones() {
    localStorage.setItem('notificaciones', JSON.stringify(this.notificaciones));
    this.notificaciones$.next([...this.notificaciones]);
  }

  private cargarNotificaciones() {
    try {
      const notificaciones = localStorage.getItem('notificaciones');
      if (notificaciones) {
        this.notificaciones = JSON.parse(notificaciones).map((n: any) => ({
          ...n,
          fecha: new Date(n.fecha)
        }));
        this.notificaciones$.next([...this.notificaciones]);
      }
    } catch (error) {
      console.error('Error al cargar notificaciones:', error);
    }
  }

  eliminarTodasLasNotificaciones() {
    this.notificaciones = [];
    localStorage.removeItem('notificaciones');
    this.notificaciones$.next([]);
  }

  marcarTodasComoLeidas() {
    this.notificaciones = this.notificaciones.map(notif => ({
      ...notif,
      leida: true
    }));
    this.guardarNotificaciones();
  }
}
