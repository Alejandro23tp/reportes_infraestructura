import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotificacionesbarComponent } from './notificacionesbar.component';

describe('NotificacionesbarComponent', () => {
  let component: NotificacionesbarComponent;
  let fixture: ComponentFixture<NotificacionesbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificacionesbarComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NotificacionesbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
