import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../services/admin.service';
import { Categoria } from '../../../models/categoria.model';
import { toast } from 'ngx-sonner';


@Component({
  selector: 'app-categorias',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './categorias.component.html',
  styleUrl: './categorias.component.scss'
})
export class CategoriasComponent implements OnInit {
  categorias: Categoria[] = [];
  nuevaCategoria: Categoria = { id: 0, nombre: '', es_autogenerada: 0, reportes_count: 0 };
  categoriaEditando: Categoria | null = null;

  // Getters para el formulario
  get nombreActual(): string {
    return this.categoriaEditando ? this.categoriaEditando.nombre : this.nuevaCategoria.nombre;
  }

  set nombreActual(value: string) {
    if (this.categoriaEditando) {
      this.categoriaEditando.nombre = value;
    } else {
      this.nuevaCategoria.nombre = value;
    }
  }



  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.obtenerCategorias();
  }

  obtenerCategorias(): void {
    this.adminService.listarCategorias().subscribe({
      next: (data) => {
        this.categorias = data;
      },
      error: (error) => {
        console.error('Error al obtener categorías:', error);
        toast.error('Error al cargar las categorías');
      }
    });
  }

  crearCategoria(): void {
    this.adminService.crearCategoria(this.nuevaCategoria).subscribe({
      next: (data) => {
        toast.success('Categoría creada correctamente');
        this.obtenerCategorias();
        this.nuevaCategoria = { id: 0, nombre: '', es_autogenerada: 0, reportes_count: 0 };
      },
      error: (error) => {
        console.error('Error al crear categoría:', error);
        toast.error('Error al crear la categoría');
      }
    });
  }

  editarCategoria(categoria: Categoria): void {
    this.categoriaEditando = { ...categoria };
  }

  actualizarCategoria(): void {
    if (!this.categoriaEditando) return;

    this.adminService.actualizarCategoria(this.categoriaEditando.id, this.categoriaEditando).subscribe({
      next: (data) => {
        toast.success('Categoría actualizada correctamente');
        this.obtenerCategorias();
        this.categoriaEditando = null;
      },
      error: (error) => {
        console.error('Error al actualizar categoría:', error);
        toast.error('Error al actualizar la categoría');
      }
    });
  }

  async eliminarCategoria(id: number): Promise<void> {
    const confirmado = await this.mostrarConfirmacion(
      'Eliminar categoría',
      '¿Estás seguro de eliminar esta categoría?',
      'warning',
      'Sí, eliminar',
      'Cancelar',
      'Esta acción no se puede deshacer.'
    );

    if (confirmado) {
      this.adminService.eliminarCategoria(id).subscribe({
        next: (data) => {
          toast.success('Categoría eliminada correctamente');
          this.obtenerCategorias();
        },
        error: (error) => {
          console.error('Error al eliminar categoría:', error);
          toast.error('Error al eliminar la categoría');
        }
      });
    }
  }

  cancelarEdicion(): void {
    this.categoriaEditando = null;
  }

  private mostrarConfirmacion(
    titulo: string,
    mensaje: string,
    tipo: 'success' | 'error' | 'warning' | 'info' = 'warning',
    textoBotonAceptar: string = 'Aceptar',
    textoBotonCancelar: string = 'Cancelar',
    descripcion?: string
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const toastId = toast.loading('Cargando...');
      
      // Simulamos un diálogo de confirmación con dos toasts consecutivos
      setTimeout(() => {
        toast.dismiss(toastId);
        
        // Mostrar el mensaje de confirmación usando toast con acciones
        toast(
          mensaje,
          {
            description: descripcion,
            duration: 10000, // 10 segundos para que el usuario decida
            action: {
              label: textoBotonAceptar,
              onClick: () => resolve(true)
            },
            cancel: {
              label: textoBotonCancelar,
              onClick: () => resolve(false)
            }
          }
        );
        
        // Cerrar automáticamente después de 10 segundos si no se toma una decisión
        setTimeout(() => {
          resolve(false);
        }, 10000);
      }, 300);
    });
  }
}
