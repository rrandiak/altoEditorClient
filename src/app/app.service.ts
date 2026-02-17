import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { forkJoin } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AppConfiguration } from './app-configuration';
import { Batch, BatchPriority, BatchSearchFilters } from './shared/batch';
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

@Injectable({
  providedIn: 'root',
})
export class AppService {
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

  /** Load current user + Kramerius users + engine users in parallel. Call after login and on guarded routes. */
  loadSession(): Observable<
    [CurrentUser, Pageable<UserInfo>, Pageable<UserInfo>]
  > {
    return forkJoin([
      this.loadCurrentUser(),
      this.loadKrameriusUsers(),
      this.loadEngineUsers(),
    ]);
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
      offset?: number;
      limit?: number;
      orderBy?: string;
      orderSort?: string;
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
    if (params?.offset != null)
      httpParams = httpParams.set('offset', String(params.offset));
    if (params?.limit != null)
      httpParams = httpParams.set('limit', String(params.limit));
    if (params?.orderBy != null)
      httpParams = httpParams.set('orderBy', params.orderBy);
    if (params?.orderSort != null)
      httpParams = httpParams.set('orderSort', params.orderSort);
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

  rejectAltoVersion(id: number): Observable<any> {
    return this.post(`/alto-versions/${id}/reject`, null);
  }

  archiveAltoVersion(id: number): Observable<any> {
    return this.post(`/alto-versions/${id}/archive`, null);
  }

  // OLD
  getDigitalObjectVersion(
    pid: string,
    version: string,
    login: string,
  ): Observable<string> {
    const params: HttpParams = new HttpParams()
      .set('pid', pid)
      .set('versionXml', version)
      .set('login', login);
    return this.get(`/db/object`, params);
  }

  getDigitalObject(pid: string, instance: string): Observable<string> {
    const params: HttpParams = new HttpParams().set('instance', instance);
    return this.get(`/alto-versions/${pid}/related`, params);
  }

  getDigitalObjects(
    login: string,
    instance: string,
    orderBy: string = 'datum',
    orderSort: string = 'asc',
  ): Observable<string> {
    const params: HttpParams = new HttpParams()
      .set('orderBy', orderBy)
      .set('orderSort', orderSort)
      .set('instance', instance)
      .set('login', login);
    return this.get(`/db/object`, params);
  }

  getAllDigitalObjects(params: HttpParams): Observable<string> {
    return this.get(`/db/objects`, params);
  }

  getVersions(
    pid: string,
    login: string,
    instance: string,
    filterField?: string,
    filterValue?: string,
  ): Observable<string> {
    const params: HttpParams = new HttpParams().set('pid', pid);
    return this.get(`/db/objects`, params);
  }

  getAlto(pid: string, login: string, instance: string): Observable<string> {
    const params: HttpParams = new HttpParams()
      .set('pid', pid)
      .set('instance', instance)
      .set('login', login);
    return this.get(`/object/alto`, params);
  }

  getAltoOriginal(
    pid: string,
    login: string,
    instance: string,
  ): Observable<string> {
    const params: HttpParams = new HttpParams()
      .set('pid', pid)
      .set('instance', instance)
      .set('login', login);
    return this.get(`/object/altoOriginal`, params);
  }

  getAltoVersion(
    pid: string,
    versionXml: string,
    login: string,
    instance: string,
  ): Observable<string> {
    const params: HttpParams = new HttpParams()
      .set('pid', pid)
      .set('versionXml', versionXml)
      .set('instance', instance)
      .set('login', login);
    return this.get(`/object/alto`, params);
  }

  getBatches(params: HttpParams): Observable<SearchResults<Batch>> {
    return this.get<SearchResults<Batch>>(`/batches`, params);
  }

  markAsMajorVersion(data: any) {
    // {"id":{{digitalObjectId}},"login":"inovatika"}
    const url = `/object/stateAccepted`;
    return this.post(url, data);
  }

  markForDeletion(data: any) {
    // {"id":{{digitalObjectId}},"login":"inovatika"}
    const url = `/object/stateRejected`;
    return this.post(url, data);
  }

  uploadKramerius(data: any) {
    // {"id":{{digitalObjectId}},"login":"inovatika"}
    const url = `/object/uploadKramerius`;
    return this.post(url, data);
  }
}
