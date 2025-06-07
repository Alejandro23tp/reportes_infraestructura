import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, NavigationEnd, RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { NotificacionesappService } from '../../services/notificacionesapp.service';

interface NotificacionHeader {
  id: number;
  titulo: string;
  mensaje: string;
  leido: boolean;
  created_at: string;
  updated_at: string;
}

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  providers: [DatePipe]
})
export class HeaderComponent implements OnInit, OnDestroy {
  private routerSubscription: Subscription = Subscription.EMPTY;
  isMapPage: boolean = false;

  userName: string = '';
  userRole: string = '';
  notificaciones: NotificacionHeader[] = [];
  noLeidasCount = 0;
  loading = false;
  showNotifications = false;

  constructor(
    private authService: AuthService, 
    private router: Router,
    private notificacionesService: NotificacionesappService,
    private datePipe: DatePipe
  ) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      window.scrollTo(0, 0);
    });
  }

  ngOnInit(): void {
    // Obtener información del usuario actual
    this.authService.getUser().subscribe(user => {
      if (user) {
        this.userName = user.nombre || '';
        this.userRole = user.rol || '';
        this.cargarNotificaciones();
      }
    });

    // Track route changes to update isMapPage
    this.routerSubscription = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.isMapPage = this.router.url.includes('/mapa');
    });
  }

  onLogout() {
    this.authService.logout();
  }

  ngOnDestroy(): void {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  toggleNotifications(event: Event): void {
    event.stopPropagation();
    this.showNotifications = !this.showNotifications;
    if (this.showNotifications) {
      this.cargarNotificaciones();
    }
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (!(event.target as HTMLElement).closest('.notification-container')) {
      this.showNotifications = false;
    }
  }

  cargarNotificaciones() {
    if (this.loading) return;
    
    this.loading = true;
    this.notificacionesService.getNotificaciones().subscribe({
      next: (response: any) => {
        if (response.success) {
          // Tomar solo las 3 notificaciones más recientes
          this.notificaciones = response.data.slice(0, 3);
          this.actualizarContadorNoLeidas();
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar notificaciones:', error);
        this.loading = false;
      }
    });
  }
  
  private actualizarContadorNoLeidas() {
    this.noLeidasCount = this.notificaciones.filter(notif => !notif.leido).length;
  }
  
  formatearFecha(fecha: string): string {
    return this.datePipe.transform(fecha, 'dd/MM/yyyy HH:mm') || '';
  }

  trackByNotificacion(index: number, notificacion: NotificacionHeader): number {
    return notificacion.id;
  }

  marcarComoLeida(notificacion: NotificacionHeader, event: Event) {
    event.stopPropagation();
    
    if (notificacion.leido) return;
    
    this.notificacionesService.marcarComoLeida(notificacion.id).subscribe({
      next: () => {
        notificacion.leido = true;
        this.actualizarContadorNoLeidas();
      },
      error: (error) => {
        console.error('Error al marcar notificación como leída:', error);
      }
    });
  }

  marcarTodasComoLeidas(event: Event) {
    event.stopPropagation();
    
    if (this.noLeidasCount === 0) return;
    
    this.notificacionesService.marcarTodasComoLeidas().subscribe({
      next: () => {
        this.notificaciones.forEach(notif => notif.leido = true);
        this.noLeidasCount = 0;
      },
      error: (error) => {
        console.error('Error al marcar todas las notificaciones como leídas:', error);
      }
    });
  }
}
