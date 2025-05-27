import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../services/admin.service';
import { toast } from 'ngx-sonner';

@Component({
  selector: 'app-exportar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './exportar.component.html',
  styleUrls: ['./exportar.component.scss']
})
export class ExportarComponent {
  exportType: 'reportes' | 'usuarios' = 'reportes';
  loading = false;

  // Filtros para reportes
  reportFilters = {
    fecha_inicio: '',
    fecha_fin: '',
    estado: '',
    categoria_id: undefined as number | undefined
  };

  // Filtros para usuarios
  userFilters = {
    rol: '',
    activo: null as boolean | null,
    fecha_registro_desde: '',
    fecha_registro_hasta: ''
  };

  constructor(private adminService: AdminService) {}

  exportData() {
    this.loading = true;

    try {
      if (this.exportType === 'reportes') {
        this.exportReportes();
      } else {
        this.exportUsuarios();
      }
    } catch (err) {
      this.handleError(err);
    }
  }

  private exportReportes() {
    const params: any = {};
    
    if (this.reportFilters.fecha_inicio) params.fecha_inicio = this.reportFilters.fecha_inicio;
    if (this.reportFilters.fecha_fin) params.fecha_fin = this.reportFilters.fecha_fin;
    if (this.reportFilters.estado) params.estado = this.reportFilters.estado;
    if (this.reportFilters.categoria_id !== undefined) params.categoria_id = this.reportFilters.categoria_id;
    
    this.adminService.exportarReportes(params).subscribe({
      next: (blob) => this.downloadFile(blob, 'reportes'),
      error: (err) => this.handleError(err)
    });
  }

  private exportUsuarios() {
    const params: any = {};
    
    if (this.userFilters.rol) params.rol = this.userFilters.rol;
    
    // Manejar el parámetro activo
    if (this.userFilters.activo !== null && this.userFilters.activo !== undefined) {
      // Convertir a booleano según el valor del radio button
      const activoValue = String(this.userFilters.activo);
      params.activo = activoValue === 'true';
    }
    
    if (this.userFilters.fecha_registro_desde) params.fecha_registro_desde = this.userFilters.fecha_registro_desde;
    if (this.userFilters.fecha_registro_hasta) params.fecha_registro_hasta = this.userFilters.fecha_registro_hasta;
    
    this.adminService.exportarUsuarios(params).subscribe({
      next: (blob) => this.downloadFile(blob, 'usuarios'),
      error: (err) => this.handleError(err)
    });
  }

  private downloadFile(blob: Blob, prefix: string) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${prefix}_export_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    this.loading = false;
    toast.success('¡Exportación completada con éxito!');
  }

  private handleError(error: any) {
    console.error('Error al exportar:', error);
    toast.error('Ocurrió un error al exportar los datos. Por favor, inténtalo de nuevo.');
    this.loading = false;
  }

  resetForm() {
    if (this.exportType === 'reportes') {
      this.reportFilters = {
        fecha_inicio: '',
        fecha_fin: '',
        estado: '',
        categoria_id: undefined
      };
    } else {
      this.userFilters = {
        rol: '',
        activo: null,
        fecha_registro_desde: '',
        fecha_registro_hasta: ''
      };
    }
  }
}
