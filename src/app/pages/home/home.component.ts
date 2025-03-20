import { Component, inject, OnInit } from '@angular/core';
import { ReportesService } from '../../services/reportes.service';
import { firstValueFrom } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategoriasService } from '../../services/categorias.service';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment.development';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export default class HomeComponent implements OnInit {
  listReports: any[] = [];
  nuevoReporte: any = { descripcion: '', ubicacion: '', imagen: null, estado: 'pendiente', urgencia: 'normal', categoria_id: '' };
  categorias: any[] = [];  // Almacena las categorías
  errorMessage: string = '';  // Variable para almacenar el mensaje de error
  mostrarFormulario = false;
  imagenPreview: string | null = null;
  submitting = false;
  geoLocationMessage: string = '';
  geoLocationSuccess: boolean = false;
  userName: string = '';
  userId: string = '';
  categoriaSugerida: any = null;
  analizandoImagen: boolean = false; // Nueva propiedad para controlar el estado del análisis

  private srvReports = inject(ReportesService);
  private srvCategorias = inject(CategoriasService);
  private authService = inject(AuthService);

  async ngOnInit() {
    await this.getReports();
    await this.getCategorias();
    this.authService.getUser().subscribe(user => {
      if (user) {
        this.userName = user.nombre || '';
        this.userId = user.sub || ''; // El ID del usuario viene en el claim 'sub' del JWT
      }
    });
  }

  async getReports() {
    try {
      const res: any = await firstValueFrom(this.srvReports.getReports());
      this.listReports = res.data
        .map((reporte: any) => {
          reporte.ubicacion = JSON.parse(reporte.ubicacion);
          //reporte.imagen_url = `http://127.0.0.1:8000${reporte.imagen_url}`; 
          reporte.imagen_url = `${environment.urlApiImages}${reporte.imagen_url}`;
          console.log('reporte.imagen_url', reporte.imagen_url);
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

  // Método mejorado para manejar cambios de imagen
  async onImageChange(event: any): Promise<void> {
    const file = event?.target?.files?.[0];
    
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.errorMessage = 'Por favor, selecciona un archivo de imagen válido.';
      this.nuevoReporte.imagen = null;
      this.imagenPreview = null;
      return;
    }

    // Crear preview de la imagen
    const reader = new FileReader();
    reader.onload = (e) => {
      this.imagenPreview = e.target?.result as string;
    };
    reader.readAsDataURL(file);
    
    this.analizandoImagen = true; // Iniciar análisis
    this.categoriaSugerida = null; // Resetear categoría sugerida
    
    try {
      const response = await firstValueFrom(this.srvReports.analizarImagen(file));
      
      if (!response.success) {
        if (response.error_tipo === 'imagen_no_relevante') {
          this.errorMessage = 'La imagen debe mostrar daños en infraestructura urbana (calles, edificios, servicios públicos, etc).';
          this.nuevoReporte.imagen = null;
          this.imagenPreview = null;
          // Limpiar input de imagen
          event.target.value = '';
          return;
        }
      }

      // Continuar con el proceso si la imagen es válida
      this.nuevoReporte.imagen = file;
      this.errorMessage = '';
      
      if (response.success && response.categoria_sugerida) {
        this.categoriaSugerida = response.categoria_sugerida;
        
        let categoriaEncontrada = this.categorias.find(
          cat => cat.nombre.toLowerCase() === this.categoriaSugerida.toLowerCase()
        );

        if (categoriaEncontrada) {
          this.nuevoReporte.categoria_id = categoriaEncontrada.id;
        } else {
          const categoriaMasCercana = this.encontrarCategoriaMasCercana(this.categoriaSugerida);
          if (categoriaMasCercana) {
            this.nuevoReporte.categoria_id = categoriaMasCercana.id;
          }
        }
      }
    } catch (error) {
      console.error('Error al analizar la imagen:', error);
      this.errorMessage = 'Error al procesar la imagen. Por favor, intenta con otra imagen.';
      this.nuevoReporte.imagen = null;
      this.imagenPreview = null;
      event.target.value = '';
    } finally {
      this.analizandoImagen = false; // Finalizar análisis
    }
  }

  private encontrarCategoriaMasCercana(categoriaSugerida: string): any {
    const categoriasMap: { [key: string]: string } = {
      'Daños estructurales': 'estructura',
      'Daños en redes de servicios': 'servicios',
      'Daños en infraestructuras de transporte': 'transporte',
      'Daños causados por fenómenos naturales': 'natural',
      'Daños en espacios públicos': 'publico',
      'Impacto ambiental asociado': 'ambiental',
      'Daños por conflictos humanos': 'vandalismo'
    };

    const categoriaKey = categoriasMap[categoriaSugerida];
    if (categoriaKey) {
      return this.categorias.find(cat => 
        cat.nombre.toLowerCase().includes(categoriaKey.toLowerCase())
      );
    }
    return null;
  }

  // Obtiene la ubicación actual
  getGeolocalizacion() {
    if (navigator.geolocation) {
      this.geoLocationMessage = 'Obteniendo ubicación...';
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          this.nuevoReporte.ubicacion = JSON.stringify({ lat, lon });
          this.geoLocationSuccess = true;
          this.geoLocationMessage = 'Ubicación obtenida correctamente';
          setTimeout(() => {
            this.geoLocationMessage = '';
          }, 3000);
        },
        (error) => {
          this.geoLocationSuccess = false;
          switch(error.code) {
            case error.PERMISSION_DENIED:
              this.geoLocationMessage = 'Permiso de ubicación denegado';
              break;
            case error.POSITION_UNAVAILABLE:
              this.geoLocationMessage = 'Información de ubicación no disponible';
              break;
            case error.TIMEOUT:
              this.geoLocationMessage = 'Tiempo de espera agotado';
              break;
            default:
              this.geoLocationMessage = 'Error al obtener la ubicación';
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    } else {
      this.geoLocationMessage = 'La geolocalización no es compatible con este navegador';
      this.geoLocationSuccess = false;
    }
  }

  // Método mejorado para crear reporte
  async crearReporte() {
    if (!this.validarFormulario()) return;
    
    this.submitting = true;
    this.errorMessage = '';
    
    const formData = new FormData();
    
    formData.append('usuario_id', this.userId);
    formData.append('imagen', this.nuevoReporte.imagen);
    formData.append('descripcion', this.nuevoReporte.descripcion);
    formData.append('ubicacion', this.nuevoReporte.ubicacion);
    formData.append('estado', this.nuevoReporte.estado);
    formData.append('urgencia', this.nuevoReporte.urgencia);
    
    if (this.nuevoReporte.categoria_id) {
      formData.append('categoria_id', this.nuevoReporte.categoria_id);
    }

    try {
      const response = await firstValueFrom(this.srvReports.crearReporte(formData));
      this.resetForm();
      await this.getReports();
      this.toggleFormulario();
    } catch (error: any) {
      this.errorMessage = error.message || 'Error al crear el reporte. Inténtalo de nuevo.';
      console.error('Error al crear reporte:', error);
    } finally {
      this.submitting = false;
    }
  }

  private validarFormulario(): boolean {
    if (!this.nuevoReporte.descripcion.trim()) {
      this.errorMessage = 'La descripción es requerida';
      return false;
    }
    if (!this.nuevoReporte.ubicacion) {
      this.errorMessage = 'La ubicación es requerida';
      return false;
    }
    if (!this.nuevoReporte.imagen) {
      this.errorMessage = 'La imagen es requerida';
      return false;
    }
    if (this.analizandoImagen) {
      this.errorMessage = 'Espere a que se complete el análisis de la imagen';
      return false;
    }
    if (!this.categoriaSugerida) {
      this.errorMessage = 'Espere la sugerencia de categoría';
      return false;
    }
    return true;
  }

  private resetForm() {
    this.nuevoReporte = {
      descripcion: '',
      ubicacion: '',
      imagen: null,
      estado: 'pendiente',
      urgencia: 'normal',
      categoria_id: ''
    };
    this.imagenPreview = null;
    this.errorMessage = '';
  }

  toggleFormulario() {
    this.mostrarFormulario = !this.mostrarFormulario;
  }

  onLogout() {
    this.authService.logout();
  }
}
