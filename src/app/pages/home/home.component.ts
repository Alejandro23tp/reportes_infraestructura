import { Component, inject } from '@angular/core';
import { ReportesService } from '../../services/reportes.service';
import { firstValueFrom } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategoriasService } from '../../services/categorias.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export default class HomeComponent {
  listReports: any[] = [];
  nuevoReporte: any = { descripcion: '', ubicacion: '', imagen: null, estado: 'pendiente', urgencia: 'normal', categoria_id: '' };
  categorias: any[] = [];  // Almacena las categorías
  errorMessage: string = '';  // Variable para almacenar el mensaje de error
  mostrarFormulario = false;

  private srvReports = inject(ReportesService);
  private srvCategorias = inject(CategoriasService);

  async ngOnInit() {
    await this.getReports();
    await this.getCategorias();
  }

  async getReports() {
    try {
      const res: any = await firstValueFrom(this.srvReports.getReports());
      this.listReports = res.data
        .map((reporte: any) => {
          reporte.ubicacion = JSON.parse(reporte.ubicacion);
          reporte.imagen_url = `http://127.0.0.1:8000${reporte.imagen_url}`;
          return reporte;
        })
        .sort(
          (a: any, b: any) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    } catch (error) {
      console.error('Error al obtener los reportes:', error);
    }
  }

  async getCategorias() {
    try {
      const res: any = await firstValueFrom(this.srvCategorias.getCategorias());
      this.categorias = res.data;
    } catch (error) {
      console.error('Error al obtener las categorías:', error);
    }
  }

  onFileChange(event: any) {
    this.nuevoReporte.imagen = event.target.files[0];
  }

  // Este método se ejecuta cuando se selecciona una imagen
  onImageChange(event: any): void {
    const file = event.target.files[0];  // Obtener el archivo seleccionado
  
    // Verificar si un archivo ha sido seleccionado
    if (file) {
      // Comprobar que el archivo es una imagen válida
      if (file.type.startsWith('image/')) {
        this.nuevoReporte.imagen = file;  // Guardamos el archivo directamente en el objeto
      } else {
        alert('Por favor, selecciona un archivo de imagen válido.');
        this.nuevoReporte.imagen = null; // Resetear si no es una imagen válida
      }
    }
  }
  
  // Obtiene la ubicación actual
  getGeolocalizacion() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          // Convertir la ubicación a un objeto JSON
          this.nuevoReporte.ubicacion = JSON.stringify({ lat, lon }); // Convertimos a JSON

          console.log('Ubicación obtenida:', this.nuevoReporte.ubicacion);
        },
        (error) => {
          console.error('Error al obtener ubicación:', error);
          alert('No se pudo obtener la ubicación. Verifique los permisos de geolocalización.');
        }
      );
    } else {
      alert('La geolocalización no es compatible con este navegador.');
    }
  }

  // Método para crear el reporte
  async crearReporte() {
    const formData = new FormData();
    formData.append('usuario_id', "1");  // Ajusta este valor según lo que necesites
    formData.append('imagen', this.nuevoReporte.imagen);
    formData.append('descripcion', this.nuevoReporte.descripcion);
    formData.append('ubicacion', this.nuevoReporte.ubicacion);
    formData.append('estado', this.nuevoReporte.estado);
    formData.append('urgencia', this.nuevoReporte.urgencia);
    formData.append('categoria_id', this.nuevoReporte.categoria_id);

    try {
      const response = await firstValueFrom(this.srvReports.crearReporte(formData));
      console.log('Reporte creado:', response);
      this.nuevoReporte = { descripcion: '', ubicacion: '', imagen: null, estado: 'pendiente', urgencia: 'normal', categoria_id: '' };
      await this.getReports(); // Recargar los reportes
    } catch (error: HttpErrorResponse | any) {
      console.error('Error al crear reporte:', error);
      if (error.status === 400 && error.error.error === 'La imagen no está relacionada con infraestructura o daños') {
        this.errorMessage = 'La imagen no está relacionada con infraestructura o daños';
      } else {
        this.errorMessage = 'Error al crear el reporte. Inténtalo de nuevo.';
      }
    }
  }

  toggleFormulario() {
    this.mostrarFormulario = !this.mostrarFormulario;
  }
}
