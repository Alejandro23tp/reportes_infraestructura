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
      return this.http.post(`${environment.urlApi}reportes/crear`, formData)
        .pipe(
          catchError((error: HttpErrorResponse) => {
            console.error('Error completo:', error);
            let errorMessage = 'Error al crear el reporte';
            
            if (error.status === 422 && error.error?.errors) {
              return throwError(() => ({
                message: 'Error de validación',
                errors: error.error.errors
              }));
            }
            
            return throwError(() => ({
              message: error.error?.message || errorMessage,
              status: error.status
            }));
          })
        );
  }

  actualizarestadoReporte(id: number, estado: string): Observable<any> {
    const url = `${this.environment}reportes/actualizar/${id}`;
    return this.http.put(url, { estado });
  }

  getUbicaciones() {
    return this.http.get(`${this.environment}reportes/ubicaciones/all`);
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
