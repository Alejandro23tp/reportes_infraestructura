import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink]
})
export class LoginComponent {
  credentials = {
    email: '',
    password: ''
  };
  loading = false;
  error = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onSubmit() {
    this.loading = true;
    this.error = '';
    console.log('Intentando login...');

    this.authService.login(this.credentials.email, this.credentials.password)
      .subscribe({
        next: (response) => {
          console.log('Login exitoso:', response);
          this.loading = false;
          this.router.navigate(['/'])
            .then(() => console.log('Navegación completada'))
            .catch(err => console.error('Error en navegación:', err));
        },
        error: (err) => {
          console.error('Error en login:', err);
          this.error = err.status === 500 
            ? 'Error en el servidor. Por favor, intente más tarde.' 
            : 'Credenciales inválidas';
          this.loading = false;
        }
      });
  }
}
