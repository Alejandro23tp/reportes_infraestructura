import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../services/admin.service';
import { toast } from 'ngx-sonner';

interface Reporte {
  id: number;
  titulo: string;
  descripcion: string;
  estado: string;
  urgencia: string;
  categoria: any;
  usuario: any;
  asignado_a?: any;
  created_at: string;
  nota_admin?: string;
}

interface CambioHistorial {
  campo: string;
  valor_anterior: string;
  nuevo_valor: string;
}

interface ComentarioHistorial {
  cambios: CambioHistorial[];
  nota?: string;
  motivo?: string;
}

interface ItemHistorial {
  id: number;
  tipo: string | null;
  usuario: {
    id: number;
    nombre: string;
    email: string;
  };
  fecha: string;
  fecha_humano: string;
  comentario: string | ComentarioHistorial;
}

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reportes.component.html',
  styleUrls: ['./reportes.component.scss']
})
export class ReportesComponent implements OnInit {
  @ViewChild('dropdownContainer') dropdownContainer!: ElementRef;
  isDropdownOpen = false;

   // Estado para controlar los menús desplegables
   dropdownStates: { [key: number]: boolean } = {}; 

   // Alternar el estado de un menú desplegable específico
   toggleDropdown(reporteId: number, event?: MouseEvent) {
     if (event) {
       event.stopPropagation();
     }
     // Cerrar otros menús abiertos
     Object.keys(this.dropdownStates).forEach(key => {
       const id = Number(key);
       if (id !== reporteId) {
         this.dropdownStates[id] = false;
       }
     });
     // Alternar el menú actual
     this.dropdownStates[reporteId] = !this.dropdownStates[reporteId];
   }
 
   // Cerrar un menú específico
   closeDropdown(reporteId: number, event?: MouseEvent) {
     if (event) {
       event.stopPropagation();
     }
     this.dropdownStates[reporteId] = false;
   }
 
   // Cerrar menús al hacer clic fuera
   @HostListener('document:click')
   onClick() {
     Object.keys(this.dropdownStates).forEach(key => {
       this.dropdownStates[Number(key)] = false;
     });
   }
 

  reportes: Reporte[] = [];
  reporteSeleccionado: Reporte | null = null;
  historial: ItemHistorial[] = [];
  
  // Lista de administradores para asignar reportes
  adminUsers: any[] = [];

  // Filtros
  filtros = {
    estado: '',
    categoria_id: '',
    urgencia: '',
    buscar: '',
    order_by: 'created_at',
    order_dir: 'desc',
    page: 1,
    per_page: 15
  };

  // Estados para los selects
  estados = ['Pendiente', 'En Proceso', 'Completado', 'Cancelado'];
  nivelesUrgencia = ['bajo', 'medio', 'alto', 'crítico'];
  categorias: any[] = [];
  
  // Paginación
  paginacion = {
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 0
  };

  // Modal states
  mostrarModalDetalle = false;
  mostrarModalHistorial = false;
  mostrarModalCambiarEstado = false;
  mostrarModalCambiarUrgencia = false;
  mostrarModalAsignar = false;

  
  // Formularios
  estadoForm = {
    estado: '',
    nota_admin: ''
  };
  
  urgenciaForm = {
    urgencia: ''
  };
  
  asignacionForm = {
    usuarioId: null as number | null
  };

  constructor(private adminService: AdminService) {
    this.loadAdminUsers();
  }

  // TrackBy function for ngFor to improve performance
  trackByReporteId(index: number, reporte: Reporte): number {
    return reporte.id;
  }

  ngOnInit(): void {
    this.cargarReportes();
    this.cargarCategorias();
  }

  // Cargar categorías
  cargarCategorias(): void {
    this.adminService.listarCategorias().subscribe({
      next: (categorias: any[]) => {
        if (Array.isArray(categorias)) {
          this.categorias = categorias;
        } else {
          console.warn('La respuesta de categorías no es un arreglo:', categorias);
          this.categorias = [];
        }
      },
      error: (error: any) => {
        console.error('Error al cargar las categorías:', error);
        this.categorias = [];
      }
    });
  }

  // Cargar lista de administradores
  loadAdminUsers(): void {
    this.adminService.listarUsuarios({ rol: 'admin' }).subscribe({
      next: (response) => {
        if (response && response.data) {
          this.adminUsers = response.data;
        }
      },
      error: (error) => {
        console.error('Error al cargar los administradores:', error);
      }
    });
  }

  cargarReportes(): void {
    this.adminService.listarReportes(this.filtros).subscribe({
      next: (response: any) => {
        this.reportes = response.data || [];
        this.paginacion = {
          current_page: response.current_page || 1,
          last_page: response.last_page || 1,
          per_page: response.per_page || 15,
          total: response.total || 0
        };
      },
      error: (error) => {
        console.error('Error al cargar reportes:', error);
      }
    });
  }


  verDetalle(reporte: Reporte): void {
    this.reporteSeleccionado = reporte;
    this.adminService.verReporte(reporte.id).subscribe({
      next: (data) => {
        this.reporteSeleccionado = data;
        this.mostrarModalDetalle = true;
      },
      error: (error) => {
        console.error('Error al cargar detalle:', error);
      }
    });
  }

  verHistorial(id: number): void {
    this.adminService.historialReporte(id).subscribe({
      next: (data: any) => {
        if (data.historial && Array.isArray(data.historial)) {
          this.historial = data.historial.map((item: any) => {
            try {
              if (typeof item.comentario === 'string') {
                item.comentario = JSON.parse(item.comentario);
              }
            } catch (e) {
              console.error('Error al parsear comentario:', e);
            }
            return item;
          });
        } else {
          this.historial = [];
        }
        this.mostrarModalHistorial = true;
      },
      error: (error) => {
        console.error('Error al cargar historial:', error);
        this.historial = [];
      }
    });
  }

