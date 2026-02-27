import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { Injectable } from '@angular/core';
import { map, Observable, of } from 'rxjs';
import { AppService } from './app.service';
import { AppState } from './shared/app.state';

@Injectable()
export class CuratorGuard implements CanActivate {
  constructor(
    private appService: AppService,
    private appState: AppState,
    private router: Router,
  ) {}

  canActivate(
    _route: ActivatedRouteSnapshot,
    _state: RouterStateSnapshot,
  ): Observable<boolean> {
    if (this.appState.currentUser?.isCurator) {
      return of(true);
    }
    return this.appService.loadSession().pipe(
      map(() => !!this.appState.currentUser?.isCurator),
      map((allowed) => {
        if (!allowed) {
          this.router.navigate(['/']);
          return false;
        }
        return true;
      }),
    );
  }
}
