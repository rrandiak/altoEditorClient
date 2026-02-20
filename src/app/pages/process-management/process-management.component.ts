import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
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

const today = new Date();
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
  ],
  templateUrl: './process-management.component.html',
  styleUrls: ['./process-management.component.scss'],
})
export class ProcessManagementComponent {
  states: BatchState[] = Object.values(BatchState);
  priorities: BatchPriority[] = Object.values(BatchPriority);
  types: BatchType[] = Object.values(BatchType);

  displayedColumns: string[] = [
    'id',
    'pid',
    'createdAt',
    'updatedAt',
    'state',
    'substate',
    'priority',
    'type',
    'instance',
  ];
  filterColumns: string[] = [];

  batches: Batch[] = [];
  filters: BatchSearchFilters = {};
  dateFormControls: { createdAfter: FormControl; updatedAfter: FormControl } = {
    createdAfter: new FormControl(),
    updatedAfter: new FormControl(),
  };
  sortBy: string = 'createdAt';
  orderSort: string = 'desc';
  totalRows: number = 0;
  pageIndex: number = 0;
  pageSize: number = 25;

  constructor(
    private _adapter: DateAdapter<any>,
    @Inject(MAT_DATE_LOCALE) private _locale: string,
    private route: ActivatedRoute,
    private config: AppConfiguration,
    private service: AppService,
  ) {}

  ngOnInit() {
    this._locale = 'cs';
    this._adapter.setLocale(this._locale);

    this.getBatches();
    this.displayedColumns.forEach((c) => {
      this.filterColumns.push(c + '-filter');
    });
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
}
