import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotificacionesappComponent } from './notificacionesapp.component';

describe('NotificacionesappComponent', () => {
  let component: NotificacionesappComponent;
  let fixture: ComponentFixture<NotificacionesappComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificacionesappComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NotificacionesappComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
