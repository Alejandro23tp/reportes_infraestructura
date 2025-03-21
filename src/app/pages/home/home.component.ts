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
import { SkeletonLoaderComponent } from '../../components/skeleton-loader/skeleton-loader.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, SkeletonLoaderComponent],
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
  loading = true;
  reaccionesLoading: { [key: number]: boolean } = {};
  comentariosLoading: { [key: number]: boolean } = {};
  private srvReports = inject(ReportesService);
  private srvCategorias = inject(CategoriasService);
  private authService = inject(AuthService);
  private interaccionesService = inject(InteraccionesService);
  private pageSize = 5;
  private currentPage = 0;
  private isLoading = false;
  private allReportsLoaded = false;
  private loadedReportIds = new Set<number>();
  imagesLoading = new Map<number, boolean>();
  private currentImageIndex = 0;
  private batchSize = 5;

  async ngOnInit() {
    await this.getInitialReports();
    await this.getCategorias();
    this.authService.getUser().subscribe(user => {
      if (user) {
        this.userName = user.nombre || '';
        this.userId = user.sub || ''; // El ID del usuario viene en el claim 'sub' del JWT
        // Solo cargamos los datos iniciales una vez
        this.cargarDatosInicialesPrioritarios();
      }
    });
    this.setupInfiniteScroll();
  }

  private async cargarDatosInicialesPrioritarios() {
    // Tomar las primeras 3 publicaciones
    const publicacionesPrioritarias = this.listReports.slice(0, 3);
    
    // Cargar sus datos de forma prioritaria
    for (const reporte of publicacionesPrioritarias) {
      if (!this.loadedReportIds.has(reporte.id)) {
        await this.cargarDatosReporteAsync(reporte.id);
        this.loadedReportIds.add(reporte.id);
      }
    }
  }

  private cargarDatosRestantes(startIndex: number) {
    const reportesRestantes = this.listReports.slice(startIndex);
    for (const reporte of reportesRestantes) {
      if (!this.loadedReportIds.has(reporte.id)) {
        this.cargarDatosReporteAsync(reporte.id);
        this.loadedReportIds.add(reporte.id);
      }
    }
  }

  private async getInitialReports() {
    try {
      const res: any = await firstValueFrom(this.srvReports.getReports());
      // Limpiar estados antes de actualizar la lista
      this.imagesLoading.clear();
      this.loadedReportIds.clear();
      
      this.listReports = res.data
        .map((reporte: any) => {
          reporte.ubicacion = JSON.parse(reporte.ubicacion);
          reporte.imagen_url = `${environment.urlApiImages}${reporte.imagen_url}`;
          this.imagesLoading.set(reporte.id, true);
          return reporte;
        })
        .sort((a: any, b: any) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

      // Precargar imágenes
      this.preloadImages();
    } catch (error) {
      console.error('Error al obtener los reportes:', error);
    }
  }

  private setupInfiniteScroll() {
    window.addEventListener('scroll', () => {
      if (this.isLoading || this.allReportsLoaded) return;

      const scrollHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;
      const clientHeight = document.documentElement.clientHeight;

      if (scrollHeight - scrollTop <= clientHeight + 100) {
        this.loadMoreReports();
      }
    });
  }

  private async loadMoreReports() {
    if (this.isLoading || this.allReportsLoaded) return;

    this.isLoading = true;
    const start = (this.currentPage + 1) * this.pageSize;
    const end = start + this.pageSize;
    const nextReports = this.listReports.slice(start, end);

    if (nextReports.length === 0) {
      this.allReportsLoaded = true;
      this.isLoading = false;
      return;
    }

    // Cargar datos para cada reporte
    for (const reporte of nextReports) {
      await this.cargarDatosReporteAsync(reporte.id);
      // Asegurarse de que la imagen se cargue
      if (!this.imagesLoading.has(reporte.id)) {
        this.precargarImagen(reporte);
      }
    }

    this.currentPage++;
    this.isLoading = false;
  }

  private async cargarDatosReporteAsync(reporteId: number): Promise<void> {
    try {
      this.reaccionesLoading[reporteId] = true;
      this.comentariosLoading[reporteId] = true;

      const [reacciones, comentarios] = await Promise.all([
        firstValueFrom(this.interaccionesService.getReacciones(reporteId)),
        firstValueFrom(this.interaccionesService.getComentariosCount(reporteId))
      ]);

      // Procesar reacciones
      this.reaccionesPorReporte[reporteId] = reacciones.data.map(reaccion => ({
        ...reaccion,
        usuarios: reaccion.usuarios?.map(usuario => ({
          ...usuario,
          nombre: usuario.nombre || 'Usuario'
        })) || []
      }));

      this.comentariosCounts[reporteId] = comentarios.data;
    } catch (error) {
      console.error(`Error cargando datos para reporte ${reporteId}:`, error);
    } finally {
      this.reaccionesLoading[reporteId] = false;
      this.comentariosLoading[reporteId] = false;
    }
  }

  private cargarDatosReporte(reporteId: number) {
    if (!this.loadedReportIds.has(reporteId)) {
      this.cargarDatosReporteAsync(reporteId);
      this.loadedReportIds.add(reporteId);
    }
  }

  private precargarImagen(reporte: any) {
    this.imagesLoading.set(reporte.id, true);
    const img = new Image();
    img.onload = () => this.imagesLoading.set(reporte.id, false);
    img.onerror = () => this.imagesLoading.set(reporte.id, false);
    img.src = reporte.imagen_url;
  }

  private preloadImages() {
    // Cargar las primeras 5 imágenes
    const initialBatch = this.listReports.slice(0, this.batchSize);
    initialBatch.forEach(reporte => this.precargarImagen(reporte));

    // Programar la carga del siguiente lote cuando se complete el primero
    setTimeout(() => {
      const nextBatch = this.listReports.slice(this.batchSize);
      nextBatch.forEach(reporte => this.precargarImagen(reporte));
    }, 1000);
  }

  isImageLoading(reporteId: number): boolean {
    return this.imagesLoading.get(reporteId) !== false;
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
          timeout: 10000,
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
      await this.getInitialReports(); // Cambiamos getReports por getInitialReports
      
      // Forzar la carga de datos e imagen del nuevo reporte
      if (response.data && response.data.id) {
        this.precargarImagen({
          id: response.data.id,
          imagen_url: `${environment.urlApiImages}${response.data.imagen_url}`
        });
        await this.cargarDatosReporteAsync(response.data.id);
      }
      
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
    return this.cargarDatosReporteAsync(reporteId);
  }

  toggleReaccion(reporteId: number, tipoReaccion: number) {
    if (!this.userId) {
      console.error('Usuario no autenticado');
      return;
    }

    const usuarioId = Number(this.userId);
    const reaccionActual = this.reaccionesPorReporte[reporteId]?.find(
      r => r.tipo === tipoReaccion && r.usuarios.some(u => u.id === usuarioId)
    );

    // Copia de las reacciones actuales
    let reacciones = [...(this.reaccionesPorReporte[reporteId] || [])];

    // Si ya existe esta reacción del usuario, solo la quitamos
    if (reaccionActual) {
      reaccionActual.usuarios = reaccionActual.usuarios.filter(u => u.id !== usuarioId);
      reaccionActual.count = Math.max(0, reaccionActual.count - 1);
      reacciones = reacciones.filter(r => r.count > 0);
    } else {
      // Eliminar cualquier otra reacción del usuario
      reacciones = reacciones.map(r => {
        if (r.usuarios.some(u => u.id === usuarioId)) {
          return {
            ...r,
            usuarios: r.usuarios.filter(u => u.id !== usuarioId),
            count: r.count - 1
          };
        }
        return r;
      }).filter(r => r.count > 0);

      // Agregar la nueva reacción
      const reaccionExistente = reacciones.find(r => r.tipo === tipoReaccion);
      if (reaccionExistente) {
        reaccionExistente.usuarios.push({ id: usuarioId, nombre: this.userName });
        reaccionExistente.count++;
      } else {
        reacciones.push({
          tipo: tipoReaccion,
          count: 1,
          usuarios: [{ id: usuarioId, nombre: this.userName }]
        });
      }
    }

    // Actualizar el estado inmediatamente
    this.reaccionesPorReporte[reporteId] = reacciones;

    // Llamada al servidor sin esperar respuesta para UI más fluida
    this.interaccionesService.toggleReaccion(reporteId, tipoReaccion, usuarioId)
      .subscribe({
        error: (error) => {
          console.error('Error al actualizar reacción:', error);
          // Solo recargar en caso de error
          this.cargarReaccionesParaReporte(reporteId);
        }
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
      next: async () => {
        // Limpiar estados
        this.comentariosPorReporte[reporteId] = '';
        this.comentarioRespuestaTexto = '';
        const padreId = this.comentarioPadreId;
        this.comentarioPadreId = null;

        // Actualizar inmediatamente los contadores y comentarios
        try {
          // Actualizar el contador de comentarios
          const countResponse = await firstValueFrom(
            this.interaccionesService.getComentariosCount(reporteId)
          );
          this.comentariosCounts[reporteId] = countResponse.data;

          // Si los comentarios están visibles, actualizar la lista
          if (this.mostrarComentarios[reporteId]) {
            const comentariosResponse = await firstValueFrom(
              this.interaccionesService.getComentariosPrincipales(reporteId)
            );
            this.comentariosPrincipales[reporteId] = comentariosResponse.data;

            // Si estábamos respondiendo a un comentario, actualizar sus respuestas
            if (padreId && this.mostrarRespuestas[padreId]) {
              const respuestasResponse = await firstValueFrom(
                this.interaccionesService.getRespuestasComentario(padreId)
              );
              this.comentariosRespuestas[padreId] = respuestasResponse.data;
            }
          }
        } catch (error) {
          console.error('Error al actualizar comentarios:', error);
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
