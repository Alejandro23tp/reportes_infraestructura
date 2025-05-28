import { Reaccion } from './../../interfaces/interacciones.interface';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ReportesService } from '../../services/reportes.service';
import { firstValueFrom } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment.development';
import { InteraccionesService } from '../../services/interacciones.service';
import { Comentario } from '../../interfaces/interacciones.interface';
import { SkeletonLoaderComponent } from '../../components/skeleton-loader/skeleton-loader.component';
import { ReporteFormModalComponent } from '../../components/reportes/reporte-form-modal/reporte-form-modal.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    SkeletonLoaderComponent,
    ReporteFormModalComponent,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export default class HomeComponent implements OnInit {
  listReports: any[] = [];
  errorMessage: string = '';
  mostrarFormulario = false;
  userName: string = '';
  userId: string = '';
  isAdmin: boolean = false;
  
  // Comentarios y reacciones
  comentariosPorReporte: { [key: number]: string } = {};
  reaccionesPorReporte: { [key: number]: Reaccion[] } = {};
  comentariosCounts: { [key: number]: { total_comentarios: number, total_reacciones: number } } = {};
  mostrarComentarios: { [key: number]: boolean } = {};
  mostrarRespuestas: { [key: number]: boolean } = {};
  comentariosPrincipales: { [key: number]: any[] } = {};
  comentariosRespuestas: { [key: number]: any[] } = {};
  comentarioPadreId: number | null = null;
  comentarioRespuestaTexto: string = '';
  loading = true;
  reaccionesLoading: { [key: number]: boolean } = {};
  comentariosLoading: { [key: number]: boolean } = {};
  imagesLoading = new Map<number, boolean>();
  
  // Variables para scroll infinito
  currentPage = 1;
  totalPages = 1;
  pageSize = 10;
  totalItems = 0;
  isLoading = false;
  isLoadingMore = false;
  private loadedReportIds = new Set<number>();
  private scrollContainer: HTMLElement | null = null;
  private readonly SCROLL_THRESHOLD = 500; // Píxeles desde el fondo para cargar más
  private scrollHandler = this.onScroll.bind(this);
  
  // Método para verificar si hay más páginas por cargar
  get hasMorePages(): boolean {
    return this.currentPage < this.totalPages && !this.isLoadingMore;
  }

  // Variables para el visor de imágenes
  selectedImage: string | null = null;
  selectedReporte: any = null;
  nuevoEstado: string = '';

  constructor(
    private reportesService: ReportesService,
    private authService: AuthService,
    private interaccionesService: InteraccionesService,
    private router: Router
  ) {}

  async ngOnInit() {
    await this.loadInitialData();
    this.authService.getUser().subscribe(user => {
      if (user) {
        this.userName = user.nombre || '';
        this.userId = user.sub || '';
        this.isAdmin = user.rol === 'admin';
      }
    });
    
    // Configurar el scroll después de la renderización inicial
    setTimeout(() => this.setupScrollListener(), 0);
  }
  
  ngOnDestroy() {
    this.removeScrollListener();
  }

  private async loadInitialData(): Promise<void> {
    if (this.isLoading) return;
    
    this.isLoading = true;
    this.listReports = [];
    this.loadedReportIds.clear();
    this.currentPage = 0; // Empezamos en 0 para que la primera carga sea la 1
    
    await this.loadMoreReports();
    this.isLoading = false;
  }
  
  private async loadMoreReports(): Promise<void> {
    // Verificar si ya estamos cargando o no hay más páginas
    if (this.isLoadingMore || !this.hasMorePages) {
      console.log('No se cargarán más reportes. isLoadingMore:', this.isLoadingMore, 'hasMorePages:', this.hasMorePages);
      return;
    }
    
    // Calcular la siguiente página
    const nextPage = this.currentPage + 1;
    console.log('Cargando página', nextPage, 'de', this.totalPages);
    
    this.isLoadingMore = true;
    
    try {
      // Mostrar el spinner de carga
      this.isLoading = true;
      
      // Hacer la petición al servidor
      const res = await firstValueFrom(
        this.reportesService.getReportsWithInteractions({ page: nextPage })
      ) as { 
        data: any[], 
        pagination: { 
          total: number, 
          current_page: number, 
          last_page: number,
          per_page: number
        } 
      };
      
      console.log('Respuesta del servidor:', res);
      
      if (res?.data && res.data.length > 0) {
        console.log(`Se recibieron ${res.data.length} reportes`);
        
        // Procesar los nuevos reportes (sin limpiar los existentes)
        this.processNewReports(res.data);
        
        // Actualizar la información de paginación
        this.currentPage = res.pagination.current_page;
        this.totalPages = res.pagination.last_page;
        this.totalItems = res.pagination.total;
        this.pageSize = res.pagination.per_page;
        
        console.log('Paginación actualizada:', {
          currentPage: this.currentPage,
          totalPages: this.totalPages,
          totalItems: this.totalItems
        });
      } else {
        console.log('No hay más reportes para cargar');
      }
    } catch (error) {
      console.error('Error al cargar más reportes:', error);
      // Aquí podrías mostrar un mensaje de error al usuario
    } finally {
      this.isLoading = false;
      this.isLoadingMore = false;
      
      // Verificar si necesitamos cargar más contenido
      setTimeout(() => this.checkScroll(), 100);
    }
  }
  
  private setupScrollListener(): void {
    // Usar el contenedor principal o el body
    this.scrollContainer = document.documentElement || document.body;
    
    // Asegurarse de que el contenedor tenga la altura suficiente para hacer scroll
    this.adjustContainerHeight();
    
    // Agregar el event listener
    window.addEventListener('scroll', this.scrollHandler, { passive: true });
    
    // Forzar una verificación inicial
    setTimeout(() => this.checkScroll(), 300);
  }
  
  private adjustContainerHeight(): void {
    // Asegurarse de que el body tenga al menos el 100% de la altura de la ventana
    document.body.style.minHeight = '100vh';
  }
  
  private removeScrollListener(): void {
    window.removeEventListener('scroll', this.scrollHandler);
  }
  
  private onScroll(): void {
    this.checkScroll();
  }
  
  private checkScroll(): void {
    if (this.isLoadingMore || !this.hasMorePages) {
      console.log('checkScroll: No se verificará el scroll. isLoadingMore:', this.isLoadingMore, 'hasMorePages:', this.hasMorePages);
      return;
    }
    
    try {
      const scrollPosition = window.innerHeight + window.scrollY;
      const bodyHeight = document.body.offsetHeight;
      const threshold = 500; // Aumentar el umbral para mayor confiabilidad
      
      console.log('Verificando scroll - Posición:', scrollPosition, 'Altura total:', bodyHeight, 'Umbral:', bodyHeight - threshold);
      
      // Verificar si estamos cerca del final de la página
      if (scrollPosition >= bodyHeight - threshold) {
        console.log('Umbral alcanzado, cargando más reportes...');
        this.loadMoreReports();
      }
    } catch (error) {
      console.error('Error al verificar el scroll:', error);
    }
  }

  private processNewReports(reports: any[]): void {
    const newReports = reports
      .filter((reporte: any) => !this.loadedReportIds.has(reporte.id))
      .map((reporte: any) => {
        //console.log(reporte);
        this.processReportData(reporte);
        
        reporte.ubicacion = typeof reporte.ubicacion === 'string' 
          ? JSON.parse(reporte.ubicacion) 
          : reporte.ubicacion;
          
        reporte.imagen_url = `${reporte.imagen_url}`;
        this.precargarImagen(reporte);
        
        // Asegurarse de que reaccionesPorReporte[reporte.id] sea un array
        const reacciones = Array.isArray(this.reaccionesPorReporte[reporte.id]) 
          ? this.reaccionesPorReporte[reporte.id] 
          : [];
          
        this.comentariosCounts[reporte.id] = {
          total_comentarios: reporte.total_comentarios || 0,
          total_reacciones: reacciones.reduce((sum: number, r: any) => sum + (r.count || 0), 0)
        };
        
        return reporte;
      });

    this.listReports = [...this.listReports, ...newReports];
  }

  private precargarImagen(reporte: any): void {
    if (!reporte?.id || !reporte?.imagen_url) return;
    
    this.imagesLoading.set(reporte.id, true);
    const img = new Image();
    img.onload = () => this.imagesLoading.set(reporte.id, false);
    img.onerror = () => this.imagesLoading.set(reporte.id, false);
    img.src = reporte.imagen_url;
  }

  private async cargarDatosReporteAsync(reporteId: number): Promise<void> {
    if (this.loadedReportIds.has(reporteId)) {
      return; // Si ya están cargados los datos, no los volvemos a cargar
    }

    try {
      // Mostrar carga
      this.comentariosLoading[reporteId] = true;

      // Buscar el reporte en la lista actual
      const reporte = this.listReports.find(r => r.id === reporteId);
      
      if (reporte) {
        this.processReportData(reporte);
      } else {
        // Si no está en la lista, lo cargamos individualmente
        const response = await firstValueFrom(
          this.reportesService.getReportsWithInteractions({ page: 1, perPage: 1, reporteId })
        ) as { data: any[] };
        
        if (response?.data?.length > 0) {
          this.processReportData(response.data[0]);
        }
      }

      // Marcar como cargado
      this.loadedReportIds.add(reporteId);
    } catch (error) {
      console.error(`Error procesando datos para reporte ${reporteId}:`, error);
    } finally {
      this.comentariosLoading[reporteId] = false;
    }
  }

  private processReportData(reporte: any) {
    // Asegurar que la ubicación sea un objeto
    if (typeof reporte.ubicacion === 'string') {
      reporte.ubicacion = JSON.parse(reporte.ubicacion);
    }
    
    // Construir URL de la imagen
    reporte.imagen_url = `${environment.urlApiImages}${reporte.imagen_url}`;
    
    // Precargar imagen
    this.precargarImagen(reporte);
    
    // Inicializar array de reacciones
    this.reaccionesPorReporte[reporte.id] = [];
    
    // Procesar reacciones si vienen del servidor
    if (reporte.reacciones?.contadores) {
      // Convertir el objeto de contadores a un array de reacciones
      Object.entries<number>(reporte.reacciones.contadores as Record<string, number>).forEach(([tipo, count]) => {
        if (count > 0) {
          this.reaccionesPorReporte[reporte.id].push({
            tipo: Number(tipo),
            count: count,
            usuarios: reporte.reacciones.usuarios_por_tipo?.[tipo] || []
          });
        }
      });
    }
    
    // Inicializar contadores
    this.comentariosCounts[reporte.id] = {
      total_comentarios: reporte.total_comentarios || 0,
      total_reacciones: Object.values(reporte.reacciones?.contadores || {}).reduce(
        (sum: number, count: any) => sum + Number(count), 
        0
      )
    };
    
    // Procesar comentarios si vienen del servidor
    if (reporte.comentarios && Array.isArray(reporte.comentarios)) {
      this.comentariosPrincipales[reporte.id] = reporte.comentarios.map((comentario: any) => ({
        ...comentario,
        // Asegurarse de que las respuestas estén inicializadas
        respuestas: comentario.respuestas || []
      }));
    }
    
    // Marcar como cargado
    this.loadedReportIds.add(reporte.id);
  }

  async toggleReaccion(reporteId: number, tipoReaccion: number): Promise<void> {
    if (!this.userId) {
      console.error('Usuario no autenticado');
      return;
    }

    // Guardar el estado actual para poder revertir si hay error
    const estadoAnterior = {
      reacciones: { ...this.reaccionesPorReporte },
      contadores: { ...this.comentariosCounts }
    };

    // Actualizar la interfaz de usuario inmediatamente
    this.actualizarEstadoLocalReacciones(reporteId, tipoReaccion);

    try {
      // Llamar a la API en segundo plano
      await firstValueFrom(
        this.interaccionesService.toggleReaccion(reporteId, tipoReaccion, Number(this.userId))
      );
    } catch (error) {
      console.error('Error al actualizar la reacción:', error);
      
      // Revertir los cambios locales si hay error
      this.reaccionesPorReporte = estadoAnterior.reacciones;
      this.comentariosCounts = estadoAnterior.contadores;
      
      // Forzar la detección de cambios
      this.reaccionesPorReporte = { ...this.reaccionesPorReporte };
      this.comentariosCounts = { ...this.comentariosCounts };
      
      // Mostrar mensaje de error al usuario
      this.errorMessage = 'Error al actualizar la reacción. Por favor, inténtalo de nuevo.';
    }
  }

  /**
   * Actualiza el estado local de las reacciones sin hacer llamadas a la API
   */
  private actualizarEstadoLocalReacciones(reporteId: number, tipoReaccion: number): void {
    // Obtener reacciones actuales o inicializar array si no existe
    const currentReactions = [...(this.reaccionesPorReporte[reporteId] || [])];
    const userId = Number(this.userId);
    
    // Buscar si el usuario ya tiene una reacción
    const userReactionIndex = currentReactions.findIndex(r => 
      r.usuarios.some((u: any) => u.id === userId)
    );
    
    // Si el usuario ya tiene una reacción de este tipo, la quitamos
    if (userReactionIndex !== -1 && currentReactions[userReactionIndex].tipo === tipoReaccion) {
      const reaccionUsuario = currentReactions[userReactionIndex];
      reaccionUsuario.count--;
      reaccionUsuario.usuarios = reaccionUsuario.usuarios.filter((u: any) => u.id !== userId);
      
      // Si no quedan más reacciones de este tipo, la eliminamos
      if (reaccionUsuario.count === 0) {
        currentReactions.splice(userReactionIndex, 1);
      }
    } 
    // Si el usuario tiene otra reacción, la quitamos y agregamos la nueva
    else if (userReactionIndex !== -1) {
      const otraReaccion = currentReactions[userReactionIndex];
      otraReaccion.count--;
      otraReaccion.usuarios = otraReaccion.usuarios.filter((u: any) => u.id !== userId);
      
      // Si no quedan más reacciones de este tipo, la eliminamos
      if (otraReaccion.count === 0) {
        currentReactions.splice(userReactionIndex, 1);
      }
      
      // Buscar si ya existe una reacción del nuevo tipo
      const nuevaReaccionIndex = currentReactions.findIndex(r => r.tipo === tipoReaccion);
      
      if (nuevaReaccionIndex !== -1) {
        // Si ya existe, incrementar el contador
        currentReactions[nuevaReaccionIndex].count++;
        currentReactions[nuevaReaccionIndex].usuarios.push({ 
          id: userId, 
          nombre: this.userName 
        });
      } else {
        // Si no existe, crear una nueva reacción
        currentReactions.push({
          tipo: tipoReaccion,
          count: 1,
          usuarios: [{ id: userId, nombre: this.userName }]
        });
      }
    } 
    // Si el usuario no tiene ninguna reacción, agregamos la nueva
    else {
      const reaccionExistenteIndex = currentReactions.findIndex(r => r.tipo === tipoReaccion);
      
      if (reaccionExistenteIndex !== -1) {
        // Si ya existe una reacción de este tipo, incrementar el contador
        currentReactions[reaccionExistenteIndex].count++;
        currentReactions[reaccionExistenteIndex].usuarios.push({ 
          id: userId, 
          nombre: this.userName 
        });
      } else {
        // Si no existe, crear una nueva reacción
        currentReactions.push({
          tipo: tipoReaccion,
          count: 1,
          usuarios: [{ id: userId, nombre: this.userName }]
        });
      }
    }
    
    // Actualizar el estado con las nuevas reacciones
    this.reaccionesPorReporte[reporteId] = currentReactions;
    
    // Actualizar el contador total de reacciones
    if (this.comentariosCounts[reporteId]) {
      this.comentariosCounts[reporteId].total_reacciones = 
        currentReactions.reduce((sum, r) => sum + r.count, 0);
    } else {
      this.comentariosCounts[reporteId] = {
        total_comentarios: 0,
        total_reacciones: currentReactions.reduce((sum, r) => sum + r.count, 0)
      };
    }
    
    // Forzar la detección de cambios
    this.reaccionesPorReporte = { ...this.reaccionesPorReporte };
    this.comentariosCounts = { ...this.comentariosCounts };
  }

  getReaccionesArray(reporteId: number): Reaccion[] {
    return this.reaccionesPorReporte[reporteId] || [];
  }

  getReaccionesPorTipo(reporteId: number, tipoReaccion: number): number {
    const reaccion = this.reaccionesPorReporte[reporteId]?.find(r => r.tipo === tipoReaccion);
    return reaccion?.count || 0;
  }



  haReaccionado(reporteId: number, tipo: number): boolean {
    const reacciones = this.reaccionesPorReporte[reporteId] || [];
    return reacciones.some(r => 
      r.tipo === tipo && 
      r.usuarios.some(u => u.id === Number(this.userId))
    );
  }



  cancelarRespuesta() {
    this.comentarioPadreId = null;
    this.comentarioRespuestaTexto = '';
  }

  enviarComentario(reporteId: number) {
    const contenido = this.comentarioRespuestaTexto || this.comentariosPorReporte[reporteId];
    if (!contenido?.trim() || !this.userId) return;

    // Mostrar loading
    this.comentariosLoading[reporteId] = true;
    const padreId = this.comentarioPadreId;

    console.log('Enviando comentario:', { reporteId, contenido, padreId, userId: this.userId });

    this.interaccionesService.crearComentario(
      reporteId,
      contenido,
      parseInt(this.userId),
      padreId || undefined
    ).subscribe({
      next: (response: any) => {
        console.log('Respuesta del servidor:', response);
        try {
          // Obtener el comentario de la respuesta
          const nuevoComentario = response?.data || response?.comentario || response;
          
          if (!nuevoComentario) {
            console.error('No se recibió el comentario del servidor');
            return;
          }
          
          // Asegurarse de que el comentario tenga la estructura correcta
          const comentarioActualizado = {
            id: nuevoComentario.id || Date.now(),
            contenido: nuevoComentario.contenido || contenido,
            created_at: nuevoComentario.created_at || new Date().toISOString(),
            usuario: {
              id: parseInt(this.userId),
              nombre: this.userName,
              email: ''
            },
            reporte_id: reporteId,
            padre_id: padreId || null,
            respuestas: [] // Asegurar que el array de respuestas esté inicializado
          };

          // Asegurarse de que la sección de comentarios esté abierta
          this.mostrarComentarios[reporteId] = true;

          if (padreId) {
            // Es una respuesta a un comentario existente
            this.mostrarRespuestas[padreId] = true;
            
            // Actualizar las respuestas localmente
            const comentarioPadre = this.comentariosPrincipales[reporteId]?.find(c => c.id === padreId);
            if (comentarioPadre) {
              // Inicializar el array de respuestas si no existe
              if (!comentarioPadre.respuestas) {
                comentarioPadre.respuestas = [];
              }
              // Agregar la nueva respuesta al inicio del array
              comentarioPadre.respuestas = [comentarioActualizado, ...comentarioPadre.respuestas];
              comentarioPadre.respuestas_count = (comentarioPadre.respuestas_count || 0) + 1;
            }

            // Limpiar el campo de respuesta
            this.comentarioRespuestaTexto = '';
            this.comentarioPadreId = null;
          } else {
            // Es un comentario principal
            if (!this.comentariosPrincipales[reporteId]) {
              this.comentariosPrincipales[reporteId] = [];
            }
            
            // Crear un nuevo array con el nuevo comentario
            const nuevosComentarios = [comentarioActualizado, ...this.comentariosPrincipales[reporteId] || []];
            
            // Actualizar el objeto de comentarios principales de manera inmutable
            this.comentariosPrincipales = {
              ...this.comentariosPrincipales,
              [reporteId]: nuevosComentarios
            };

            // Limpiar el campo de comentario
            this.comentariosPorReporte[reporteId] = '';
          }
          
          // Actualizar el contador de comentarios
          if (this.comentariosCounts[reporteId]) {
            this.comentariosCounts[reporteId].total_comentarios++;
          } else {
            this.comentariosCounts[reporteId] = { total_comentarios: 1, total_reacciones: 0 };
          }
          
          // Forzar la detección de cambios
          this.comentariosPrincipales = { ...this.comentariosPrincipales };
          this.comentariosRespuestas = { ...this.comentariosRespuestas };
          this.comentariosCounts = { ...this.comentariosCounts };
          
        } catch (error) {
          console.error('Error al procesar la respuesta del servidor:', error);
        }
      },
      error: (error) => {
        console.error('Error al crear comentario:', error);
        this.errorMessage = 'Error al crear el comentario. Por favor, intenta de nuevo.';
      },
      complete: () => {
        this.comentariosLoading[reporteId] = false;
      }
    });
}

  eliminarComentario(reporteId: number, comentarioId: number) {
    this.interaccionesService.eliminarComentario(comentarioId).subscribe({
      next: () => {
        // Actualizar contadores y comentarios principales
        if (this.mostrarComentarios[reporteId]) {
          this.cargarComentariosPrincipales(reporteId);
        }
      },
      error: (error) => console.error('Error al eliminar comentario:', error)
    });
  }



  toggleComentarios(reporteId: number) {
    this.mostrarComentarios[reporteId] = !this.mostrarComentarios[reporteId];
    if (this.mostrarComentarios[reporteId] && !this.comentariosPrincipales[reporteId]) {
      this.cargarComentariosPrincipales(reporteId);
    }
  }

  /**
   * Prepara el formulario para responder a un comentario
   * @param comentarioId ID del comentario al que se está respondiendo
   */
  responderComentario(comentario: any) {
    this.comentarioPadreId = comentario.id;
    this.comentarioRespuestaTexto = '';
    
    // Asegurarse de que las respuestas estén visibles
    if (!this.mostrarRespuestas[comentario.id]) {
      this.mostrarRespuestas[comentario.id] = true;
    }
    
    // Desplazarse al campo de respuesta después de un breve retraso
    setTimeout(() => {
      const elemento = document.querySelector(`#respuesta-${comentario.id}`);
      if (elemento) {
        elemento.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
        const input = elemento.querySelector('input');
        if (input) {
          input.focus();
        }
      }
    }, 100);
  }

  cargarComentariosPrincipales(reporteId: number) {
    this.comentariosLoading[reporteId] = true;
    
    // Usamos el endpoint actualizado que ya incluye las respuestas anidadas
    this.reportesService.getReportsWithInteractions({ reporteId }).subscribe({
      next: (response: any) => {
        if (response.data && response.data.length > 0) {
          const reporte = response.data[0];
          if (reporte.comentarios && Array.isArray(reporte.comentarios)) {
            // Mapear los comentarios para asegurar que las respuestas estén inicializadas
            this.comentariosPrincipales[reporteId] = reporte.comentarios.map((comentario: any) => ({
              ...comentario,
              respuestas: comentario.respuestas || []
            }));
            
            // Actualizar el contador de comentarios
            if (this.comentariosCounts[reporteId]) {
              this.comentariosCounts[reporteId].total_comentarios = reporte.total_comentarios || 0;
            }
          }
        }
      },
      error: (error) => {
        console.error('Error al cargar comentarios:', error);
      },
      complete: () => {
        this.comentariosLoading[reporteId] = false;
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

  async handleReporteCreado(reporte: any) {
    try {
      // Get the complete report data with interactions
      const reporteCompleto: any = await firstValueFrom(
        this.reportesService.getReportsWithInteractions({ reporteId: reporte.id })
      );

      // Get the first report from the data array
      const nuevoReporte = reporteCompleto?.data?.[0] || reporte;

      // Make sure the report has the expected structure
      const reporteProcesado = {
        ...nuevoReporte,
        // Ensure the user object exists with the current user's information
        usuario: nuevoReporte.usuario || {
          id: this.userId,
          nombre: this.userName || 'Usuario',
          email: '',
          cedula: ''
        },
        // Ensure the created_at property exists
        created_at: nuevoReporte.created_at || new Date().toISOString(),
        // Ensure the description property exists
        descripcion: nuevoReporte.descripcion || '',
        // Ensure the image_url property exists
        imagen_url: nuevoReporte.imagen_url ? `${nuevoReporte.imagen_url}` : ''
      };

      // Process the report data (handles reactions, comments, etc.)
      this.processReportData(reporteProcesado);
      
      // Preload the image
      this.precargarImagen(reporteProcesado);
      
      // Add the new report to the beginning of the list
      this.listReports = [reporteProcesado, ...this.listReports];
      
      // Update the total reports counter
      //this.totalReports++;
    } catch (error) {
      console.error('Error al obtener los datos del reporte:', error);
      // In case of error, create a basic report with the available information
      const reporteBasico = {
        ...reporte,
        usuario: {
          id: this.userId,
          nombre: this.userName || 'Usuario',
          email: '',
          cedula: ''
        },
        created_at: reporte.created_at || new Date().toISOString(),
        descripcion: reporte.descripcion || '',
        imagen_url: reporte.imagen_url ? `${environment.urlApiImages}${reporte.imagen_url}` : '',
        reacciones: { contadores: [], usuarios_por_tipo: [], usuario_ha_reaccionado: false, tipo_reaccion_usuario: null },
        total_comentarios: 0,
        comentarios: []
      };
      
      this.processReportData(reporteBasico);
      this.precargarImagen(reporteBasico);
      this.listReports = [reporteBasico, ...this.listReports];
      //this.totalReports++;
    }
  }

  openImageViewer(imageUrl: string) { // Add this method
    this.selectedImage = imageUrl;
  }

  closeImageViewer() { // Add this method
    this.selectedImage = null;
  }

  openEstadoModal(reporte: any) {
    this.selectedReporte = reporte;
    this.nuevoEstado = reporte.estado;
  }

  closeEstadoModal() {
    this.selectedReporte = null;
    this.nuevoEstado = '';
  }

  actualizarEstado(): void {
    if (!this.selectedReporte || !this.nuevoEstado) return;

    this.reportesService.actualizarestadoReporte(this.selectedReporte.id, this.nuevoEstado)
      .subscribe({
        next: (response: any) => {
          // Update the local state
          this.selectedReporte.estado = this.nuevoEstado;
          // Close the modal
          this.closeEstadoModal();
          // Optional: Show success message
          console.log('Estado actualizado con éxito');
        },
        error: (error: any) => {
          console.error('Error al actualizar el estado:', error);
          // Optional: Show error message
        }
      });
  }

  /**
   * Calcula el total de usuarios que han reaccionado a un reporte
   */
  getTotalUsuariosReacciones(reporteId: number): number {
    if (!this.reaccionesPorReporte[reporteId]) return 0;
    
    let total = 0;
    this.reaccionesPorReporte[reporteId].forEach(reaccion => {
      if (reaccion.usuarios && reaccion.usuarios.length) {
        total += reaccion.usuarios.length;
      }
    });
    return total;
  }

  /**
   * Obtiene el nombre del primer usuario que reaccionó
   */
  getNombrePrimerUsuarioReaccion(reporteId: number): string {
    if (!this.reaccionesPorReporte[reporteId]) return 'Usuario';
    
    for (const reaccion of this.reaccionesPorReporte[reporteId]) {
      if (reaccion.usuarios && reaccion.usuarios.length > 0) {
        return reaccion.usuarios[0].nombre || 'Usuario';
      }
    }
    
    return 'Usuario';
  }

  toggleRespuestas(comentarioId: number, reporteId: number) {
    // Si el comentario no está en el mapa, lo inicializamos
    if (this.mostrarRespuestas[comentarioId] === undefined) {
      this.mostrarRespuestas[comentarioId] = false;
    }
    
    // Cambiamos el estado de visibilidad
    this.mostrarRespuestas[comentarioId] = !this.mostrarRespuestas[comentarioId];
    
    // No necesitamos cargar las respuestas ya que vienen con los comentarios
    // Solo asegurémonos de que el comentario tenga sus respuestas
    if (this.comentariosPrincipales[reporteId]) {
      const comentario = this.comentariosPrincipales[reporteId].find((c: any) => c.id === comentarioId);
      if (comentario && !comentario.respuestas) {
        comentario.respuestas = [];
      }
    }
  }

  /**
   * Carga las respuestas de un comentario específico
   * @param comentarioId ID del comentario padre
   */
  cargarRespuestas(comentarioId: number, reporteId: number) {
    // No necesitamos este método ya que las respuestas vienen con los comentarios
    // Solo marcamos que las respuestas están visibles
    this.mostrarRespuestas[comentarioId] = true;
    
    // Forzar la actualización de la vista
    this.comentariosPrincipales = { ...this.comentariosPrincipales };
  }
}
