import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { FormsModule } from '@angular/forms';


import { AppComponent } from './app.component';

import { LoginComponent } from './pages/login/login.component';
import { authInterceptor } from './interceptors/auth.interceptor';
import { AppRoutingModule } from './app-routing.module';
import HomeComponent from './pages/home/home.component';

@NgModule({
  declarations: [
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    AppComponent,
    HomeComponent,
    LoginComponent

  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useValue: authInterceptor, multi: true }
  ],
  // Removed bootstrap array as AppComponent is a standalone component
})
export class AppModule { }
