import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import HomeComponent from './pages/home/home.component';
import { AuthGuard } from './guards/auth.guard';
import { ResetPasswordComponent } from './pages/reset-password/reset-password.component';
import { NotificacionesComponent } from './pages/notificaciones/notificaciones.component';
import { AjustesComponent } from './pages/ajustes/ajustes.component';
import { DashboardComponent } from './pages/admin/dashboard/dashboard.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'register',
    component: RegisterComponent
  },
  {
    path: 'mapa',
    loadComponent: () => import('./pages/mapa/mapa.component').then(m => m.MapaComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'reset-password',
    component: ResetPasswordComponent
  },
  {
    path: 'notificaciones',
    component: NotificacionesComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'ajustes',
    component: AjustesComponent,
    canActivate: [AuthGuard]  
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [AuthGuard]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
