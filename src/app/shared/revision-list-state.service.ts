import { Injectable } from '@angular/core';
import {
  AltoVersion,
  AltoVersionSearchRequest,
} from 'src/app/shared/alto-version';
import { Params } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class RevisionListStateService {
  items: AltoVersion[] = [];
  searchRequest: AltoVersionSearchRequest | null = null;
  totalRows: number = 0;
  currentIndex: number = -1;

  get pageIndex(): number {
    const r = this.searchRequest;
    if (!r?.offset || !r?.limit) return 0;
    return Math.floor(r.offset / r.limit);
  }

  get pageSize(): number {
    return this.searchRequest?.limit ?? 25;
  }

  buildResultsQueryParams(): Params {
    const r = this.searchRequest;
    if (!r) return {};
    const p: Params = {};
    if (r.hierarchyPid) p['pid'] = r.hierarchyPid;
    if (r.title) p['label'] = r.title;
    if (r.states?.length) p['state'] = r.states[0];
    if (r.users?.length) p['user'] = String(r.users[0]);
    if (r.updatedAfter) p['updatedAfter'] = r.updatedAfter;
    const page = r.offset != null && r.limit ? Math.floor(r.offset / r.limit) : 0;
    p['page'] = String(page);
    p['size'] = String(r.limit ?? 25);
    return p;
  }
}
