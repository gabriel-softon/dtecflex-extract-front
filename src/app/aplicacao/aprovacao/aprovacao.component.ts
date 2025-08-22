import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MdbAccordionModule } from 'mdb-angular-ui-kit/accordion';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { ApiService } from 'src/services/extract-api.service';
import { catchError, finalize, of, switchMap } from 'rxjs';

type ColType = 'text' | 'number' | 'select' | 'boolean';

interface ColumnDef {
  key: string;
  label: string;
  type: ColType;
  visible: boolean;
  order: number;
  options?: Array<string | { value: any; label: string }>;
  readOnly?: boolean;
}

interface NomeRaspado {
  ID?: number | string;
  [key: string]: any;
}

interface Noticia {
  ID: number;
  TITULO: string;
  CATEGORIA: string;
  DT_RASPAGEM?: string | Date;
  REG_NOTICIA?: string;
  STATUS?: string;
  FONTE?: string;
  REGIAO?: string;
  UF?: string;
  TEXTO_NOTICIA?: string;
  LINK_ORIGINAL?: string;
  URL?: string;
  nomes_raspados?: NomeRaspado[];
}

@Component({
  selector: 'app-approve-news-page',
  standalone: true,
  templateUrl: './aprovacao.component.html',
  styleUrls: ['./aprovacao.component.scss'],
  imports: [CommonModule, FormsModule, MdbAccordionModule, DragDropModule],
})
export class ApproveNewsPageComponent implements OnInit {
  noticias: Noticia[] = [];
  isLoading = false;
  currentPage = 1;
  readonly limit = 10;
  totalPages = 0;

  selectedIds = new Set<string | number>();

  tableColumns: ColumnDef[] = [
    { key: 'NOME', label: 'Nome', type: 'text', visible: true, order: 1 },
    { key: 'CPF', label: 'CPF', type: 'text', visible: true, order: 2 },
    { key: 'SEXO', label: 'Sexo', type: 'select', visible: true, order: 3, options: ['M','F'] },
    { key: 'IDADE', label: 'Idade', type: 'number', visible: true, order: 4 },
    { key: 'PESSOA', label: 'Pessoa', type: 'select', visible: true, order: 5,
      options: [{ value: 'F', label: 'Física' }, { value: 'J', label: 'Jurídica' }] },
    { key: 'APELIDO', label: 'Apelido', type: 'text', visible: true, order: 6 },
    { key: 'ATIVIDADE', label: 'Atividade', type: 'text', visible: true, order: 7 },
    { key: 'TIPO_SUSPEITA', label: 'Tipo Suspeita', type: 'text', visible: true, order: 8 },
    { key: 'ANIVERSARIO', label: 'Aniversário', type: 'text', visible: true, order: 9 },
    { key: 'OPERACAO', label: 'Operação', type: 'text', visible: true, order: 10 },
    { key: 'INDICADOR_PPE', label: 'PPE', type: 'boolean', visible: true, order: 11 },
    { key: 'FLG_PESSOA_PUBLICA', label: 'Pessoa Pública', type: 'boolean', visible: true, order: 12 },
  ];

  editingMap: Record<string | number, boolean> = {};
  originalById: Record<string | number, Noticia> = {};
  isNomeModalOpen = false;
  modalNomeTarget: any | null = null;
  modalNoticiaTarget: any | null = null;
  nomeForm: any = {};    

  constructor(
    private apiService: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadNoticias();
  }

  private clone<T>(o: T): T { return JSON.parse(JSON.stringify(o)); }
  private emptyToNull = (v: any) => (v === '' ? null : v);

  private fromFlag(v: any): boolean { return v === '1' || v === 1 || v === true; }
  private toFlag(v: any): '1' | '0' { return (v === true || v === '1' || v === 1) ? '1' : '0'; }

