import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { AuthService } from './app/services/login.service';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './app/interceptors/auth.interceptors';
import { routes } from './app/app.routes';
import { APP_INITIALIZER } from '@angular/core';

function initializeApp(authService: AuthService) {
  return () => {
    if (authService.isAuthenticated()) {
      return authService.getCurrentUser().toPromise().catch(() => {
        // If loading user fails, clear token
        localStorage.removeItem('token');
        return null;
      });
    }
    return Promise.resolve();
  };
}

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [AuthService],
      multi: true
    }
  ]
});

setTimeout(() => {
  bootstrapApplication(AppComponent, appConfig)
    .catch((err) => console.error(err));
}, 100); // 100ms delay to let everything initialize
