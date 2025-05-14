import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ReportesService } from '../../../services/reportes.service';
import { CategoriasService } from '../../../services/categorias.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-reporte-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reporte-form-modal.component.html',
  styleUrls: ['./reporte-form-modal.component.scss']
})
export class ReporteFormModalComponent implements OnInit {
  @Output() reporteCreado = new EventEmitter<any>();
  @Output() cerrarModal = new EventEmitter<void>();
  errorMessage: string = ''; 
  nuevoReporte: any = { 
    descripcion: '', 
    ubicacion: '', 
    imagen: null, 
    estado: 'pendiente', 
    urgencia: 'normal', 
    categoria_id: '' 
  };
  imagenPreview: string | null = null;
  analizandoImagen: boolean = false; // Nueva propiedad para controlar el estado del análisis
  categoriaSugerida: any = null;
  confianzaCategoria: number = 0;
  categorias: any[] = [];  // Almacena las categorías
  geoLocationMessage: string = '';
  geoLocationSuccess: boolean = false;
  submitting = false;
  userName: string = '';
  userId: string = '';
 

    constructor(
      private srvReports: ReportesService,
      private srvCategorias: CategoriasService,
      private authService: AuthService,
    ) {}

    async ngOnInit() {
      await this.getCategorias();
      this.authService.getUser().subscribe(user => {
      if (user) {
        this.userName = user.nombre || '';
        this.userId = user.sub || '';
      }
    });
    
    }
        onFileChange(event: any) {
      this.nuevoReporte.imagen = event.target.files[0];
    }

  async onImageChange(event: any): Promise<void> {
      const file = event?.target?.files?.[0];
      
      if (!file) return;

      if (!file.type.startsWith('image/')) {
          this.errorMessage = 'Por favor, selecciona un archivo de imagen válido.';
          this.nuevoReporte.imagen = null;
          this.imagenPreview = null;
          return;
      }

      // Set the image immediately to prevent validation errors
      this.nuevoReporte.imagen = file;
      
      const reader = new FileReader();
      reader.onload = (e) => {
          this.imagenPreview = e.target?.result as string;
      };
      reader.readAsDataURL(file);
      
      this.analizandoImagen = true;
      this.categoriaSugerida = null;
      this.confianzaCategoria = 0;

      try {
        console.log('Analizando imagen...');
          const response = await firstValueFrom(this.srvReports.analizarImagen(file));
          
          if (!response.success && response.error_tipo === 'imagen_no_relevante') {
              this.errorMessage = 'La imagen debe mostrar daños en infraestructura urbana (calles, edificios, servicios públicos, etc).';
              this.nuevoReporte.imagen = null;
              this.imagenPreview = null;
              event.target.value = '';
              return;
          }

          if (response.success && response.categoria_sugerida) {
              this.categoriaSugerida = response.categoria_sugerida;
              this.confianzaCategoria = response.confianza;

              // Actualizar lista de categorías
              await this.getCategorias(true);
              
              let categoriaEncontrada = this.categorias.find(
                  c => c.nombre.toLowerCase() === this.categoriaSugerida.toLowerCase()
              );

              if (!categoriaEncontrada) {
                  // Crear categoría si no existe
                  await this.crearNuevaCategoria(this.categoriaSugerida);
                  await this.getCategorias(true); // Recargar categorías
                  categoriaEncontrada = this.categorias.find(
                      c => c.nombre.toLowerCase() === this.categoriaSugerida.toLowerCase()
                  );
              }

              if (categoriaEncontrada) {
                  this.nuevoReporte.categoria_id = categoriaEncontrada.id;
              } else {
                  this.errorMessage = 'Error al crear la categoría sugerida';
              }
          }

      } catch (error) {
          console.error('Error al analizar la imagen:', error);
          this.errorMessage = 'Error al procesar la imagen. Por favor, intenta con otra imagen.';
      } finally {
          this.analizandoImagen = false;
          if (this.nuevoReporte.imagen) this.nuevoReporte.imagen = file;
      }
  }

