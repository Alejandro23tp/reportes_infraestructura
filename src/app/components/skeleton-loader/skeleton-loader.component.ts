import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="skeleton-loader" [ngStyle]="{'height': height, 'width': width}">
      <div class="shimmer"></div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    
    .skeleton-loader {
      background: #e2e8f0;
      position: relative;
      overflow: hidden;
      border-radius: 4px;
    }
    
    @media (prefers-color-scheme: dark) {
      .skeleton-loader {
        background: #1f2937;
      }
    }
    
    .shimmer {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      animation: loading 1.5s infinite;
    }
    
    @media (prefers-color-scheme: light) {
      .shimmer {
        background: linear-gradient(
          90deg,
          rgba(255, 255, 255, 0) 0%,
          rgba(255, 255, 255, 0.6) 50%,
          rgba(255, 255, 255, 0) 100%
        );
      }
    }
    
    @media (prefers-color-scheme: dark) {
      .shimmer {
        background: linear-gradient(
          90deg,
          rgba(31, 41, 55, 0) 0%,
          rgba(55, 65, 81, 0.6) 50%,
          rgba(31, 41, 55, 0) 100%
        );
      }
    }
    
    @keyframes loading {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
  `]
})
export class SkeletonLoaderComponent {
  @Input() width = '100%';
  @Input() height = '20px';
}
