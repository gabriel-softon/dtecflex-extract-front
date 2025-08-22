import { NgxToastModule, NgxToastService } from '@angular-magic/ngx-toast';
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MdbAccordionModule } from 'mdb-angular-ui-kit/accordion';
import { BsDatepickerConfig, BsDatepickerModule } from 'ngx-bootstrap/datepicker';
import { ApiService } from 'src/services/extract-api.service';
import { MdbTabsModule } from 'mdb-angular-ui-kit/tabs';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  imports: [CommonModule, FormsModule, BsDatepickerModule, MdbAccordionModule, MdbTabsModule, NgxToastModule]
})
export class HomeComponent implements OnInit {
  highlightedText: SafeHtml = '';
  minDate: Date = new Date(2025, 0, 1);
  dateRange: Date[] = [];
  bsConfig: Partial<BsDatepickerConfig> = {
    rangeInputFormat: 'YYYY-MM-DD',
    dateInputFormat: 'YYYY-MM-DD',
    containerClass: 'theme-dark-blue'
  };

  statusMap: any = {
    '07-EDIT-MODE': { label: 'Em edição', color: 'warning' },
    '10-URL-OK': { label: 'OK', color: 'success' },
    '15-URL-CHK': { label: 'Em verificação', color: 'info' },
    '99-DELETED': { label: 'Deletado', color: 'danger' },
    '00-START-APPROVE': { label: 'Para aprovação', color: 'primary' },
    '203-PUBLISHED': { label: 'Publicadas', color: 'success' },
    '201-APPROVED': { label: 'Aprovadas', color: 'success' },
  };

  noticias: any[] = [];
  categorias: string[] = [];
  subcategorias: string[] = [];
  savedEntities: any[] = [];

  isModalOpen = false;
  isExtractingText = false;
  isSaving = false;
  selectedNoticia: any = null;
  isGridLayout = true;
  modalPage = 1;

  extractedEntities: any[] = [];
  isExtractingNames = false;

  selectedCategoria = '';
  startDate = '';
  endDate = '';
  newTag = '';

  currentPage = 1;
  limit = 10;
  totalPages = 0;
  showMyAnalyses = false;
  defaultStatuses = ['10-URL-OK', '15-URL-CHK'];
  isLoading = false;

  dataGrouped: Record<string, any[]> = {};

  statusKeys: string[] = [];

  activeStatus = '';

  pagesPerStatus: Record<string, number> = {};
  isAddModalOpen = false;
  isCreating = false;
  newNoticia: { url: string; titulo: string; fonte: string; categoria: string } = {
    url: '',
    titulo: '',
    fonte: '',
    categoria: ''
  };

  newEntity: any | null = null;

  startAddEntity() {
    this.newEntity = {
      NOME: '',
      CPF: '',
      APELIDO: '',
      NOME_CPF: '',
      OPERACAO: '',
      SEXO: '',
      PESSOA: '',
      IDADE: null,
      ATIVIDADE: '',
      ENVOLVIMENTO: '',
      ANIVERSARIO: '',
      FLG_PESSOA_PUBLICA: false,
      INDICADOR_PPE: false,
      ENVOLVIMENTO_GOV: false,
      isSaving: false
    };
  }

  isDtecModalOpen = false;
  isSearchingDtec = false;
  dtecResults: any[] = [];
  dtecSearchQuery = '';
  dtecTargetEntity: any | null = null;

  constructor(
    private apiService: ApiService,
    private toast: NgxToastService,
    private sanitizer: DomSanitizer,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.loadCategorias();
    this.loadNoticias();
    this.loadAnalises();
  }

  // test(page: number= this.currentPage) {
  //   this.apiService.test(page, this.limit)
  //     .subscribe((res: any) => {
  //       this.noticias     = res.noticias;
  //       this.totalPages   = res.total_pages;
  //       this.currentPage  = res.page;
  //       this.isLoading    = false;
  //   });
  // }


