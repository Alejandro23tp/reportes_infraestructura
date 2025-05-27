import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { AdminService } from '../../../services/admin.service';
import { toast } from 'ngx-sonner';

// Definir una interfaz para el tipo de suscriptor
interface Suscriptor {
  id: number;
  email: string;
  nombre: string;
  activo: boolean;
  fecha_suscripcion: string;
  created_at: string;
  updated_at: string;
}

@Component({
  selector: 'app-notificacionescorreo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './notificacionescorreo.component.html',
  styleUrls: ['./notificacionescorreo.component.scss']
})
export class NotificacionescorreoComponent implements OnInit {
  @ViewChild('suscriptorForm') suscriptorForm!: NgForm;
  
  suscriptoresActivos: Suscriptor[] = [];
  suscriptoresInactivos: Suscriptor[] = [];
  nuevoSuscriptor = {
    email: '',
    nombre: ''
  };
  loading = false;
  emailACancelar = '';
  pestanaActiva = 'activos'; // Para controlar qué pestaña se muestra

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.cargarSuscriptores();
  }

  cargarSuscriptores(): void {
    this.loading = true;
    this.adminService.listarSuscriptores().subscribe({
      next: (response) => {
        if (response.success && Array.isArray(response.data)) {
          // Separar suscriptores activos e inactivos
          this.suscriptoresActivos = response.data.filter((suscriptor: Suscriptor) => 
            suscriptor && (suscriptor.activo === true)
          );
          
          this.suscriptoresInactivos = response.data.filter((suscriptor: Suscriptor) => 
            suscriptor && (suscriptor.activo === false)
          );
        } else {
          console.error('Formato de respuesta inesperado:', response);
          toast.error('Formato de respuesta inesperado del servidor');
          this.suscriptoresActivos = [];
          this.suscriptoresInactivos = [];
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar suscriptores:', error);
        toast.error('Error al cargar la lista de suscriptores');
        this.loading = false;
        this.suscriptoresActivos = [];
        this.suscriptoresInactivos = [];
      }
    });
  }

  agregarSuscriptor(): void {
    if (this.suscriptorForm.invalid) {
      // No mostrar toast si el formulario es inválido
      return;
    }

    this.loading = true;
    this.adminService.suscribirEmail(this.nuevoSuscriptor.email, this.nuevoSuscriptor.nombre).subscribe({
      next: () => {
        toast.success('Suscripción exitosa');
        // Resetear el formulario completamente (incluye estado de validación)
        this.suscriptorForm.resetForm();
        this.cargarSuscriptores();
      },
      error: (error) => {
        console.error('Error al suscribir:', error);
        toast.error('Error al suscribir el correo');
        this.loading = false;
      }
    });
  }

  async confirmarCancelarSuscripcion(email: string): Promise<void> {
    this.emailACancelar = email;
    const confirmado = await this.mostrarConfirmacion(
      'Cancelar suscripción',
      `¿Estás seguro de que deseas cancelar la suscripción de ${email}?`,
      'warning',
      'Sí, cancelar',
      'No, mantener'
    );
    
    if (confirmado) {
      this.cancelarSuscripcion();
    }
  }

  private cancelarSuscripcion(): void {
    if (!this.emailACancelar) return;

    this.loading = true;
    this.adminService.cancelarSuscripcion(this.emailACancelar).subscribe({
      next: () => {
        toast.success('Suscripción cancelada correctamente');
        this.emailACancelar = '';
        this.cargarSuscriptores();
      },
      error: (error) => {
        console.error('Error al cancelar suscripción:', error);
        toast.error('Error al cancelar la suscripción');
        this.loading = false;
      }
    });
  }

  // Método para reactivar un suscriptor
  async confirmarReactivarSuscripcion(email: string): Promise<void> {
    const confirmado = await this.mostrarConfirmacion(
      'Reactivar suscripción',
      `¿Estás seguro de que deseas reactivar la suscripción de ${email}?`,
      'info',
      'Sí, reactivar',
      'No, cancelar'
    );
    
    if (confirmado) {
      this.reactivarSuscripcion(email);
    }
  }

  private reactivarSuscripcion(email: string): void {
    this.loading = true;
    // Reutilizamos el método de suscribir, ya que no hay uno específico para reactivar
    // Buscamos el nombre del suscriptor en la lista de inactivos
    const suscriptor = this.suscriptoresInactivos.find(s => s.email === email);
    if (!suscriptor) {
      toast.error('No se encontró el suscriptor');
      this.loading = false;
      return;
    }

    this.adminService.suscribirEmail(email, suscriptor.nombre).subscribe({
      next: () => {
        toast.success('Suscripción reactivada correctamente');
        this.cargarSuscriptores();
      },
      error: (error) => {
        console.error('Error al reactivar suscripción:', error);
        toast.error('Error al reactivar la suscripción');
        this.loading = false;
      }
    });
  }

  // Método para cambiar entre pestañas
  cambiarPestana(pestana: string): void {
    this.pestanaActiva = pestana;
  }

  // Método para mostrar confirmación personalizada
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
      setTimeout(() => {
        toast.dismiss(toastId);
        toast(mensaje, {
          description: descripcion,
          duration: 10000,
          action: {
            label: textoBotonAceptar,
            onClick: () => resolve(true)
          },
          cancel: {
            label: textoBotonCancelar,
            onClick: () => resolve(false)
          }
        });
        setTimeout(() => {
          resolve(false);
        }, 10000);
      }, 300);
    });
  }
}
