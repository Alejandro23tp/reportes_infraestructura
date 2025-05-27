import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, FormControl, Validators, ReactiveFormsModule, FormsModule, NonNullableFormBuilder } from '@angular/forms';
import { AdminService } from '../../../services/admin.service';
import { CommonModule } from '@angular/common';
import { toast } from 'ngx-sonner';
import { take, takeUntil, Subject } from 'rxjs';

interface Usuario {
  id: number;
  nombre: string;
  email: string;
}

type TipoDestino = 'todos' | 'rol' | 'usuarios';

interface NotificationFormValue {
  titulo: string | null;
  mensaje: string | null;
  tipoDestino: TipoDestino;
  rol: string | null;
  usuarios: number[];
}

@Component({
  selector: 'app-notificacionesmasivas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './notificacionesmasivas.component.html',
  styleUrls: ['./notificacionesmasivas.component.scss']
})
export class NotificacionesmasivasComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  notificationForm: FormGroup<{
    titulo: FormControl<string>;
    mensaje: FormControl<string>;
    tipoDestino: FormControl<TipoDestino>;
    rol: FormControl<string>;
    usuarios: FormControl<number[]>;
  }>;
  
  isLoading = false;
  responseData: any = null;
  
  roles = [
    { value: 'admin', label: 'Administradores' },
    { value: 'usuario', label: 'Usuarios' },
  ] as const;

  usuarios: any[] = [];
  usuariosFiltrados: any[] = [];
  usuariosPaginados: any[] = [];
  cargandoUsuarios = false;
  
  // Variables de paginación
  paginaActual = 1;
  itemsPorPagina = 3; // Mostrar 3 usuarios por página
  totalPaginas = 1;

  buscadorUsuario = new FormControl('');
  mostrarDropdown = false;
  usuariosSeleccionados: Set<number> = new Set();

  constructor(
    private fb: NonNullableFormBuilder,
    private adminService: AdminService
  ) {
    this.notificationForm = this.fb.group({
      titulo: this.fb.control('', [Validators.required, Validators.maxLength(255)]),
      mensaje: this.fb.control('', [Validators.required]),
      tipoDestino: this.fb.control<TipoDestino>('todos', [Validators.required]),
      rol: this.fb.control(''),
      usuarios: this.fb.control<number[]>([])
    });
  }

  ngOnInit(): void {
    this.cargarUsuarios();
    
    // Initialize filtered users with all users
    this.usuariosFiltrados = [];
    
    // Listen for search input changes
    this.buscadorUsuario.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(searchTerm => {
      if (searchTerm && searchTerm.trim() !== '') {
        this.filtrarUsuarios(searchTerm);
      } else {
        this.usuariosFiltrados = [...this.usuarios];
      }
    });
    
    // Listen for changes in destination type
    const tipoDestinoControl = this.notificationForm.get('tipoDestino');
    if (tipoDestinoControl) {
      tipoDestinoControl.valueChanges.pipe(
        take(1) // Take only the first emission to set initial state
      ).subscribe();
      
      tipoDestinoControl.valueChanges.pipe(
        takeUntil(this.destroy$)
      ).subscribe((value) => {
        const rolControl = this.notificationForm.get('rol');
        const usuariosControl = this.notificationForm.get('usuarios');
        
        if (value === 'rol') {
          rolControl?.setValidators([Validators.required]);
          usuariosControl?.clearValidators();
        } else if (value === 'usuarios') {
          usuariosControl?.setValidators([Validators.required]);
          rolControl?.clearValidators();
        } else {
          rolControl?.clearValidators();
          usuariosControl?.clearValidators();
        }
        
        rolControl?.updateValueAndValidity();
        usuariosControl?.updateValueAndValidity();
      });
    }
  }

  async cargarUsuarios(): Promise<void> {
    this.cargandoUsuarios = true;
    try {
      const response = await this.adminService.listarUsuarios({ activo: 1 })
        .pipe(take(1))
        .toPromise();

      if (response?.data && Array.isArray(response.data) && response.data.length > 0) {
        this.usuarios = response.data;
        this.usuariosFiltrados = [...this.usuarios];
      } else {
        this.handleError('No se encontraron usuarios activos');
      }
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
      this.handleError('Error al cargar la lista de usuarios');
    } finally {
      this.cargandoUsuarios = false;
    }
  }

  private handleError(message: string): void {
    // Mostrar notificación de error al usuario
    toast.error(message);
    
    // Usar datos de prueba para desarrollo
    this.usuarios = [
      { id: 1, nombre: 'Usuario de Prueba 1', email: 'usuario1@ejemplo.com' },
      { id: 2, nombre: 'Usuario de Prueba 2', email: 'usuario2@ejemplo.com' },
      { id: 3, nombre: 'Administrador', email: 'admin@ejemplo.com' }
    ];
    this.usuariosFiltrados = [...this.usuarios];
  }

  filtrarUsuarios(searchTerm: string): void {
    if (!searchTerm || searchTerm.trim() === '') {
      this.usuariosFiltrados = [...this.usuarios];
    } else {
      const busqueda = searchTerm.toLowerCase().trim();
      this.usuariosFiltrados = this.usuarios.filter(usuario => {
        const nombreMatch = usuario.nombre && usuario.nombre.toLowerCase().includes(busqueda);
        const emailMatch = usuario.email && usuario.email.toLowerCase().includes(busqueda);
        return nombreMatch || emailMatch;
      });
    }
    
    this.paginaActual = 1; // Reiniciar a la primera página al filtrar
    this.actualizarUsuariosPaginados();
    this.mostrarDropdown = true;
  }
  
  // Métodos de paginación
  cambiarPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas) {
      this.paginaActual = pagina;
      this.actualizarUsuariosPaginados();
    }
  }
  
  private actualizarUsuariosPaginados(): void {
    // Calcular el índice de inicio y fin para la página actual
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    const fin = inicio + this.itemsPorPagina;
    
    // Obtener los usuarios para la página actual
    this.usuariosPaginados = this.usuariosFiltrados.slice(inicio, fin);
    
    // Calcular el número total de páginas
    this.totalPaginas = Math.ceil(this.usuariosFiltrados.length / this.itemsPorPagina);
    
    // Asegurarse de que la página actual no sea mayor que el total de páginas
    if (this.paginaActual > this.totalPaginas && this.totalPaginas > 0) {
      this.paginaActual = this.totalPaginas;
      this.actualizarUsuariosPaginados();
    }
  }

  onUsuarioSelect(event: Event, userId: number): void {
    const target = event.target as HTMLInputElement;
    
    if (target.checked) {
      this.usuariosSeleccionados.add(userId);
    } else {
      this.usuariosSeleccionados.delete(userId);
    }
    
    // Update form control value
    this.notificationForm.get('usuarios')?.setValue(Array.from(this.usuariosSeleccionados));
  }

  estaSeleccionado(usuarioId: number): boolean {
    return this.usuariosSeleccionados.has(usuarioId);
  }

  toggleSeleccionUsuario(usuario: Usuario, event?: Event): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    
    if (this.usuariosSeleccionados.has(usuario.id)) {
      this.usuariosSeleccionados.delete(usuario.id);
    } else {
      this.usuariosSeleccionados.add(usuario.id);
    }
    
    const usuariosArray = Array.from(this.usuariosSeleccionados);
    this.notificationForm.get('usuarios')?.setValue(usuariosArray);
    this.notificationForm.get('usuarios')?.markAsTouched();
    
    // Update validation state
    if (usuariosArray.length > 0) {
      this.notificationForm.get('usuarios')?.setErrors(null);
    } else {
      this.notificationForm.get('usuarios')?.setErrors({ required: true });
    }
  }

  // Get user by ID
  getUsuarioById(id: number): Usuario | null {
    const usuario = this.usuarios.find(u => u.id === id);
    return usuario || null;
  }

  // Remove user from selection
  removeUsuario(id: number, event?: Event): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    this.usuariosSeleccionados.delete(id);
    this.notificationForm.get('usuarios')?.setValue(Array.from(this.usuariosSeleccionados));
    // Update form validation
    this.notificationForm.get('usuarios')?.updateValueAndValidity();
  }

  // Close dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-selection-container')) {
      this.mostrarDropdown = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit(): void {
    if (this.notificationForm.invalid) {
      this.notificationForm.markAllAsTouched();
      toast.error('Por favor complete todos los campos requeridos');
      return;
    }

    const formValue = this.notificationForm.getRawValue();
    const notificationData: any = {
      titulo: formValue.titulo || '',
      mensaje: formValue.mensaje || '',
      tipoDestino: formValue.tipoDestino
    };

    if (formValue.tipoDestino === 'rol' && formValue.rol) {
      notificationData.rol = formValue.rol;
    } else if (formValue.tipoDestino === 'usuarios' && Array.isArray(formValue.usuarios) && formValue.usuarios.length > 0) {
      notificationData.usuarios = formValue.usuarios;
    }

    this.isLoading = true;
    this.adminService.enviarNotificacionMasiva(notificationData).pipe(
      take(1) // Ensure we complete the subscription after first emission
    ).subscribe({
      next: (response: any) => {
        this.responseData = response;
        toast.success('Notificaciones enviadas correctamente');
        this.isLoading = false;
        this.notificationForm.reset({
          titulo: '',
          mensaje: '',
          tipoDestino: 'todos',
          rol: '',
          usuarios: []
        });
      },
      error: (error: any) => {
        console.error('Error al enviar notificaciones:', error);
        toast.error('Error al enviar notificaciones');
        this.isLoading = false;
      }
    });
  }
}
