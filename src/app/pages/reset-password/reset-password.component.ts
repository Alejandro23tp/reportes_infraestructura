import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ResetPasswordService } from '../../services/reset-password.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './reset-password.component.html'
})
export class ResetPasswordComponent implements OnInit {
  form: FormGroup;
  mode: 'request' | 'reset' = 'request';
  message: string = '';
  error: string = '';
  loading = false;

  constructor(
    private fb: FormBuilder,
    private resetService: ResetPasswordService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: [''],
      password_confirmation: [''],
      token: ['']
    });
  }

  ngOnInit() {
    // Check if we have token and email in URL params
    this.route.queryParams.subscribe(params => {
      if (params['token'] && params['email']) {
        this.mode = 'reset';
        this.form.patchValue({
          email: params['email'],
          token: params['token']
        });
        this.form.get('password')?.setValidators([Validators.required, Validators.minLength(8)]);
        this.form.get('password_confirmation')?.setValidators([Validators.required]);
      }
    });
  }

  onSubmit() {
    if (this.form.invalid) return;
    this.loading = true;
    this.message = '';
    this.error = '';

    if (this.mode === 'request') {
      this.resetService.enviarLinkRestablecimiento(this.form.value.email)
        .subscribe({
          next: (response) => {
            this.message = 'Se ha enviado un enlace de restablecimiento a tu correo';
            this.loading = false;
          },
          error: (error) => {
            this.error = error.error.message || 'Ha ocurrido un error';
            this.loading = false;
          }
        });
    } else {
      this.resetService.resetearContrasena(this.form.value)
        .subscribe({
          next: (response) => {
            this.message = 'La contraseña ha sido restablecida exitosamente';
            this.loading = false;
            // Redirect to login after successful reset
            setTimeout(() => this.router.navigate(['/login']), 2000);
          },
          error: (error) => {
            this.error = error.error.message || 'Ha ocurrido un error';
            this.loading = false;
          }
        });
    }
  }
}
