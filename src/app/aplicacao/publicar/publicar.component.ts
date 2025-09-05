import { Component, OnInit, OnDestroy, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MdbAccordionModule } from 'mdb-angular-ui-kit/accordion';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { MdbTabsModule } from 'mdb-angular-ui-kit/tabs';
import { ApiService } from 'src/services/extract-api.service';
// import { Noticia } from '../models'; // se tiver tipagem, mantenha

type ModoPublicacao = 'registro' | 'data';
type Noticia = any;

@Component({
  selector: 'app-publicar-noticias-page',
  standalone: true,
  imports: [CommonModule, FormsModule, MdbAccordionModule, DragDropModule, MdbTabsModule],
  templateUrl: './publicar.component.html',
  styleUrls: ['./publicar.component.scss']
})
export class PublicarNoticiasPageComponent implements OnInit, OnDestroy {
  modo: ModoPublicacao = 'registro';
  categoriaSelecionada: any | '' = '';
  registroInput = '';
  dataInput = '';

  isLoading = false;
  isPublishing = false;
  publishLabel = '';
  mensagem?: string;
  private lastDateFetched?: string;

  noticias: Noticia[] = [];

  private publishIntervalId?: any;
  private publishTimeoutId?: any;

  private readonly PUBLISH_TOTAL_MS = 60_000;
  private readonly LABEL_TOGGLE_MS = 3_000;
  page = 1;
  limit = 10;
  totalPages = 1;
  totalCount = 0;
  private readonly PAGE_WINDOW = 7;
  // mapa de status -> rótulo e classe do badge (usado no header do accordion)
  statusMap: Record<string, { label: string; badgeClass: string }> = {
    '201-APPROVED': { label: 'Aprovado', badgeClass: 'text-bg-success' },
    '203-PUBLISHED': { label: 'Publicado', badgeClass: 'text-bg-primary' },
    '07-EDIT-MODE': { label: 'Em edição', badgeClass: 'text-bg-warning text-dark' },
    // ... outros se necessário
  };
  private statusPollId?: any;
  private readonly STATUS_POLL_MS = 1500;

  progress = 0;
  private ws?: WebSocket;
  private wsConnected = false;
  private wsKey?: string; // date8|category (p/ evitar reconectar igual)
  private wsFirstEventTimer?: any; // timeout de "silêncio" em modo passivo

  // Mapeia estados/etapas do backend para rótulos amigáveis

  activeJob?: { date: string; category: string; task_id?: string; progress?: number; state?: string; key?: string };


  // label de fase (opcional)
  private phaseLabelMap: Record<string, string> = {
    START: 'iniciando…', QUEUED: 'na fila…', RSYNC: 'transferindo arquivos…',
    AUX_INSERT: 'inserindo nomes…', SUMMARY: 'finalizando…',
    RUNNING: 'em execução…', DONE: 'concluído', FAILED: 'falhou'
  };

  private startStatusPolling(date8: string, catAbrev: string) {
    this.stopStatusPolling();
    this.statusPollId = setInterval(() => {
      this.apiService.getTransferStatus(date8, catAbrev).subscribe({
        next: (res: any) => {
          const m = res?.meta || {};
          const evt   = String(m.event || '');
          const state = String(m.state || '');
          const pct   = Number(m.progress ?? 0);
          // sincroniza UI como se fosse WS
          this.handleWsEvent({ event: evt, state, progress: pct, date: date8, category: catAbrev });
        },
        error: () => { /* silencioso */ }
      });
    }, this.STATUS_POLL_MS);
  }

  private stopStatusPolling() {
    if (this.statusPollId) {
      clearInterval(this.statusPollId);
      this.statusPollId = undefined;
    }
  }

  // bloqueia publicar se inputs = job ativo
  isSameAsActive(): boolean {
    if (!this.activeJob) return false;
    const date8 = this.toYMD(this.dataInput)?.replace(/-/g, '') || '';
    const inputCat = this.normalizeCat(this.categoriaSelecionada);
    const actCat   = this.normalizeCat(this.activeJob.category);
    const inRun    = (this.activeJob.progress ?? 0) < 100 && this.activeJob.state !== 'FAILED';
    return inRun && date8 && inputCat && (date8 === this.activeJob.date) && (inputCat === actCat);
  }
  constructor(
    private apiService: ApiService,
    private zone: NgZone,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
   this.fetchActive();
  }

