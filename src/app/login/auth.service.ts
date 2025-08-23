import { HttpClient, HttpHeaders, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { StorageService } from "../shared/service/storage.service";
import { LocalStorageVariables } from "../shared/enums/local-storage-variables.enum";
import moment from "moment";
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: "root",
})
export class AuthService {
  private readonly apiUrl = `usuario`;
  private readonly apiLogin = environment.API



  constructor(
    private http: HttpClient,
    private router: Router,
    private storageService: StorageService
  ) { }
  private handleError(error: HttpErrorResponse) {
    return throwError(error.error);
  }

  private extractData(res: Response) {
    let body = res;
    return body || {};
  }

  headers() {
    return {
      headers: new HttpHeaders({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.storageService.getItem(LocalStorageVariables.ACCESS_TOKEN)}` })
    }
  }
  headersSimpleJSON() {
    return {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' })
    }
  }


  atualziaTokenAcesso(data): Observable<any> {
    const url = `${this.apiUrl}/atualziaTokenAcesso`;
    return this.http.post(url, data, this.headers())
      .pipe(catchError(this.handleError)
      );
  }

  login(username: string, password: string): Observable<any> {
    const url = `${this.apiLogin}/login`;

    // 1. Monta o form-encoded
    const body = new HttpParams()
      .set('username', username)
      .set('password', password);

    // 2. Define o header adequado
    const headers = new HttpHeaders()
      .set('Content-Type', 'application/x-www-form-urlencoded');

    // 3. Envia a requisição
    return this.http.post<{ access_token: string; token_type: string }>(
      url,
      body.toString(),
      { headers }
    );
  }

  fazerLoginNoModulo(): Observable<any> {
    const url = `${this.apiUrl}/fazerLoginNoModulo`;
    return this.http.get(url, this.headers())
      .pipe(catchError(this.handleError)
      );
  }

  trocarSenhaAutenticado(data): Observable<any> {
    const url = `${this.apiUrl}/trocarSenhaAutenticado`;
    return this.http.post(url, data, this.headers())
      .pipe(catchError(this.handleError)
      );
  }

  editarUsuarioFilho(data): Observable<any> {
    const url = `${this.apiUrl}/editarUsuarioFilho`;
    return this.http.post(url, data, this.headers())
      .pipe(catchError(this.handleError)
      );
  }

  cadastrar(data): Observable<any> {
    const url = `${this.apiLogin}/auth/register`;
    return this.http.post(url, data, this.headers())
      .pipe(catchError(this.handleError)
      );
  }

  verificarEmail(data): Observable<any> {
    const url = `${this.apiUrl}/verificaEmail`;
    return this.http.post(url, data, this.headersSimpleJSON())
      .pipe(catchError(this.handleError)
      );
  }

  editarSenhaEsquecida(data): Observable<any> {
    const url = `${this.apiUrl}/editarSenhaEsquecida`;
    return this.http.post(url, data, this.headersSimpleJSON())
      .pipe(catchError(this.handleError)
      );
  }

  pagante(): Observable<any> {
    const url = `${this.apiUrl}/pagante`;
    return this.http.get(url, this.headers())
      .pipe(catchError(this.handleError)
      );
  }

  recuperarSenha(data): Observable<any> {
    const url = `${this.apiUrl}/recuperarSenha`;
    return this.http.post(url, data, this.headersSimpleJSON())
      .pipe(catchError(this.handleError)
      );
  }
  loginVidraAdm(token: string): Observable<any> {
    const url = `${this.apiUrl}/loginVidraAdm/${token}`;
    return this.http.get(url, this.headersSimpleJSON())
      .pipe(catchError(this.handleError)
      );
  }

  verificarAceitouTermosUso(): Observable<any> {
    const url = `${this.apiUrl}/verificaAceitouTermos`;
    return this.http.get(url, this.headers())
      .pipe(catchError(this.handleError)
      );
  }

  aceitarTermosUso(data): Observable<any> {
    const url = `${this.apiUrl}/aceitarTermosUso`;
    return this.http.post(url, data, this.headers())
      .pipe(catchError(this.handleError)
      );
  }

  clearCookies(): void {
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
  }

  logout() {
    console.log('th clear 3')
    this.storageService.clear()
    this.clearCookies()
    this.router.navigate(['/entrar']);
  }

  isLoggedIn() {
    return moment().isBefore(this.getExpiration());
  }

  private isLoggedOut() {
    return !this.isLoggedIn();
  }

  private getExpiration() {
    const expiration = this.storageService.getItem(LocalStorageVariables.EXPIRES_AT);
    const expiresAt = JSON.parse(expiration);
    return moment(expiresAt);
  }

  usuario() {
    return this.storageService.getItem(LocalStorageVariables.USUARIO)
  }

  verificaSeTemAcessoNota(): Observable<any> {
    const url = `${this.apiUrl}/liberarGerarNota`;
    return this.http.post(url, {}, this.headers())
      .pipe(catchError(this.handleError)
      );
  }

}
