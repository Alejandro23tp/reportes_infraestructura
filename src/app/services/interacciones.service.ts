import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, delay, shareReplay } from 'rxjs';
import { Reaccion, Comentario, ReaccionesResponse, ComentariosResponse } from '../interfaces/interacciones.interface';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class InteraccionesService {
  private apiUrl = environment.urlApi;
  private cache = new Map<string, Observable<any>>();

  constructor(private http: HttpClient) { }

  toggleReaccion(reporteId: number, tipoReaccion: number, usuarioId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}reacciones/toggle`, {
      reporte_id: reporteId,
      tipo_reaccion: tipoReaccion,
      usuario_id: usuarioId
    });
  }

  getReacciones(reporteId: number): Observable<ReaccionesResponse> {
    return this.http.get<ReaccionesResponse>(`${this.apiUrl}reacciones/${reporteId}`)
      .pipe(
        shareReplay(1)
      );
  }

  // Endpoints actualizados de comentarios
  getComentariosCount(reporteId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}comentarios/count/${reporteId}`);
  }

  getComentariosPrincipales(reporteId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}comentarios/principales/${reporteId}`);
  }

  getRespuestasComentario(comentarioId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}comentarios/respuestas/${comentarioId}`);
  }

  crearComentario(reporteId: number, contenido: string, usuarioId: number, padreId?: number): Observable<any> {
    const payload = {
      reporte_id: reporteId,
      contenido,
      usuario_id: usuarioId,
      padre_id: padreId || null // Asegurar que sea null si no hay valor
    };

    console.log('Payload comentario:', payload);
    
    return this.http.post(`${this.apiUrl}comentarios`, payload);
  }

  eliminarComentario(comentarioId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}comentarios/${comentarioId}`);
  }
}
