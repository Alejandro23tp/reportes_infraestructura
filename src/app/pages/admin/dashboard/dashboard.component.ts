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

  // Método para determinar el tipo de gráfico mensual
  getMonthlyChartType(): 'bar' | 'line' {
    if (!this.stats || !this.stats.reportes.por_mes) {
      return 'bar';
    }
    
    const monthsWithData = this.stats.reportes.por_mes.filter(m => m.total > 0).length;
    return monthsWithData <= 2 ? 'line' : 'bar';
  }
  
  // Método para obtener las opciones del gráfico mensual
  getMonthlyChartOptions(): any {
    const isDarkMode = document.documentElement.classList.contains('dark');
    const textColor = isDarkMode ? '#e5e7eb' : '#374151';
    const gridColor = isDarkMode ? 'rgba(75, 85, 99, 0.2)' : 'rgba(209, 213, 219, 0.5)';
    const axisColor = isDarkMode ? '#9ca3af' : '#6b7280';
    
    const isLineChart = this.getMonthlyChartType() === 'line';
    
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            font: {
              size: 12
            },
            color: textColor,
            usePointStyle: true,
            padding: 16
          }
        },
        tooltip: {
          enabled: true,
          backgroundColor: 'rgba(17, 24, 39, 0.8)',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          padding: 10,
          cornerRadius: 6
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: axisColor
          }
        },
        y: {
          beginAtZero: true,
          grid: {
            color: gridColor
          },
          ticks: {
            stepSize: 1,
            color: axisColor
          }
        }
      },
      elements: {
        line: {
          tension: 0.4,
          borderWidth: 3,
          fill: isLineChart
        },
        point: {
          radius: isLineChart ? 5 : 0,
          hoverRadius: isLineChart ? 7 : 0
        },
        bar: {
          borderWidth: 0,
          borderRadius: 4,
          maxBarThickness: 40
        }
      },
      barPercentage: 0.5,
      categoryPercentage: 0.7
    };
  }
  
  // Modificar el método prepareChartData para mejorar los datos del gráfico mensual
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
      const isLineChart = this.stats.reportes.por_mes.filter(m => m.total > 0).length <= 2;
      
      this.monthlyChartData = {
        labels: this.stats.reportes.por_mes.map(m => `${m.mes}/${m.año}`),
        datasets: [{
          label: 'Reportes',
          data: this.stats.reportes.por_mes.map(m => m.total),
          backgroundColor: isLineChart ? 'rgba(33, 150, 243, 0.2)' : '#2196F3',
          borderColor: '#1E88E5',
          borderWidth: isLineChart ? 3 : 1,
          pointBackgroundColor: '#1E88E5',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: '#1E88E5',
          fill: isLineChart
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

  
// Añade o actualiza esta propiedad en tu clase
categoryChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'right',
      align: 'center',
      labels: {
        boxWidth: 15,
        padding: 12,
        font: {
          size: 13,
          weight: 'bold'
        },
        usePointStyle: true,
        pointStyle: 'circle'
      }
    },
    tooltip: {
      enabled: true,
      backgroundColor: 'rgba(17, 24, 39, 0.8)',
      titleColor: '#ffffff',
      bodyColor: '#ffffff',
      padding: 10,
      cornerRadius: 6,
      displayColors: true
    },
    datalabels: {
      display: false
    }
  },
  cutout: '0%',
  radius: '80%',
  layout: {
    padding: {
      top: 20,
      bottom: 20,
      left: 0,
      right: 20
    }
  },
  scales: {
    x: {
      display: false,
      grid: {
        display: false
      },
      ticks: {
        display: false
      }
    },
    y: {
      display: false,
      grid: {
        display: false
      },
      ticks: {
        display: false
      }
    }
  }
};
}

