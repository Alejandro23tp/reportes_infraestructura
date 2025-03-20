import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable, map, tap } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {
    return this.authService.isAuthenticated().pipe(
      tap(isAuth => {
        console.log('Estado de autenticación:', isAuth);
        if (!isAuth) {
          console.log('Usuario no autenticado, redirigiendo a login');
          this.router.navigate(['/login']);
        }
      }),
      map(isAuth => {
        console.log('Permitiendo acceso:', isAuth);
        return isAuth;
      })
    );
  }
}
