import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReporteFormModalComponent } from './reporte-form-modal.component';

describe('ReporteFormModalComponent', () => {
  let component: ReporteFormModalComponent;
  let fixture: ComponentFixture<ReporteFormModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReporteFormModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReporteFormModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
