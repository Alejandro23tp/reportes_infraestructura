import { Component, OnInit, inject, AfterViewInit, OnDestroy } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportesService } from '../../services/reportes.service';

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
  imagen?: string;
}

interface ActiveFilter {
  type: 'estado' | 'urgencia' | 'categoria' | 'busqueda';
  value: string;
  label: string;
}

interface UrgenciaResumen {
  critico: number;
  alto: number;
  medio: number;
  bajo: number;
}

@Component({
  selector: 'app-mapa',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mapa.component.html',
  styleUrls: ['./mapa.component.scss'],
})
export class MapaComponent implements OnInit, AfterViewInit, OnDestroy {  
  private map!: google.maps.Map;
  public markers: google.maps.Marker[] = [];
  private circles: google.maps.Circle[] = [];
  private layerGroups: { [key: string]: google.maps.Marker[] } = {
    critico: [],
    alto: [],
    medio: [],
    bajo: []
  };
  private reportesService = inject(ReportesService);

  filtroEstado: string = '';
  filtroUrgencia: string = '';
  filtroCategoria: string = '';
  filtroBusqueda: string = '';
  mostrarAreas: boolean = false;
  private datosReportes: Ubicacion[] = [];
  showDrawer: boolean = false;
  isMobile: boolean = false;
  activeFilters: ActiveFilter[] = [];
  categorias: string[] = [];
  resumen: {
    urgencia: UrgenciaResumen;
    total: number;
  } = {
    urgencia: { critico: 0, alto: 0, medio: 0, bajo: 0 },
    total: 0,
  };

  ngOnInit() {
    this.checkScreenSize();
    window.addEventListener('resize', () => this.checkScreenSize());
    this.loadGoogleMapsScript();
    this.inicializarFlowbite();
  }

  ngAfterViewInit() {
    (window as any).openImageModal = (imageUrl: string) => {
      this.openImageModal(imageUrl);
    };
  }

  private inicializarFlowbite() {
    import('flowbite').then((flowbite) => {
      flowbite.initFlowbite();
    });
  }

