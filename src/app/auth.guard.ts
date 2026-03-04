

import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { Injectable } from '@angular/core';
import { tap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { AppService } from './app.service';
import { BatchPollingService } from './shared/batch-polling.service';

@Injectable()
export class AuthGuard implements CanActivate {

  constructor(
    private auth: AuthService,
    private appService: AppService,
    private batchPolling: BatchPollingService,
    private router: Router,
  ) {}

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean>|boolean {
      return Observable.create((observer: any) => {
        if (this.auth.isAuthorized()) {
          this.appService.ensureSession().pipe(
            tap(() => this.batchPolling.start()),
          ).subscribe();
          observer.next(true);
          observer.complete();
        } else {
          this.auth.checkToken((status: number) => {
            if (status == AuthService.AUTH_AUTHORIZED) {
              this.appService.ensureSession().pipe(
                tap(() => this.batchPolling.start()),
              ).subscribe();
              observer.next(true);
              observer.complete();
            } else {
              localStorage.setItem('login.url', state.url);
              observer.next(false);
              observer.complete();
              this.router.navigate(['/login']);
            }
          });
        }
      });
    }

}