  private runInZone(fn: () => void) {
    // evita exceções se já estiver na zone
    if ((Zone as any)?.current === (this as any)) { fn(); return; }
    this.zone.run(() => { fn(); this.cdr.markForCheck(); });
  }

  private fetchActive() {
    this.apiService.getActiveTransfers().subscribe({
      next: (res: any) => {
        const jobs = Array.isArray(res) ? res : (res?.active || []);
        // pega o primeiro em execução
        const running = jobs.find((j: any) =>
          (j?.state && !['DONE','FAILED'].includes(String(j.state))) ||
          (Number(j?.progress ?? 0) < 100)
        );
        if (running) {
          // normaliza categoria para abreviação
          const abrev = this.normalizeCat(running.category);
          this.activeJob = { ...running, category: abrev };
          // conecta ao WS para atualizar progresso
          this.connectWs(running.date, abrev, /*passive*/ true);
        } else {
          this.activeJob = undefined;
        }
      },
      error: () => { /* silencioso */ }
    });
  }

  private catLabelMap: Record<string,string> = {
  'LD':'Lavagem de Dinheiro','CR':'Crime','FF':'Fraude Financeira','SE':'Empresarial','SA':'Ambiental'
  };
  private normalizeCat(c: string): string {
    const up = (c || '').toUpperCase();
    const inv: Record<string,string> = {
      'LAVAGEM DE DINHEIRO':'LD','CRIME':'CR','FRAUDE':'FF','FRAUDE FINANCEIRA':'FF',
      'EMPRESARIAL':'SE','AMBIENTAL':'SA'
    };
    return this.catLabelMap[up] ? up : (inv[up] || up);
  }
  catLabel(abrev: string) { return this.catLabelMap[abrev] || abrev; }
  formatDate8(d?: string) { return d && d.length === 8 ? `${d.slice(6,8)}/${d.slice(4,6)}/${d.slice(0,4)}` : (d || ''); }

  // ngOnDestroy(): void {
  //   this.stopPublishing();
  // }

  // ========== TRACK BYS ==========
  trackByNoticiaId = (_: number, n: any) => n?.ID ?? n?.REG_NOTICIA ?? _;
  trackByNomeId = (_: number, e: any) => e?.ID ?? e?.NOME ?? _;
  trackByIdx = (i: number) => i;

  // ========== HELPERS PARA TABS ==========
  hasKey(list: any[], key: string): boolean {
    return Array.isArray(list) && list.some(
      it => it && Object.prototype.hasOwnProperty.call(it, key)
    );
  }

  pickAny(row: Record<string, any> | null | undefined, keys: string[]): string {
    if (!row) return '—';
    for (const k of keys) {
      const v = row[k];
      if (v !== undefined && v !== null && String(v).trim() !== '') return v;
    }
    return '—';
  }

  getDtecNome(row: Record<string, any>): string {
    return this.pickAny(row, [
      'NOME', 'Nome', 'nome',
      'NM_PESSOA', 'NOME_PESSOA', 'PESSOA', 'RAZAO_SOCIAL'
    ]);
  }

  getDtecEnvolvimento(row: Record<string, any>): string {
    return this.pickAny(row, [
      'ENVOLVIMENTO', 'Envolvimento', 'envolvimento',
      'TIPO', 'RELACAO', 'RELACIONAMENTO', 'PAPEL', 'FUNCAO', 'CARGO'
    ]);
  }

  // ========== FLUXO ==========
  onModoChange(m: ModoPublicacao) {
    this.modo = m;
    // ao trocar para "data", se já tiver filtros válidos, recarrega
    if (m === 'data' && this.dataInput && this.categoriaSelecionada) {
      this.onDateChange(this.dataInput);
    }
  }