  private loadGoogleMapsScript() {
    if (typeof google === 'undefined') {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        console.log('Google Maps script loaded');
        this.initMap();
      };
      script.onerror = () => console.error('Error loading Google Maps script');
      document.head.appendChild(script);
    } else {
      this.initMap();
    }
  }

  private initMap(): void {
    try {
      const mapElement = document.getElementById('map');
      if (!mapElement) {
        console.error('Elemento del mapa no encontrado');
        return;
      }

      this.map = new google.maps.Map(mapElement, {
        center: { lat: -2.239527, lng: -80.910316 },
        zoom: 13,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        zoomControl: true,
        scaleControl: true,
      });

      this.cargarUbicaciones();
    } catch (error) {
      console.error('Error al inicializar el mapa:', error);
    }
  }

  private normalizarUrgencia(urgencia: string): string {
    const urgenciaLower = urgencia.toLowerCase();
    switch(urgenciaLower) {
      case 'crítico':
      case 'critico': return 'critico';
      case 'alto': return 'alto';
      case 'medio': return 'medio';
      case 'bajo': return 'bajo';
      default: return 'bajo';
    }
  }

  private getColorUrgencia(urgencia: string): string {
    const urgenciaNormalizada = this.normalizarUrgencia(urgencia);
    switch(urgenciaNormalizada) {
      case 'critico': return '#ff0000';
      case 'alto': return '#ff4500';
      case 'medio': return '#ffa500';
      case 'bajo': return '#008000';
      default: return '#0000ff';
    }
  }

  private actualizarResumen(ubicaciones: Ubicacion[]): void {
    this.resumen = {
      urgencia: { critico: 0, alto: 0, medio: 0, bajo: 0 },
      total: ubicaciones.length,
    };
    
    ubicaciones.forEach((reporte) => {
      const urgencia = this.normalizarUrgencia(reporte.urgencia) as keyof UrgenciaResumen;
      this.resumen.urgencia[urgencia]++;
    });
  }

  private actualizarCategorias(ubicaciones: Ubicacion[]): void {
    this.categorias = [...new Set(ubicaciones.map((r) => r.categoria))].sort();
  }

  private actualizarFiltrosActivos(): void {
    this.activeFilters = [];
    if (this.filtroEstado) {
      this.activeFilters.push({
        type: 'estado',
        value: this.filtroEstado,
        label: `Estado: ${this.filtroEstado}`,
      });
    }
    if (this.filtroUrgencia) {
      this.activeFilters.push({
        type: 'urgencia',
        value: this.filtroUrgencia,
        label: `Urgencia: ${this.filtroUrgencia}`,
      });
    }
    if (this.filtroCategoria) {
      this.activeFilters.push({
        type: 'categoria',
        value: this.filtroCategoria,
        label: `Categoría: ${this.filtroCategoria}`,
      });
    }
    if (this.filtroBusqueda) {
      this.activeFilters.push({
        type: 'busqueda',
        value: this.filtroBusqueda,
        label: `Búsqueda: ${this.filtroBusqueda}`,
      });
    }
  }

  removeFilter(filter: ActiveFilter): void {
    switch (filter.type) {
      case 'estado':
        this.filtroEstado = '';
        break;
      case 'urgencia':
        this.filtroUrgencia = '';
        break;
      case 'categoria':
        this.filtroCategoria = '';
        break;
      case 'busqueda':
        this.filtroBusqueda = '';
        break;
    }
    this.aplicarFiltros();
  }

  limpiarFiltros(): void {
    this.filtroEstado = '';
    this.filtroUrgencia = '';
    this.filtroCategoria = '';
    this.filtroBusqueda = '';
    this.mostrarAreas = false;
    this.aplicarFiltros();
  }

  aplicarFiltros(): void {
    this.mostrarUbicaciones(this.datosReportes);
  }

  toggleAreas(): void {
    if (this.mostrarAreas) {
      this.agregarAreas();
    } else {
      this.circles.forEach((circle) => circle.setMap(null));
      this.circles = [];
    }
  }

  private agregarAreas(): void {
    this.circles.forEach((circle) => circle.setMap(null));
    this.circles = [];

    this.datosReportes.forEach((reporte) => {
      const color = this.getColorUrgencia(reporte.urgencia);
      const circle = new google.maps.Circle({
        center: { lat: reporte.ubicacion.lat, lng: reporte.ubicacion.lng },
        radius: 100,
        strokeColor: color,
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: color,
        fillOpacity: 0.2,
        map: this.map,
      });
      this.circles.push(circle);
    });
  }

  showImageModal: boolean = false;
  selectedImageUrl: string | null = null;

  openImageModal(imageUrl: string) {
    this.selectedImageUrl = imageUrl;
    this.showImageModal = true;
  }

  closeImageModal() {
    this.showImageModal = false;
    this.selectedImageUrl = null;
  }

  private mostrarUbicaciones(ubicaciones: Ubicacion[]): void {
    this.layerGroups = { critico: [], alto: [], medio: [], bajo: [] };
    this.markers.forEach(marker => marker.setMap(null));
    this.markers = [];

    const ubicacionesFiltradas = ubicaciones.filter((reporte) => {
      const cumpleEstado = !this.filtroEstado || reporte.estado === this.filtroEstado;
      const cumpleUrgencia = !this.filtroUrgencia || 
        this.normalizarUrgencia(reporte.urgencia) === this.filtroUrgencia.toLowerCase();
      const cumpleCategoria = !this.filtroCategoria || reporte.categoria === this.filtroCategoria;
      const cumpleBusqueda =
        !this.filtroBusqueda ||
        reporte.id.toString().includes(this.filtroBusqueda) ||
        reporte.ubicacion.descripcion.toLowerCase().includes(this.filtroBusqueda.toLowerCase());
      return cumpleEstado && cumpleUrgencia && cumpleCategoria && cumpleBusqueda;
    });

    ubicacionesFiltradas.forEach((reporte) => {
      const urgenciaNormalizada = this.normalizarUrgencia(reporte.urgencia);
      const color = this.getColorUrgencia(urgenciaNormalizada);
      
      const marker = new google.maps.Marker({
        position: { lat: reporte.ubicacion.lat, lng: reporte.ubicacion.lng },
        map: this.map,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: color,
          fillOpacity: 0.8,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          scale: 12,
        },
        title: `ID: ${reporte.id}`,
      });

      let infoWindowContent = `
        <div class="p-2">
          <p class="font-bold">ID: ${reporte.id}</p>
          <p class="text-sm">Estado: ${reporte.estado}</p>
          <p class="text-sm">Urgencia: ${reporte.urgencia}</p>
          <p class="text-sm">Categoría: ${reporte.categoria}</p>
          <p class="text-sm">Descripción: ${reporte.ubicacion.descripcion}</p>
      `;

      if (reporte.imagen) {
        infoWindowContent += `
          <div class="mt-2">
            <img src="${reporte.imagen}" alt="Foto del reporte ${reporte.id}" class="w-24 h-24 object-cover rounded cursor-pointer" onclick="window.openImageModal('${reporte.imagen}')">
          </div>
        `;
      }

      infoWindowContent += `</div>`;

      const infoWindow = new google.maps.InfoWindow({
        content: infoWindowContent,
      });

      marker.addListener('click', () => {
        infoWindow.open(this.map, marker);
      });

      this.layerGroups[urgenciaNormalizada].push(marker);
      this.markers.push(marker);
    });

    if (this.mostrarAreas) {
      this.agregarAreas();
    }

    this.actualizarResumen(ubicacionesFiltradas);
    this.actualizarFiltrosActivos();

    if (this.markers.length > 0) {
      this.centerMap();
    }
  }

  private cargarUbicaciones(): void {
    this.reportesService.getUbicaciones().subscribe({
      next: (response: any) => {
        if (response.status === 'success') {
          this.datosReportes = response.data.map((reporte: any) => ({
            ...reporte,
            imagen: reporte.imagen ? `${environment.urlApiImages}${reporte.imagen}` : undefined
          }));
          this.actualizarCategorias(this.datosReportes);
          this.mostrarUbicaciones(this.datosReportes);
        }
      },
      error: (error) => console.error('Error cargando ubicaciones:', error),
    });
  }

  private checkScreenSize() {
    this.isMobile = window.innerWidth < 768;
    this.showDrawer = !this.isMobile;
  }

  toggleDrawer() {
    this.showDrawer = !this.showDrawer;
  }

  centerMap() {
    if (this.markers.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      this.markers.forEach((marker) => {
        const position = marker.getPosition();
        if (position) {
          bounds.extend(position);
        }
      });
      this.map.fitBounds(bounds);
      this.map.panBy(50, 50);
    } else {
      this.map.setCenter({ lat: -2.239527, lng: -80.910316 });
      this.map.setZoom(13);
    }
  }

  ngOnDestroy() {
    window.removeEventListener('resize', () => this.checkScreenSize());
    delete (window as any).openImageModal;
  }
}