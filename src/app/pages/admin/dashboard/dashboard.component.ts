import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../../services/admin.service';
import { CardModule } from 'primeng/card';
import { ProgressBarModule } from 'primeng/progressbar';
import { ButtonModule } from 'primeng/button';
import { ChartModule } from 'primeng/chart';

// Define types for better type safety
type ReportStatus = 'pendientes' | 'en_proceso' | 'resueltos' | 'cancelados';
type ReportStatusMap = Record<ReportStatus, number>;

interface DashboardStats {
  usuarios: {
    total: number;
    nuevos: number;
  };
  reportes: {
    total: number;
    nuevos: number;
    por_estado: ReportStatusMap;
    por_categoria: Array<{
      categoria_id: number;
      categoria: { nombre: string } | null;
      total: number;
    }>;
    por_mes: Array<{
      mes: number;
      año: number;
      total: number;
    }>;
  };
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ProgressBarModule,
    ButtonModule,
    ChartModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  loading = true;
  stats: DashboardStats | null = null;
  error: string | null = null;

  statuses: Array<{ label: string; key: ReportStatus }> = [
    { label: 'Pendientes', key: 'pendientes' },
    { label: 'En Proceso', key: 'en_proceso' },
    { label: 'Resueltos', key: 'resueltos' },
    { label: 'Cancelados', key: 'cancelados' }
  ];

  // Chart data
  categoryChartData: any;
  monthlyChartData: any;

  // Chart options
  chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          usePointStyle: true,
          padding: 16
        }
      }
    }
  };

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loadDashboardStats();
  }

  loadDashboardStats(): void {
    this.loading = true;
    this.error = null;
    
    this.adminService.getDashboardStats().subscribe({
      next: (data: DashboardStats) => {
        this.stats = data;
        this.prepareChartData();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading dashboard stats:', err);
        this.error = 'Error al cargar las estadísticas del dashboard';
        this.loading = false;
      }
    });
  }

  private prepareChartData(): void {
    if (!this.stats) return;

    // Prepare category chart data
    if (this.stats.reportes.por_categoria?.length > 0) {
      this.categoryChartData = {
        labels: this.stats.reportes.por_categoria.map(c => c.categoria?.nombre || 'Sin categoría'),
        datasets: [{
          data: this.stats.reportes.por_categoria.map(c => c.total),
          backgroundColor: [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'
          ]
        }]
      };
    }

    // Prepare monthly chart data
    if (this.stats.reportes.por_mes?.length > 0) {
      this.monthlyChartData = {
        labels: this.stats.reportes.por_mes.map(m => `${m.mes}/${m.año}`),
        datasets: [{
          label: 'Reportes',
          data: this.stats.reportes.por_mes.map(m => m.total),
          backgroundColor: '#2196F3',
          borderColor: '#1E88E5',
          borderWidth: 1
        }]
      };
    }
  }

  getStatusPercentage(status: ReportStatus): number {
    if (!this.stats || !this.stats.reportes) return 0;
    const total = this.stats.reportes.total;
    if (total === 0) return 0;
    
    const count = this.stats.reportes.por_estado[status] || 0;
    return (count / total) * 100;
  }

  getStatusColor(status: ReportStatus): string {
    const colors: Record<ReportStatus, string> = {
      'pendientes': '#ffc107',
      'en_proceso': '#17a2b8',
      'resueltos': '#28a745',
      'cancelados': '#dc3545'
    };
    return colors[status];
  }
}
