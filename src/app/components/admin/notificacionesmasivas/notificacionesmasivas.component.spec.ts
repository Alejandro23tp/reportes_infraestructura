import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotificacionesmasivasComponent } from './notificacionesmasivas.component';

describe('NotificacionesmasivasComponent', () => {
  let component: NotificacionesmasivasComponent;
  let fixture: ComponentFixture<NotificacionesmasivasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificacionesmasivasComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NotificacionesmasivasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
