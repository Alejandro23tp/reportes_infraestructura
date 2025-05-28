import { TestBed } from '@angular/core/testing';

import { CentronotificacionesService } from './centronotificaciones.service';

describe('CentronotificacionesService', () => {
  let service: CentronotificacionesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CentronotificacionesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
