import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { AdminService } from '../../../services/admin.service';
import { Usuario } from '../../../models/usuario.model';
import { Pagination } from '../../../models/pagination.model';
import { toast } from 'ngx-sonner';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './usuarios.component.html',
  styleUrls: ['./usuarios.component.scss']
})
export class UsuariosComponent implements OnInit {
  // Controla qué menú desplegable está abierto
  openedDropdown: number | null = null;
  usuarios: Usuario[] = [];
  usuarioSeleccionado: Usuario | null = null;
  paginacion: Pagination | null = null;
  loading = false;
  error: string | null = null;
  filtros = {
    search: '',
    rol: '',
    activo: ''
  };
  roles = ['admin', 'usuario'];
  modoEdicion = false;
  selectedRole: string | null = null;
  nuevoUsuario = {
    nombre: '',
    email: '',
    cedula: '',
    direccion: '',
    password: '',
    password_confirmation: ''
  };

  constructor(private adminService: AdminService) {}

  @HostListener('document:click', ['$event'])
  onClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.role-dropdown')) {
      this.openedDropdown = null;
    }
  }

  toggleRoleDropdown(userId: number, event: Event) {
    event.stopPropagation();
    event.preventDefault();
    
    // Cerrar otros menús abiertos o abrir/cerrar el actual
    this.openedDropdown = this.openedDropdown === userId ? null : userId;
    
    // Si se está cerrando el menú, no hacemos nada más
    if (this.openedDropdown === null) return;
    
    // Forzar la detección de cambios
    setTimeout(() => {
      const menuElement = document.querySelector('.role-dropdown .absolute');
      if (menuElement) {
        menuElement.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  ngOnInit(): void {
    this.cargarUsuarios();
  }

  cargarUsuarios(pagina: number = 1): void {
    this.loading = true;
    this.error = null;
    
    // Crear un objeto de parámetros limpio
    const params: any = { 
      page: pagina,
      per_page: 10,
      ...this.filtros
    };
    
    // Eliminar propiedades vacías
    Object.keys(params).forEach(key => {
      if (params[key] === '' || params[key] === null || params[key] === undefined) {
        delete params[key];
      }
    });
    
    console.log('Enviando parámetros de búsqueda al servicio:', params);
    
    // Desplazarse al inicio de la tabla
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    this.adminService.listarUsuarios(params).subscribe({
      next: (response) => {
        console.log('Respuesta del servidor:', response);
        this.usuarios = response.data || [];
        this.paginacion = {
          current_page: response.current_page || 1,
          last_page: response.last_page || 1,
          per_page: response.per_page || 10,
          total: response.total || 0,
          first_page_url: response.first_page_url || '',
          last_page_url: response.last_page_url || '',
          next_page_url: response.next_page_url || null,
          prev_page_url: response.prev_page_url || null,
          path: response.path || '',
          from: response.from || 0,
          to: response.to || 0
        };
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar usuarios:', error);
        this.loading = false;
        this.error = 'Error al cargar los usuarios. Por favor, intente nuevamente.';
        toast.error(this.error);
        this.usuarios = [];
        this.paginacion = null;
      }
    });
  }

  seleccionarUsuario(usuario: Usuario): void {
    this.usuarioSeleccionado = { ...usuario };
    this.modoEdicion = true;
  }

  guardarCambios(): void {
    if (!this.usuarioSeleccionado) return;

    this.loading = true;
    this.error = null;

    this.adminService.actualizarUsuario(this.usuarioSeleccionado.id, this.usuarioSeleccionado)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (response) => {
          this.cargarUsuarios(this.paginacion?.current_page);
          this.cancelarEdicion();
          toast.success('Usuario actualizado correctamente');
        },
        error: (err) => {
          this.error = 'Error al actualizar el usuario. Por favor, intente nuevamente.';
          toast.error(this.error);
          console.error('Error al actualizar usuario:', err);
        }
      });
  }

  async cambiarRol(usuario: Usuario, rol: string, event?: Event): Promise<void> {
    if (event) event.stopPropagation();
    
    if (usuario.rol === rol) {
      this.selectedRole = null;
      return;
    }

    const confirmar = await this.mostrarConfirmacion(
      'Cambiar rol de usuario',
      `¿Está seguro de cambiar el rol de ${usuario.nombre} a ${rol}?`,
      'warning',
      'Sí, cambiar rol',
      'Cancelar'
    );

    if (confirmar) {
      this.loading = true;
      this.error = null;
      this.selectedRole = rol;

      this.adminService.cambiarRolUsuario(usuario.id, rol)
        .pipe(finalize(() => this.loading = false))
        .subscribe({
          next: (response) => {
            usuario.rol = rol; // Actualizar el rol localmente
            this.selectedRole = null;
            toast.success(`Rol cambiado a ${rol} correctamente`, {
              description: `El usuario ${usuario.nombre} ahora tiene el rol de ${rol}`,
              duration: 3000
            });
          },
          error: (err) => {
            this.error = 'Error al cambiar el rol. Por favor, intente nuevamente.';
            toast.error(this.error, {
              description: 'Ocurrió un error al intentar actualizar el rol del usuario',
              duration: 3000
            });
            console.error('Error al cambiar rol:', err);
            this.selectedRole = null;
          }
        });
    }
  }

  async cambiarEstado(usuario: Usuario): Promise<void> {
    const nuevoEstado = !usuario.activo;
    const accion = nuevoEstado ? 'activar' : 'desactivar';
    const titulo = nuevoEstado ? 'Activar usuario' : 'Desactivar usuario';
    const mensaje = nuevoEstado 
      ? `¿Está seguro de activar al usuario ${usuario.nombre}?`
      : `¿Está seguro de desactivar al usuario ${usuario.nombre}?`;
    const icono = nuevoEstado ? 'success' : 'warning';
    const textoBoton = nuevoEstado ? 'Sí, activar' : 'Sí, desactivar';

    const confirmar = await this.mostrarConfirmacion(
      titulo,
      mensaje,
      icono,
      textoBoton,
      'Cancelar'
    );

    if (confirmar) {
      this.loading = true;
      this.error = null;

      this.adminService.cambiarEstadoUsuario(usuario.id, nuevoEstado)
        .pipe(finalize(() => this.loading = false))
        .subscribe({
          next: (response) => {
            this.cargarUsuarios(this.paginacion?.current_page);
            toast.success(`Usuario ${nuevoEstado ? 'activado' : 'desactivado'} correctamente`, {
              description: nuevoEstado 
                ? `El usuario ${usuario.nombre} ha sido activado con éxito`
                : `El usuario ${usuario.nombre} ha sido desactivado`,
              duration: 3000
            });
          },
          error: (err) => {
            this.error = `Error al ${accion} el usuario. Por favor, intente nuevamente.`;
            toast.error(this.error, {
              description: 'Ocurrió un error al intentar cambiar el estado del usuario',
              duration: 3000
            });
            console.error(`Error al ${accion} usuario:`, err);
          }
        });
    }
  }

  async eliminarUsuario(usuario: Usuario): Promise<void> {
    const confirmar = await this.mostrarConfirmacion(
      'Eliminar usuario',
      `¿Está seguro de eliminar al usuario ${usuario.nombre}? Esta acción es irreversible.`,
      'error',
      'Sí, eliminar',
      'Cancelar',
      'Esta acción no se puede deshacer. Se eliminarán todos los datos asociados al usuario.'
    );

    if (confirmar) {
      this.loading = true;
      this.error = null;

      this.adminService.eliminarUsuario(usuario.id)
        .pipe(finalize(() => this.loading = false))
        .subscribe({
          next: (response) => {
            this.cargarUsuarios(this.paginacion?.current_page);
            toast.success('Usuario eliminado correctamente', {
              description: `El usuario ${usuario.nombre} ha sido eliminado del sistema`,
              duration: 3000
            });
          },
          error: (err) => {
            this.error = 'Error al eliminar el usuario. Por favor, intente nuevamente.';
            toast.error(this.error, {
              description: 'Ocurrió un error al intentar eliminar el usuario',
              duration: 3000
            });
            console.error('Error al eliminar usuario:', err);
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

  cancelarEdicion(): void {
    this.usuarioSeleccionado = null;
    this.modoEdicion = false;
  }

  limpiarFiltros(): void {
    this.filtros = {
      search: '',
      rol: '',
      activo: ''
    };
    this.cargarUsuarios();
    toast.info('Filtros restablecidos');
  }

  cambiarPagina(url: string | null): void {
    if (!url || this.loading) return;
    
    const urlObj = new URL(url);
    const pagina = urlObj.searchParams.get('page');
    if (pagina) {
      this.cargarUsuarios(parseInt(pagina, 10));
    }
  }

}
