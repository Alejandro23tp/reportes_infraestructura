import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import { ReportesService } from '../../services/reportes.service';

// Add this after imports
const iconRetinaUrl = 'assets/marker-icon-2x.png';
const iconUrl = 'assets/marker-icon.png';
const shadowUrl = 'assets/marker-shadow.png';
const iconDefault = L.icon({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = iconDefault;

interface Ubicacion {
  id: number;
  ubicacion: {
    lat: number;
    lng: number;
    descripcion: string;
  };
  estado: string;
  urgencia: string;
  categoria: string;
}

@Component({
  selector: 'app-mapa',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="w-full h-screen relative">
      <!-- Panel de control flotante -->
      <div class="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        <!-- Botón toggle para móvil -->
        <button 
          (click)="toggleControls()" 
          class="md:hidden bg-white p-3 rounded-lg shadow-lg hover:bg-gray-50 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
        </button>

        <!-- Panel de controles (responsive) -->
        <div 
          [class.hidden]="!showControls && isMobile"
          class="bg-white p-4 rounded-lg shadow-lg max-w-xs w-full md:w-auto transition-all duration-300"
        >
          <div class="flex justify-between items-center mb-4">
            <h3 class="font-bold text-lg">Filtros</h3>
            <span class="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
              {{markers.length}} reportes
            </span>
          </div>

          <!-- Filtros -->
          <div class="space-y-3">
            <div>
              <label class="block text-sm font-medium mb-1">Estado</label>
              <select 
                [(ngModel)]="filtroEstado" 
                (change)="aplicarFiltros()" 
                class="w-full p-2 rounded border bg-white shadow-sm"
              >
                <option value="">Todos los estados</option>
                <option value="pendiente">Pendiente</option>
                <option value="en_proceso">En proceso</option>
                <option value="completado">Completado</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium mb-1">Urgencia</label>
              <select 
                [(ngModel)]="filtroUrgencia" 
                (change)="aplicarFiltros()" 
                class="w-full p-2 rounded border bg-white shadow-sm"
              >
                <option value="">Todas las urgencias</option>
                <option value="baja">Baja</option>
                <option value="normal">Normal</option>
                <option value="alta">Alta</option>
              </select>
            </div>

            <!-- Toggles -->
            <div class="space-y-2 pt-2 border-t">
              <label class="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  [(ngModel)]="mostrarAreas" 
                  (change)="toggleAreas()"
                  class="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                >
                <span class="text-sm">Mostrar áreas afectadas</span>
              </label>

              <button 
                (click)="centerMap()" 
                class="w-full p-2 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
              >
                Centrar mapa
              </button>
            </div>

            <!-- Leyenda -->
            <div class="pt-2 border-t">
              <p class="text-sm font-medium mb-2">Leyenda</p>
              <div class="grid grid-cols-2 gap-2 text-xs">
                <div class="flex items-center gap-1">
                  <span class="w-3 h-3 rounded-full bg-red-500"></span>
                  <span>Alta</span>
                </div>
                <div class="flex items-center gap-1">
                  <span class="w-3 h-3 rounded-full bg-orange-500"></span>
                  <span>Normal</span>
                </div>
                <div class="flex items-center gap-1">
                  <span class="w-3 h-3 rounded-full bg-green-500"></span>
                  <span>Baja</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div id="map" class="w-full h-full"></div>
    </div>
  `
})
export class MapaComponent implements OnInit {
  private map!: L.Map;
  public markers: L.Marker[] = [];
  private circles: L.Circle[] = [];
  private layerGroups: { [key: string]: L.LayerGroup } = {};
  private reportesService = inject(ReportesService);
  
  filtroEstado: string = '';
  filtroUrgencia: string = '';
  mostrarAreas: boolean = false;
  private datosReportes: Ubicacion[] = [];
  showControls: boolean = true;
  isMobile: boolean = false;

  ngOnInit() {
    this.checkScreenSize();
    window.addEventListener('resize', () => this.checkScreenSize());
    this.initMap();
    this.cargarUbicaciones();
  }

  private getColorUrgencia(urgencia: string): string {
    switch(urgencia.toLowerCase()) {
      case 'alta': return 'red';
      case 'normal': return 'orange';
      case 'baja': return 'green';
      default: return 'blue';
    }
  }

  private initMap(): void {
    this.map = L.map('map').setView([-2.239527, -80.910316], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    // Agregar control de capas
    this.layerGroups = {
      alta: L.layerGroup().addTo(this.map),
      normal: L.layerGroup().addTo(this.map),
      baja: L.layerGroup().addTo(this.map)
    };

    // Agregar escala
    L.control.scale().addTo(this.map);
  }

  aplicarFiltros(): void {
    this.mostrarUbicaciones(this.datosReportes);
  }

  toggleAreas(): void {
    if (this.mostrarAreas) {
      this.agregarAreas();
    } else {
      this.circles.forEach(circle => circle.remove());
      this.circles = [];
    }
  }

  private agregarAreas(): void {
    this.circles.forEach(circle => circle.remove());
    this.circles = [];

    this.datosReportes.forEach(reporte => {
      const circle = L.circle(
        [reporte.ubicacion.lat, reporte.ubicacion.lng],
        {
          radius: 100, // Radio en metros
          color: this.getColorUrgencia(reporte.urgencia),
          fillColor: this.getColorUrgencia(reporte.urgencia),
          fillOpacity: 0.2
        }
      ).addTo(this.map);
      this.circles.push(circle);
    });
  }

  private mostrarUbicaciones(ubicaciones: Ubicacion[]): void {
    // Limpiar marcadores existentes
    Object.values(this.layerGroups).forEach(layer => layer.clearLayers());
    this.markers = [];

    const ubicacionesFiltradas = ubicaciones.filter(reporte => {
      const cumpleEstado = !this.filtroEstado || reporte.estado === this.filtroEstado;
      const cumpleUrgencia = !this.filtroUrgencia || reporte.urgencia === this.filtroUrgencia;
      return cumpleEstado && cumpleUrgencia;
    });

    ubicacionesFiltradas.forEach(reporte => {
      const color = this.getColorUrgencia(reporte.urgencia);
      const customIcon = L.divIcon({
        html: `<div style="background-color: ${color}; width: 25px; height: 25px; border-radius: 50%; border: 2px solid white;"></div>`,
        className: 'custom-marker',
        iconSize: [25, 25],
        iconAnchor: [12, 12]
      });

      const marker = L.marker([reporte.ubicacion.lat, reporte.ubicacion.lng], { icon: customIcon })
        .bindPopup(`
          <div class="p-2">
            <p class="font-bold">ID: ${reporte.id}</p>
            <p class="text-sm">Estado: ${reporte.estado}</p>
            <p class="text-sm">Urgencia: ${reporte.urgencia}</p>
            <p class="text-sm">Categoría: ${reporte.categoria}</p>
            <p class="text-sm">Descripción: ${reporte.ubicacion.descripcion}</p>
          </div>
        `);
      
      this.layerGroups[reporte.urgencia.toLowerCase()].addLayer(marker);
      this.markers.push(marker);
    });

    if (this.mostrarAreas) {
      this.agregarAreas();
    }

    if (this.markers.length > 0) {
      const group = L.featureGroup(this.markers);
      this.map.fitBounds(group.getBounds(), { padding: [50, 50] });
    }
  }

  private cargarUbicaciones(): void {
    this.reportesService.getUbicaciones().subscribe({
      next: (response: any) => {
        if (response.status === 'success') {
          this.datosReportes = response.data;
          this.mostrarUbicaciones(this.datosReportes);
        }
      },
      error: (error) => console.error('Error cargando ubicaciones:', error)
    });
  }

  private checkScreenSize() {
    this.isMobile = window.innerWidth < 768;
    this.showControls = !this.isMobile;
  }

  toggleControls() {
    this.showControls = !this.showControls;
  }

  centerMap() {
    if (this.markers.length > 0) {
      const group = L.featureGroup(this.markers);
      this.map.fitBounds(group.getBounds(), { padding: [50, 50] });
    } else {
      this.map.setView([-2.239527, -80.910316], 13);
    }
  }

  ngOnDestroy() {
    window.removeEventListener('resize', () => this.checkScreenSize());
  }
}
