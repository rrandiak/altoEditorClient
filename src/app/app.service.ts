import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { forkJoin } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AppConfiguration } from './app-configuration';
import { Batch, BatchPriority, BatchSearchFilters, HierarchyGenerateScope, PipelineRequest } from './shared/batch';
import { SearchResults } from './shared/search-results';
import { AppState } from './shared/app.state';
import {
  CurrentUser,
  UserInfo,
  UserInfoSearchRequest,
  UserRole,
} from './shared/user-info';
import {
  AltoVersion,
  AltoVersionContent,
  AltoVersionSearchRelatedRequest,
  AltoVersionSearchRequest,
} from './shared/alto-version';
import { Pageable } from './shared/pageable';
import { DOHierarchy, DOHierarchySearchRequest } from './shared/digital-object';

function toCurrentUser(data: any): CurrentUser {
  return {
    id: data.id,
    username: data.username,
    roles: data.roles ?? [],
    isCurator: (data.roles ?? []).includes(UserRole.CURATOR),
  };
}

function objectToParams<T extends object>(request: T): HttpParams {
  return Object.entries(request).reduce((p, [key, value]) => {
    if (value === undefined) return p;
    if (Array.isArray(value)) {
      return value.reduce((pp, v) => pp.append(key, String(v)), p);
    }
    return p.set(key, String(value));
  }, new HttpParams());
}

/** Minimum ms between session loads when navigating; load always on first access and after login. */
const SESSION_LOAD_THROTTLE_MS = 5 * 60 * 1000;

@Injectable({
  providedIn: 'root',
})
export class AppService {
  private lastSessionLoadTime: number | null = null;

  constructor(
    private http: HttpClient,
    private translateService: TranslateService,
    private snackBar: MatSnackBar,
    private config: AppConfiguration,
    private appState: AppState,
  ) {}

  showSnackBar(s: string, error: boolean = false) {
    const clazz = error ? 'app-snack-error' : 'app-snack-success';
    this.snackBar.open(this.translateService.instant(s), '', {
      duration: 3000,
      verticalPosition: 'top',
      panelClass: clazz,
    });
  }

  private get<T>(
    url: string,
    params: HttpParams = new HttpParams(),
    responseType?: any,
  ): Observable<T> {
    // const r = re ? re : 'json';
    const options = { params, responseType, withCredentials: true };
    // return this.http.get<T>(`${this.config.clientBaseUrl}${url}`, options);
    return this.http.get<T>(`api${url}`, options);
  }

  private post(url: string, obj: any) {
    return this.http.post<any>(`api${url}`, obj);
  }

  fetchMe(): Observable<CurrentUser> {
    return this.get(`/users/me`).pipe(map(toCurrentUser));
  }

  createMe(): Observable<CurrentUser> {
    return this.post(`/users/me`, null).pipe(map(toCurrentUser));
  }

  loadCurrentUser(): Observable<CurrentUser> {
    return this.fetchMe()
      .pipe(catchError(() => this.createMe()))
      .pipe(tap((user) => (this.appState.currentUser = user)));
  }

  fetchUsers(
    searchRequest: UserInfoSearchRequest,
  ): Observable<Pageable<UserInfo>> {
    const params = Object.entries(searchRequest).reduce(
      (p, [key, value]) =>
        value === undefined ? p : p.set(key, String(value)),
      new HttpParams(),
    );
    return this.get<Pageable<UserInfo>>(`/users`, params);
  }

  loadKrameriusUsers(): Observable<Pageable<UserInfo>> {
    return this.fetchUsers({
      isKramerius: true,
      isEnabled: true,
      page: 0,
      size: 1000,
    }).pipe(
      tap((pageable) => (this.appState.krameriusUsers = pageable.content)),
    );
  }

  loadEngineUsers(): Observable<Pageable<UserInfo>> {
    return this.fetchUsers({
      isEngine: true,
      isEnabled: true,
      page: 0,
      size: 1000,
    }).pipe(tap((pageable) => (this.appState.engineUsers = pageable.content)));
  }

  /** Load current user + Kramerius users + engine users in parallel. Call after login; use ensureSession() in guards. */
  loadSession(): Observable<
    [CurrentUser, Pageable<UserInfo>, Pageable<UserInfo>]
  > {
    return forkJoin([
      this.loadCurrentUser(),
      this.loadKrameriusUsers(),
      this.loadEngineUsers(),
    ]).pipe(tap(() => (this.lastSessionLoadTime = Date.now())));
  }

  /**
   * Load session only if not loaded yet or last load was more than SESSION_LOAD_THROTTLE_MS ago.
   * Use in guards so session is not refetched on every route change.
   */
  ensureSession(): Observable<
    [CurrentUser, Pageable<UserInfo>, Pageable<UserInfo>] | undefined
  > {
    const now = Date.now();
    if (
      this.lastSessionLoadTime !== null &&
      now - this.lastSessionLoadTime < SESSION_LOAD_THROTTLE_MS
    ) {
      return of(undefined);
    }
    return this.loadSession();
  }

  /** Clear session load cache so next ensureSession() will load again (e.g. after logout). */
  resetSessionLoadCache(): void {
    this.lastSessionLoadTime = null;
  }

  searchRelatedAltoVersions(
    request: AltoVersionSearchRelatedRequest,
  ): Observable<SearchResults<AltoVersion>> {
    const params = objectToParams(request);
    return this.get<SearchResults<AltoVersion>>(
      '/alto-versions/search/related',
      params,
    );
  }

  /** GET /alto-versions/search with AltoVersionSearchRequest as query params. */
  searchAltoVersions(
    request: AltoVersionSearchRequest,
  ): Observable<SearchResults<AltoVersion>> {
    const params = objectToParams(request);
    return this.get<SearchResults<AltoVersion>>(
      '/alto-versions/search',
      params,
    );
  }

