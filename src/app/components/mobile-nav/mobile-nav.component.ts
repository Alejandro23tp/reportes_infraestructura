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
    
    // Add debug logging
    console.log('MobileNavComponent: Subscribing to user changes');
    
    this.userSubscription = this.authService.getUser().subscribe(user => {
      console.log('MobileNavComponent: User data received:', user);
      this.currentUser = user;
      console.log('MobileNavComponent: Current user role:', this.currentUser?.rol); // Note: 'rol' is the correct property based on auth service
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
    console.log('getUserName called, currentUser:', this.currentUser);
    if (this.currentUser) {
      // Check both 'name' and 'nombre' properties since the backend might use either
      return this.currentUser.name || this.currentUser.nombre || 'Usuario';
    }
    return 'Usuario';
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
