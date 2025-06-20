import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  
  // No aplicar el interceptor a las peticiones de login
  if (req.url.includes('/auth/login')) {
    return next(req);
  }
  
  const token = authService.getToken();
  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Solo manejar errores 401 que no sean de login
      if (error.status === 401 && !error.url?.includes('/auth/login')) {
        authService.logout();
      }
      return throwError(() => error);
    })
  );
};
