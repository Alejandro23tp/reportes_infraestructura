import { Component, HostListener, OnInit, OnDestroy, Output, EventEmitter, inject } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-mobile-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './mobile-nav.component.html'
})
export class MobileNavComponent implements OnInit, OnDestroy {

  isProfileMenuOpen = false;
  private userSubscription: Subscription | null = null;
  currentUser: any = null;
  router = inject(Router);

  @Output() toggleFilterPanel = new EventEmitter<void>();

  constructor(private authService: AuthService) {}

  ngOnInit() {
    document.addEventListener('click', this.onDocumentClick.bind(this));
    
    this.userSubscription = this.authService.getUser().subscribe(user => {
      this.currentUser = user;
    });
  }

  ngOnDestroy() {
    document.removeEventListener('click', this.onDocumentClick.bind(this));
    
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  // En el componente, modifica el HostListener
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const profileTrigger = document.querySelector('.profile-trigger'); // Añade esta clase al botón
    
    if (!target.closest('.profile-menu') && !target.closest('.profile-trigger')) {
      this.closeProfileMenu();
    }
  }

  toggleProfileMenu(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
  }

  closeProfileMenu() {
    this.isProfileMenuOpen = false;
  }

  getUserInitials(): string {
    if (this.currentUser && this.currentUser.name) {
      const names = this.currentUser.name.split(' ');
      return names.map((name: string) => name[0].toUpperCase()).slice(0, 2).join('');
    }
    return 'US';
  }

  getUserName(): string {
    return this.currentUser ? this.currentUser.name : 'Usuario';
  }

  getUserEmail(): string {
    return this.currentUser ? this.currentUser.email : 'usuario@ejemplo.com';
  }

  logout() {
    this.authService.logout();
  }

  onLogout() {
    this.authService.logout();
  }
}
