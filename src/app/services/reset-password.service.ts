import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class ResetPasswordService {
 private environment = environment.urlApi;
 
 private http = inject(HttpClient);

  constructor() { }

  // Método para solicitar el link de restablecimiento
  enviarLinkRestablecimiento(email: string) {
    const url = `${this.environment}password/email`;
    return this.http.post<any>(url, { email });
  }

  // Método para hacer el reset de la contraseña con el token
  resetearContrasena(data: { email: string, token: string, password: string, password_confirmation: string }) {
    const url = `${this.environment}password/reset`;
    return this.http.post<any>(url, data);
  }
}