  // dispara quando o <input type="date"> muda
  onDateChange(value: string | Date) {
    if (this.modo !== 'data') return;
    const ymd = this.toYMD(value);
    if (!ymd) { this.mensagem = 'Selecione uma data válida.'; return; }
    if (!this.categoriaSelecionada) { this.mensagem = 'Selecione uma categoria.'; return; }
    this.page = 1;
    this.buscarNoticiasPorAprovacao(ymd, this.page);

    const compact = ymd.replace(/-/g, '');
    this.connectWs(compact, this.normalizeCat(this.categoriaSelecionada), /*passive*/ true);
  }

  onCategoriaChange(_: any) {
    if (this.modo === 'data' && this.dataInput) {
      const ymd = this.toYMD(this.dataInput);
      if (ymd) {
        this.page = 1;
        this.buscarNoticiasPorAprovacao(ymd, this.page);
        const compact = ymd.replace(/-/g, '');
        this.connectWs(compact, this.normalizeCat(this.categoriaSelecionada), /*passive*/ true);
      }
    }
  }

  // GET /por-data-categoria?date=YYYY-MM-DD&category=CR&incluir_aux=true&page=...&limit=...
  // private buscarNoticiasPorAprovacao(ymd: string, page?: number) {
  //   if (!this.categoriaSelecionada) { this.mensagem = 'Selecione uma categoria.'; return; }

  //   if (page) this.page = page;

  //   this.mensagem = undefined;
  //   this.isLoading = true;
  //   this.noticias = [];

  //     const categoriaMap = {
  //     'LD': 'Lavagem de Dinheiro',
  //     'CR': 'Crime',
  //     'FF': 'Fraude Financeira',
  //     'SA': 'Ambiental',
  //     'SE': 'Empresarial',
  //   }

  //   this.apiService
  //     .getNoticiasPorDataCategoria(ymd, categoriaMap[this.categoriaSelecionada], this.page, this.limit,)
  //     .subscribe({
  //       next: (res: any) => {
  //         this.noticias = this.normalizeNoticias(res?.noticias);
  //         this.totalPages = Number(res?.total_pages || 1);
  //         this.totalCount = Number(res?.total_count || this.noticias.length);
  //         this.page = Number(res?.page || this.page);
  //         this.mensagem = this.noticias.length
  //           ? `Total retornado: ${this.totalCount} (data=${ymd}, categoria=${this.categoriaSelecionada}).`
  //           : 'Nenhum resultado para os filtros.';
  //         this.lastDateFetched = ymd;
  //         this.isLoading = false;
  //       },
  //       error: (err) => {
  //         console.error('GET /noticias/por-data-categoria erro:', err);
  //         const msg = this.humanizeHttpError(err);
  //         this.mensagem = `Erro ao buscar a listagem: ${msg}`;
  //         this.isLoading = false;
  //       }
  //     });
  // }

  // --- AJUSTES: ao buscar por data/categoria, conectar em modo passivo ---
  private buscarNoticiasPorAprovacao(ymd: string, page?: number) {
    this.stopStatusPolling?.();
    if (!this.categoriaSelecionada) { this.mensagem = 'Selecione uma categoria.'; return; }
    if (page) this.page = page;

    this.mensagem = undefined;
    this.isLoading = true;
    this.noticias = [];

    const categoriaMap = {
      'LD': 'Lavagem de Dinheiro',
      'CR': 'Crime',
      'FF': 'Fraude Financeira',
      'SA': 'Ambiental',
      'SE': 'Empresarial',
    };

    this.apiService
      .getNoticiasPorDataCategoria(ymd, categoriaMap[this.categoriaSelecionada], this.page, this.limit)
      .subscribe({
        next: (res: any) => {
          this.noticias = this.normalizeNoticias(res?.noticias);
          this.totalPages = Number(res?.total_pages || 1);
          this.totalCount = Number(res?.total_count || this.noticias.length);
          this.page = Number(res?.page || this.page);
          this.mensagem = this.noticias.length
            ? `Total retornado: ${this.totalCount} (data=${ymd}, categoria=${this.categoriaSelecionada}).`
            : 'Nenhum resultado para os filtros.';
          this.lastDateFetched = ymd;
          this.isLoading = false;

          // 👇 tenta conectar no canal dessa data/categoria para pegar SNAPSHOT de job em andamento
          const compact = ymd.replace(/-/g, '');
          const abrev = this.normalizeCat(this.categoriaSelecionada);
          // só conecta se existir job em execução para este filtro
          if (this.activeJob && (this.activeJob.progress ?? 0) < 100
              && this.normalizeCat(this.activeJob.category) === abrev
              && this.activeJob.date === compact) {
            this.connectWs(compact, abrev, /*passive*/ true);
          }
        },
        error: (err) => {
          console.error('GET /noticias/por-data-categoria erro:', err);
          const msg = this.humanizeHttpError(err);
          this.mensagem = `Erro ao buscar a listagem: ${msg}`;
          this.isLoading = false;
        }
      });
  }


