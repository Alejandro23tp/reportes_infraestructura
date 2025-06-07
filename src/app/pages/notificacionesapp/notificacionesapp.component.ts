import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { NotificacionesappService, Notificacion } from '../../services/notificacionesapp.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-notificacionesapp',
  standalone: true,
  imports: [CommonModule],
  providers: [DatePipe],
  templateUrl: './notificacionesapp.component.html',
  styleUrl: './notificacionesapp.component.scss'
})
export class NotificacionesappComponent implements OnInit {
  notificaciones: Notificacion[] = [];
  loading = true;
  error: string | null = null;
  noLeidasCount = 0;

  constructor(
    private notificacionesService: NotificacionesappService,
    private datePipe: DatePipe
  ) {}

  ngOnInit(): void {
    this.cargarNotificaciones();
    this.contarNoLeidas();
  }

  cargarNotificaciones(): void {
    this.loading = true;
    this.error = null;
    
    this.notificacionesService.getNotificaciones()
      .pipe(
        finalize(() => this.loading = false)
      )
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.notificaciones = response.data;
          } else {
            this.error = 'Error al cargar las notificaciones';
          }
        },
        error: (err) => {
          console.error('Error:', err);
          this.error = 'Error de conexión al cargar las notificaciones';
        }
      });
  }

  contarNoLeidas(): void {
    this.notificacionesService.contarNoLeidas()
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.noLeidasCount = response.count;
          }
        },
        error: (err) => {
          console.error('Error al contar no leídas:', err);
        }
      });
  }

  marcarComoLeida(notificacion: Notificacion): void {
    if (notificacion.leido) return;
    
    this.notificacionesService.marcarComoLeida(notificacion.id)
      .subscribe({
        next: (response) => {
          if (response.success) {
            notificacion.leido = true;
            this.noLeidasCount = Math.max(0, this.noLeidasCount - 1);
          }
        },
        error: (err) => {
          console.error('Error al marcar como leída:', err);
        }
      });
  }

  marcarTodasComoLeidas(): void {
    if (this.noLeidasCount === 0) return;
    
    this.notificacionesService.marcarTodasComoLeidas()
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.notificaciones.forEach(notif => notif.leido = true);
            this.noLeidasCount = 0;
          }
        },
        error: (err) => {
          console.error('Error al marcar todas como leídas:', err);
        }
      });
  }

  formatearFecha(fecha: string): string {
    return this.datePipe.transform(fecha, 'dd/MM/yyyy HH:mm') || '';
  }
}
