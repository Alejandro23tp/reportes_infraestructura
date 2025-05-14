import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategoriasService } from '../../../services/categorias.service';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-panel.component.html',
})
export class AdminPanelComponent implements OnInit {
  nuevaCategoria = {
    nombre: '',
    descripcion: '',
    es_autogenerada: false
  };
  errorMessage = '';
  successMessage = '';

  constructor(private categoriasService: CategoriasService) {}

  ngOnInit(): void {}

  async crearCategoria() {
    if (!this.nuevaCategoria.nombre) {
      this.errorMessage = 'El nombre de la categoría es requerido';
      return;
    }

    try {
      const response = await this.categoriasService.crearCategoria(this.nuevaCategoria).toPromise();
      this.successMessage = 'Categoría creada exitosamente';
      this.limpiarFormulario();
    } catch (error) {
      this.errorMessage = 'Error al crear la categoría';
      console.error('Error:', error);
    }
  }

  private limpiarFormulario() {
    this.nuevaCategoria = {
      nombre: '',
      descripcion: '',
      es_autogenerada: false
    };
  }
}
