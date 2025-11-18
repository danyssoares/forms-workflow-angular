import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { importProvidersFrom, NgModule } from '@angular/core';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { far } from '@fortawesome/free-regular-svg-icons';
import { provideNgxMatNativeDate } from '@katyan/datetime-picker';
import { NgxNativeDateModule } from '@katyan/datetime-picker';
import { MatNativeDateModule, MatRippleModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideToastr } from 'ngx-toastr';

@NgModule({
  imports: [NgxNativeDateModule, MatNativeDateModule, MatRippleModule, MatDatepickerModule],
})
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
    provideNgxMatNativeDate(),
    importProvidersFrom(SharedModule),
    provideToastr({
      timeOut: 3000,
      positionClass: 'toast-top-right',
      preventDuplicates: true,
    }),
    {
      provide: FaIconLibrary,
      useFactory: () => {
        const library = new FaIconLibrary();
        library.addIconPacks(fas, far);
        return library;
      }
    }
  ]
}).catch(err => console.error(err));

