import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  MatPaginatorModule,
  MatPaginatorIntl,
  PageEvent,
} from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { PaginatorI18n } from 'src/app/shared/paginator-i18n';
import { AppConfiguration } from 'src/app/app-configuration';
import { AppService } from 'src/app/app.service';
import { AppState } from 'src/app/shared/app.state';
import {
  DOHierarchy,
  DOHierarchySearchRequest,
  Model,
  TOP_MODELS,
} from 'src/app/shared/digital-object';
import { SearchResults } from 'src/app/shared/search-results';
import { BatchPriority } from 'src/app/shared/batch';
import { BatchPollingService } from 'src/app/shared/batch-polling.service';
import {
  PlanProcessDialogComponent,
  PlanProcessDialogData,
} from 'src/app/components/plan-process-dialog/plan-process-dialog.component';
import { UserInfo } from 'src/app/shared/user-info';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { AltoVersionContent } from 'src/app/shared/alto-version';
import { AppDateTimePipe } from 'src/app/shared/app-date-time.pipe';

/** Kramerius can return childrenCount. */
export interface KrameriusDOHierarchy extends DOHierarchy {
  childrenCount?: number;
}

export interface PidCheckResult {
  pid: string;
  kramerius: KrameriusDOHierarchy | null;
  local: DOHierarchy | null;
  /** When Kramerius model is "page" and no local, we fetch active ALTO; if found, treat as local for actions. */
  altoVersion?: AltoVersionContent | null;
}

@Component({
  selector: 'app-document-hierarchy',
  standalone: true,
  providers: [{ provide: MatPaginatorIntl, useClass: PaginatorI18n }],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule,
    MatDialogModule,
    MatInputModule,
    MatFormFieldModule,
    TranslateModule,
    MatPaginatorModule,
    MatTableModule,
    MatSortModule,
    MatProgressSpinnerModule,
    MatCheckboxModule,
    MatSelectModule,
    AppDateTimePipe,
  ],
  templateUrl: './document-hierarchy.component.html',
  styleUrls: ['./document-hierarchy.component.scss'],
})
export class DocumentHierarchyComponent implements OnInit {
  /** true = showing PID check results (Kramerius + local), false = local browse */
  isPidSearchMode = false;

  showPidInput = false;
  pidInputText = '';
  pidResults: PidCheckResult[] = [];
  loadingPids = false;
  /** When checking PIDs one-by-one: current index (1-based) and total. */
  checkingPidCurrent = 0;
  checkingPidTotal = 0;
  private checkCancelled = false;

  localLevel0: DOHierarchy[] = [];
  localTotal = 0;
  localPageIndex = 0;
  localPageSize = 10;
  loadingLocal = false;
  localSortBy = 'title';
  localOrderSort: 'asc' | 'desc' = 'asc';
  localTitleFilter = '';
  localModelFilter: string = '';
  modelOptions = TOP_MODELS;
  expandedChildren = new Map<string, DOHierarchy[]>();
  loadingChildrenPid: string | null = null;

  /** PID search tree: expanded children per parent PID */
  expandedPidChildren = new Map<string, PidCheckResult[]>();
  loadingPidChildrenPid: string | null = null;

  /** Selected PIDs in local table */
  selectedLocalPids = new Set<string>();
  /** Selected PIDs in both/Kramerius table */
  selectedBothPids = new Set<string>();

  /** When batch is running, shows { planned, total } */
  batchProgress: { planned: number; total: number } | null = null;

  localColumns: string[] = [
    'select',
    'title',
    'pid',
    'model',
    'pagesCount',
    'pagesWithAlto',
    'updatedAt',
    'actions',
  ];
  bothColumns: string[] = [
    'select',
    'location',
    'title',
    'pid',
    'model',
    'level',
    'childrenCount',
    'pagesCount',
    'pagesWithAlto',
    'updatedAt',
    'actions',
  ];

  get displayedColumns(): string[] {
    return this.isPidSearchMode ? this.bothColumns : this.localColumns;
  }