  openDtecModalFor(entity: any, presetName: string = '') {
    this.dtecTargetEntity = entity;
    this.dtecSearchQuery = (presetName || '').trim();
    this.dtecResults = [];
    this.isDtecModalOpen = true;
    if (this.dtecSearchQuery) this.searchDtec();
  }

  closeDtecModal() {
    if (this.isSearchingDtec) return;
    this.isDtecModalOpen = false;
    this.dtecTargetEntity = null;
    this.dtecSearchQuery = '';
    this.dtecResults = [];
  }

  searchDtec(rows: number = 20) {
    const q = (this.dtecSearchQuery || '').trim();
    if (!q) return;
    this.isSearchingDtec = true;
    this.apiService.buscarDtec(q, rows).subscribe({
      next: (res: any[]) => { this.dtecResults = res || []; this.isSearchingDtec = false; },
      error: _ => { this.toastr.error('Falha ao consultar DTEC.'); this.isSearchingDtec = false; }
    });
  }

  applyDtecResultToTarget(r: any) {
    if (!this.dtecTargetEntity) return;
    // preencher campos
    this.dtecTargetEntity.NOME             = r.nome || r.nome_exato || this.dtecTargetEntity.NOME || '';
    this.dtecTargetEntity.CPF              = r.cpf  || this.dtecTargetEntity.CPF  || '';
    this.dtecTargetEntity.NOME_CPF         = r.nome_cpf || this.dtecTargetEntity.NOME_CPF || '';
    this.dtecTargetEntity.SEXO             = r.sexo || this.dtecTargetEntity.SEXO || '';
    this.dtecTargetEntity.PESSOA           = r.pessoa || this.dtecTargetEntity.PESSOA || '';
    this.dtecTargetEntity.ENVOLVIMENTO     = r.envolvimento || this.dtecTargetEntity.ENVOLVIMENTO || '';
    this.dtecTargetEntity.IDADE            = r.idade ?? this.dtecTargetEntity.IDADE;
    // flags S/N → boolean (checkbox na UI)
    this.dtecTargetEntity.ENVOLVIMENTO_GOV = this.snToBool(r.envolvimento_gov);
    this.dtecTargetEntity.INDICADOR_PPE    = this.snToBool(r.ppe);

    this.generateHighlightedText();
    this.toastr.success('Dados preenchidos a partir do DTEC.');
    this.closeDtecModal();
  }

  loadAnalises(): void {
    this.apiService.getMinhasAnalises()
      .subscribe((res: any) => {
        this.dataGrouped = res.data_agrupada_status;
        this.statusKeys = Object.keys(this.dataGrouped);
        this.activeStatus = this.statusKeys[0] || '';
        this.statusKeys.forEach(s => this.pagesPerStatus[s] = 1);
      });
  }

  toggleMyAnalyses() {
    this.showMyAnalyses = !this.showMyAnalyses;
    this.applyFilters();
  }

  onDateRangeChange(range: Date[]): void {
    if (range?.length === 2) {
      this.startDate = range[0].toISOString().split('T')[0];
      this.endDate   = range[1].toISOString().split('T')[0];
      this.applyFilters();
    }
  }

  loadCategorias() {
    this.apiService.getCategorias().subscribe(res => {
      this.categorias = res;
    });
  }

  loadNoticias(page: number = this.currentPage) {
    this.isLoading = true;
    const filters: any = {};
    if (this.selectedCategoria) filters.CATEGORIA = this.selectedCategoria;
    if (this.startDate && this.endDate) {
      filters.DATA_INICIO = this.startDate;
      filters.DATA_FIM    = this.endDate;
    }
    if (this.subcategorias.length > 0) {
      filters.SUBCATEGORIA = this.subcategorias;
    }
    const statuses = this.defaultStatuses;

    this.apiService.getNoticias(page, this.limit, statuses, filters)
      .subscribe((res: any) => {
        this.noticias     = res.noticias;
        this.totalPages   = res.total_pages;
        this.currentPage  = res.page;
        this.isLoading    = false;
      });
  }

