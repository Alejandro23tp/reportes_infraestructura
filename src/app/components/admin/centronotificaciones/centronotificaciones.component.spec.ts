import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CentronotificacionesComponent } from './centronotificaciones.component';

describe('CentronotificacionesComponent', () => {
  let component: CentronotificacionesComponent;
  let fixture: ComponentFixture<CentronotificacionesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CentronotificacionesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CentronotificacionesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