  /** Local mode: tree rows from search. */
  get localTableRows(): DOHierarchy[] {
    const out: DOHierarchy[] = [];
    const append = (docs: DOHierarchy[]) => {
      for (const doc of docs) {
        out.push(doc);
        const children = this.expandedChildren.get(doc.pid);
        if (children?.length) append(children);
      }
    };
    append(this.localLevel0);
    return out;
  }

  /** Both mode: tree rows (roots + expanded children recursively). */
  get bothTableRows(): PidCheckResult[] {
    const out: PidCheckResult[] = [];
    const append = (rows: PidCheckResult[]) => {
      for (const r of rows) {
        out.push(r);
        const children = this.expandedPidChildren.get(r.pid);
        if (children?.length) append(children);
      }
    };
    append(this.pidResults);
    return out;
  }

  getRowLevel(r: PidCheckResult): number {
    return r.kramerius?.model === 'page'
      ? 0
      : (r.kramerius?.level ?? r.local?.level ?? 0);
  }

  canExpandPidRow(r: PidCheckResult): boolean {
    const k = r.kramerius as KrameriusDOHierarchy | null;
    const hasKidsK =
      (k?.childrenCount ?? 0) > 0 && k?.childrenCount !== k?.pagesCount;
    const hasKidsL = r.local?.hasSubhierarchy === true;
    if (!hasKidsK && !hasKidsL) return false;
    if (this.loadingPidChildrenPid === r.pid) return true;
    const children = this.expandedPidChildren.get(r.pid);
    return children === undefined || children.length > 0;
  }

  isPidRowExpanded(pid: string): boolean {
    return this.expandedPidChildren.has(pid);
  }

  private collapsePidSubtree(pid: string): void {
    const children = this.expandedPidChildren.get(pid);
    this.expandedPidChildren.delete(pid);
    if (children?.length) {
      for (const c of children) this.collapsePidSubtree(c.pid);
    }
  }

  get isLoading(): boolean {
    return this.loadingLocal || this.loadingPids;
  }

