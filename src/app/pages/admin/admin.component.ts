import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TabMenuModule } from 'primeng/tabmenu';
import { MenuItem } from 'primeng/api';
import { DashboardComponent } from '../../components/admin/dashboard/dashboard.component';
import { UsuariosComponent } from '../../components/admin/usuarios/usuarios.component';
import { ReportesComponent } from '../../components/admin/reportes/reportes.component';
import { CategoriasComponent } from '../../components/admin/categorias/categorias.component';
import { NotificacionesmasivasComponent } from "../../components/admin/notificacionesmasivas/notificacionesmasivas.component";
import { ExportarComponent } from "../../components/admin/exportar/exportar.component";
import { NotificacionescorreoComponent } from "../../components/admin/notificacionescorreo/notificacionescorreo.component";
import { CentronotificacionesComponent } from "../../components/admin/centronotificaciones/centronotificaciones.component";

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    CommonModule,
    TabMenuModule,
    DashboardComponent,
    UsuariosComponent,
    ReportesComponent,
    CategoriasComponent,
    NotificacionesmasivasComponent,
    ExportarComponent,
    NotificacionescorreoComponent,
    CentronotificacionesComponent
],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss'
})
export class AdminComponent {
  items: MenuItem[] = [];
  activeItem: MenuItem | undefined;

  ngOnInit() {
    this.items = [
      { 
        label: 'Dashboard', 
        icon: 'pi pi-fw pi-chart-bar',
        command: () => this.setActiveItem(this.items[0])
      },
      { 
        label: 'Gestión de Usuarios', 
        icon: 'pi pi-fw pi-users',
        command: () => this.setActiveItem(this.items[1])
      },
      { 
        label: 'Gestión de Reportes', 
        icon: 'pi pi-fw pi-file-edit',
        command: () => this.setActiveItem(this.items[2])
      },
      { 
        label: 'Gestión de Categorías', 
        icon: 'pi pi-fw pi-tags',
        command: () => this.setActiveItem(this.items[3])
      },
      { 
        label: 'Notificaciones Masivas', 
        icon: 'pi pi-fw pi-bell',
        command: () => this.setActiveItem(this.items[4])
      },
      { 
        label: 'Exportación de Datos', 
        icon: 'pi pi-fw pi-download',
        command: () => this.setActiveItem(this.items[5])
      },
      { 
        label: 'Notificaciones por Correo', 
        icon: 'pi pi-fw pi-envelope',
        command: () => this.setActiveItem(this.items[6])
      },
      { 
        label: 'Centro de Notificaciones', 
        icon: 'pi pi-fw pi-bell',
        command: () => this.setActiveItem(this.items[7])
      }
    ];

    this.activeItem = this.items[0];
  }

  setActiveItem(item: MenuItem) {
    this.activeItem = item;
  }
}
