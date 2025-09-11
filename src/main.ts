import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { importProvidersFrom } from '@angular/core';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { far } from '@fortawesome/free-regular-svg-icons';

export class SharedModule {
  constructor(library: FaIconLibrary) {
    // Adiciona os ícones que serão usados na aplicação
    library.addIconPacks(fas, far);
  }

}

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes), 
    provideHttpClient(), 
    provideAnimations(),
    importProvidersFrom(SharedModule),
  ]
}).catch(err => console.error(err));