  fetchRelatedAltoVersion(
    pid: string,
    instance: string,
  ): Observable<AltoVersionContent> {
    const params: HttpParams = new HttpParams().set('instance', instance);
    return this.get<AltoVersionContent>(
      `/alto-versions/${pid}/related`,
      params,
    );
  }

  searchBatches(
    filters: BatchSearchFilters,
    params?: {
      page?: number;
      size?: number;
      sortBy?: string;
      sortOrder?: string;
    },
  ): Observable<Pageable<Batch>> {
    let httpParams = new HttpParams();
    if (filters.pid != null) httpParams = httpParams.set('pid', filters.pid);
    if (filters.state != null)
      httpParams = httpParams.set('state', String(filters.state));
    if (filters.substate != null)
      httpParams = httpParams.set('substate', String(filters.substate));
    if (filters.createdAfter != null)
      httpParams = httpParams.set('createdAfter', filters.createdAfter);
    if (filters.createdBefore != null)
      httpParams = httpParams.set('createdBefore', filters.createdBefore);
    if (filters.updatedAfter != null)
      httpParams = httpParams.set('updatedAfter', filters.updatedAfter);
    if (filters.updatedBefore != null)
      httpParams = httpParams.set('updatedBefore', filters.updatedBefore);
    if (filters.priority != null)
      httpParams = httpParams.set('priority', String(filters.priority));
    if (filters.type != null)
      httpParams = httpParams.set('type', String(filters.type));
    if (filters.instance != null)
      httpParams = httpParams.set('instance', filters.instance);
    if (filters.createdBy != null)
      httpParams = httpParams.set('createdBy', filters.createdBy);
    if (params?.page != null)
      httpParams = httpParams.set('page', String(params.page));
    if (params?.size != null)
      httpParams = httpParams.set('size', String(params.size));
    if (params?.sortBy != null && params?.sortOrder != null) {
      const dir = String(params.sortOrder).toLowerCase();
      httpParams = httpParams.set('sort', `${params.sortBy},${dir}`);
    }
    return this.get<Pageable<Batch>>(`/batches`, httpParams).pipe(
      map((res: any) => ({
        content: res.content ?? res.items ?? [],
        page: res.page ?? res.number ?? 0,
        size: res.size ?? res.limit ?? 10,
        totalElements: res.totalElements ?? res.total ?? 0,
        totalPages:
          res.totalPages ??
          (Math.ceil(
            (res.totalElements ?? res.total ?? 0) /
              (res.size ?? res.limit ?? 10),
          ) ||
            0),
      })),
    );
  }

  saveAltoVersion(pid: string, content: string) {
    const url = `/alto-versions/${pid}/versions`;
    return this.post(url, { content });
  }

  generateAlto(
    pid: string,
    engine: string,
    priority: BatchPriority,
    instance: string,
  ) {
    const url = `/alto-versions/${pid}/generate/${engine}`;
    const params = new HttpParams()
      .set('priority', priority)
      .set('instance', instance);
    return this.post(url, params);
  }

  fetchImage(pid: string, instance: string): Observable<any> {
    const params: HttpParams = new HttpParams().set('instance', instance);
    return this.get(`/alto-versions/${pid}/image`, params, 'blob');
  }

  fetchAltoVersion(
    pid: string,
    version: number,
  ): Observable<AltoVersionContent> {
    return this.get(`/alto-versions/${pid}/versions/${version}`);
  }

  fetchActiveAltoVersion(pid: string): Observable<AltoVersionContent> {
    return this.get(`/alto-versions/${pid}/active`);
  }

  acceptAltoVersion(id: number): Observable<any> {
    return this.post(`/alto-versions/${id}/accept`, null);
  }

  planAcceptAltoVersions(
    request: AltoVersionSearchRequest,
    priority: BatchPriority,
  ): Observable<any> {
    return this.post(
      `/alto-versions/accept?priority=${priority}`,
      request,
    );
  }

  rejectAltoVersion(id: number): Observable<any> {
    return this.post(`/alto-versions/${id}/reject`, null);
  }

  archiveAltoVersion(id: number): Observable<any> {
    return this.post(`/alto-versions/${id}/archive`, null);
  }

  searchDOHierarchy(
    request: DOHierarchySearchRequest,
  ): Observable<SearchResults<DOHierarchy>> {
    const params = objectToParams(request);
    return this.get<SearchResults<DOHierarchy>>(`/hierarchy/search`, params);
  }

  getKrameriusDOHierarchy(pid: string): Observable<DOHierarchy> {
    return this.get<DOHierarchy>(`/hierarchy/${pid}/from-kramerius`);
  }

  getKrameriusChildrenDOHierarchy(pid: string): Observable<DOHierarchy[]> {
    return this.get<DOHierarchy[]>(`/hierarchy/${pid}/children-from-kramerius`);
  }

  planFetchDOHierarchy(pid: string, priority: BatchPriority): Observable<any> {
    return this.post(
      `/hierarchy/${pid}/fetch-from-kramerius?priority=${priority}`,
      null,
    );
  }

  planGenerateForHierarchy(
    pid: string,
    engine: string,
    priority: BatchPriority,
    scope?: HierarchyGenerateScope,
  ): Observable<any> {
    let url = `/hierarchy/${pid}/generate-alto/${engine}?priority=${priority}`;
    if (scope) {
      url += `&scope=${scope}`;
    }
    return this.post(url, null);
  }

  planReindex(priority: BatchPriority): Observable<any> {
    return this.post(`/system/reindex?priority=${priority}`, null);
  }

  planPipeline(request: PipelineRequest): Observable<any> {
    return this.post(`/pipelines`, request);
  }
}
