import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = 'http://localhost:8000/api/auth';
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  private userSubject = new BehaviorSubject<any>(null);

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.checkToken();
  }

  private checkToken() {
    const token = localStorage.getItem('token');
    if (token) {
      this.isAuthenticatedSubject.next(true);
      const user = this.decodeToken(token);
      this.userSubject.next(user);
    }
  }

  private decodeToken(token: string) {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
      return null;
    }
  }

  login(email: string, password: string): Observable<any> {
    console.log('Iniciando login con:', { email });
    return this.http.post(`${this.API_URL}/login`, { email, password })
      .pipe(
        tap((response: any) => {
          console.log('Respuesta login:', response);
          // Cambiado de token a access_token para coincidir con la respuesta del backend
          if (response?.access_token) {
            localStorage.setItem('token', response.access_token);
            this.isAuthenticatedSubject.next(true);
            const user = this.decodeToken(response.access_token);
            console.log('Usuario decodificado:', user);
            this.userSubject.next(user);
          } else {
            console.error('No se recibió access_token en la respuesta');
            throw new Error('No access_token received');
          }
        })
      );
  }

  register(userData: {
    nombre: string,
    email: string,
    password: string,
    cedula: string,
    direccion: string,
    rol: 'admin' | 'user'
  }): Observable<any> {
    console.log('Enviando datos de registro:', userData);
    return this.http.post(`${this.API_URL}/register`, userData).pipe(
      tap(response => console.log('Respuesta del registro:', response))
    );
  }

  logout(): void {
    localStorage.removeItem('token');
    this.isAuthenticatedSubject.next(false);
    this.userSubject.next(null);
    this.router.navigate(['/login']);
  }

  isAuthenticated(): Observable<boolean> {
    return this.isAuthenticatedSubject.asObservable();
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getUser(): Observable<any> {
    return this.userSubject.asObservable();
  }
}
