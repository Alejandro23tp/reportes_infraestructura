import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotificacionescorreoComponent } from './notificacionescorreo.component';

describe('NotificacionescorreoComponent', () => {
  let component: NotificacionescorreoComponent;
  let fixture: ComponentFixture<NotificacionescorreoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificacionescorreoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NotificacionescorreoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
