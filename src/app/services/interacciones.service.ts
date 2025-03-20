import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Reaccion, Comentario, ReaccionesResponse, ComentariosResponse } from '../interfaces/interacciones.interface';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class InteraccionesService {
  private apiUrl = environment.urlApi;

  constructor(private http: HttpClient) { }

  toggleReaccion(reporteId: number, tipoReaccion: number, usuarioId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}reacciones/toggle`, {
      reporte_id: reporteId,
      tipo_reaccion: tipoReaccion,
      usuario_id: usuarioId
    });
  }

  getReacciones(reporteId: number): Observable<ReaccionesResponse> {
    return this.http.get<ReaccionesResponse>(`${this.apiUrl}reacciones/${reporteId}`);
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

  getComentarios(reporteId: number): Observable<ComentariosResponse> {
    return this.http.get<ComentariosResponse>(`${this.apiUrl}comentarios/${reporteId}`);
  }

  eliminarComentario(comentarioId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}comentarios/${comentarioId}`);
  }
}
