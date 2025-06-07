import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';


export interface Notificacion {
  id: number;
  usuario_id: number;
  titulo: string;
  mensaje: string;
  leido: boolean;
  created_at: string;
  updated_at: string;
  reporte?: any; // Ajusta el tipo según tu modelo de Reporte
}

@Injectable({
  providedIn: 'root'
})
export class NotificacionesappService {
  private apiUrl = `${environment.urlApi}notificaciones-app`;

  constructor(private http: HttpClient) { }

  /**
   * Obtener todas las notificaciones del usuario autenticado
   */
  getNotificaciones(): Observable<{success: boolean; data: Notificacion[]}> {
    return this.http.get<{success: boolean; data: Notificacion[]}>(`${this.apiUrl}/`);
  }

  /**
   * Marcar una notificación como leída
   * @param id ID de la notificación
   */
  marcarComoLeida(id: number): Observable<{success: boolean; message: string; data: Notificacion}> {
    return this.http.post<{success: boolean; message: string; data: Notificacion}>
      (`${this.apiUrl}/marcar-leida/${id}`, {});
  }

  /**
   * Obtener el conteo de notificaciones no leídas
   */
  contarNoLeidas(): Observable<{success: boolean; count: number}> {
    return this.http.get<{success: boolean; count: number}>(`${this.apiUrl}/contar-no-leidas`);
  }

  /**
   * Marcar todas las notificaciones como leídas
   */
  marcarTodasComoLeidas(): Observable<{success: boolean; message: string}> {
    return this.http.post<{success: boolean; message: string}>
      (`${this.apiUrl}/marcar-todas-leidas`, {});
  }
}