  getCurrentPageItems(status: string): any[] {
    const page = this.pagesPerStatus[status] || 1;
    const start = (page - 1) * this.limit;
    return (this.dataGrouped[status] || []).slice(start, start + this.limit);
  }

  getTotalPages(status: string): number {
    const total = (this.dataGrouped[status] || []).length;
    return Math.ceil(total / this.limit);
  }

  getPages(status: string): number[] {
    return Array.from({ length: this.getTotalPages(status) }, (_, i) => i + 1);
  }

  onPageChange(status: string, page: number): void {
    if (page < 1 || page > this.getTotalPages(status)) return;
    this.pagesPerStatus[status] = page;
  }

  onTabChange(event: any): void {
    this.activeStatus = this.statusKeys[event.index];
    this.pagesPerStatus[this.activeStatus] = 1;
  }

  deleteNoticia(noticia: any): void {
    if (!confirm('Tem certeza que deseja excluir esta notícia?')) {
      return;
    }
    noticia.isDeleting = true;

    this.apiService.deleteNoticia(noticia.ID).subscribe({
      next: () => {
        // remove da lista
        this.noticias = this.noticias.filter(n => n.ID !== noticia.ID);
        this.toastr.success('Notícia excluída com sucesso!');
      },
      error: err => {
        console.error('Erro ao excluir notícia:', err);
        this.toastr.error('Falha ao excluir notícia.');
      },
      complete: () => {
        noticia.isDeleting = false;
      }
    });
  }

  cancelNewEntity() {
    this.newEntity = null;
  }

  saveNewEntity() {
    if (!this.newEntity) return;
    this.saveEntity(this.newEntity);
  }

  applyFilters() {
    this.loadNoticias();
  }

  addTag() {
    if (this.newTag && !this.subcategorias.includes(this.newTag)) {
      this.subcategorias.push(this.newTag);
      this.newTag = '';
      this.applyFilters();
    }
  }

  removeTag(tag: string) {
    this.subcategorias = this.subcategorias.filter(t => t !== tag);
    this.applyFilters();
  }

  toggleLayout() {
    this.isGridLayout = !this.isGridLayout;
  }

  openFullscreenModal(noticia: any) {
    this.selectedNoticia = noticia;

    const payload = {
      status: '07-EDIT-MODE'
    };

    this.apiService.setCurrentUserIdInNotice(this.selectedNoticia.ID)
    .subscribe(
      (updated: any) => {
        // this.toast.success({
        //   title: 'Sucesso',
        //   messages: ['Notícia atualizada com sucesso!']
        // });
        // Object.assign(this.selectedNoticia, {
        //   FONTE:         updated.fonte,
        //   TITULO:        updated.titulo,
        //   CATEGORIA:     updated.categoria,
        //   REGIAO:        updated.regiao,
        //   UF:            updated.uf,
        //   REG_NOTICIA:   updated.reg_noticia,
        //   TEXTO_NOTICIA: updated.texto_noticia,
        // });
        this.loadNoticias()
        this.isSaving = false;
      },
      err => {
        console.error('Erro ao salvar notícia:', err);
        this.isSaving = false;
      }
    );

    this.savedEntities = noticia.nomes_raspados?.map((n: any) => ({
      ...n,
      FLG_PESSOA_PUBLICA: n.FLG_PESSOA_PUBLICA === '1',
      INDICADOR_PPE:       n.INDICADOR_PPE       === '1',
      // ENVOLVIMENTO_GOV:     n.INDICADOR_PPE       === '1',
      isSaving: false
    })) ?? [];
    this.isModalOpen     = true;
    this.modalPage       = 1;
    this.extractedEntities = [];
    this.isExtractingNames  = false;
    
    // if (!this.selectedNoticia.TEXTO_NOTICIA) {
    //   this.isExtractingText = true;
    //   this.apiService.capturarTextoNoticia({ url: noticia.URL })
    //     .subscribe(
    //       (res: any) => {
    //         this.selectedNoticia.TEXTO_NOTICIA = res.TEXTO_NOTICIA;
    //         this.isExtractingText = false;
    //       },
    //       err => {
    //         console.error('Erro ao capturar texto da notícia:', err);
    //         this.isExtractingText = false;
    //       }
    //     );
    // } else {
    //   this.isExtractingText = false;
    // }


    const afterTextReady = () => {
      this.generateHighlightedText();
    };

    if (!this.selectedNoticia.TEXTO_NOTICIA) {
      this.isExtractingText = true;
      this.apiService.capturarTextoNoticia({ url: noticia.URL })
        .subscribe(
          res => {
            this.selectedNoticia.TEXTO_NOTICIA = res.TEXTO_NOTICIA;
            this.isExtractingText = false;
            afterTextReady();
          },
          _ => {
            this.isExtractingText = false;
            afterTextReady();
          }
        );
    } else {
      afterTextReady();
    }
  }

