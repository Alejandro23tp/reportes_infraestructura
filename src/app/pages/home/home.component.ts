import { Reaccion } from './../../interfaces/interacciones.interface';
import { Component, inject, OnInit } from '@angular/core';
import { ReportesService } from '../../services/reportes.service';
import { firstValueFrom } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategoriasService } from '../../services/categorias.service';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment.development';
import { InteraccionesService } from '../../services/interacciones.service';
import { Comentario } from '../../interfaces/interacciones.interface';
import { SkeletonLoaderComponent } from '../../components/skeleton-loader/skeleton-loader.component';
import { ReporteFormModalComponent } from '../../components/reportes/reporte-form-modal/reporte-form-modal.component';
import { AdminPanelComponent } from '../../components/admin/admin-panel/admin-panel.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    SkeletonLoaderComponent,
    ReporteFormModalComponent,
    AdminPanelComponent
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export default class HomeComponent implements OnInit {
  listReports: any[] = [];


  errorMessage: string = '';  // Variable para almacenar el mensaje de error
  mostrarFormulario = false;




  userName: string = '';
  userId: string = '';
  isAdmin: boolean = false;
 
  
  comentariosPorReporte: { [key: number]: string } = {}; // Para el input de comentarios
  comentariosLista: { [key: number]: Comentario[] } = {}; // Para la lista de comentarios
  reaccionesPorReporte: { [key: number]: Reaccion[] } = {};
  comentarioRespuestaId: number | null = null;
  comentariosCounts: { [key: number]: any } = {};
  comentariosPrincipales: { [key: number]: any[] } = {};
  comentariosRespuestas: { [key: number]: any[] } = {};
  mostrarComentarios: { [key: number]: boolean } = {};
  mostrarRespuestas: { [key: number]: boolean } = {};
  comentarioPadreId: number | null = null;
  comentarioRespuestaTexto: string = '';
  loading = true;
  reaccionesLoading: { [key: number]: boolean } = {};
  comentariosLoading: { [key: number]: boolean } = {};
  private pageSize = 5;
  private currentPage = 0;
  private isLoading = false;
  private allReportsLoaded = false;
  private loadedReportIds = new Set<number>();
  imagesLoading = new Map<number, boolean>();
  private currentImageIndex = 0;
  private batchSize = 5;

  selectedImage: string | null = null; // Add this property

  constructor(
    private srvReports: ReportesService,
    private srvCategorias: CategoriasService,
    private authService: AuthService,
    private interaccionesService: InteraccionesService
  ) {}

  async ngOnInit() {
    await this.getInitialReports();
    //await this.getCategorias();
    this.authService.getUser().subscribe(user => {
      if (user) {
        this.userName = user.nombre || '';
        this.userId = user.sub || '';
        this.isAdmin = user.rol === 'admin'; // Assuming the role is returned from your auth service
        // Cargar todos los datos iniciales
        this.cargarDatosIniciales();
      }
    });
    this.setupInfiniteScroll();
  }

  private async cargarDatosIniciales() {
    // Cargar datos para todos los reportes
    for (const reporte of this.listReports) {
      await this.cargarDatosReporteAsync(reporte.id);
      this.loadedReportIds.add(reporte.id);
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

    // Cargar datos para cada reporte nuevo
    for (const reporte of nextReports) {
      if (!this.loadedReportIds.has(reporte.id)) {
        await this.cargarDatosReporteAsync(reporte.id);
        this.loadedReportIds.add(reporte.id);
        // Precargar imagen si es necesario
        if (!this.imagesLoading.has(reporte.id)) {
          this.precargarImagen(reporte);
        }
      }
    }

    this.currentPage++;
    this.isLoading = false;
  }

  private async cargarDatosReporteAsync(reporteId: number): Promise<void> {
    if (this.loadedReportIds.has(reporteId)) {
      return; // Si ya están cargados los datos, no los volvemos a cargar
    }

    try {
      this.reaccionesLoading[reporteId] = true;
      this.comentariosLoading[reporteId] = true;

      const [reacciones, comentarios] = await Promise.all([
        firstValueFrom(this.interaccionesService.getReacciones(reporteId)),
        firstValueFrom(this.interaccionesService.getComentariosCount(reporteId))
      ]);

      // Asegurarnos de que los datos se guarden correctamente
      if (reacciones?.data) {
        this.reaccionesPorReporte[reporteId] = reacciones.data.map(reaccion => ({
          ...reaccion,
          usuarios: reaccion.usuarios?.map(usuario => ({
            ...usuario,
            nombre: usuario.nombre || 'Usuario'
          })) || []
        }));
      }

      if (comentarios?.data) {
        this.comentariosCounts[reporteId] = comentarios.data;
      }

      // Marcar como cargado solo si todo fue exitoso
      this.loadedReportIds.add(reporteId);

    } catch (error) {
      console.error(`Error cargando datos para reporte ${reporteId}:`, error);
      // Remover del set si hubo error para intentar cargar de nuevo después
      this.loadedReportIds.delete(reporteId);
    } finally {
      this.reaccionesLoading[reporteId] = false;
      this.comentariosLoading[reporteId] = false;
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
          console.log('reporte.imagen_url',environment.urlApiImages + reporte.imagen_url);
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

  toggleFormulario(show: boolean = false) {
    this.mostrarFormulario = show;
  }

  handleReporteCreado(reporte: any) {
    this.getInitialReports();
  }

  openImageViewer(imageUrl: string) { // Add this method
    this.selectedImage = imageUrl;
  }

  closeImageViewer() { // Add this method
    this.selectedImage = null;
  }
}
