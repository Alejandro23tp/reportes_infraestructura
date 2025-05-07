import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideRouter } from '@angular/router';
import { routes } from './app/app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './app/interceptors/auth.interceptor';
import { isDevMode } from '@angular/core';
import { provideServiceWorker } from '@angular/service-worker';
import { initializeApp } from 'firebase/app';
import { getMessaging } from 'firebase/messaging';
import { environment } from './environments/environment';

const firebaseApp = initializeApp(environment.firebaseConfig);

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    }),
    {
      provide: 'FirebaseApp',
      useValue: firebaseApp
    },
    {
      provide: 'Messaging',
      useFactory: () => getMessaging(firebaseApp)
    }
  ]
}).catch((err) => console.error(err));