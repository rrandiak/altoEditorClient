import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AppConfiguration } from 'src/app/app-configuration';
import { AppService } from 'src/app/app.service';
import { Batch, BatchSearchRequest } from 'src/app/shared/batch';
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
import { BATCH_PRIORITIES, BATCH_STATES } from 'src/app/shared/constants';
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
  sortBy: string = 'updatedAt';
  orderSort: string = 'desc';
  totalRows: number = 0;
  pageIndex: number = 0;
  pageSize: number = 10;

  pidFilter: string;
  states: string[] = [];
  stateFilter: string = '';
  priorities: string[] = [];
  priorityFilter: string = '';

  filters: { field: string; value: string }[] = [];

  createDate = new FormControl();
  updateDate = new FormControl();

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
    this.states = Object.values(BATCH_STATES);
    this.priorities = Object.values(BATCH_PRIORITIES);

    this.getBatches();
    this.displayedColumns.forEach((c) => {
      this.filterColumns.push(c + '-filter');
    });
  }

  buildSearchRequest(): BatchSearchRequest {
    const request: BatchSearchRequest = {
      instance: null,
    };
    if (this.pidFilter?.trim()) request.pid = this.pidFilter.trim();
    if (this.stateFilter) request.state = this.stateFilter;
    if (this.priorityFilter) request.priority = this.priorityFilter;
    if (this.createDate.value) {
      const d: Date = this.createDate.value;
      d.setHours(0, 0, 0, 0);
      const iso = d.toISOString().split('T')[0];
      request.createdAfter = iso;
      request.createdBefore = iso;
    }
    if (this.updateDate.value) {
      const d: Date = this.updateDate.value;
      d.setHours(0, 0, 0, 0);
      const iso = d.toISOString().split('T')[0];
      request.updatedAfter = iso;
      request.updatedBefore = iso;
    }
    return request;
  }

  getBatches() {
    const request = this.buildSearchRequest();
    const offset = this.pageIndex * this.pageSize;
    this.service
      .searchBatches(request, {
        offset,
        limit: this.pageSize,
        orderBy: this.sortBy,
        orderSort: this.orderSort,
      })
      .subscribe((res) => {
        this.batches = res.content;
        this.totalRows = res.totalElements;
      });
  }

  onSortChange(e: any) {
    console.log(e);
    this.sortBy = e.active ? e.active : 'updatedAt';
    this.orderSort = e.direction ? e.direction : 'desc';
    this.getBatches();
  }

  dateChanged(e: any, control: FormControl, field: string) {
    if (control.value) {
      const d: Date = control.value;
      d.setHours(10); // jinak dostaneme o den min kvuli GMT+1
      this.filter(field, d.toISOString().split('T')[0]);
    } else {
      this.filter(field, '');
    }
  }

  filter(field: string, value: string) {
    const f = this.filters.find((f) => f.field === field);
    if (f) {
      f.value = value;
    } else {
      this.filters.push({ field, value });
    }
    this.getBatches();
  }

  onPageChanged(e: any) {
    this.pageSize = e.pageSize;
    this.pageIndex = e.pageIndex;
    this.getBatches();
  }
}
