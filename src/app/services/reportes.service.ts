import { HttpClient } from '@angular/common/http';
import { environment } from './../../environments/environment.development';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

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
    return this.http.post(`${environment.urlApi}reportes/crear`, formData);
  }

}
