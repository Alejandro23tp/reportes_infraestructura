import { Component } from '@angular/core';
import { HeaderComponent } from '../components/header/header.component';
import { FooterComponent } from '../components/footer/footer.component';
import { RouterOutlet } from '@angular/router';


@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [ HeaderComponent, FooterComponent, RouterOutlet ],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss'
})
export default class LayoutComponent {

}
