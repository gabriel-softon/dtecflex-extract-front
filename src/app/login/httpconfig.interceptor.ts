// import { AuthService } from './auth.service';
// import { Injectable } from '@angular/core';
// import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
// import { Observable, throwError } from 'rxjs';
// import { catchError } from 'rxjs/operators';
// import { ToastrService } from 'ngx-toastr';
// import { Router } from '@angular/router';
// import { environment } from 'src/environments/environment';

// @Injectable()
// export class HttpConfigInterceptor implements HttpInterceptor {
//     private apiPdf = environment.pdfGeneratorHtml;

//     constructor(
//         private authService: AuthService,
//         private toastr: ToastrService,
//         private router: Router,
//     ) { }

//     intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
//         return next.handle(request).pipe(
//             catchError((error: HttpErrorResponse) => {
//                 if (error.status == 0 && (error.url != `${this.apiPdf.API}/pdf/generate-pdf-compress` &&
//                     error.url != `${this.apiPdf.API2}/pdf/generate-pdf-compress` )) {  
//                     this.toastr.warning('Verifique sua conexão com a internet')
//                 } else if (error.status === 403) {
//                     if (this.router.url !== '/entrar') {
//                         this.toastr.error('Error de permissão');
//                         this.authService.logout()
//                     }
//                 }
//                 return throwError(error);
//             }));
//     }
// }