import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken } from 'firebase/messaging';
import { environment } from '../../../environments/environment';

const firebaseApp = initializeApp(environment.firebaseConfig);
const messaging = getMessaging(firebaseApp);

@Component({
  selector: 'app-notificaciones',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notificaciones.component.html',
  styleUrl: './notificaciones.component.scss'
})
export class NotificacionesComponent implements OnInit {
  isLoggedIn$: Observable<boolean>;
  notificationStatus$: Observable<{
    isEnabled: boolean;
    message: string;
  }>;

  constructor(
    private authService: AuthService,
    private http: HttpClient
  ) {
    this.isLoggedIn$ = this.authService.isAuthenticated();
    this.notificationStatus$ = this.checkNotificationStatus();
  }

  ngOnInit() {}

  checkNotificationStatus(): Observable<{
    isEnabled: boolean;
    message: string;
  }> {
    return this.http.get<{
      notifications_enabled: boolean;
      fcm_token: boolean;
    }>(`${environment.urlApiImages}api/notificaciones/status`).pipe(
      map(response => ({
        isEnabled: response.notifications_enabled && response.fcm_token,
        message: response.notifications_enabled && response.fcm_token
          ? 'Las notificaciones están activadas' 
          : response.notifications_enabled
            ? 'Activar token de notificaciones'
            : 'Activar notificaciones'
      })),
      catchError(() => of({
        isEnabled: false,
        message: 'Activar notificaciones'
      }))
    );
  }

  requestPermission() {
    this.isLoggedIn$.subscribe((isLoggedIn: boolean) => {
      if (!isLoggedIn) {
        console.error('Usuario no autenticado');
        return;
      }

      const token = this.authService.getToken();
      const apiUrl = `${environment.urlApiImages}api/subscribe`.trim();
      console.log('URL de la petición:', apiUrl); // Debug URL

      getToken(messaging, {
        vapidKey: environment.vapidKey,
      })
        .then((fcmToken) => {
          console.log('Token FCM:', fcmToken);
          this.http
            .post(
              apiUrl,
              { token: fcmToken },
              {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                  'Accept': 'application/json'
                }
              }
            )
            .subscribe({
              next: (response) => {
                console.log('Token enviado al backend:', response);
                // Refresh notification status
                this.notificationStatus$ = this.checkNotificationStatus();
              },
              error: (err) => {
                console.error('Error detallado:', {
                  message: err.message,
                  status: err.status,
                  url: apiUrl
                });
              }
            });
        })
        .catch((err) => console.error('Error al obtener token:', err));
    });
  }
}