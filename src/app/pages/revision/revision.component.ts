import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AppConfiguration } from 'src/app/app-configuration';
import { AppService } from 'src/app/app.service';
import { MatSortModule, Sort } from '@angular/material/sort';
import {
  MatPaginatorIntl,
  MatPaginatorModule,
} from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  DateAdapter,
  MAT_DATE_LOCALE,
  MatNativeDateModule,
} from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { PaginatorI18n } from 'src/app/shared/paginator-i18n';
import {
  AltoVersion,
  AltoVersionSearchRequest,
  AltoVersionState,
} from 'src/app/shared/alto-version';
import { UserInfo } from 'src/app/shared/user-info';
import { Pageable } from 'src/app/shared/pageable';
import { RevisionListStateService } from 'src/app/shared/revision-list-state.service';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from 'src/app/components/confirm-dialog/confirm-dialog.component';
import { AppDateTimePipe } from 'src/app/shared/app-date-time.pipe';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

@Component({
  selector: 'app-revision',
  standalone: true,
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'cs' },
    { provide: MatPaginatorIntl, useClass: PaginatorI18n },
  ],
  imports: [
    CommonModule,
    TranslateModule,
    RouterModule,
    MatSortModule,
    FormsModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatTooltipModule,
    MatPaginatorModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCheckboxModule,
    MatDialogModule,
    AppDateTimePipe,
  ],
  templateUrl: './revision.component.html',
  styleUrls: ['./revision.component.scss'],
})
export class RevisionComponent {
  displayedColumns: string[] = [
    'select',
    'label',
    'pageIndex',
    'username',
    'version',
    'updatedAt',
    'state',
    'pid',
    'actions',
  ];

  labelFilter = '';
  userFilter: number | null = null;
  updatedAfterFilter = new FormControl();
  stateFilter = '';
  pidFilter = '';

  states: string[] = Object.values(AltoVersionState);
  users: UserInfo[] = [];
  filters: { field: string; value: string }[] = [];

  revisions: AltoVersion[] = [];
  selectedRevisionIds = new Set<number>();
  batchProgress: { done: number; total: number } | null = null;

  sortBy = 'updatedAt';
  orderSort: 'asc' | 'desc' = 'desc';
  totalRows = 0;
  pageIndex = 0;
  pageSize = 25;

  constructor(
    private _adapter: DateAdapter<unknown>,
    @Inject(MAT_DATE_LOCALE) private _locale: string,
    private router: Router,
    private route: ActivatedRoute,
    private config: AppConfiguration,
    private service: AppService,
    private revisionListState: RevisionListStateService,
    private translate: TranslateService,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this._adapter.setLocale(this._locale);
    this.applyFiltersFromQueryParams();
    this.service
      .fetchUsers({ page: 0, size: 1000 })
      .subscribe((res: Pageable<UserInfo>) => {
        this.users = res.content;
      });
    this.search();
  }

  private applyFiltersFromQueryParams(): void {
    const q = this.route.snapshot.queryParamMap;
    const pid = q.get('pid');
    if (pid) this.pidFilter = pid;
    const label = q.get('label');
    if (label) this.labelFilter = label;
    const state = q.get('state');
    if (state) this.stateFilter = state;
    const user = q.get('user');
    if (user) {
      const id = parseInt(user, 10);
      if (!isNaN(id)) this.userFilter = id;
    }
    const updatedAfter = q.get('updatedAfter');
    if (updatedAfter) {
      const d = new Date(updatedAfter);
      if (!isNaN(d.getTime())) this.updatedAfterFilter.setValue(d);
    }
    const page = q.get('page');
    if (page) {
      const p = parseInt(page, 10);
      if (!isNaN(p) && p >= 0) this.pageIndex = p;
    }
    const sortBy = q.get('sortBy');
    if (sortBy) this.sortBy = sortBy;
    const sortOrder = q.get('sortOrder');
    if (sortOrder === 'asc' || sortOrder === 'desc') this.orderSort = sortOrder;
    const size = q.get('size');
    if (size) {
      const s = parseInt(size, 10);
      if (!isNaN(s) && s > 0) this.pageSize = s;
    }
  }

