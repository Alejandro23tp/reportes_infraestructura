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

  historialReporte(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/reportes/${id}/historial`);
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

  // Exportar reportes
exportarReportes(params: {
  fecha_inicio?: string;
  fecha_fin?: string;
  estado?: string;
  categoria_id?: number;
} = {}): Observable<Blob> {
  let httpParams = new HttpParams();
  
  if (params) {
    if (params.fecha_inicio) {
      httpParams = httpParams.set('fecha_inicio', params.fecha_inicio);
    }
    
    if (params.fecha_fin) {
      httpParams = httpParams.set('fecha_fin', params.fecha_fin);
    }
    
    if (params.estado) {
      httpParams = httpParams.set('estado', params.estado);
    }
    
    if (params.categoria_id !== undefined) {
      httpParams = httpParams.set('categoria_id', params.categoria_id.toString());
    }
  }
  
  return this.http.get(`${this.apiUrl}/exportar/reportes`, {
    params: httpParams,
    responseType: 'blob',
    headers: {
      'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }
  });
}

// Exportar usuarios
// Exportar usuarios
exportarUsuarios(params: {
  rol?: string;
  activo?: boolean | string | null;
  fecha_registro_desde?: string;
  fecha_registro_hasta?: string;
} = {}): Observable<Blob> {
  let httpParams = new HttpParams();
  
  // Solo agregar parámetros que tengan valor
  if (params) {
    // Manejar el parámetro rol
    if (params.rol && params.rol !== '') {
      httpParams = httpParams.set('rol', params.rol.toLowerCase());
    }
    
    // Manejar el parámetro activo
    if (params.activo !== null && params.activo !== undefined) {
      // Convertir a booleano considerando diferentes formatos de entrada
      let activoValue: boolean;
      
      if (typeof params.activo === 'string') {
        // Para cuando viene del formulario como string
        activoValue = params.activo === 'true' || params.activo === '1';
      } else if (typeof params.activo === 'number') {
        // Por si acaso viene como número
        activoValue = params.activo === 1;
      } else {
        // Para booleanos directos
        activoValue = Boolean(params.activo);
      }
      
      // Enviar como booleano (true/false) en lugar de '1'/'0'
      httpParams = httpParams.set('activo', activoValue.toString());
    }
    
    // Manejar fechas
    if (params.fecha_registro_desde) {
      httpParams = httpParams.set('fecha_registro_desde', params.fecha_registro_desde);
    }
    
    if (params.fecha_registro_hasta) {
      httpParams = httpParams.set('fecha_registro_hasta', params.fecha_registro_hasta);
    }
  }
  
  return this.http.get(`${this.apiUrl}/exportar/usuarios`, {
    params: httpParams,
    responseType: 'blob',
    headers: {
      'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }
  });
}
}
