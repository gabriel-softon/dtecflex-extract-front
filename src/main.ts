import { enableProdMode, LOCALE_ID } from '@angular/core';
import { CustomCurrencyMaskConfig } from './app/app.module';
import { environment } from './environments/environment';
import { AppComponent } from './app/app.component';
import { provideToastr } from 'ngx-toastr';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { CURRENCY_MASK_CONFIG } from 'ng2-currency-mask';
// import { RenewTokenInterceptor } from './app/login/renewtoken.interceptor';
// import { HttpConfigInterceptor } from './app/login/httpconfig.interceptor';
import { HTTP_INTERCEPTORS, withInterceptorsFromDi, provideHttpClient } from '@angular/common/http';
import { provideRouter} from '@angular/router';
import { APP_ROUTING } from './app/app.routing';
import { RenewTokenInterceptor } from './app/login/renewtoken.interceptor';
import { provideEnvironmentNgxMask } from 'ngx-mask';

if (environment.production) {
  enableProdMode();
}


bootstrapApplication(AppComponent, {
    providers: [        
        provideRouter(APP_ROUTING),
        { provide: LOCALE_ID, useValue: 'pt-BR' },
        // { provide: HTTP_INTERCEPTORS, useClass: HttpConfigInterceptor, multi: true },     
        { provide: HTTP_INTERCEPTORS, useClass: RenewTokenInterceptor, multi: true },
        { provide: CURRENCY_MASK_CONFIG, useValue: CustomCurrencyMaskConfig },
        provideAnimations(),
        provideToastr(),
        provideEnvironmentNgxMask(),
        provideHttpClient(withInterceptorsFromDi())
    ]
})
  .catch(err => console.error(err));