  private toIsoDate(d: any): string | null {
    if (!d) return null;
    if (d instanceof Date && !isNaN(d.valueOf())) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(d));
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    return String(d);
  }

  openNomeModal(noticia: any, row: any) {
    this.modalNoticiaTarget = noticia;
    this.modalNomeTarget = row;

    this.nomeForm = this.clone({
      ...row,
      FLG_PESSOA_PUBLICA: this.fromFlag(row.FLG_PESSOA_PUBLICA),
      INDICADOR_PPE: this.fromFlag(row.INDICADOR_PPE),
      ANIVERSARIO: this.toIsoDate(row.ANIVERSARIO)
    });

    this.isNomeModalOpen = true;
    this.cdr.markForCheck();
  }

  closeNomeModal(apply: boolean) {
    if (apply && this.modalNomeTarget) {
      const r = this.modalNomeTarget;

      r.NOME = this.nomeForm.NOME?.trim() ?? r.NOME;
      r.CPF = this.emptyToNull(this.nomeForm.CPF);
      r.NOME_CPF = this.emptyToNull(this.nomeForm.NOME_CPF);
      r.APELIDO = this.emptyToNull(this.nomeForm.APELIDO);
      r.OPERACAO = this.emptyToNull(this.nomeForm.OPERACAO);
      r.SEXO = this.emptyToNull(this.nomeForm.SEXO);
      r.PESSOA = this.emptyToNull(this.nomeForm.PESSOA);
      r.IDADE = (this.nomeForm.IDADE === '' || this.nomeForm.IDADE == null) ? null : Number(this.nomeForm.IDADE);
      r.ATIVIDADE = this.emptyToNull(this.nomeForm.ATIVIDADE);
      r.ENVOLVIMENTO = this.emptyToNull(this.nomeForm.ENVOLVIMENTO);
      r.TIPO_SUSPEITA = this.emptyToNull(this.nomeForm.TIPO_SUSPEITA);
      r.FLG_PESSOA_PUBLICA = this.toFlag(this.nomeForm.FLG_PESSOA_PUBLICA);
      r.INDICADOR_PPE = this.toFlag(this.nomeForm.INDICADOR_PPE);
      r.ANIVERSARIO = this.emptyToNull(this.nomeForm.ANIVERSARIO);
    }

    this.isNomeModalOpen = false;
    this.modalNomeTarget = null;
    this.modalNoticiaTarget = null;
    this.nomeForm = {};
    this.cdr.markForCheck();
  }

  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  loadNoticias(page: number = 1): void {
    this.isLoading = true;
    const statuses = ['00-START-APPROVE'] as const;

    this.apiService.getNoticias(page, this.limit, statuses as any, {}).subscribe({
      next: (res: any) => {
        this.noticias    = res.noticias ?? [];
        this.currentPage = res.page ?? page;
        this.totalPages  = res.total_pages ?? 0;
        this.isLoading   = false;
      },
      error: () => {
        console.error('Erro ao buscar notícias');
        this.isLoading = false;
      }
    });
  }

  get selectedCount(): number {
    return this.selectedIds.size;
  }

  isEditing(n: Noticia): boolean {
    return !!this.editingMap[n.ID];
  }

  startEdit(n: Noticia): void {
    if (n?.ID == null) return;
    this.originalById[n.ID] = this.deepClone(n);
    this.editingMap[n.ID] = true;
  }

  saveEdit(n: Noticia): void {
    if (n?.ID == null) return;

    const payload = {
      fonte:         n.FONTE,
      titulo:        n.TITULO,
      categoria:     n.CATEGORIA,
      regiao:        n.REGIAO,
      uf:            n.UF,
      reg_noticia:   n.REG_NOTICIA,
      texto_noticia: n.TEXTO_NOTICIA,
      link_original: n.LINK_ORIGINAL,
      url:           n.URL
    };

    const nomes = (n.nomes_raspados || [])
      .filter((e: any) => e?.ID != null)
      .map((e: any) => ({
        id: e.ID,
        nome: this.emptyToNull(e.NOME),
        cpf: this.emptyToNull(e.CPF),
        apelido: this.emptyToNull(e.APELIDO),
        nome_cpf: this.emptyToNull(e.NOME_CPF),
        operacao: this.emptyToNull(e.OPERACAO),
        sexo: this.emptyToNull(e.SEXO),
        pessoa: this.emptyToNull(e.PESSOA),
        idade: e.IDADE !== '' && e.IDADE != null ? Number(e.IDADE) : null,
        atividade: this.emptyToNull(e.ATIVIDADE),
        envolvimento: this.emptyToNull(e.ENVOLVIMENTO),
        tipo_suspeita: this.emptyToNull(e.TIPO_SUSPEITA),
        flg_pessoa_publica: e.FLG_PESSOA_PUBLICA == '1' || e.FLG_PESSOA_PUBLICA === true,
        indicador_ppe: e.INDICADOR_PPE == '1' || e.INDICADOR_PPE === true,
        aniversario: this.toIsoDate(e.ANIVERSARIO),
      }));

    this.apiService.updateNoticia(n.ID, payload).pipe(
      switchMap(() => {
        if (!nomes.length) return of({ updated: 0, updated_ids: [], not_found: [], wrong_noticia: [], skipped: [] });
        return this.apiService.updateNomesMany(n.ID, nomes);
      }),
      finalize(() => {
        delete this.originalById[n.ID];
        this.editingMap[n.ID] = false;
      }),
      catchError(err => {
        console.error('Falha no salvar/atualizar nomes', err);
        throw err;
      })
    ).subscribe(res => {
      console.log('Batch nomes atualizado:', res);
    });
  }

  cancelEdit(n: Noticia): void {
    if (n?.ID == null) return;
    const orig = this.originalById[n.ID];
    if (orig) {
      Object.assign(n, this.deepClone(orig));
    }
    delete this.originalById[n.ID];
    this.editingMap[n.ID] = false;
  }

  getNoticiaId(n: Noticia): string | number | undefined {
    return n?.ID ?? (n as any)?.id ?? n?.REG_NOTICIA;
  }

  isSelecionada(n: Noticia): boolean {
    const id = this.getNoticiaId(n);
    return id !== undefined && this.selectedIds.has(id);
  }

  toggleSelecionada(n: Noticia, checked: boolean): void {
    const id = this.getNoticiaId(n);
    if (id === undefined) {
      console.warn('Notícia sem ID identificável:', n);
      return;
    }
    if (checked) this.selectedIds.add(id);
    else this.selectedIds.delete(id);
  }

  aprovarSelecionadas(): void {
    const ids = Array.from(this.selectedIds);
    if (!ids.length) return;

    this.apiService.aprovarNoticias(ids).subscribe({
      next: (res: any) => {
        const msgBase = `Aprovadas: ${res?.updated ?? 0}/${ids.length}`;
        const msgNF = res?.not_found?.length ? ` | Não encontradas: ${res.not_found.join(', ')}` : '';
        console.log(msgBase + msgNF);

        this.selectedIds.clear();
        this.loadNoticias();
      },
      error: (err: Error) => {
        console.error(err);
      }
    });
  }

  get displayedColumns(): ColumnDef[] {
    return this.tableColumns
      .filter(c => c.visible)
      .sort((a, b) => a.order - b.order);
  }

  onColumnToggle(index: number, checked: boolean): void {
    this.tableColumns[index].visible = checked;
  }

  dropColumn(event: CdkDragDrop<ColumnDef[]>): void {
    const visible = this.tableColumns
      .filter(c => c.visible)
      .sort((a, b) => a.order - b.order);

    moveItemInArray(visible, event.previousIndex, event.currentIndex);
    visible.forEach((c, i) => (c.order = i));
  }

  trackByNoticiaId = (_: number, n: Noticia) => n?.ID ?? _;
  trackByNomeId = (_: number, row: NomeRaspado) => (row?.ID ?? _);
  trackByColKey  = (_: number, col: ColumnDef) => col.key;
  trackByPage    = (_: number, p: number) => p;

  onCellEdit(row: any, key: string, ev: Event): void {
    const el = ev.target as HTMLElement;
    row[key] = (el.innerText || '').trim();
  }

  onCheckboxChange(row: any, key: string, ev: Event): void {
    const input = ev.target as HTMLInputElement;
    row[key] = input.checked ? '1' : '0';
  }

  getOptValue(opt: any) { return typeof opt === 'string' ? opt : opt?.value; }
  
  getOptLabel(opt: any) { return typeof opt === 'string' ? opt : opt?.label; }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  hasRemoteEdit(): boolean {
    return (this.noticias || []).some(x => x.STATUS === '07-EDIT-MODE');
  }

  hasLocalEdit(): boolean {
    return Object.values(this.editingMap).some(Boolean);
  }

  get canApproveSelected(): boolean {
    const hasSelection = this.selectedIds.size > 0;
    return hasSelection && !this.isLoading && !this.hasRemoteEdit() && !this.hasLocalEdit();
  }

  // private emptyToNull = (v: any) => (v === '' ? null : v);

  // private toIsoDate(d: any): string | null {
  //   if (!d) return null;
  //   if (d instanceof Date && !isNaN(d.valueOf())) {
  //     const yyyy = d.getFullYear();
  //     const mm = String(d.getMonth() + 1).padStart(2, '0');
  //     const dd = String(d.getDate()).padStart(2, '0');
  //     return `${yyyy}-${mm}-${dd}`;
  //   }
  //   const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(d));
  //   if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  //   return String(d);
  // }
}
