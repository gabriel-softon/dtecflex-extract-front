import { Injectable } from "@angular/core";
import {
  HttpClient,
  HttpHeaders,
  HttpErrorResponse,
} from "@angular/common/http";
import { environment } from "src/environments/environment";
import { Observable, throwError } from "rxjs";
import { map, catchError } from "rxjs/operators";
import { LocalStorageVariables } from "../enums/local-storage-variables.enum";
import { StorageService } from "./storage.service";

import { ToastrService } from 'ngx-toastr'; // Importação do Toastr
import { JwtHelperService } from "@auth0/angular-jwt";

@Injectable({
  providedIn: "root",
})
export class TokenManagerService {
//   private readonly urlAPI = `${environment.authenticationMvServer.API}/session`;

  constructor(
    private http: HttpClient,
    private storageService: StorageService,
    private toastr: ToastrService  // Injeção do ToastrService
  ) {}

  private handleError(error: HttpErrorResponse) {
    console.log('Erro ao renovar token ==> ', error);
    return throwError(error);
  }

  private extractData(res: Response) {
    return res || {};
  }

  private headers() {
    return {
      headers: new HttpHeaders({ "Content-Type": "application/json" }),
    };
  }

//   refreshToken(): Observable<any> {
//     const url = `${this.urlAPI}/refresh-token`;
//     return this.http
//       .post(
//         url,
//         {
//           refreshToken: this.getRefreshToken(),
//         },
//         this.headers()
//       )
//       .pipe(map(this.extractData), catchError(this.handleError));
//   }

  getJwtToken(): string | null {
    return this.storageService.getItem(LocalStorageVariables.ACCESS_TOKEN);
  }

  getRefreshToken(): string | null {
    return this.storageService.getItem(LocalStorageVariables.REFRESH_TOKEN_AUTHE_MV);
  }

  saveTokens(accessToken: string, refreshToken: string): void {
    this.storageService.setItem(LocalStorageVariables.ACCESS_TOKEN_AUTHE_MV, accessToken);
    this.storageService.setItem(LocalStorageVariables.REFRESH_TOKEN_AUTHE_MV, refreshToken);
  }

  isRefreshTokenExpired(): boolean {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return true; // Caso não exista refresh token
    }

    const helper = new JwtHelperService();
    const decodedToken: any = helper.decodeToken(refreshToken)
    const currentTime = Math.floor(Date.now() / 1000);

    return decodedToken.exp < currentTime; // Verifica se o token já expirou
  }

  handleSessionExpired(): void {
    // Limpa tokens e avisa o usuário
    this.storageService.removeItem(LocalStorageVariables.ACCESS_TOKEN_AUTHE_MV);
    this.storageService.removeItem(LocalStorageVariables.REFRESH_TOKEN_AUTHE_MV);

    // Mostra a notificação com Toastr
    this.toastr.warning('Sua sessão expirou. Por favor, faça login novamente.');

    // Redirecionar ou realizar logout completo
    // Exemplo: this.authService.logout();
  }
}
