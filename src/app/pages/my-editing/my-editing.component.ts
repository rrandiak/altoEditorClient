import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AppConfiguration } from 'src/app/app-configuration';
import { AppService } from 'src/app/app.service';
import { AppState } from 'src/app/shared/app.state';
import { MatSortModule, Sort } from '@angular/material/sort';
import {
  MatPaginatorIntl,
  MatPaginatorModule,
} from '@angular/material/paginator';
import {
  DateAdapter,
  MAT_DATE_LOCALE,
  MatNativeDateModule,
} from '@angular/material/core';
import { PaginatorI18n } from 'src/app/shared/paginator-i18n';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import {
  AltoVersion,
  AltoVersionSearchRequest,
  AltoVersionState,
} from 'src/app/shared/alto-version';

@Component({
  selector: 'app-my-editing',
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
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatTooltipModule,
    MatPaginatorModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatInputModule,
  ],
  templateUrl: './my-editing.component.html',
  styleUrls: ['./my-editing.component.scss'],
})
export class MyEditingComponent {
  displayedColumns: string[] = [
    'label',
    'createdAt',
    'updatedAt',
    'state',
    'pid',
    'actions',
  ];
  filterColumns: string[] = [];

  versions: AltoVersion[] = [];
  sortBy = 'updatedAt';
  orderSort: 'asc' | 'desc' = 'desc';
  totalRows = 0;
  pageIndex = 0;
  pageSize = 25;

  titleFilter = '';
  createdAfterFilter = new FormControl();
  updatedAfterFilter = new FormControl();
  stateFilter = '';
  pidFilter = '';
  filters: { field: string; value: string }[] = [];

  states: string[] = Object.values(AltoVersionState);

  /** Format Date to LocalDateTime ISO string for backend (YYYY-MM-DDTHH:mm:ss). */
  private toLocalDateTime(d: Date, endOfDay: boolean): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const time = endOfDay ? '23:59:59' : '00:00:00';
    return `${y}-${m}-${day}T${time}`;
  }

  constructor(
    private _adapter: DateAdapter<unknown>,
    @Inject(MAT_DATE_LOCALE) private _locale: string,
    private router: Router,
    private config: AppConfiguration,
    private service: AppService,
    public state: AppState,
  ) {}

  ngOnInit(): void {
    this._adapter.setLocale(this._locale);
    this.displayedColumns.forEach((c) => {
      this.filterColumns.push(c + '-filter');
    });
    this.search();
  }

  buildSearchRequest(): AltoVersionSearchRequest {
    const offset = this.pageIndex * this.pageSize;
    const request: AltoVersionSearchRequest = {
      // instance: this.config.instance,
      offset,
      limit: this.pageSize,
      orderBy: this.sortBy,
      orderSort: this.orderSort,
    };
    if (this.state.currentUser?.username) {
      request.users = [this.state.currentUser.username];
    }
    if (this.titleFilter?.trim()) {
      request.title = this.titleFilter.trim();
    }
    if (this.createdAfterFilter.value) {
      const d = this.createdAfterFilter.value as Date;
      request.createdAfter = this.toLocalDateTime(d, false);
    }
    if (this.updatedAfterFilter.value) {
      const d = this.updatedAfterFilter.value as Date;
      request.updatedAfter = this.toLocalDateTime(d, false);
    }
    if (this.stateFilter) {
      request.states = [this.stateFilter as AltoVersionState];
    }
    if (this.pidFilter?.trim()) {
      request.targetPid = this.pidFilter.trim();
      request.hierarchyPid = this.pidFilter.trim();
    }
    return request;
  }

  search(): void {
    const request = this.buildSearchRequest();
    this.service.searchRelatedAltoVersions(request).subscribe((res) => {
      this.versions = res.items ?? [];
      this.totalRows = res.total ?? 0;
    });
  }

  gotoToObject(version: AltoVersion): void {
    this.router.navigate(['/', version.pid, 'editing']);
  }

  onSortChange(e: Sort): void {
    this.sortBy = e.active || 'updatedAt';
    this.orderSort =
      e.direction === 'asc' || e.direction === 'desc' ? e.direction : 'desc';
    this.search();
  }

  onPageChanged(e: { pageSize: number; pageIndex: number }): void {
    this.pageSize = e.pageSize;
    this.pageIndex = e.pageIndex;
    this.search();
  }

  createdAfterChanged(_e: unknown, control: FormControl): void {
    const value = control.value as Date | null;
    if (value) {
      this.filter('createdAfter', this.toLocalDateTime(value, false));
    } else {
      this.filter('createdAfter', '');
    }
  }

  updatedAfterChanged(_e: unknown, control: FormControl): void {
    const value = control.value as Date | null;
    if (value) {
      this.filter('updatedAfter', this.toLocalDateTime(value, false));
    } else {
      this.filter('updatedAfter', '');
    }
  }

  filter(field: string, value: string): void {
    const f = this.filters.find((x) => x.field === field);
    if (f) {
      f.value = value;
    } else {
      this.filters.push({ field, value });
    }
    if (field === 'title') this.titleFilter = value;
    if (field === 'createdAfter' && !value)
      this.createdAfterFilter.setValue(null);
    if (field === 'updatedAfter' && !value)
      this.updatedAfterFilter.setValue(null);
    if (field === 'state') this.stateFilter = value;
    if (field === 'pid') this.pidFilter = value;
    this.search();
  }

  versionLabel(row: AltoVersion): string {
    if (row.ancestorTitles?.length) {
      return (
        row.ancestorTitles.join(' / ') + ' / ' + (row.pageTitle ?? row.pid)
      );
    }
    return row.pageTitle ?? row.pid;
  }
}