  nextModalPage() {
    if (this.modalPage < 2) {
      this.modalPage++;
    }
  }

  prevModalPage() {
    if (this.modalPage > 1) {
      this.modalPage--;
    }
  }

  saveNoticia(): void {
    if (!this.selectedNoticia) return;
    this.isSaving = true;

    const payload = {
      fonte:         this.selectedNoticia.FONTE,
      titulo:        this.selectedNoticia.TITULO,
      categoria:     this.selectedNoticia.CATEGORIA,
      regiao:        this.selectedNoticia.REGIAO,
      uf:            this.selectedNoticia.UF,
      reg_noticia:   this.selectedNoticia.REG_NOTICIA,
      texto_noticia: this.selectedNoticia.TEXTO_NOTICIA,
    };

    this.apiService.updateNoticia(this.selectedNoticia.ID, payload)
      .subscribe(
        (updated: any) => {
          this.toastr.success('Notícia salva com sucesso!');
          // Object.assign(this.selectedNoticia, {
          //   FONTE:         updated.fonte,
          //   TITULO:        updated.titulo,
          //   CATEGORIA:     updated.categoria,
          //   REGIAO:        updated.regiao,
          //   UF:            updated.uf,
          //   REG_NOTICIA:   updated.reg_noticia,
          //   TEXTO_NOTICIA: updated.texto_noticia,
          // });
          this.isSaving = false;
        },
        err => {
          console.error('Erro ao salvar notícia:', err);
          this.isSaving = false;
        }
      );
  }

  saveEntity(entity: any): void {
    if (!this.selectedNoticia) return;
    entity.isSaving = true;

    const payload = {
      noticia_id:          this.selectedNoticia.ID,
      nome:                entity.NOME,
      cpf:                 entity.CPF,
      apelido:             entity.APELIDO,
      nome_cpf:            entity.NOME_CPF,
      operacao:            entity.OPERACAO,
      sexo:                entity.SEXO,
      pessoa:              entity.PESSOA,
      idade:               entity.IDADE,
      atividade:           entity.ATIVIDADE,
      envolvimento:        entity.ENVOLVIMENTO,
      tipo_suspeita:       entity.INDICADOR_PPE ? 'PPE' : null,
      flg_pessoa_publica:  entity.FLG_PESSOA_PUBLICA,
      indicador_ppe:       entity.INDICADOR_PPE,
      aniversario:         entity.ANIVERSARIO
    };

    this.apiService.saveExtractedName(payload).subscribe({
      next: (res: any) => {
        entity.ID = res.id;

        this.savedEntities.push({ ...entity });
        this.extractedEntities = this.extractedEntities.filter(e => e !== entity);

        if (!this.selectedNoticia.nomes_raspados) {
          this.selectedNoticia.nomes_raspados = [];
        }
        this.selectedNoticia.nomes_raspados.push({ ...entity });

        this.toastr.success('Nome salvo com sucesso!');
        entity.isSaving = false;

        if (this.newEntity === entity) {
          this.newEntity = null;
        }

        this.generateHighlightedText();
      },
      error: err => {
        console.error('Erro ao salvar entidade:', err);
        this.toastr.error('Falha ao salvar nome.');
        entity.isSaving = false;
      }
    });
  }

