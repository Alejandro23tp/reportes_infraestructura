export interface Usuario {
  id: number;
  nombre: string;
}

export interface Reaccion {
  tipo: number;
  count: number;
  usuarios: Usuario[];
}

export interface Comentario {
  id: number;
  contenido: string;
  usuario: Usuario;
  usuario_id?: number;
  created_at: string;
  respuestas: Comentario[];
}

export interface ReaccionesResponse {
  status: string;
  data: Reaccion[];
}

export interface ComentariosResponse {
  status: string;
  data: Comentario[];
}