  private humanizeHttpError(err: any): string {
    if (!err) return 'desconhecido';
    if (err.status === 0) return 'falha de rede/CORS';
    const e = err.error;
    if (e?.detail) return Array.isArray(e.detail) ? e.detail.map((d: any) => d.msg || d).join('; ') : e.detail;
    if (e?.message) return e.message;
    return `${err.status} ${err.statusText || ''}`.trim();
  }

  // (mantive caso você ainda use a outra rota genérica)
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

  // publicar() {
  //   if (this.isPublishing || this.isLoading) return;

  //   if (this.modo === 'data') {
  //     const ymd = this.toYMD(this.dataInput);
  //     if (!ymd) { this.mensagem = 'Selecione uma data válida.'; return; }
  //     if (!this.categoriaSelecionada) { this.mensagem = 'Selecione uma categoria.'; return; }

  //     const compact = ymd.replace(/-/g, '');

  //     this.isPublishing = true;
  //     this.publishLabel = 'transferindo arquivos';
  //     this.togglePublishLabel();

  //     this.apiService.transfer(compact, this.categoriaSelecionada).subscribe({
  //       next: (res: any) => {
  //         this.mensagem = `Tarefa agendada: ${res?.task_id} (${res?.message}).`;
  //         this.stopPublishing(true);
  //       },
  //       error: (err) => {
  //         console.error('Erro ao agendar transferência:', err);
  //         this.mensagem = 'Falha ao agendar transferência.';
  //         this.stopPublishing(false);
  //       }
  //     });

  //     return;
  //   }

  //   if (this.modo === 'registro') {
  //     const info = this.deriveDateAndCategoryFromRegistro(this.registroInput);
  //     if (!info) { this.mensagem = 'Registro inválido.'; return; }

  //     this.isPublishing = true;
  //     this.publishLabel = 'transferindo arquivos';
  //     this.togglePublishLabel();

  //     this.apiService.transfer(info.date, info.category).subscribe({
  //       next: (res: any) => { this.mensagem = `Tarefa agendada: ${res?.task_id}.`; this.stopPublishing(true); },
  //       error: () => { this.mensagem = 'Falha ao agendar transferência.'; this.stopPublishing(false); }
  //     });
  //   }
  // }

