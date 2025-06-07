import { TestBed } from '@angular/core/testing';

import { NotificacionesappService } from './notificacionesapp.service';

describe('NotificacionesappService', () => {
  let service: NotificacionesappService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NotificacionesappService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
