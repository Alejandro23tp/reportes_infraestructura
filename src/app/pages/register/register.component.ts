import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink]
})
export class RegisterComponent {
  userData = {
    nombre: '',
    email: '',
    password: '',
    cedula: '',
    direccion: '',
    rol: 'user' as 'admin' | 'user'
  };
  loading = false;
  error = '';
  validationErrors: { [key: string]: string } = {};

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onSubmit() {
    this.loading = true;
    this.error = '';
    this.validationErrors = {};

    this.authService.register(this.userData)
      .subscribe({
        next: (response) => {
          console.log('Registro exitoso:', response);
          // Añadir un pequeño delay antes del login automático
          setTimeout(() => {
            this.authService.login(this.userData.email, this.userData.password)
              .subscribe({
                next: () => this.router.navigate(['/']),
                error: (loginErr) => {
                  console.error('Error en login:', loginErr);
                  // Cambiar el mensaje para dirigir al usuario al login manual
                  this.error = 'Registro exitoso. Por favor, inicie sesión manualmente.';
                  this.loading = false;
                  // Redirigir al login después de un breve momento
                  setTimeout(() => this.router.navigate(['/login']), 2000);
                }
              });
          }, 1000);
        },
        error: (err) => {
          console.error('Error en registro:', err);
          this.loading = false;
          
          if (err.error && typeof err.error === 'object') {
            // Manejar errores de validación específicos por campo
            Object.entries(err.error).forEach(([key, value]) => {
              if (Array.isArray(value)) {
                this.validationErrors[key] = value[0];
              }
            });
          } else {
            this.error = 'Error en el registro';
          }
        }
      });
  }
}