  // --- AJUSTES NO publicar(): trata 200 e 409 com WS ---
  publicar() {
    if (this.isPublishing || this.isLoading) return;

    if (this.modo === 'data') {
      const ymd = this.toYMD(this.dataInput);
      if (!ymd) { this.mensagem = 'Selecione uma data válida.'; return; }
      if (!this.categoriaSelecionada) { this.mensagem = 'Selecione uma categoria.'; return; }

      const compact = ymd.replace(/-/g, '');
      const abrev = this.normalizeCat(this.categoriaSelecionada);

      // estado inicial
      this.isPublishing = true;
      this.progress = 0;
      this.publishLabel = 'na fila…';
      this.activeJob = { date: compact, category: abrev, progress: 0, state: 'QUEUED' };

      this.apiService.transfer(compact, abrev).subscribe({
        next: (res: any) => {
          this.mensagem = `Tarefa agendada: ${res?.task_id} (${res?.message}).`;
          this.connectWs(compact, abrev, /*passive*/ false);
        },
        error: (err) => {
          if (err?.status === 409) {
            this.mensagem = 'Já existe publicação em andamento para esses filtros. Acompanhando progresso…';
            this.connectWs(compact, abrev, /*passive*/ false);
          } else {
            this.mensagem = this.humanizeHttpError(err) || 'Falha ao agendar transferência.';
            this.stopPublishing(false);
            this.activeJob = undefined;
          }
        }
      });
      return;
    }

    // ... (modo 'registro' permanece igual ou pode ser desativado)
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

  private normalizeNoticias(raw: any): Noticia[] {
    // garante arrays e ajusta STATUS exibido se PUBLISHED sem aux_registros
    const arr: any[] =
      !raw ? [] :
        Array.isArray(raw) ? raw :
          typeof raw === 'object' ? Object.values(raw) : [];

    return arr.map((n) => {
      const aux = Array.isArray(n?.aux_registros) ? n.aux_registros : [];
      const nomes = Array.isArray(n?.nomes_raspados) ? n.nomes_raspados : [];

      // regra de exibição: PUBLICADO sem aux_registros => exibir como APROVADO
      const status =
        n?.STATUS === '203-PUBLISHED' && aux.length === 0
          ? '201-APPROVED'
          : n?.STATUS;

      return { ...n, aux_registros: aux, nomes_raspados: nomes, STATUS: status };
    });
  }

  private deriveDateAndCategoryFromRegistro(reg: string): { date: string; category: string } | null {
    const m = /^([CNEA])(\d{8})/.exec(reg?.trim() ?? '');
    if (!m) return null;
    const prefix = m[1];
    const date = m[2];
    const catByPrefix: Record<string, string> = { C: 'CR', N: 'LD', E: 'SE', A: 'SA' };
    const category = catByPrefix[prefix];
    if (!category) return null;
    return { date, category };
  }

  private togglePublishLabel(): void {
    if (this.publishIntervalId) {
      clearInterval(this.publishIntervalId);
      this.publishIntervalId = undefined;
    }
    this.publishIntervalId = setInterval(() => {
      this.publishLabel =
        this.publishLabel === 'transferindo arquivos'
          ? 'publicando nomes'
          : 'transferindo arquivos';
    }, this.LABEL_TOGGLE_MS);
  }

  getPages(): number[] {
    const total = this.totalPages || 1;
    const current = Math.min(Math.max(1, this.page), total);
    const half = Math.floor(this.PAGE_WINDOW / 2);

    let start = Math.max(1, current - half);
    let end = Math.min(total, start + this.PAGE_WINDOW - 1);
    start = Math.max(1, end - this.PAGE_WINDOW + 1);

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  goToPage(p: number) {
    this.stopStatusPolling?.();
    if (this.isLoading) return;
    const total = this.totalPages || 1;
    const clamped = Math.min(Math.max(1, p), total);

    if (clamped === this.page) return;

    const ymd = this.toYMD(this.dataInput);
    if (this.modo === 'data' && ymd && this.categoriaSelecionada) {
      this.buscarNoticiasPorAprovacao(ymd, clamped);
    } else {
      this.page = clamped; // caso use em outro modo futuramente
    }
  }

  goPrev(e: Event) {
    e.preventDefault();
    this.goToPage(this.page - 1);
  }

  goNext(e: Event) {
    e.preventDefault();
    this.goToPage(this.page + 1);
  }

  private wsBase(): string {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  // se você tem environment.apiBase com http(s)://host:port
  try {
    // @ts-ignore
    const apiBase = (window as any).API_BASE || undefined; // opcional, se usar global
    const urlStr = (apiBase || '').toString();
    if (urlStr) {
      const u = new URL(urlStr);
      const wsProto = u.protocol === 'https:' ? 'wss' : 'ws';
      return `${wsProto}://${u.host}`;
    }
  } catch {}
  return `${proto}://${location.host}`; // fallback mesmo host do front (precisa de proxy)
}

// --- conectar WS para a data/categoria atual
private buildWsUrl(date8: string, categoryAbrev: string): string {
  return `${this.wsBase()}/api/ws/publication?date=${date8}&category=${encodeURIComponent(categoryAbrev)}`;
}

private connectWs(date8: string, categoryAbrev: string, passive: boolean) {
  const key = `${date8}|${categoryAbrev}`;
  if (this.ws && this.wsConnected && this.wsKey === key) return;

  this.closeWs();
  // ❗️apenas pare polling sempre que reconectar
  this.stopStatusPolling?.();

  this.wsKey = key;

  // ✅ apenas em modo "ativo" (após Publicar) arme o fallback por polling
  let firstEvent = false;
  let firstEventTimeout: any;
  if (!passive) {
    firstEventTimeout = setTimeout(() => {
      if (!firstEvent) this.startStatusPolling?.(date8, categoryAbrev);
    }, 2000);
  }

  try {
    this.ws = new WebSocket(this.buildWsUrl(date8, categoryAbrev));
  } catch {
    if (!passive) this.startStatusPolling?.(date8, categoryAbrev);
    return;
  }

  if (!passive) {
    this.runInZone(() => {
      this.isPublishing = true;
      this.publishLabel = 'na fila…';
      this.progress = 0;
      this.activeJob = { date: date8, category: categoryAbrev, progress: 0, state: 'QUEUED' };
    });
  }

  this.ws.onopen = () => this.runInZone(() => { this.wsConnected = true; });

  this.ws.onmessage = (ev) => {
    this.runInZone(() => {
      try {
        const data = JSON.parse(ev.data);
        firstEvent = true;
        if (firstEventTimeout) clearTimeout(firstEventTimeout);
        this.stopStatusPolling?.(); // recebeu WS, cancela polling
        this.handleWsEvent(data);
      } catch {
        firstEvent = true;
        if (firstEventTimeout) clearTimeout(firstEventTimeout);
        this.stopStatusPolling?.();
        this.publishLabel = String(ev.data || '');
        this.isPublishing = true;
      }
    });
  };

  this.ws.onerror = () => {
    this.runInZone(() => {
      if (!passive) this.startStatusPolling?.(date8, categoryAbrev);
    });
  };

  this.ws.onclose = () => {
    this.runInZone(() => {
      this.wsConnected = false;
      if (this.wsFirstEventTimer) { clearTimeout(this.wsFirstEventTimer); this.wsFirstEventTimer = undefined; }
      // se passivo, não arma polling; se ativo, o onerror/timeout já acionou
    });
  };
}

private handleWsEvent(p: any) {
  const evt   = String(p?.event || '');
  const date8 = String(p?.date || '');
  const cat   = this.normalizeCat(String(p?.category || ''));
  const pct   = Number(p?.progress ?? 0);
  const state = String(p?.state || '');

  // mantém activeJob sincronizado
  if (!this.activeJob || this.activeJob.date !== date8 || this.normalizeCat(this.activeJob.category) !== cat) {
    this.activeJob = { date: date8, category: cat, progress: pct, state };
  } else {
    this.activeJob = { ...this.activeJob, progress: pct, state };
  }

  // UI geral
  this.isPublishing = evt !== 'DONE' && evt !== 'FAILED';
  this.publishLabel = this.phaseLabelMap[state] || (evt || 'processando…');
  this.progress = Math.max(this.progress, pct);

  if (evt === 'DONE') {
    this.progress = 100;
    this.publishLabel = this.phaseLabelMap.DONE;
    this.closeWs();
    this.stopStatusPolling();            // <- para polling
    this.stopPublishing(true);
    this.activeJob = undefined;
    if (this.modo === 'data' && this.dataInput && this.categoriaSelecionada) {
      this.buscarNoticiasPorAprovacao(this.toYMD(this.dataInput), this.page);
    }
  }
  if (evt === 'FAILED') {
    this.publishLabel = this.phaseLabelMap.FAILED;
    this.closeWs();
    this.stopStatusPolling();            // <- para polling
    this.stopPublishing(false);
    this.activeJob = undefined;
  }
}

private closeWs() {
  if (this.wsFirstEventTimer) { clearTimeout(this.wsFirstEventTimer); this.wsFirstEventTimer = undefined; }
  try { this.ws?.close(); } catch {}
  this.ws = undefined;
  this.wsConnected = false;
}


ngOnDestroy(): void {
  this.closeWs();
  this.stopStatusPolling?.();
  this.stopPublishing();
}

}
