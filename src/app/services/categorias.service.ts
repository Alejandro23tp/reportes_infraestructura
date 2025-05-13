import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CategoriasService {
  private environment = environment.urlApi;

  private http = inject(HttpClient);

  constructor() { } 

  crearCategoria(categoriaData: any): Observable<any> {
    return this.http.post(`${environment.urlApi}categorias`, categoriaData);
}

  getCategorias() {
    const url = `${this.environment}categorias/all`;
    return this.http.get<any>(url);
  }
}