  buildSearchRequest(): AltoVersionSearchRequest {
    const offset = this.pageIndex * this.pageSize;
    const request: AltoVersionSearchRequest = {
      // instance: this.config.instance,
      offset,
      limit: this.pageSize,
      sortBy: this.sortBy === 'label' ? 'title_sort' : this.sortBy,
      sortOrder: this.orderSort === 'asc' ? 'ASC' : 'DESC',
    };
    if (this.labelFilter?.trim()) {
      request.title = this.labelFilter.trim();
    }
    if (this.userFilter) {
      request.users = [this.userFilter];
    }
    if (this.updatedAfterFilter.value) {
      request.updatedAfter = this.toLocalDateTime(
        this.updatedAfterFilter.value,
        false,
      );
    }
    if (this.stateFilter) {
      request.states = [this.stateFilter as AltoVersionState];
    }
    if (this.pidFilter?.trim()) {
      request.hierarchyPid = this.pidFilter.trim();
    }
    return request;
  }

  search(): void {
    const request = this.buildSearchRequest();
    this.service.searchAltoVersions(request).subscribe((res) => {
      this.revisions = res.items ?? [];
      this.totalRows = res.total ?? 0;
      this.revisionListState.items = this.revisions;
      this.revisionListState.searchRequest = request;
      this.revisionListState.totalRows = this.totalRows;
    });
  }

  onSortChange(e: Sort): void {
    this.sortBy = e.active || 'updatedAt';
    this.orderSort =
      e.direction === 'asc' || e.direction === 'desc' ? e.direction : 'desc';
    this.search();
  }

  navigate(row: AltoVersion): void {
    const idx = this.revisions.findIndex((r) => r.id === row.id);
    this.revisionListState.currentIndex = idx >= 0 ? idx : -1;
  }

  updatedAfterChanged(e: unknown, control: FormControl): void {
    const value = control.value as Date | null;
    if (value) {
      this.filter('updatedAfter', this.toLocalDateTime(value, false));
    } else {
      this.filter('updatedAfter', '');
    }
  }

  filterByUsername(username: string): void {
    const user = this.users.find((u) => u.username === username);
    if (user) {
      this.userFilter = user.id;
      this.filter('username', user.id);
    }
  }

  filter(field: string, value: string | number | null): void {
    if (field === 'username') {
      this.userFilter = value as number | null;
      this.search();
      return;
    }
    value = value as string;
    const f = this.filters.find((x) => x.field === field);
    if (f) {
      f.value = value;
    } else {
      this.filters.push({ field, value });
    }
    if (field === 'label') this.labelFilter = value;
    if (field === 'updatedAfter' && !value)
      this.updatedAfterFilter.setValue(null);
    if (field === 'state') this.stateFilter = value;
    if (field === 'pid') this.pidFilter = value;
    this.search();
  }

  onPageChanged(e: { pageSize: number; pageIndex: number }): void {
    this.pageSize = e.pageSize;
    this.pageIndex = e.pageIndex;
    this.search();
  }

  /** Label for table: ancestor path + page title */
  versionLabel(row: AltoVersion): string {
    if (row.ancestorTitles?.length) {
      return (
        row.ancestorTitles.join(' / ') + ' / ' + (row.pageTitle ?? row.pid)
      );
    }
    return row.pageTitle ?? row.pid;
  }

