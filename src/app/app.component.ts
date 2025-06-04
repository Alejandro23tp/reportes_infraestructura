import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { HeaderComponent } from './components/header/header.component';
import { MobileNavComponent } from './components/mobile-nav/mobile-nav.component';
import { AuthService } from './services/auth.service';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { environment } from '../environments/environment';
import { NgxSonnerToaster } from 'ngx-sonner';
import { NotificacionesService } from './services/notificaciones.service';


const firebaseApp = initializeApp(environment.firebaseConfig);
const messaging = getMessaging(firebaseApp);

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, MobileNavComponent, CommonModule, NgxSonnerToaster],
  template: `
    <div class="flex flex-col min-h-screen">
      <app-header *ngIf="(isLoggedIn$ | async) === true && router.url !== '/mapa'"></app-header>
      <main class="flex-grow pb-16 md:pb-0">
        <router-outlet></router-outlet>
      </main>
      <app-mobile-nav *ngIf="(isLoggedIn$ | async) === true && router.url !== '/mapa'" class="md:hidden"></app-mobile-nav>
      <ngx-sonner-toaster theme="dark" richColors />
    </div>
  `
})
export class AppComponent implements OnInit, OnDestroy {
  isLoggedIn$: any;
  alertaActiva = false;
  private alertaSubscription: any;

  constructor(
    public router: Router,
    private authService: AuthService,
    private http: HttpClient,
    @Inject(NotificacionesService) private notificacionesService: NotificacionesService
  ) {
    this.isLoggedIn$ = this.authService.isAuthenticated();
  }

  async ngOnInit() {
  }

  private extraerUrgencia(cuerpo: string): 'baja' | 'media' | 'alta' | 'critico' {
    const cuerpoLower = cuerpo.toLowerCase();
    if (cuerpoLower.includes('crítico') || cuerpoLower.includes('critico')) return 'critico';
    if (cuerpoLower.includes('alto')) return 'alta';
    if (cuerpoLower.includes('medio')) return 'media';
    return 'baja';
  }

  ngOnDestroy() {
    if (this.alertaSubscription) {
      this.alertaSubscription.unsubscribe();
    }
  }

  requestPermission() {
    this.isLoggedIn$.subscribe((isLoggedIn: boolean) => {
      if (!isLoggedIn) {
        console.error('Usuario no autenticado');
        return;
      }

      const apiUrl = `${environment.urlApiImages}api/subscribe`.trim();
      console.log('Solicitando token FCM...');

      getToken(messaging, { vapidKey: environment.vapidKey })
        .then((fcmToken) => {
          console.log('Token FCM obtenido:', fcmToken);
          
          // El interceptor añadirá automáticamente el token de autenticación
          return this.http.post(apiUrl, { token: fcmToken }).toPromise();
        })
        .then((response) => {
          console.log('Token FCM registrado exitosamente:', response);
        })
        .catch((error) => {
          console.error('Error en el proceso de registro FCM:', {
            message: error.message,
            status: error.status,
            url: apiUrl,
            error: error.error
          });
        });
    });
  }
}
