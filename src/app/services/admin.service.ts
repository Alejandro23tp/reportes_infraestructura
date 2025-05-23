import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = `${environment.urlApi}admin`;

  constructor(private http: HttpClient) { }

  // Dashboard y estadísticas
  getDashboardStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/dashboard`);
  }

  // Gestión de usuarios
  listarUsuarios(params?: any): Observable<any> {
    let httpParams = new HttpParams();
    
    if (params) {
      console.log('Parámetros recibidos en el servicio:', params);
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
          httpParams = httpParams.set(key, params[key]);
          console.log(`Agregando parámetro: ${key}=${params[key]}`);
        }
      });
    }
    
    const url = `${this.apiUrl}/usuarios`;
    console.log('URL de la solicitud:', url);
    console.log('Parámetros HTTP:', httpParams.toString());
    
    return this.http.get(url, { params: httpParams });
  }

  verUsuario(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/usuarios/${id}`);
  }

  actualizarUsuario(id: number, usuarioData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/usuarios/${id}`, usuarioData);
  }

  eliminarUsuario(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/usuarios/${id}`);
  }

  cambiarRolUsuario(id: number, rol: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/usuarios/${id}/rol`, { rol });
  }

  cambiarEstadoUsuario(id: number, activo: boolean): Observable<any> {
    return this.http.put(`${this.apiUrl}/usuarios/${id}/estado`, { activo });
  }

  // Gestión de reportes
  listarReportes(params?: any): Observable<any> {
    let httpParams = new HttpParams();
    
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    
    return this.http.get(`${this.apiUrl}/reportes`, { params: httpParams });
  }

  verReporte(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/reportes/${id}`);
  }

  cambiarEstadoReporte(id: number, estado: string, notaAdmin?: string): Observable<any> {
    const data: any = { estado };
    if (notaAdmin) {
      data.nota_admin = notaAdmin;
    }
    return this.http.put(`${this.apiUrl}/reportes/${id}/estado`, data);
  }

  cambiarPrioridadReporte(id: number, urgencia: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/reportes/${id}/prioridad`, { urgencia });
  }

  asignarReporte(id: number, usuarioId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/reportes/${id}/asignar`, { asignado_a: usuarioId });
  }

  eliminarReporte(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/reportes/${id}`);
  }

  // Gestión de categorías
  listarCategorias(): Observable<any> {
    return this.http.get(`${this.apiUrl}/categorias`);
  }

  crearCategoria(categoriaData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/categorias`, categoriaData);
  }

  actualizarCategoria(id: number, categoriaData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/categorias/${id}`, categoriaData);
  }

  eliminarCategoria(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/categorias/${id}`);
  }

  // Gestión de comentarios
  listarComentarios(params?: any): Observable<any> {
    let httpParams = new HttpParams();
    
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    
    return this.http.get(`${this.apiUrl}/comentarios`, { params: httpParams });
  }

  eliminarComentario(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/comentarios/${id}`);
  }

  // Notificaciones masivas
  enviarNotificacionMasiva(notificacionData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/notificaciones/enviar`, notificacionData);
  }

  // Exportación de datos
  exportarReportes(params?: any): Observable<any> {
    let httpParams = new HttpParams();
    
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    
    return this.http.get(`${this.apiUrl}/exportar/reportes`, { 
      params: httpParams,
      responseType: 'blob' as 'json' // Para manejar la descarga de archivos
    });
  }

  exportarUsuarios(params?: any): Observable<any> {
    let httpParams = new HttpParams();
    
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    
    return this.http.get(`${this.apiUrl}/exportar/usuarios`, { 
      params: httpParams,
      responseType: 'blob' as 'json' // Para manejar la descarga de archivos
    });
  }
}
