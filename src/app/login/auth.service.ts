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
  private readonly apiRoot  = environment.API;              // '/api'
  private readonly authBase = `${this.apiRoot}/auth`;       // '/api/auth'
  private readonly userBase = `${this.apiRoot}/usuario`;



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

  login(username: string, password: string) {
    const body = new HttpParams().set('username', username).set('password', password);
    const headers = new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded');
    return this.http.post<{ access_token: string; token_type: string }>(
      `${this.authBase}/login`,
      body.toString(),
      { headers }
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


}
