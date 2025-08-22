import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, timer } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { environment } from 'src/environments/environment';
import { StorageService } from '../shared/service/storage.service';
import { LocalStorageVariables } from '../shared/enums/local-storage-variables.enum';
import { TokenManagerService } from '../shared/service/token-manager.service';

@Injectable()
export class RenewTokenInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(
    null
  );

  constructor(
    public tokenManagerService: TokenManagerService,
    private authService: AuthService,
    private storageService: StorageService
  ) {}

  intercept(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    console.log(
    '[AuthInterceptor]',
    'url=', request.url,
    '| shouldIntercept=', this.shouldIntercept(request.url),
    '| tokenManager=', this.tokenManagerService.getJwtToken(),
    '| storage.access_token=', localStorage.getItem(LocalStorageVariables.ACCESS_TOKEN),
    '| storage.access_token_authe_mv=', localStorage.getItem(LocalStorageVariables.ACCESS_TOKEN_AUTHE_MV)
    );

    if (this.shouldIntercept(request.url)) {
      const accessToken = this.tokenManagerService.getJwtToken();
      if (accessToken) {
        request = this.addToken(request, accessToken);
      }

      // Adicionar a versão do frontend ao cabeçalho
      request = this.addFrontendVersion(request);

      return next.handle(request).pipe(
        catchError(error => {
          if (error instanceof HttpErrorResponse && error.status === 401) {
            // Tentar renovar o token de acesso
            // return this.tentarRefreshToken401Error(request, next);
          } else if (
            error instanceof HttpErrorResponse &&
            error.status === 429
          ) {
            const retryAfter = parseInt(error.headers.get('Retry-After'), 10);
            return timer(retryAfter * 1000).pipe(
              switchMap(() => next.handle(request))
            );
          }
          return throwError(error);
        })
      );
    } else {
      return next.handle(request);
    }
  }

  private addToken(request: HttpRequest<any>, token: string) {
    return request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  // Método para adicionar a versão do frontend ao cabeçalho
  private addFrontendVersion(request: HttpRequest<any>) {
    const frontendVersion = environment.PROJETO_VERSION;
    return request.clone({
      setHeaders: {
        'X-Frontend-Version': frontendVersion,
      },
    });
  }

//   private tentarRefreshToken401Error(
//     request: HttpRequest<any>,
//     next: HttpHandler
//   ) {
//     const refreshToken = this.tokenManagerService.getRefreshToken();

//     // Se não houver refresh token ou ele estiver expirado, desloga o usuário
//     if (!refreshToken || this.tokenManagerService.isRefreshTokenExpired()) {
//       this.authService.logout();
//       return throwError(
//         () => new Error('Refresh token expired, user logged out.')
//       );
//     }

//     if (!this.isRefreshing) {
//       this.isRefreshing = true;
//       this.refreshTokenSubject.next(null);

//       return this.tokenManagerService.refreshToken().pipe(
//         switchMap((token: any) => {
//           if (!token.accessToken) {
//             this.authService.logout(); // Token não renovado, desloga o usuário
//             return throwError(() => new Error('Session expired'));
//           }
//           this.storageService.setItem(
//             LocalStorageVariables.ACCESS_TOKEN_AUTHE_MV,
//             token.accessToken
//           );
//           this.isRefreshing = false;
//           this.refreshTokenSubject.next(token.accessToken);
//           return next.handle(this.addToken(request, token.accessToken));
//         }),
//         catchError(error => {
//           // Se ocorrer um erro durante a renovação do token, desloga o usuário
//           this.authService.logout();
//           return throwError(error);
//         })
//       );
//     } else {
//       return this.refreshTokenSubject.pipe(
//         filter(token => token != null),
//         take(1),
//         switchMap(jwt => next.handle(this.addToken(request, jwt)))
//       );
//     }
//   }

  private shouldIntercept(url: string): boolean {
    const urlsToIntercept = [
      environment.API,
    ];
    return urlsToIntercept.some(urlToCheck => url.includes(urlToCheck));
  }
}
