import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import HomeComponent from './pages/home/home.component';
import { AuthGuard } from './guards/auth.guard';
import { ResetPasswordComponent } from './pages/reset-password/reset-password.component';
import { AjustesComponent } from './pages/ajustes/ajustes.component';
import { AdminComponent } from './pages/admin/admin.component';
import { CentronotificacionesComponent } from './components/admin/centronotificaciones/centronotificaciones.component';


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
    path: 'ajustes',
    component: AjustesComponent,
    canActivate: [AuthGuard]  
  },
  {
    path: 'admin',
    component: AdminComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'centronotificaciones',
    component: CentronotificacionesComponent,
    canActivate: [AuthGuard]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