  deleteEntity(entity: any): void {
    if (!entity.ID) return;
    entity.isSaving = true;

    this.apiService.deleteExtractedName(entity.ID).subscribe({
      next: () => {
        this.savedEntities = this.savedEntities.filter(e => e.ID !== entity.ID);
        entity.isSaving = false;
        delete entity.ID;
        this.extractedEntities.push(entity);
        this.toastr.success('Nome removido com sucesso!');
      },
      error: err => {
        console.error('Erro ao remover entidade:', err);
        entity.isSaving = false;
        this.toastr.error('Falha ao remover.');
      }
    });
  }

  extractNames(): void {
    if (!this.selectedNoticia) return;
    this.isExtractingNames = true;

    this.apiService.extractNames(this.selectedNoticia.ID)
      .subscribe(
        res => {
          this.extractedEntities = res;
          this.normalizeEntitiesInPlace(this.extractedEntities);
          this.isExtractingNames = false;
          this.generateHighlightedText();
        },
        err => {
          console.error('Erro ao extrair nomes:', err);
          this.isExtractingNames = false;
        }
      );
  }

  confirmAnalyse(noticia) {
    this.selectedNoticia = noticia;
    this.isSaving = true;

    const payload = { status: '00-START-APPROVE' };
    this.apiService.updateNoticia(noticia.ID, payload)
      .subscribe(
        updated => {
          this.loadNoticias();
          this.isSaving = false;
          this.closeModal();
        },
        err => {
          console.error('Erro ao salvar notícia:', err);
          this.isSaving = false;
        }
      );
  }

  closeModal() {
    this.isModalOpen     = false;
    this.selectedNoticia = null;
    this.isExtractingText = false;
    this.isSaving         = false;
    this.newEntity = null;
  }

  private palette = [
    '#fff1f0', // vermelho claro
    '#f6ffed', // verde claro
    '#fffbe6', // amarelo claro
    '#e6f7ff', // azul claro
    '#f9f0ff'  // roxo claro
  ];

  private assignColors(entities: any[]) {
    entities.forEach((ent, idx) => {
      ent.color = this.palette[idx % this.palette.length];
    });
  }

  private escapeRegExp(text: string): string {
    return text.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  }

  private generateHighlightedText() {
    let text = this.selectedNoticia?.TEXTO_NOTICIA || '';
    const all = [...this.extractedEntities, ...this.savedEntities];
    this.assignColors(all);
    const names = Array.from(new Set(all.map(e => e.NOME))).sort((a,b) => b.length - a.length);

    names.forEach(name => {
      const entity = all.find(e => e.NOME === name);
      const color = entity?.color || '#ffffb8';
      const re = new RegExp(`\\b${this.escapeRegExp(name)}\\b`, 'g');
      text = text.replace(re, `<span class="highlight" style="background-color:${color}">${name}</span>`);
    });

    this.highlightedText = this.sanitizer.bypassSecurityTrustHtml(text);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
    this.currentPage = page;
    this.loadNoticias(page);
  }

  onStatusPageChange(status: string, page: number): void {
    if (page < 1 || page > this.getTotalPages(status)) return;
    this.pagesPerStatus[status] = page;
  }


  openAddModal() {
    this.isAddModalOpen = true;
    this.newNoticia = {
      url: '',
      titulo: '',
      fonte: '',
      categoria: this.selectedCategoria || ''
    };
  }

  closeAddModal() {
    if (this.isCreating) return;
    this.isAddModalOpen = false;
  }

