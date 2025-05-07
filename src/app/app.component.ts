import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './components/header/header.component';
import { MobileNavComponent } from './components/mobile-nav/mobile-nav.component';
import { AuthService } from './services/auth.service';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { environment } from '../environments/environment';

const firebaseApp = initializeApp(environment.firebaseConfig);
const messaging = getMessaging(firebaseApp);

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, MobileNavComponent, CommonModule],
  template: `
    <div class="flex flex-col min-h-screen">
      <app-header *ngIf="isLoggedIn$ | async"></app-header>
      <main class="flex-grow pb-16 md:pb-0">
        <router-outlet></router-outlet>
      </main>
      <app-mobile-nav *ngIf="isLoggedIn$ | async" class="md:hidden"></app-mobile-nav>
      <button
        *ngIf="isLoggedIn$ | async"
        (click)="requestPermission()"
        class="fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded"
      >
        Activar notificaciones
      </button>
    </div>
  `
})
export class AppComponent implements OnInit {
  isLoggedIn$;

  constructor(
    private authService: AuthService,
    private http: HttpClient
  ) {
    this.isLoggedIn$ = this.authService.isAuthenticated();
  }

  ngOnInit() {
    onMessage(messaging, (payload) => {
      if (document.visibilityState === 'visible') {
        // Solo mostrar como console.log si la app está visible
        console.log('Mensaje recibido en primer plano:', payload);
        // Aquí podrías implementar una notificación visual en la UI
        // por ejemplo, usando un servicio de notificaciones de Angular
      }
    });
  }

  requestPermission() {
    this.isLoggedIn$.subscribe((isLoggedIn: boolean) => {
      if (!isLoggedIn) {
        console.error('Usuario no autenticado');
        return;
      }

      const token = this.authService.getToken();

      getToken(messaging, {
        vapidKey: 'BDIq0xeM3djwWGabQElECWuJJnZCuJ10FtP9bKlKqKAIw8Cv_Yvwbe1qT2an6FHoySx6hyiV1QijB6Vc6zp_BJE'
      })
        .then((fcmToken) => {
          console.log('Token FCM:', fcmToken);
          this.http
            .post(
              'http://localhost:8000/api/subscribe',
              { token: fcmToken },
              {
                headers: {
                  Authorization: `Bearer ${token}`
                }
              }
            )
            .subscribe({
              next: (response) => console.log('Token enviado al backend:', response),
              error: (err) => console.error('Error al enviar token:', err)
            });
        })
        .catch((err) => console.error('Error al obtener token:', err));
    });
  }
}