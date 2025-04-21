import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './components/header/header.component';
import { MobileNavComponent } from './components/mobile-nav/mobile-nav.component';
import { AuthService } from './services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, MobileNavComponent, CommonModule],
  template: `
    <div class="flex flex-col min-h-screen">
      <app-header *ngIf="isLoggedIn$ | async"></app-header>
      <main class="flex-grow pb-16 md:pb-0">
        <router-outlet></router-outlet>
      </main>
      <app-mobile-nav *ngIf="isLoggedIn$ | async" class="md:hidden"></app-mobile-nav>
    </div>
  `
})
export class AppComponent {
  isLoggedIn$;

  constructor(private authService: AuthService) {
    this.isLoggedIn$ = this.authService.isAuthenticated();
  }
}
