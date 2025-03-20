import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from './../../environments/environment.development';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError, catchError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ReportesService {
  private environment = environment.urlApi;

  private http = inject(HttpClient);
  constructor() { }

  getReports() {
    const url = `${this.environment}reportes/all`;
    return this.http.get<any>(url);
  }

  crearReporte(formData: FormData): Observable<any> {
    console.log('Enviando formData:', {
      usuario_id: formData.get('usuario_id'),
      categoria_id: formData.get('categoria_id'),
      imagen: formData.get('imagen'),
      descripcion: formData.get('descripcion'),
      ubicacion: formData.get('ubicacion')
    });

    return this.http.post(`${environment.urlApi}reportes/crear`, formData)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('Error completo del servidor:', error);
          
          if (error.status === 500) {
            return throwError(() => ({
              type: 'ServerError',
              message: error.error?.message || 'Error interno del servidor',
              error: error.error,
              details: error.error?.details || error.message
            }));
          }
          
          if (error.status === 422) {
            return throwError(() => ({
              type: 'ValidationError',
              message: error.error?.message || 'Error de validación',
              details: error.error?.errors || error.error
            }));
          }

          return throwError(() => ({
            type: 'GeneralError',
            message: 'Error al crear el reporte',
            error: error,
            details: error.message
          }));
        })
      );
  }

  analizarImagen(imagen: File): Observable<any> {
    const formData = new FormData();
    formData.append('imagen', imagen);

    return this.http.post(`${environment.urlApi}reportes/analizar-imagen`, formData)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          let errorMessage = 'Error al analizar la imagen';
          if (error.error?.message) {
            errorMessage = error.error.message;
          }
          return throwError(() => ({ message: errorMessage, status: error.status }));
        })
      );
  }
}
