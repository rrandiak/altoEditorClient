import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable, of, switchMap } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AppConfiguration } from './app-configuration';
import { KrameriusDocument } from './shared/kramerius-document';

@Injectable({
  providedIn: 'root'
})
export class AppService {

  constructor(
    private http: HttpClient,
    private translateService: TranslateService,
    private snackBar: MatSnackBar,
    private config: AppConfiguration
  ) {

     }

  showSnackBar(s: string, error: boolean = false) {
    const clazz = error ? 'app-snack-error' : 'app-snack-success';
    this.snackBar.open(this.translateService.instant(s), '', {
      duration: 3000,
      verticalPosition: 'top',
      panelClass: clazz
    });
  }
  
  private get<T>(url: string, params: HttpParams = new HttpParams(), responseType?: any): Observable<T> {
    // const r = re ? re : 'json';
    const options = { params, responseType, withCredentials: true };
    // return this.http.get<T>(`${this.config.clientBaseUrl}${url}`, options);
    return this.http.get<T>(`api${url}`, options);

  }

  private post(url: string, obj: any) {
    return this.http.post<any>(`api${url}`, obj);
  }

  getUsers(): Observable<string> {
    return this.get(`/db/users`);
  }

  getDigitalObjectVersion(pid: string, version: string, login: string): Observable<string> {
    const params: HttpParams = new HttpParams()
    .set('pid', pid)
    .set('versionXml', version)
    .set('login', login);
    return this.get(`/db/object`, params);
  }

  getDigitalObject(pid: string, login: string): Observable<string> {
    const params: HttpParams = new HttpParams()
    .set('pid', pid)
    .set('login', login);
    return this.get(`/db/object`, params);
  }

  getDigitalObjects(login: string, instance: string, orderBy: string = 'datum', orderSort: string = 'asc'): Observable<string> {
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

  getVersions(pid: string, login: string, instance: string, filterField?: string, filterValue?: string): Observable<string> {
    const params: HttpParams = new HttpParams()
    .set('pid', pid);
    return this.get(`/db/objects`, params);
    
  }
  
  getImge(pid: string, login: string, instance: string): Observable<any> {
    const params: HttpParams = new HttpParams()
    .set('pid', pid)
    .set('instance', instance)
    .set('login', login);
    return this.get(`/object/image`, params, 'blob');
    
  }

  getAlto(pid: string, login: string, instance: string): Observable<string> {
    const params: HttpParams = new HttpParams()
    .set('pid', pid)
    .set('instance', instance)
    .set('login', login);
    return this.get(`/object/alto`, params);
    
  }

  getAltoOriginal(pid: string, login: string, instance: string): Observable<string> {
    const params: HttpParams = new HttpParams()
    .set('pid', pid)
    .set('instance', instance)
    .set('login', login);
    return this.get(`/object/altoOriginal`, params);
    
  }

  getAltoVersion(pid: string, versionXml: string, login: string, instance: string): Observable<string> {
    const params: HttpParams = new HttpParams()
    .set('pid', pid)
    .set('versionXml', versionXml)
    .set('instance', instance)
    .set('login', login);
    return this.get(`/object/alto`, params);
    
  }

  getBatches(params: HttpParams): Observable<string> {
    return this.get(`/db/batches`, params);  
  }

  saveAlto(data: any) {
    const url = `/object/alto`;
    return this.post(url, data);
  }

  generatePERO(data: any) {
    // {"pid":"{{uuidStrana}}","priority":"LOW", "instance":"k7"}
    const url = `/object/pero`;
    return this.post(url, data);
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

  findKrameriusObject(pid: string, instance: string): Observable<KrameriusDocument | null> {
    const baseUrl = 'https://api.kramerius.mzk.cz/search/api/client/v7.0/search';

    const baseParams = new HttpParams()
      .set('q', `pid:"${pid}"`)
      .set(
        'fl',
        'authors,title.search,root.title,model,count_page,count_volume,count_issue,count_monograph_unit'
      )
      .set('rows', '1')
      .set('wt', 'json');

    return this.http.get<any>(baseUrl, { params: baseParams }).pipe(
      map(res => res?.response?.docs?.[0] ?? null),

      switchMap(doc => {
        if (!doc) {
          return of(null);
        }

        const mapped: KrameriusDocument = {
          pid,
          link: `https://digitalniknihovna.cz/mzk/uuid/${pid}`,
          root_title: doc['root.title'],
          title: doc['title.search'],
          authors: doc['authors'] || [],
          model: doc['model'],
          page_count: doc['count_page'],
          volume_count: doc['count_volume'],
          issue_count: doc['count_issue'],
          monograph_unit_count: doc['count_monograph_unit'],
          all_pages_count: 0
        };

        // Page = exactly 1 page
        if (mapped.model === 'page') {
          mapped.all_pages_count = 1;
          return of(mapped);
        }

        // If Kramerius already gave page count
        if (mapped.page_count) {
          mapped.all_pages_count = mapped.page_count;
          return of(mapped);
        }

        // Otherwise count pages via secondary query
        const pageCountParams = new HttpParams()
          .set('q', `own_pid_path:/.*${pid}.*/ AND model:page`)
          .set('rows', '0')
          .set('wt', 'json');

        return this.http.get<any>(baseUrl, { params: pageCountParams }).pipe(
          map(r => {
            mapped.all_pages_count = r?.response?.numFound ?? 0;
            return mapped;
          })
        );
      })
    );
    // const params: HttpParams = new HttpParams()
    // .set('pid', pid)
    // .set('instance', instance);
    // return this.get(`/object/findKrameriusObjects`, params); 
  }

  addAllPages(pid: string, instance: string): Observable<any> {
    const url = `/object/addAllPages`;
    const data = { pid, instance };
    return this.post(url, data);
  }

}
