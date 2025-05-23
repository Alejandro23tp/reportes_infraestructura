export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  cedula: string;
  direccion: string;
  rol: string;
  activo: boolean | number;
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
}
