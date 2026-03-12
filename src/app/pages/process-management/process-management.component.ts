import { Component, Inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AppConfiguration } from 'src/app/app-configuration';
import { AppService } from 'src/app/app.service';
import {
  Batch,
  BatchPriority,
  BatchSearchFilters,
  BatchState,
  BatchType,
} from 'src/app/shared/batch';
import { Subject } from 'rxjs';
import { MatSortModule } from '@angular/material/sort';
import {
  MatPaginatorIntl,
  MatPaginatorModule,
} from '@angular/material/paginator';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import {
  MatDatepickerInputEvent,
  MatDatepickerModule,
} from '@angular/material/datepicker';
import {
  DateAdapter,
  MAT_DATE_LOCALE,
  MatNativeDateModule,
} from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { PaginatorI18n } from 'src/app/shared/paginator-i18n';
import { AppDateTimePipe } from 'src/app/shared/app-date-time.pipe';
import { UserInfo } from 'src/app/shared/user-info';
import { Pageable } from 'src/app/shared/pageable';

const today = new Date();
const POLL_INTERVAL_MS = 5000;
const month = today.getMonth();
const year = today.getFullYear();

@Component({
  selector: 'app-process-management',
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'cs' },
    { provide: MatPaginatorIntl, useClass: PaginatorI18n },
  ],
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    TranslateModule,
    MatTableModule,
    MatTooltipModule,
    MatSortModule,
    MatPaginatorModule,
    MatButtonModule,
    AppDateTimePipe,
  ],
  templateUrl: './process-management.component.html',
  styleUrls: ['./process-management.component.scss'],
})
export class ProcessManagementComponent implements OnDestroy {
  states: BatchState[] = Object.values(BatchState);
  priorities: BatchPriority[] = Object.values(BatchPriority);
  types: BatchType[] = Object.values(BatchType);

  displayedColumns: string[] = [
    'createdBy',
    'type',
    'instance',
    'pid',
    'engine',
    'priority',
    'state',
    'createdAt',
    'updatedAt',
  ];

  batches: Batch[] = [];
  filters: BatchSearchFilters = {};
  /** Real users only (not kramerius, not engine) for createdBy filter */
  realUsers: UserInfo[] = [];
  dateFormControls: { createdAfter: FormControl; updatedAfter: FormControl } = {
    createdAfter: new FormControl(),
    updatedAfter: new FormControl(),
  };
  sortBy: string = 'createdAt';
  orderSort: 'asc' | 'desc' = 'desc';
  totalRows: number = 0;
  pageIndex: number = 0;
  pageSize: number = 25;

  private readonly destroy$ = new Subject<void>();
  private refreshInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private _adapter: DateAdapter<any>,
    @Inject(MAT_DATE_LOCALE) private _locale: string,
    private route: ActivatedRoute,
    private config: AppConfiguration,
    private service: AppService,
    private translate: TranslateService,
  ) {}

  ngOnInit() {
    this._locale = 'cs';
    this._adapter.setLocale(this._locale);
    this.service
      .fetchUsers({
        isKramerius: false,
        isEngine: false,
        isEnabled: true,
        page: 0,
        size: 1000,
      })
      .subscribe((res: Pageable<UserInfo>) => {
        this.realUsers = res.content ?? [];
      });
    this.getBatches();
    this.startRefreshIfRunning();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopRefresh();
  }

  private hasRunningOnPage(): boolean {
    return this.batches.some(
      (b) => b.state === BatchState.RUNNING || b.state === BatchState.PLANNED,
    );
  }

  private startRefreshIfRunning() {
    if (this.hasRunningOnPage() && !this.refreshInterval) {
      this.refreshInterval = setInterval(() => {
        this.getBatches();
        if (!this.hasRunningOnPage()) {
          this.stopRefresh();
        }
      }, POLL_INTERVAL_MS);
    }
  }

  private stopRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  getBatches() {
    this.service
      .searchBatches(this.filters, {
        page: this.pageIndex,
        size: this.pageSize,
        sortBy: this.sortBy,
        sortOrder: this.orderSort === 'asc' ? 'ASC' : 'DESC',
      })
      .subscribe((res) => {
        this.batches = res.content;
        this.totalRows = res.totalElements;
        this.startRefreshIfRunning();
      });
  }

  onSortChange(e: { active: string; direction: 'asc' | 'desc' | '' }) {
    this.sortBy = e.active || 'updatedAt';
    this.orderSort =
      e.direction === 'asc' || e.direction === 'desc' ? e.direction : 'desc';
    this.pageIndex = 0;
    this.getBatches();
  }

  filter(field: string, value: string | undefined): void {
    const trimmed = value != null ? String(value).trim() : '';
    this.filters[field as keyof BatchSearchFilters] = trimmed || undefined;
    this.pageIndex = 0;
    this.getBatches();
  }

  filterDate(
    field: 'createdAfter' | 'updatedAfter',
    control: FormControl | null,
    endOfDay: boolean,
  ): void {
    if (!control) {
      this.filters[field] = undefined;
      this.dateFormControls[field].setValue(null);
      this.pageIndex = 0;
      this.getBatches();
      return;
    }
    if (control.value) {
      const d = control.value as Date;
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const time = endOfDay ? '23:59:59' : '00:00:00';
      this.filters[field] = `${y}-${m}-${day}T${time}`;
    } else {
      this.filters[field] = undefined;
    }
    this.pageIndex = 0;
    this.getBatches();
  }

  onPageChanged(e: any) {
    this.pageSize = e.pageSize;
    this.pageIndex = e.pageIndex;
    this.getBatches();
  }

  /** Progress 0–100 when estimatedItemCount and processedItemCount are set, else null. */
  getProgressPercent(batch: Batch): number | null {
    const total = batch.estimatedItemCount;
    const done = batch.processedItemCount;
    if (total == null || total <= 0 || done == null || done < 0) return null;
    return Math.min(100, (done / total) * 100);
  }

  /** Tooltip for state badge: when DONE and processedItemCount > 0, show translated message; else show log. */
  getStateTooltip(batch: Batch): string {
    if (batch.state === 'DONE' && (batch.processedItemCount ?? 0) > 0) {
      return this.translate.instant('message.processedItemsCount', {
        count: batch.processedItemCount,
      });
    }
    return batch.log ?? '';
  }

  /** Tooltip for progress gauge: percent and "processed / estimated". */
  getProgressTooltip(batch: Batch): string {
    const pct = this.getProgressPercent(batch);
    const done = batch.processedItemCount ?? 0;
    const total = batch.estimatedItemCount ?? 0;
    if (pct == null) return '';
    const pctStr = pct.toFixed(2) + '%';
    return `${pctStr} (${done} / ${total})`;
  }
}
