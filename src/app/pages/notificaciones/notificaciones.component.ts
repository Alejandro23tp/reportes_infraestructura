import { Component, OnInit } from '@angular/core';

interface Device {
  dispositivo_id: string;
  ultimo_uso: string;
  [key: string]: any;
}

@Component({
  selector: 'app-notificaciones',
  standalone: true,
  imports: [
  ],
  templateUrl: './notificaciones.component.html',
  styleUrls: ['./notificaciones.component.scss']
})
export class NotificacionesComponent implements OnInit {
  ngOnInit(): void {
    throw new Error('Method not implemented.');
  }
 
}