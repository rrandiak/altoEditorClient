import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from 'src/app/auth.service';
import { AppService } from 'src/app/app.service';
import { BatchPollingService } from 'src/app/shared/batch-polling.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule],
  templateUrl: './auth.component.html'
})
export class AuthComponent implements OnInit {

  constructor(
    private auth: AuthService,
    private appService: AppService,
    private batchPolling: BatchPollingService,
    private route: ActivatedRoute,
    public router: Router,
  ) {}

  ngOnInit() {
    this.route.queryParamMap.subscribe(params => {
      const code = params.get('code');
      const target = localStorage.getItem('login.url') || '/';
      localStorage.removeItem('login.url');
      this.auth.keycloakAuth(code, (status: number) => {
        if (status == AuthService.AUTH_AUTHORIZED) {
          this.appService.loadSession().pipe(
            tap(() => this.batchPolling.start()),
          ).subscribe({
            next: () => this.router.navigateByUrl(target),
            error: () => this.router.navigateByUrl(target),
          });
        } else if (status == AuthService.AUTH_NOT_AUTHORIZED) {
          this.auth.logout('/login?failure=1');
        } else {
          this.router.navigateByUrl('/login?failure=2');
        }
      });
    });
  }

}