  private toLocalDateTime(d: Date, endOfDay: boolean): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const time = endOfDay ? '23:59:59' : '00:00:00';
    return `${y}-${m}-${day}T${time}`;
  }

  // --- Selection ---
  isRowSelected(v: AltoVersion): boolean {
    return this.selectedRevisionIds.has(v.id);
  }
  toggleSelection(v: AltoVersion, _event?: unknown): void {
    if (this.selectedRevisionIds.has(v.id)) {
      this.selectedRevisionIds.delete(v.id);
    } else {
      this.selectedRevisionIds.add(v.id);
    }
    this.selectedRevisionIds = new Set(this.selectedRevisionIds);
  }
  get selectedRevisions(): AltoVersion[] {
    return this.revisions.filter((r) => this.selectedRevisionIds.has(r.id));
  }
  isAllSelected(): boolean {
    return (
      this.revisions.length > 0 &&
      this.revisions.every((r) => this.selectedRevisionIds.has(r.id))
    );
  }
  toggleAllSelection(_event?: unknown): void {
    if (this.isAllSelected()) {
      this.selectedRevisionIds.clear();
    } else {
      this.revisions.forEach((r) => this.selectedRevisionIds.add(r.id));
    }
    this.selectedRevisionIds = new Set(this.selectedRevisionIds);
  }

  /** Selected versions eligible for Accept (any state) */
  get acceptEligibleCount(): number {
    return this.selectedRevisions.length;
  }
  /** Selected versions eligible for Reject/Archive (PENDING only) */
  get rejectArchiveEligibleCount(): number {
    return this.selectedRevisions.filter(
      (r) => r.state === AltoVersionState.PENDING,
    ).length;
  }

  batchAccept(): void {
    const items = this.selectedRevisions;
    if (items.length === 0) return;
    this.dialog
      .open(ConfirmDialogComponent, {
        data: {
          message: 'message.confirmAccept',
          messageParams: { count: items.length },
          confirmLabel: 'button.accept',
        } as ConfirmDialogData,
        width: '380px',
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) this.runBatchAccept(items);
      });
  }
  batchReject(): void {
    const items = this.selectedRevisions.filter(
      (r) => r.state === AltoVersionState.PENDING,
    );
    if (items.length === 0) return;
    this.dialog
      .open(ConfirmDialogComponent, {
        data: {
          message: 'message.confirmReject',
          messageParams: { count: items.length },
          confirmLabel: 'button.reject',
        } as ConfirmDialogData,
        width: '380px',
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) this.runBatchReject(items);
      });
  }
  batchArchive(): void {
    const items = this.selectedRevisions.filter(
      (r) => r.state === AltoVersionState.PENDING,
    );
    if (items.length === 0) return;
    this.dialog
      .open(ConfirmDialogComponent, {
        data: {
          message: 'message.confirmArchive',
          messageParams: { count: items.length },
          confirmLabel: 'button.archive',
        } as ConfirmDialogData,
        width: '380px',
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) this.runBatchArchive(items);
      });
  }

  private runBatchAccept(items: AltoVersion[]): void {
    this.batchProgress = { done: 0, total: items.length };
    let idx = 0;
    const run = () => {
      if (idx >= items.length) {
        this.batchProgress = null;
        this.selectedRevisionIds.clear();
        this.selectedRevisionIds = new Set();
        this.service.showSnackBar('desc.acceptSuccess');
        this.search();
        return;
      }
      this.service.acceptAltoVersion(items[idx].id).subscribe({
        next: () => {
          this.batchProgress = { done: idx + 1, total: items.length };
          idx++;
          run();
        },
        error: (err) => {
          this.batchProgress = null;
          this.service.showSnackBar(
            err?.error?.errors?.[0] ?? 'message.error',
            true,
          );
        },
      });
    };
    run();
  }
  private runBatchReject(items: AltoVersion[]): void {
    this.batchProgress = { done: 0, total: items.length };
    let idx = 0;
    const run = () => {
      if (idx >= items.length) {
        this.batchProgress = null;
        this.selectedRevisionIds.clear();
        this.selectedRevisionIds = new Set();
        this.service.showSnackBar('desc.rejectSuccess');
        this.search();
        return;
      }
      this.service.rejectAltoVersion(items[idx].id).subscribe({
        next: () => {
          this.batchProgress = { done: idx + 1, total: items.length };
          idx++;
          run();
        },
        error: (err) => {
          this.batchProgress = null;
          this.service.showSnackBar(
            err?.error?.errors?.[0] ?? 'message.error',
            true,
          );
        },
      });
    };
    run();
  }
  private runBatchArchive(items: AltoVersion[]): void {
    this.batchProgress = { done: 0, total: items.length };
    let idx = 0;
    const run = () => {
      if (idx >= items.length) {
        this.batchProgress = null;
        this.selectedRevisionIds.clear();
        this.selectedRevisionIds = new Set();
        this.service.showSnackBar('desc.archiveSuccess');
        this.search();
        return;
      }
      this.service.archiveAltoVersion(items[idx].id).subscribe({
        next: () => {
          this.batchProgress = { done: idx + 1, total: items.length };
          idx++;
          run();
        },
        error: (err) => {
          this.batchProgress = null;
          this.service.showSnackBar(
            err?.error?.errors?.[0] ?? 'message.error',
            true,
          );
        },
      });
    };
    run();
  }
}
