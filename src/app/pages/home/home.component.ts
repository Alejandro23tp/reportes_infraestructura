import { Reaccion } from './../../interfaces/interacciones.interface';
import { Component, inject, OnInit } from '@angular/core';
import { ReportesService } from '../../services/reportes.service';
import { firstValueFrom } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategoriasService } from '../../services/categorias.service';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment.development';
import { InteraccionesService } from '../../services/interacciones.service';
import { Comentario } from '../../interfaces/interacciones.interface';

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
  comentariosPorReporte: { [key: number]: string } = {}; // Para el input de comentarios
  comentariosLista: { [key: number]: Comentario[] } = {}; // Para la lista de comentarios
  reaccionesPorReporte: { [key: number]: Reaccion[] } = {};
  comentarioRespuestaId: number | null = null;
  comentariosCounts: { [key: number]: any } = {};
  comentariosPrincipales: { [key: number]: any[] } = {};
  comentariosRespuestas: { [key: number]: any[] } = {};
  mostrarComentarios: { [key: number]: boolean } = {};
  mostrarRespuestas: { [key: number]: boolean } = {};
  comentarioEnEdicion: { [key: number]: string } = {};
  comentarioPadreId: number | null = null;
  comentarioRespuestaTexto: string = '';

  private srvReports = inject(ReportesService);
  private srvCategorias = inject(CategoriasService);
  private authService = inject(AuthService);
  private interaccionesService = inject(InteraccionesService);

  async ngOnInit() {
    await this.getReports();
    await this.getCategorias();
    this.authService.getUser().subscribe(user => {
      if (user) {
        this.userName = user.nombre || '';
        this.userId = user.sub || ''; // El ID del usuario viene en el claim 'sub' del JWT
      }
    });
    // Cargar reacciones y comentarios para cada reporte
    this.listReports.forEach(reporte => {
      this.cargarReaccionesParaReporte(reporte.id);
    });
    this.cargarContadoresComentarios();
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

  // Helper method to convert the reactions object to an array
  getReaccionesArray(reporteId: number): Reaccion[] {
    return this.reaccionesPorReporte[reporteId] || [];
  }

  cargarReaccionesParaReporte(reporteId: number) {
    this.interaccionesService.getReacciones(reporteId).subscribe({
      next: (response) => {
        // Ensure usuarios array exists and has the correct structure
        const reaccionesProcessed = response.data.map(reaccion => ({
          ...reaccion,
          usuarios: reaccion.usuarios?.map(usuario => ({
            ...usuario,
            nombre: usuario.nombre || 'Usuario'
          })) || []
        }));
        this.reaccionesPorReporte[reporteId] = reaccionesProcessed;
      },
      error: (error) => console.error('Error al cargar reacciones:', error)
    });
  }

  toggleReaccion(reporteId: number, tipoReaccion: number) {
    if (!this.userId) {
      console.error('Usuario no autenticado');
      return;
    }

    this.interaccionesService.toggleReaccion(reporteId, tipoReaccion, Number(this.userId)).subscribe({
      next: () => {
        this.cargarReaccionesParaReporte(reporteId);
      },
      error: (error) => console.error('Error al actualizar reacción:', error)
    });
  }

  getReaccionesPorTipo(reporteId: number, tipoReaccion: number): number {
    const reaccion = this.reaccionesPorReporte[reporteId]?.find(r => r.tipo === tipoReaccion);
    return reaccion?.count || 0;
  }

  getReaccionEmoji(tipo: number): string {
    switch(tipo) {
      case 1: return '👍';
      case 2: return '❤️';
      case 3: return '😠';
      case 4: return '😮';
      case 5: return '😂';
      default: return '👍';
    }
  }

  haReaccionado(reporteId: number, tipo: number): boolean {
    const reacciones = this.reaccionesPorReporte[reporteId] || [];
    return reacciones.some(r => 
      r.tipo === tipo && 
      r.usuarios.some(u => u.id === Number(this.userId))
    );
  }

  enviarComentario(reporteId: number) {
    const contenido = this.comentarioRespuestaTexto || this.comentariosPorReporte[reporteId];
    if (!contenido?.trim() || !this.userId) return;

    this.interaccionesService.crearComentario(
      reporteId,
      contenido,
      parseInt(this.userId),
      this.comentarioPadreId || undefined
    ).subscribe({
      next: () => {
        // Limpiar estados
        this.comentariosPorReporte[reporteId] = '';
        this.comentarioRespuestaTexto = '';
        const padreId = this.comentarioPadreId;
        this.comentarioPadreId = null;

        // Actualizar vistas
        this.cargarContadoresComentarios();
        if (this.mostrarComentarios[reporteId]) {
          this.cargarComentariosPrincipales(reporteId);
          // Si estábamos respondiendo a un comentario, recargar sus respuestas
          if (padreId && this.mostrarRespuestas[padreId]) {
            this.cargarRespuestas(padreId);
          }
        }
      },
      error: (error) => {
        console.error('Error al crear comentario:', error);
        this.errorMessage = 'Error al crear el comentario. Por favor, intenta de nuevo.';
      }
    });
  }

  responderComentario(reporteId: number, comentarioId: number) {
    this.comentarioPadreId = comentarioId;
    this.comentarioRespuestaTexto = '';
  }

  cancelarRespuesta() {
    this.comentarioPadreId = null;
    this.comentarioRespuestaTexto = '';
  }

  eliminarComentario(reporteId: number, comentarioId: number) {
    this.interaccionesService.eliminarComentario(comentarioId).subscribe({
      next: () => {
        // Actualizar contadores y comentarios principales
        this.cargarContadoresComentarios();
        if (this.mostrarComentarios[reporteId]) {
          this.cargarComentariosPrincipales(reporteId);
        }
      },
      error: (error) => console.error('Error al eliminar comentario:', error)
    });
  }

  cargarContadoresComentarios() {
    this.listReports.forEach(reporte => {
      this.interaccionesService.getComentariosCount(reporte.id)
        .subscribe(response => {
          this.comentariosCounts[reporte.id] = response.data;
        });
    });
  }

  toggleComentarios(reporteId: number) {
    this.mostrarComentarios[reporteId] = !this.mostrarComentarios[reporteId];
    if (this.mostrarComentarios[reporteId]) {
      this.cargarComentariosPrincipales(reporteId);
    }
  }

  cargarComentariosPrincipales(reporteId: number) {
    this.interaccionesService.getComentariosPrincipales(reporteId)
      .subscribe(response => {
        this.comentariosPrincipales[reporteId] = response.data;
      });
  }

  toggleRespuestas(reporteId: number, comentarioId: number) {
    this.mostrarRespuestas[comentarioId] = !this.mostrarRespuestas[comentarioId];
    if (this.mostrarRespuestas[comentarioId]) {
      this.cargarRespuestas(comentarioId);
    }
  }

  cargarRespuestas(comentarioId: number) {
    // Añadir console.log para depuración
    console.log('Cargando respuestas para comentario:', comentarioId);
    
    this.interaccionesService.getRespuestasComentario(comentarioId).subscribe({
      next: (response) => {
        console.log('Respuestas recibidas:', response);
        this.comentariosRespuestas[comentarioId] = response.data;
      },
      error: (error) => {
        console.error('Error al cargar respuestas:', error);
      }
    });
  }

  // Agregar este método helper
  getComentarioTexto(reporteId: number): string {
    return this.comentarioPadreId ? this.comentarioRespuestaTexto : (this.comentariosPorReporte[reporteId] || '');
  }

  setComentarioTexto(reporteId: number, valor: string) {
    if (this.comentarioPadreId) {
      this.comentarioRespuestaTexto = valor;
    } else {
      this.comentariosPorReporte[reporteId] = valor;
    }
  }
}
