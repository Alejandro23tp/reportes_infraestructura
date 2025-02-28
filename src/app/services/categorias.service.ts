import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class CategoriasService {
  private environment = environment.urlApi;

  private http = inject(HttpClient);

  constructor() { }

  getCategorias() {
    const url = `${this.environment}categorias/all`;
    return this.http.get<any>(url);
  }
}
