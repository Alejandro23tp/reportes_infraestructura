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
    const params: any = { page: pagina };
    
    // Agregar solo los filtros que tengan valor
    if (this.filtros.search && this.filtros.search.trim() !== '') {
      // Asegurarse de que el término de búsqueda no esté vacío
      const searchTerm = this.filtros.search.trim();
      if (searchTerm) {
        params.search = searchTerm;
      }
    }
    
    if (this.filtros.rol && this.filtros.rol !== '') {
      params.rol = this.filtros.rol;
    }
    
    if (this.filtros.activo !== undefined && this.filtros.activo !== '') {
      // Asegurarse de que el valor sea numérico (0 o 1)
      params.activo = this.filtros.activo === '1' ? 1 : 0;
    }
    
    console.log('Enviando parámetros de búsqueda al servicio:', params);
    
    this.adminService.listarUsuarios(params)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (response) => {
          console.log('Respuesta del servidor:', response);
          this.usuarios = response.data;
          this.paginacion = {
            current_page: response.current_page,
            last_page: response.last_page,
            per_page: response.per_page,
            total: response.total,
            first_page_url: response.first_page_url,
            last_page_url: response.last_page_url,
            next_page_url: response.next_page_url,
            prev_page_url: response.prev_page_url,
            path: response.path,
            from: response.from,
            to: response.to
          };
        },
        error: (err) => {
          this.error = 'Error al cargar los usuarios. Por favor, intente nuevamente.';
          toast.error(this.error);
          console.error('Error al cargar usuarios:', err);
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

  cambiarRol(usuario: Usuario, rol: string, event?: Event): void {
    if (event) event.stopPropagation();
    
    if (usuario.rol === rol) {
      this.selectedRole = null;
      return;
    }

    if (confirm(`¿Está seguro de cambiar el rol de ${usuario.nombre} a ${rol}?`)) {
      this.loading = true;
      this.error = null;
      this.selectedRole = rol;

      this.adminService.cambiarRolUsuario(usuario.id, rol)
        .pipe(finalize(() => this.loading = false))
        .subscribe({
          next: (response) => {
            usuario.rol = rol; // Actualizar el rol localmente
            this.selectedRole = null;
            toast.success(`Rol cambiado a ${rol} correctamente`);
          },
          error: (err) => {
            this.error = 'Error al cambiar el rol. Por favor, intente nuevamente.';
            toast.error(this.error);
            console.error('Error al cambiar rol:', err);
            this.selectedRole = null;
          }
        });
    }
  }

  cambiarEstado(usuario: Usuario): void {
    const nuevoEstado = !usuario.activo;
    const accion = nuevoEstado ? 'activar' : 'desactivar';

    if (confirm(`¿Está seguro de ${accion} el usuario ${usuario.nombre}?`)) {
      this.loading = true;
      this.error = null;

      this.adminService.cambiarEstadoUsuario(usuario.id, nuevoEstado)
        .pipe(finalize(() => this.loading = false))
        .subscribe({
          next: (response) => {
            this.cargarUsuarios(this.paginacion?.current_page);
            toast.success(`Usuario ${nuevoEstado ? 'activado' : 'desactivado'} correctamente`);
          },
          error: (err) => {
            this.error = `Error al ${accion} el usuario. Por favor, intente nuevamente.`;
            toast.error(this.error);
            console.error(`Error al ${accion} usuario:`, err);
          }
        });
    }
  }

  eliminarUsuario(id: number): void {
    if (confirm('¿Está seguro de eliminar este usuario? Esta acción no se puede deshacer.')) {
      this.loading = true;
      this.error = null;

      this.adminService.eliminarUsuario(id)
        .pipe(finalize(() => this.loading = false))
        .subscribe({
          next: (response) => {
            this.cargarUsuarios(this.paginacion?.current_page);
            toast.success('Usuario eliminado correctamente');
          },
          error: (err) => {
            this.error = 'Error al eliminar el usuario. Por favor, intente nuevamente.';
            toast.error(this.error);
            console.error('Error al eliminar usuario:', err);
          }
        });
    }
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
    if (!url) return;
    
    const urlObj = new URL(url);
    const pagina = urlObj.searchParams.get('page');
    if (pagina) {
      this.cargarUsuarios(parseInt(pagina, 10));
    }
  }

}
