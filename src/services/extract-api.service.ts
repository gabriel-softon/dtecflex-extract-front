// extract-api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { map, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly apiUrl = `${environment.API}/noticias`;
  private readonly authUrl = `${environment.API}/auth`

  constructor(
    private http: HttpClient
  ) { }

  /** Busca lista de notícias com paginação e filtros */
  getNoticias(
    page: number,
    limit: number,
    statuses: string[],
    filters: any
  ): Observable<any> {
    let params = new HttpParams()
      .set('page', String(page))
      .set('limit', String(limit));

    // Filtros de status
    statuses.forEach(status => {
      params = params.append('status', status);
    });

    // Filtro de categoria (pode vir array ou string)
    if (filters['CATEGORIA']) {
      const cat = filters['CATEGORIA'];
      if (Array.isArray(cat)) {
        cat.forEach(c => params = params.append('categoria', c));
      } else {
        params = params.append('categoria', cat);
      }
    }

    // Demais filtros (data, subcategoria etc.)
    Object.keys(filters)
      .filter(key => key !== 'CATEGORIA' && filters[key] != null)
      .forEach(key => {
        const val = filters[key];
        // se for array, envia cada item separado
        if (Array.isArray(val)) {
          val.forEach(v => params = params.append(key.toLowerCase(), v));
        } else {
          params = params.append(key.toLowerCase(), val);
        }
      });

    // return this.http.get<any>(this.apiUrl, { params });

    return this.http
      .get<any>(this.apiUrl, { params })
      .pipe(
        map(this.extractData),
        catchError(this.handleError)
      )
  }

  getMinhasAnalises(): Observable<any> {
    return this.http
      .get(`${this.apiUrl}/me`)
      .pipe(
        map(this.extractData),
        catchError(this.handleError)
      )
  }

  getMe() {
    return this.http
      .get(`${this.apiUrl}/me`)
      .pipe(
        map(this.extractData),
        catchError(this.handleError)
      )
  }

  buscarDtec(nome: string, rows: number = 20) {
    const params = new HttpParams().set('nome', nome).set('rows', rows);
    return this.http
      .get(`${this.apiUrl}/buscar-dtec`, { params })
      .pipe(
        map(this.extractData),
        catchError(this.handleError)
      )
  }

  createNoticia(body: {
    url: string;
    fonte: string;
    categoria: string;
    data_publicacao?: string; // opcional: 'YYYY-MM-DD' ou ISO
    titulo: string;
    status?: string;
  }) : Observable<any> {
    return this.http
      .post<any>(this.apiUrl, body)
      .pipe(
        map(this.extractData),
        catchError((err) => {
          // Se backend devolver 409 por LINK_ID duplicado, mostre a msg
          const msg = err?.error?.detail || 'Erro ao criar notícia.';
          return throwError(() => new Error(msg));
        })
      );
  }

  deleteNoticia(id: number): Observable<any> {
    const endpoint = `${this.apiUrl}/excluir-noticia/${encodeURIComponent(id)}`;
    return this.http.delete<any>(endpoint);
  }

  /** Busca todas as categorias */
  getCategorias(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/categorias`);
  }

  /** Dispara extração do texto da notícia pela URL */
  capturarTextoNoticia(payload: { url: string }): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/capturar-texto-noticia`,
      payload
    );
  }

  /** Atualiza campos de uma notícia (PUT /noticias/{url}) */
  updateNoticia(id: number, data: any): Observable<any> {
    const endpoint = `${this.apiUrl}/${encodeURIComponent(id)}`;
    return this.http.put<any>(endpoint, data);
  }

  updateNomesMany(noticiaId: number | string, nomes: any[]) {
    const endpoint = `${this.apiUrl}/${encodeURIComponent(noticiaId)}/nomes/batch`;

    return this.http.put<{
      updated: number;
      updated_ids: (number | string)[];
      not_found: (number | string)[];
      wrong_noticia: (number | string)[];
      skipped: (number | string)[];
    }>(endpoint, { nomes });
  }

  aprovarNoticias(ids: any[]): Observable<any> {
    // normaliza: remove duplicados e itens inválidos
    const payload = {
      ids: Array.from(new Set(ids)).filter((n) => Number.isFinite(n))
    };

    return this.http
      .post<any>(`${this.apiUrl}/aprovar`, payload)
      .pipe(
        catchError((err) => {
          const msg = err?.error?.detail || 'Erro ao aprovar notícias.';
          return throwError(() => new Error(msg));
        })
      );
  }

  setCurrentUserIdInNotice(id: number): Observable<any>{
    const endpoint = `${this.apiUrl}/set-current-user/${encodeURIComponent(id)}`;
    const data = null
    return this.http.put<any>(endpoint, data)
  }

  extractNames(id: number): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/extrair-nomes/${id}`,);
  }

  saveExtractedName(payload: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/nome`, payload);
  }

  deleteExtractedName(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/nome/${id}`);
  }

  private extractData(res: Response) {
    let body = res;
    return body || {};
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = '';
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
    }
    return throwError(() => new Error(errorMessage));
  }
}