  async crearNuevaCategoria(nombre: string) {
    try {
        await firstValueFrom(
            this.srvCategorias.crearCategoria({
                nombre: nombre,
                descripcion: 'Creada automáticamente',
                es_autogenerada: true
            })
        );
    } catch (error) {
        console.error('Error creando categoría:', error);
    }
}

async getCategorias(forzarRecarga: boolean = false) {
    if (forzarRecarga || this.categorias.length === 0) {
        try {
            const res: any = await firstValueFrom(this.srvCategorias.getCategorias());
            this.categorias = res.data;
        } catch (error) {
            console.error('Error al obtener categorías:', error);
        }
    }
}

  // Obtiene la ubicación actual
  getGeolocalizacion() {
    if (navigator.geolocation) {
      this.geoLocationMessage = 'Obteniendo ubicación...';
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          const precision = position.coords.accuracy; // 👈 Radio de error en metros
          //console.log(`Precisión: ${precision} metros`);
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
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      this.geoLocationMessage = 'La geolocalización no es compatible con este navegador';
      this.geoLocationSuccess = false;
    }
  }

async crearReporte() {
    console.log('Iniciando creación de reporte...'); 
    
    if (!this.validarFormulario()) {
        console.log('No pasó la validación');
        return;
    }
    
    this.submitting = true;
    this.errorMessage = '';
    
    const formData = new FormData();
    
    // Debug logs para ver los datos
    console.log('Usuario ID:', this.userId);
    console.log('Imagen:', this.nuevoReporte.imagen);
    console.log('Descripción:', this.nuevoReporte.descripcion);
    console.log('Ubicación:', this.nuevoReporte.ubicacion);
    console.log('Categoría:', this.nuevoReporte.categoria_id);

    // Agregar campos directamente sin transformaciones
    formData.append('usuario_id', this.userId);
    formData.append('imagen', this.nuevoReporte.imagen);
    formData.append('descripcion', this.nuevoReporte.descripcion);
    formData.append('ubicacion', this.nuevoReporte.ubicacion);
    formData.append('estado', this.nuevoReporte.estado);
    
    if (this.nuevoReporte.categoria_id) {
      formData.append('categoria_id', this.nuevoReporte.categoria_id);
    }

    try {
      const response = await firstValueFrom(this.srvReports.crearReporte(formData));
      this.resetForm();
      this.reporteCreado.emit(response.data);
      this.cerrar();
    } catch (error: any) {
      this.errorMessage = error.message || 'Error al crear el reporte. Inténtalo de nuevo.';
      console.error('Error al crear reporte:', error);
    } finally {
      this.submitting = false;
    }
  }

  private validarFormulario(): boolean {
    console.log('Validando formulario...', this.nuevoReporte); // Debug log

    if (!this.nuevoReporte.descripcion?.trim()) {
        console.log('Error: descripción vacía');
        this.errorMessage = 'La descripción es requerida';
        return false;
    }
    if (!this.nuevoReporte.ubicacion) {
        console.log('Error: ubicación vacía');
        this.errorMessage = 'La ubicación es requerida';
        return false;
    }
    if (!this.nuevoReporte.imagen) {
        console.log('Error: imagen vacía');
        this.errorMessage = 'La imagen es requerida';
        return false;
    }
    if (this.analizandoImagen) {
        console.log('Error: análisis de imagen en proceso');
        this.errorMessage = 'Espere a que se complete el análisis de la imagen';
        return false;
    }
    if (!this.categoriaSugerida) {
        console.log('Error: no hay categoría sugerida');
        this.errorMessage = 'Espere la sugerencia de categoría';
        return false;
    }
    console.log('Validación exitosa');
    return true;
  }

  public resetForm() {
    this.nuevoReporte = {
      categoria_id: '',
      descripcion: '',
      ubicacion: null,
      imagen: null,
      estado: 'pendiente',
      urgencia: 'normal'
    };
    this.imagenPreview = null;
    this.categoriaSugerida = null;
    this.geoLocationMessage = '';
    this.geoLocationSuccess = false;
    this.errorMessage = '';
  }

  public cerrar() {
    this.resetForm();
    this.cerrarModal.emit();
  }
}