  abrirCambiarEstado(reporte: Reporte): void {
    this.reporteSeleccionado = reporte;
    this.estadoForm.estado = reporte.estado;
    this.estadoForm.nota_admin = '';
    this.mostrarModalCambiarEstado = true;
  }

  cambiarEstado(): void {
    if (!this.reporteSeleccionado) return;
    
    this.adminService.cambiarEstadoReporte(
      this.reporteSeleccionado.id,
      this.estadoForm.estado,
      this.estadoForm.nota_admin || undefined
    ).subscribe({
      next: (response) => {
        this.cargarReportes();
        this.mostrarModalCambiarEstado = false;
        if (this.reporteSeleccionado) {
          this.reporteSeleccionado.estado = this.estadoForm.estado;
        }
      },
      error: (error) => {
        console.error('Error al cambiar estado:', error);
      }
    });
  }

  abrirCambiarUrgencia(reporte: Reporte): void {
    this.reporteSeleccionado = reporte;
    this.urgenciaForm.urgencia = reporte.urgencia;
    this.mostrarModalCambiarUrgencia = true;
  }

  cambiarUrgencia(): void {
    if (!this.reporteSeleccionado) return;
    
    this.adminService.cambiarPrioridadReporte(
      this.reporteSeleccionado.id,
      this.urgenciaForm.urgencia
    ).subscribe({
      next: (response) => {
        this.cargarReportes();
        this.mostrarModalCambiarUrgencia = false;
        if (this.reporteSeleccionado) {
          this.reporteSeleccionado.urgencia = this.urgenciaForm.urgencia;
        }
      },
      error: (error) => {
        console.error('Error al cambiar urgencia:', error);
      }
    });
  }

  abrirAsignarReporte(reporte: Reporte): void {
    this.reporteSeleccionado = reporte;
    this.asignacionForm.usuarioId = reporte.asignado_a?.id || null;
    this.mostrarModalAsignar = true;
  }

  asignarReporte(): void {
    if (!this.reporteSeleccionado || this.asignacionForm.usuarioId === null) {
      console.error('No se puede asignar: reporte o usuario no seleccionado');
      return;
    }
    
    console.log('Asignando reporte:', {
      reporteId: this.reporteSeleccionado.id,
      usuarioId: this.asignacionForm.usuarioId
    });
    
    this.adminService.asignarReporte(
      this.reporteSeleccionado.id,
      this.asignacionForm.usuarioId
    ).subscribe({
      next: (response) => {
        console.log('Reporte asignado exitosamente:', response);
        this.cargarReportes();
        this.mostrarModalAsignar = false;
        // Resetear el formulario
        this.asignacionForm = { usuarioId: null };
      },
      error: (error) => {
        console.error('Error al asignar reporte:', error);
        // Mostrar mensaje de error al usuario
        alert('Error al asignar el reporte. Por favor, intente de nuevo.');
      }
    });
  }




  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleString();
  }

  parsearComentario(comentario: string | any): any {
    if (typeof comentario === 'string') {
      try {
        return JSON.parse(comentario);
      } catch (e) {
        return { texto: comentario };
      }
    }
    return comentario;
  }

  // Manejo de eliminación de reportes
  async eliminarReporte(reporte: Reporte): Promise<void> {
    const confirmar = await this.mostrarConfirmacion(
      'Eliminar reporte',
      `¿Estás seguro de que deseas eliminar el reporte #${reporte.id}?`,
      'error',
      'Sí, eliminar',
      'Cancelar',
      'Esta acción no se puede deshacer.'
    );

    if (confirmar) {
      this.adminService.eliminarReporte(reporte.id).subscribe({
        next: () => {
          this.cargarReportes();
          toast.success('Reporte eliminado', {
            description: 'El reporte ha sido eliminado correctamente',
            duration: 3000
          });
        },
        error: (error) => {
          console.error('Error al eliminar el reporte:', error);
          toast.error('Error al eliminar', {
            description: 'No se pudo eliminar el reporte. Por favor, intente nuevamente.',
            duration: 3000
          });
        }
      });
    }
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

  // Métodos de utilidad
  calcularFinPagina(): number {
    return Math.min(this.paginacion.current_page * this.paginacion.per_page, this.paginacion.total);
  }

  // Navegación de páginas
  cambiarPagina(pagina: number): void {
    this.dropdownStates = {}; // Resetear estados
    this.filtros.page = pagina;
    this.cargarReportes();
  }

  // Ordenar por columna
  ordenarPor(columna: string): void {
    if (this.filtros.order_by === columna) {
      this.filtros.order_dir = this.filtros.order_dir === 'asc' ? 'desc' : 'asc';
    } else {
      this.filtros.order_by = columna;
      this.filtros.order_dir = 'asc';
    }
    this.cargarReportes();
  }

  // Aplicar filtros
  aplicarFiltros(): void {
    this.filtros.page = 1; // Resetear a primera página
    this.cargarReportes();
  }

  // Limpiar filtros
  limpiarFiltros(): void {
    this.filtros = {
      estado: '',
      categoria_id: '',
      urgencia: '',
      buscar: '',
      order_by: 'created_at',
      order_dir: 'desc',
      page: 1,
      per_page: 15
    };
    this.cargarReportes();
  }
}