  private mapApiNoticiaToUI(res: any): any {
    return {
      ID:             res.id,
      LINK_ID:        res.link_id,
      URL:            res.url,
      FONTE:          res.fonte,
      CATEGORIA:      res.categoria,
      TITULO:         res.titulo,
      STATUS:         res.status,
      DT_RASPAGEM:    res.dt_raspagem,
    };
  }

  createNoticia(goToNoticia: boolean) {
    const { url, fonte, categoria, titulo } = this.newNoticia;

    if (!url?.trim() || !fonte?.trim() || !categoria?.trim()) {
      this.toastr.warning('Preencha URL, Fonte e Categoria.');
      return;
    }

    const payload: any = {
      url: url.trim(),
      fonte: fonte.trim(),
      categoria: categoria.trim(),
      titulo: titulo.trim(),
    };
    if (titulo?.trim()) {
      payload.titulo = titulo.trim();
    }

    this.isCreating = true;
    this.apiService.createNoticia(payload).subscribe({
      next: (res: any) => {
        const created = this.mapApiNoticiaToUI(res);

        this.isAddModalOpen = false;
        this.toastr.success('Notícia criada com sucesso!');
        this.loadNoticias(this.currentPage);

        if (goToNoticia) {
          this.openFullscreenModal(created);
          this.loadAnalises()
          this.loadNoticias()
        }
      },
      error: (err) => {
        console.error('Erro ao criar notícia:', err);
        const msg = err?.error?.detail || 'Falha ao criar notícia.';
        this.toastr.error(msg);
      },
      complete: () => {
        this.isCreating = false;
      }
    });
  }

  get paginationItems(): (number | '...')[] {
    const total   = this.totalPages;
    const current = this.currentPage;
    const delta   = 2;
    let left  = current - delta;
    let right = current + delta;

    if (left < 2) {
      right += 2 - left;
      left = 2;
    }
    if (right > total - 1) {
      left -= right - (total - 1);
      right = total - 1;
      if (left < 2) left = 2;
    }

    const pages: (number | '...')[] = [1];
    if (left > 2) pages.push('...');
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < total - 1) pages.push('...');
    if (total > 1) pages.push(total);

    return pages;
  }

  private snToBool(v: any): boolean {
    if (v === true || v === false) return v;
    const s = (v ?? '').toString().trim().toUpperCase();
    return s === 'S' || s === '1';
  }
  private boolToSN(b: any): 'S' | 'N' {
    return (b === true || b === 'S' || b === 1 || b === '1') ? 'S' : 'N';
  }

  private normalizeEntitiesInPlace(entities: any[]) {
    if (!Array.isArray(entities)) return;
    entities.forEach(e => {
      if (e.nome && !e.NOME) e.NOME = e.nome;
      if (e.cpf  && !e.CPF)  e.CPF  = e.cpf;
      if (e.nome_cpf && !e.NOME_CPF) e.NOME_CPF = e.nome_cpf;
      if (e.sexo && !e.SEXO) e.SEXO = e.sexo;
      if (e.pessoa && !e.PESSOA) e.PESSOA = e.pessoa;
      if (e.envolvimento && !e.ENVOLVIMENTO) e.ENVOLVIMENTO = e.envolvimento;
      if (e.idade != null && e.IDADE == null) e.IDADE = e.idade;

      if (e.FLG_PESSOA_PUBLICA != null) e.FLG_PESSOA_PUBLICA = this.snToBool(e.FLG_PESSOA_PUBLICA);
      if (e.INDICADOR_PPE != null) e.INDICADOR_PPE = this.snToBool(e.INDICADOR_PPE);
      else if (e.ppe != null) e.INDICADOR_PPE = this.snToBool(e.ppe);

      if (e.ENVOLVIMENTO_GOV != null) e.ENVOLVIMENTO_GOV = this.snToBool(e.ENVOLVIMENTO_GOV);
      else if (e.envolvimento_gov != null) e.ENVOLVIMENTO_GOV = this.snToBool(e.envolvimento_gov);
    });
  }
}
