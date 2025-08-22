import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from 'src/services/extract-api.service';

type ModoPublicacao = 'registro' | 'data';

type NomeRaspado = {
  NOME?: string;
  ENVOLVIMENTO?: string | null;
  [k: string]: any;
};

type Noticia = {
  ID?: number;
  TITULO?: string | null;
  REG_NOTICIA?: string | number | null;
  nomes_raspados?: NomeRaspado[] | null;
  [k: string]: any;
};

@Component({
  selector: 'app-publicar-noticias-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './publicar.component.html',
  styleUrls: ['./publicar.component.scss']
})
export class PublicarNoticiasPageComponent implements OnInit, OnDestroy {
  modo: ModoPublicacao = 'registro';

  registroInput = '';
  dataInput = '';

  isLoading = false;      // loading da busca
  isPublishing = false;   // NOVO: estado da "publicação"
  publishLabel = '';      // NOVO: texto que alterna no spinner
  mensagem?: string;

  private page = 1;
  private limit = 10;
  private lastDateFetched?: string;

  noticias: Noticia[] = [];

  // NOVO: controle de timers
  private publishIntervalId?: any;
  private publishTimeoutId?: any;

  // (opcional) constantes de tempo
  private readonly PUBLISH_TOTAL_MS = 60_000; // 1 minuto
  private readonly LABEL_TOGGLE_MS = 3_000;   // alternância a cada 3s

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    // sem load inicial — buscamos quando a data for escolhida
  }

  ngOnDestroy(): void {
    this.stopPublishing(); // garante limpeza dos timers ao sair
  }

  onModoChange(m: ModoPublicacao) {
    this.modo = m;
    if (m === 'data' && this.dataInput) {
      this.onDateChange(this.dataInput);
    }
  }

  onDateChange(value: string | Date) {
    if (this.modo !== 'data') return;

    const ymd = this.toYMD(value);
    if (!ymd) {
      this.mensagem = 'Selecione uma data válida.';
      return;
    }

    if (this.lastDateFetched === ymd && this.noticias.length) {
      // já temos o resultado desta data; não refaça a busca
      return;
    }

    this.buscarNoticiasPorAprovacao(ymd);
  }

  private buscarNoticiasPorAprovacao(ymd: string) {
    this.mensagem = undefined;
    this.isLoading = true;
    this.noticias = []; // limpa lista durante o carregamento

    const statuses = ['201-APPROVED'];
    const payload = { DT_APROVACAO: ymd };

    this.apiService.getNoticias(this.page, this.limit, statuses, payload).subscribe({
      next: (res: any) => {
        this.noticias = this.normalizeNoticias(res?.noticias);
        const total = this.noticias.length;
        this.mensagem = `Total retornado: ${total} (DT_APROVACAO = ${ymd}).`;
        this.lastDateFetched = ymd;
        this.isLoading = false;
      },
      error: () => {
        this.mensagem = 'Erro ao buscar a listagem.';
        this.isLoading = false;
      }
    });
  }

  // Alternativa por data início/fim (não usada no fluxo atual, mas normalizada)
  private buscarNoticiasPorData(ymd: string) {
    this.mensagem = undefined;
    this.isLoading = true;
    this.noticias = [];

    const statuses: string[] = [];
    const payload = { DATA_INICIO: ymd, DATA_FIM: ymd };

    this.apiService.getNoticias(this.page, this.limit, statuses, payload).subscribe({
      next: (res: any) => {
        this.noticias = this.normalizeNoticias(res?.noticias);
        const total = this.noticias.length;
        console.log('[Busca por data]', { ymd, total });
        this.mensagem = `Chamada realizada. Total retornado: ${total}. (Filtrado por ${ymd})`;
        this.lastDateFetched = ymd;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erro ao chamar listagem de notícias (com filtro de data):', err);
        this.mensagem = 'Erro ao chamar a listagem.';
        this.isLoading = false;
      }
    });
  }

  // ======================
  // PUBLICAÇÃO (NOVO)
  // ======================
  publicar() {
    if (this.isPublishing || this.isLoading) return; // evita clique duplo e conflito com busca

    if (this.modo === 'registro') {
      console.log('[Publicar por registro] valor:', this.registroInput);
    }
    this.mensagem = undefined;

    // some com a listagem via HTML (condicional usa isPublishing)
    this.isPublishing = true;
    this.publishLabel = 'transferindo arquivos';

    // alterna rótulo
    this.publishIntervalId = setInterval(() => {
      this.publishLabel =
        this.publishLabel === 'transferindo arquivos'
          ? 'publicando nomes'
          : 'transferindo arquivos';
    }, this.LABEL_TOGGLE_MS);

    // finaliza após 1 minuto
    this.publishTimeoutId = setTimeout(() => {
      this.stopPublishing(true);
    }, this.PUBLISH_TOTAL_MS);
  }

  private stopPublishing(success = false) {
    if (this.publishIntervalId) {
      clearInterval(this.publishIntervalId);
      this.publishIntervalId = undefined;
    }
    if (this.publishTimeoutId) {
      clearTimeout(this.publishTimeoutId);
      this.publishTimeoutId = undefined;
    }
    this.isPublishing = false;
    this.publishLabel = '';
    if (success) {
      this.mensagem = 'Publicação concluída.';
    }
  }

  // utilitário para garantir formato YYYY-MM-DD
  private toYMD(d: string | Date): string {
    if (!d) return '';
    if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return '';
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  // lida com array ou objeto de notícias
  private normalizeNoticias(raw: any): Noticia[] {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'object') return Object.values(raw);
    return [];
  }
}