  constructor(
    private batchPolling: BatchPollingService,
    private route: ActivatedRoute,
    private service: AppService,
    public state: AppState,
    private config: AppConfiguration,
    private dialog: MatDialog,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const pid = params.get('pid');
      if (pid?.trim()) {
        this.pidInputText = pid.trim();
        this.showPidInput = true;
        this.checkPids();
      } else {
        this.loadLocalPage();
      }
    });
  }

  get pids(): string[] {
    return this.pidInputText
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  togglePidInput(): void {
    if (this.loadingPids) return;
    this.showPidInput = !this.showPidInput;
  }

  backToLocal(): void {
    if (this.loadingPids) {
      this.checkCancelled = true;
      this.loadingPids = false;
      this.checkingPidCurrent = 0;
      this.checkingPidTotal = 0;
      this.pidResults = [];
      this.showPidInput = false;
      this.isPidSearchMode = false;
      this.expandedPidChildren.clear();
      return;
    }
    this.isPidSearchMode = false;
    this.showPidInput = false;
    this.pidResults = [];
    this.pidInputText = '';
    this.expandedPidChildren.clear();
  }

  /** When only Kramerius (no local), return same so we show value without per-cell label. */
  private formatDual(
    k: KrameriusDOHierarchy | null,
    l: DOHierarchy | null,
    getter: (d: DOHierarchy) => string | number | null | undefined,
  ): { kramerius?: string; local?: string; same?: string } {
    const kv = k ? getter(k) : null;
    const lv = l ? getter(l) : null;
    const kStr = kv != null ? String(kv) : null;
    const lStr = lv != null ? String(lv) : null;
    if (kStr === lStr && kStr != null) return { same: kStr };
    if (!l) return { same: kStr ?? undefined }; // only Kramerius: show value, no label
    return { kramerius: kStr ?? undefined, local: lStr ?? undefined };
  }

  formatDualTitle(r: PidCheckResult): {
    kramerius?: string;
    local?: string;
    same?: string;
  } {
    return this.formatDual(r.kramerius, r.local, (d) => d.title || d.pid);
  }
  formatDualModel(r: PidCheckResult): {
    kramerius?: string;
    local?: string;
    same?: string;
  } {
    return this.formatDual(r.kramerius, r.local, (d) => d.model);
  }
  formatDualLevel(r: PidCheckResult): {
    kramerius?: string;
    local?: string;
    same?: string;
  } {
    return this.formatDual(r.kramerius, r.local, (d) => d.level);
  }
  formatDualPagesCount(r: PidCheckResult): {
    kramerius?: string;
    local?: string;
    same?: string;
  } {
    if (this.isPageModel(r)) return { same: '—' };
    return this.formatDual(r.kramerius, r.local, (d) => d.pagesCount);
  }
  formatDualPagesWithAlto(r: PidCheckResult): {
    kramerius?: string;
    local?: string;
    same?: string;
  } {
    if (this.isPageModel(r)) return { same: '—' };
    return this.formatDual(r.kramerius, r.local, (d) => d.pagesWithAlto);
  }
  formatDualUpdatedAt(r: PidCheckResult): {
    kramerius?: string;
    local?: string;
    same?: string;
  } {
    const altoUpdated = r.altoVersion?.updatedAt;
    if (r.altoVersion && this.isPageModel(r)) {
      const kUpdated = r.kramerius ? (r.kramerius as any).updatedAt : null;
      if (kUpdated && altoUpdated) {
        return {
          kramerius: kUpdated,
          local: altoUpdated,
        };
      }
      return { same: altoUpdated ?? undefined };
    }
    return this.formatDual(r.kramerius, r.local, (d) => (d as any).updatedAt);
  }

  isExpanded(pid: string): boolean {
    return this.expandedChildren.has(pid);
  }

  canExpandOrCollapse(doc: DOHierarchy): boolean {
    if (doc.hasSubhierarchy !== true) return false;
    if (this.loadingChildrenPid === doc.pid) return true;
    const children = this.expandedChildren.get(doc.pid);
    return children === undefined || children.length > 0;
  }

  private collapseSubtree(pid: string): void {
    const children = this.expandedChildren.get(pid);
    this.expandedChildren.delete(pid);
    if (children?.length) {
      for (const c of children) this.collapseSubtree(c.pid);
    }
  }

  loadLocalPage(): void {
    this.loadingLocal = true;
    const request: DOHierarchySearchRequest = {
      level: 0,
      offset: this.localPageIndex * this.localPageSize,
      limit: this.localPageSize,
      sortBy: this.localSortBy,
      sortOrder: this.localOrderSort === 'asc' ? 'ASC' : 'DESC',
    };
    if (this.localTitleFilter?.trim()) {
      request.title = this.localTitleFilter.trim();
    }
    if (this.localModelFilter?.trim()) {
      request.model = this.localModelFilter.trim();
    }
    this.service.searchDOHierarchy(request).subscribe({
      next: (p: SearchResults<DOHierarchy>) => {
        this.localLevel0 = p.items ?? [];
        this.localTotal = p.total ?? 0;
        this.loadingLocal = false;
        this.expandedChildren.clear();
      },
      error: () => (this.loadingLocal = false),
    });
  }

  onLocalSortChange(e: Sort): void {
    this.localSortBy = e.active || 'title';
    this.localOrderSort =
      e.direction === 'asc' || e.direction === 'desc' ? e.direction : 'asc';
    this.localPageIndex = 0;
    this.loadLocalPage();
  }

  onLocalPageChanged(e: PageEvent): void {
    this.localPageIndex = e.pageIndex;
    this.localPageSize = e.pageSize;
    this.loadLocalPage();
  }

  applyLocalFilter(): void {
    this.localPageIndex = 0;
    this.loadLocalPage();
  }

  toggleLocalSubtree(doc: DOHierarchy, event: Event): void {
    event.stopPropagation();
    if (this.expandedChildren.has(doc.pid)) {
      this.collapseSubtree(doc.pid);
      return;
    }
    this.loadingChildrenPid = doc.pid;
    this.service
      .searchDOHierarchy({
        parentPid: doc.pid,
        level: doc.level + 1,
        limit: 500,
        offset: 0,
        sortBy: this.localSortBy,
        sortOrder: this.localOrderSort === 'asc' ? 'ASC' : 'DESC',
      })
      .subscribe({
        next: (p: SearchResults<DOHierarchy>) => {
          this.expandedChildren.set(doc.pid, p.items ?? []);
          this.loadingChildrenPid = null;
        },
        error: () => (this.loadingChildrenPid = null),
      });
  }

  checkPids(): void {
    const pids = this.pids;
    if (!pids.length) return;
    this.checkCancelled = false;
    this.loadingPids = true;
    this.showPidInput = false;
    this.checkingPidTotal = pids.length;
    this.checkingPidCurrent = 0;
    this.pidResults = [];
    this.expandedPidChildren.clear();
    this.isPidSearchMode = true;

    const run = (i: number) => {
      if (this.checkCancelled) return;
      if (i >= pids.length) {
        this.loadingPids = false;
        this.checkingPidCurrent = 0;
        this.checkingPidTotal = 0;
        this.showPidInput = false;
        return;
      }
      this.checkingPidCurrent = i + 1;
      this.checkOnePid(pids[i]).subscribe({
        next: (result) => {
          if (this.checkCancelled) return;
          this.pidResults = [...this.pidResults, result];
          run(i + 1);
        },
        error: () => {
          if (this.checkCancelled) return;
          this.pidResults = [
            ...this.pidResults,
            { pid: pids[i], kramerius: null, local: null },
          ];
          run(i + 1);
        },
      });
    };
    run(0);
  }

  private checkOnePid(pid: string) {
    return forkJoin({
      kramerius: this.service.getKrameriusDOHierarchy(pid).pipe(
        map((h) => h as KrameriusDOHierarchy | null),
        catchError(() => of(null)),
      ),
      local: this.service
        .searchDOHierarchy({ pid, limit: 1, offset: 0 })
        .pipe(
          map(
            (p: SearchResults<DOHierarchy>) =>
              (p.total && p.items?.length ? p.items[0] : null) as DOHierarchy | null,
          ),
          catchError(() => of(null)),
        ),
    }).pipe(
      switchMap(({ kramerius, local }) => {
        const base: PidCheckResult = {
          pid,
          kramerius: kramerius ?? null,
          local,
        };
        if (kramerius?.model === 'page' && !local) {
          return this.service.fetchActiveAltoVersion(pid).pipe(
            map((av) => ({ ...base, altoVersion: av })),
            catchError(() => of({ ...base, altoVersion: null })),
          );
        }
        return of(base);
      }),
    );
  }

  togglePidSubtree(r: PidCheckResult, event: Event): void {
    event.stopPropagation();
    if (this.expandedPidChildren.has(r.pid)) {
      this.collapsePidSubtree(r.pid);
      return;
    }
    this.loadingPidChildrenPid = r.pid;
    const level = this.getRowLevel(r) + 1;
    forkJoin({
      local: this.service.searchDOHierarchy({
        parentPid: r.pid,
        level,
        limit: 500,
        offset: 0,
        sortBy: this.localSortBy,
        sortOrder: this.localOrderSort === 'asc' ? 'ASC' : 'DESC',
      }),
      kramerius: this.service.getKrameriusChildrenDOHierarchy(r.pid).pipe(
        map((list) => list as KrameriusDOHierarchy[]),
        catchError(() => of([])),
      ),
    }).subscribe({
      next: ({ local, kramerius }) => {
        const localList = local.items ?? [];
        const krameriusList = kramerius ?? [];
        const byPid = new Map<string, PidCheckResult>();
        for (const d of localList) {
          byPid.set(d.pid, { pid: d.pid, kramerius: null, local: d });
        }
        for (const k of krameriusList) {
          const existing = byPid.get(k.pid);
          if (existing) {
            existing.kramerius = k;
          } else {
            byPid.set(k.pid, { pid: k.pid, kramerius: k, local: null });
          }
        }
        const merged: PidCheckResult[] = [];
        const seen = new Set<string>();
        for (const d of localList) {
          if (!seen.has(d.pid)) {
            seen.add(d.pid);
            merged.push(byPid.get(d.pid)!);
          }
        }
        for (const k of krameriusList) {
          if (!seen.has(k.pid)) {
            seen.add(k.pid);
            merged.push(byPid.get(k.pid)!);
          }
        }
        const pageOnlyPids = merged
          .filter((m) => m.kramerius?.model === 'page' && !m.local)
          .map((m) => m.pid);
        if (pageOnlyPids.length === 0) {
          this.expandedPidChildren.set(r.pid, merged);
          this.loadingPidChildrenPid = null;
          return;
        }
        const altoTasks = pageOnlyPids.map((pid) =>
          this.service.fetchActiveAltoVersion(pid).pipe(
            map((av) => ({ pid, altoVersion: av })),
            catchError(() =>
              of({ pid, altoVersion: null as AltoVersionContent | null }),
            ),
          ),
        );
        forkJoin(altoTasks).subscribe({
          next: (results) => {
            const avByPid = new Map<string, AltoVersionContent | null>();
            for (const x of results) avByPid.set(x.pid, x.altoVersion);
            for (const m of merged) {
              const av = avByPid.get(m.pid);
              if (av !== undefined) m.altoVersion = av;
            }
            this.expandedPidChildren.set(r.pid, merged);
            this.loadingPidChildrenPid = null;
          },
          error: () => (this.loadingPidChildrenPid = null),
        });
      },
      error: () => (this.loadingPidChildrenPid = null),
    });
  }

  onGenerateClick(r: PidCheckResult, engine: UserInfo, event: Event): void {
    event.stopPropagation();
    if (r.local) {
      this.openGeneratePriorityDialog(r.local, engine, event);
    } else if (r.altoVersion) {
      this.openGeneratePriorityDialogForPid(r.pid, engine, event);
    }
  }

  private openGeneratePriorityDialogForPid(
    pid: string,
    engine: UserInfo,
    event: Event,
  ): void {
    event.stopPropagation();
    this.dialog
      .open(PlanProcessDialogComponent, {
        data: {
          title: 'actionTitle.generateSinglePageAlto',
          titleParams: { engine: engine.username },
        } as PlanProcessDialogData,
        width: '320px',
      })
      .afterClosed()
      .subscribe((result) => {
        if (result?.priority) {
          this.service
            .generateAlto(
              pid,
              engine.username,
              result.priority,
              this.config.instance,
            )
            .subscribe({
              next: () => {
                this.batchPolling.triggerCheck();
                this.service.showSnackBar(
                  'message.altoVersionGenerationPlanned',
                  false,
                );
              },
              error: (err) =>
                this.service.showSnackBar(
                  err?.error?.message || 'message.error',
                  true,
                ),
            });
        }
      });
  }

  openGeneratePriorityDialog(
    doc: DOHierarchy,
    engine: UserInfo,
    event: Event,
  ): void {
    event.stopPropagation();
    this.dialog
      .open(PlanProcessDialogComponent, {
        data: {
          title:
            doc.model === 'page'
              ? 'actionTitle.generateSinglePageAlto'
              : 'actionTitle.generateForHierarchy',
          titleParams: { engine: engine.username },
        } as PlanProcessDialogData,
        width: '320px',
      })
      .afterClosed()
      .subscribe((result) => {
        if (result?.priority) {
          if (doc.model === 'page') {
            this.service
              .generateAlto(
                doc.pid,
                engine.username,
                result.priority,
                this.config.instance,
              )
              .subscribe({
                next: () => {
                  this.batchPolling.triggerCheck();
                  this.service.showSnackBar(
                    'message.altoVersionGenerationPlanned',
                    false,
                  );
                },
                error: (err) =>
                  this.service.showSnackBar(
                    err?.error?.message || 'message.error',
                    true,
                  ),
              });
          } else {
            this.planGenerateForHierarchy(doc.pid, engine, result.priority);
          }
        }
      });
  }

  planGenerateForHierarchy(
    pid: string,
    engine: UserInfo,
    priority: BatchPriority,
  ): void {
    this.service
      .planGenerateForHierarchy(pid, engine.username, priority)
      .subscribe({
        next: () => {
          this.batchPolling.triggerCheck();
          this.service.showSnackBar(
            'message.altoVersionGenerationPlanned',
            false,
          );
        },
        error: (err) =>
          this.service.showSnackBar(
            err?.error?.message || 'message.error',
            true,
          ),
      });
  }

  openAcceptEnginePriorityDialog(
    pid: string,
    engine: UserInfo,
    event: Event,
  ): void {
    event.stopPropagation();
    this.dialog
      .open(PlanProcessDialogComponent, {
        data: {
          title: 'actionTitle.acceptEngineVersions',
          titleParams: { engine: engine.username },
        } as PlanProcessDialogData,
        width: '320px',
      })
      .afterClosed()
      .subscribe((result) => {
        if (result?.priority) {
          this.service
            .planAcceptEngineVersions(pid, engine.username, result.priority)
            .subscribe({
              next: () => {
                this.batchPolling.triggerCheck();
                this.service.showSnackBar(
                  'message.acceptEngineVersionsPlanned',
                  false,
                );
              },
              error: (err) =>
                this.service.showSnackBar(
                  err?.error?.message || 'message.error',
                  true,
                ),
            });
        }
      });
  }

  openFetchPriorityDialog(pid: string, event: Event): void {
    event.stopPropagation();
    this.dialog
      .open(PlanProcessDialogComponent, {
        data: {
          title: 'actionTitle.fetchFromKramerius',
        } as PlanProcessDialogData,
        width: '320px',
      })
      .afterClosed()
      .subscribe((result) => {
        if (result?.priority) this.planFetchDOHierarchy(pid, result.priority);
      });
  }

  planFetchDOHierarchy(pid: string, priority: BatchPriority): void {
    this.service.planFetchDOHierarchy(pid, priority).subscribe({
      next: () => {
        this.batchPolling.triggerCheck();
        this.service.showSnackBar('message.hierarchyFetchPlanned', false);
      },
      error: (err) =>
        this.service.showSnackBar(err?.error?.message || 'message.error', true),
    });
  }

  /** True when we have local DOHierarchy or ALTO version (Kramerius page with ALTO). */
  hasLocalOrAlto(r: PidCheckResult): boolean {
    return !!r.local || !!r.altoVersion;
  }

  /** True when neither Kramerius nor local nor ALTO found for this PID. */
  isNotFound(r: PidCheckResult): boolean {
    return !r.kramerius && !r.local && !r.altoVersion;
  }

  isPageModel(r: PidCheckResult): boolean {
    return r.kramerius?.model === 'page' || r.local?.model === 'page';
  }

  getKrameriusChildrenCount(r: PidCheckResult): number | null {
    if (this.isPageModel(r)) return null;
    const k = r.kramerius as KrameriusDOHierarchy | null;
    return k?.childrenCount ?? null;
  }

  // --- Selection (top-level rows only) ---
  isLocalTopLevel(doc: DOHierarchy): boolean {
    return doc.level === 0;
  }
  isBothTopLevel(r: PidCheckResult): boolean {
    return this.pidResults.some((p) => p.pid === r.pid);
  }
  isLocalRowSelected(doc: DOHierarchy): boolean {
    return this.selectedLocalPids.has(doc.pid);
  }
  isBothRowSelected(r: PidCheckResult): boolean {
    return this.selectedBothPids.has(r.pid);
  }
  toggleLocalSelection(doc: DOHierarchy, _event?: unknown): void {
    if (!this.isLocalTopLevel(doc)) return;
    if (this.selectedLocalPids.has(doc.pid)) {
      this.selectedLocalPids.delete(doc.pid);
    } else {
      this.selectedLocalPids.add(doc.pid);
    }
    this.selectedLocalPids = new Set(this.selectedLocalPids);
  }
  toggleBothSelection(r: PidCheckResult, _event?: unknown): void {
    if (!this.isBothTopLevel(r)) return;
    if (this.selectedBothPids.has(r.pid)) {
      this.selectedBothPids.delete(r.pid);
    } else {
      this.selectedBothPids.add(r.pid);
    }
    this.selectedBothPids = new Set(this.selectedBothPids);
  }
  get selectedLocalCount(): number {
    return this.selectedLocalPids.size;
  }
  get selectedBothCount(): number {
    return this.selectedBothPids.size;
  }
  get selectedCount(): number {
    return this.isPidSearchMode
      ? this.selectedBothCount
      : this.selectedLocalCount;
  }
  isAllLocalSelected(): boolean {
    const topLevel = this.localLevel0;
    return (
      topLevel.length > 0 &&
      topLevel.every((r) => this.selectedLocalPids.has(r.pid))
    );
  }
  isAllBothSelected(): boolean {
    const topLevel = this.pidResults;
    return (
      topLevel.length > 0 &&
      topLevel.every((r) => this.selectedBothPids.has(r.pid))
    );
  }
  toggleAllLocalSelection(_event?: unknown): void {
    if (this.isAllLocalSelected()) {
      this.selectedLocalPids.clear();
    } else {
      this.localLevel0.forEach((r) => this.selectedLocalPids.add(r.pid));
    }
    this.selectedLocalPids = new Set(this.selectedLocalPids);
  }
  toggleAllBothSelection(_event?: unknown): void {
    if (this.isAllBothSelected()) {
      this.selectedBothPids.clear();
    } else {
      this.pidResults.forEach((r) => this.selectedBothPids.add(r.pid));
    }
    this.selectedBothPids = new Set(this.selectedBothPids);
  }

  /** PIDs eligible for Generate: local or has ALTO */
  getBothPidsEligibleForGenerate(): string[] {
    return this.bothTableRows
      .filter((r) => this.selectedBothPids.has(r.pid) && this.hasLocalOrAlto(r))
      .map((r) => r.pid);
  }
  /** PIDs eligible for Fetch: has Kramerius */
  getBothPidsEligibleForFetch(): string[] {
    return this.bothTableRows
      .filter((r) => this.selectedBothPids.has(r.pid) && !!r.kramerius)
      .map((r) => r.pid);
  }
  /** Selected local PIDs - all are eligible for both Generate and Fetch */
  getLocalPidsEligibleForGenerate(): string[] {
    return Array.from(this.selectedLocalPids);
  }
  getLocalPidsEligibleForFetch(): string[] {
    return Array.from(this.selectedLocalPids);
  }
  get generateEligibleCount(): number {
    return this.isPidSearchMode
      ? this.getBothPidsEligibleForGenerate().length
      : this.selectedLocalCount;
  }
  get fetchEligibleCount(): number {
    return this.isPidSearchMode
      ? this.getBothPidsEligibleForFetch().length
      : this.selectedLocalCount;
  }
  /** Same as generateEligibleCount - objects must be in AltoEditor (local or ALTO). */
  get acceptEligibleCount(): number {
    return this.generateEligibleCount;
  }

  openBatchGenerateDialog(event: Event): void {
    event.stopPropagation();
    if (!this.state.engineUsers?.length) return;
    const engine = this.state.engineUsers[0];
    this.openBatchGenerateDialogWithEngine(engine, event);
  }
  openBatchGenerateDialogWithEngine(engine: UserInfo, event: Event): void {
    event.stopPropagation();
    const pids = this.isPidSearchMode
      ? this.getBothPidsEligibleForGenerate()
      : this.getLocalPidsEligibleForGenerate();
    if (pids.length === 0) {
      this.service.showSnackBar('message.error', true);
      return;
    }
    const isPage = this.isPidSearchMode
      ? (pid: string) => {
          const r = this.bothTableRows.find((x) => x.pid === pid);
          return r ? this.isPageModel(r) : false;
        }
      : (pid: string) => {
          const doc = this.localTableRows.find((d) => d.pid === pid);
          return doc?.model === 'page';
        };
    this.dialog
      .open(PlanProcessDialogComponent, {
        data: {
          title:
            pids.length === 1 && isPage(pids[0])
              ? 'actionTitle.generateSinglePageAlto'
              : 'actionTitle.generateForHierarchy',
          titleParams: { engine: engine.username },
        } as PlanProcessDialogData,
        width: '320px',
      })
      .afterClosed()
      .subscribe((result) => {
        if (result?.priority) {
          this.batchGenerate(pids, engine.username, result.priority, isPage);
        }
      });
  }
  private batchGenerate(
    pids: string[],
    engine: string,
    priority: BatchPriority,
    isPage: (pid: string) => boolean,
  ): void {
    this.batchProgress = { planned: 0, total: pids.length };
    let done = 0;
    const run = (i: number) => {
      if (i >= pids.length) {
        this.batchProgress = null;
        this.batchPolling.triggerCheck();
        this.service.showSnackBar(
          'message.altoVersionGenerationPlanned',
          false,
        );
        this.selectedLocalPids.clear();
        this.selectedBothPids.clear();
        this.selectedLocalPids = new Set();
        this.selectedBothPids = new Set();
        return;
      }
      const pid = pids[i];
      const doPage = isPage(pid);
      const obs = doPage
        ? this.service.generateAlto(pid, engine, priority, this.config.instance)
        : this.service.planGenerateForHierarchy(pid, engine, priority);
      obs.subscribe({
        next: () => {
          this.batchProgress = { planned: done + 1, total: pids.length };
          done++;
          run(i + 1);
        },
        error: (err) => {
          this.batchProgress = null;
          this.service.showSnackBar(
            err?.error?.message || 'message.error',
            true,
          );
        },
      });
    };
    run(0);
  }

  openBatchFetchDialog(event: Event): void {
    event.stopPropagation();
    const pids = this.isPidSearchMode
      ? this.getBothPidsEligibleForFetch()
      : this.getLocalPidsEligibleForFetch();
    if (pids.length === 0) {
      this.service.showSnackBar('message.error', true);
      return;
    }
    this.dialog
      .open(PlanProcessDialogComponent, {
        data: {
          title: 'actionTitle.fetchFromKramerius',
        } as PlanProcessDialogData,
        width: '320px',
      })
      .afterClosed()
      .subscribe((result) => {
        if (result?.priority) {
          this.batchFetch(pids, result.priority);
        }
      });
  }
  private batchFetch(pids: string[], priority: BatchPriority): void {
    this.batchProgress = { planned: 0, total: pids.length };
    let done = 0;
    const run = (i: number) => {
      if (i >= pids.length) {
        this.batchProgress = null;
        this.batchPolling.triggerCheck();
        this.service.showSnackBar('message.hierarchyFetchPlanned', false);
        this.selectedLocalPids.clear();
        this.selectedBothPids.clear();
        this.selectedLocalPids = new Set();
        this.selectedBothPids = new Set();
        return;
      }
      this.service.planFetchDOHierarchy(pids[i], priority).subscribe({
        next: () => {
          this.batchProgress = { planned: done + 1, total: pids.length };
          done++;
          run(i + 1);
        },
        error: (err) => {
          this.batchProgress = null;
          this.service.showSnackBar(
            err?.error?.message || 'message.error',
            true,
          );
        },
      });
    };
    run(0);
  }

  openBatchAcceptDialogWithEngine(engine: UserInfo, event: Event): void {
    event.stopPropagation();
    const pids = this.isPidSearchMode
      ? this.getBothPidsEligibleForGenerate()
      : this.getLocalPidsEligibleForGenerate();
    if (pids.length === 0) {
      this.service.showSnackBar('message.error', true);
      return;
    }
    this.dialog
      .open(PlanProcessDialogComponent, {
        data: {
          title: 'actionTitle.acceptEngineVersions',
          titleParams: { engine: engine.username },
        } as PlanProcessDialogData,
        width: '320px',
      })
      .afterClosed()
      .subscribe((result) => {
        if (result?.priority) {
          this.batchAccept(pids, engine.username, result.priority);
        }
      });
  }
  private batchAccept(
    pids: string[],
    engine: string,
    priority: BatchPriority,
  ): void {
    this.batchProgress = { planned: 0, total: pids.length };
    let done = 0;
    const run = (i: number) => {
      if (i >= pids.length) {
        this.batchProgress = null;
        this.batchPolling.triggerCheck();
        this.service.showSnackBar('message.acceptEngineVersionsPlanned', false);
        this.selectedLocalPids.clear();
        this.selectedBothPids.clear();
        this.selectedLocalPids = new Set();
        this.selectedBothPids = new Set();
        return;
      }
      this.service
        .planAcceptEngineVersions(pids[i], engine, priority)
        .subscribe({
          next: () => {
            this.batchProgress = { planned: done + 1, total: pids.length };
            done++;
            run(i + 1);
          },
          error: (err) => {
            this.batchProgress = null;
            this.service.showSnackBar(
              err?.error?.message || 'message.error',
              true,
            );
          },
        });
    };
    run(0);
  }
}
