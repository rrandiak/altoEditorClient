import { Injectable, OnDestroy } from '@angular/core';
import { interval, of, Subject } from 'rxjs';
import { catchError, switchMap, takeUntil, tap } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { AppService } from '../app.service';
import { AppState } from './app.state';
import { Batch, BatchSearchFilters, BatchState, BatchType } from './batch';

const POLL_INTERVAL_MS = 5000;

@Injectable({ providedIn: 'root' })
export class BatchPollingService implements OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly trigger$ = new Subject<void>();
  private previousStates = new Map<number, BatchState | string>();

  constructor(
    private appService: AppService,
    private appState: AppState,
    private translate: TranslateService,
  ) {}

  ngOnDestroy() {
    this.stop();
  }

  start() {
    this.stop();
    const fetch$ = this.fetchUserBatches().pipe(catchError(() => of({ content: [] })));

    interval(POLL_INTERVAL_MS)
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => fetch$),
      )
      .subscribe((res) => this.checkCompleted(res.content));

    this.trigger$
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => fetch$),
      )
      .subscribe((res) => this.checkCompleted(res.content));

    fetch$.subscribe((res) => {
      res.content.forEach((b) => this.previousStates.set(b.id, b.state));
    });
  }

  stop() {
    this.destroy$.next();
    this.previousStates.clear();
  }

  /** Call after user plans a process to check for completion sooner. */
  triggerCheck() {
    this.trigger$.next();
  }

  private fetchUserBatches() {
    const username = this.appState.currentUser?.username;
    if (!username) {
      return of({ content: [] as Batch[], totalElements: 0 });
    }
    const filters: BatchSearchFilters = { createdBy: username };
    return this.appService.searchBatches(filters, {
      page: 0,
      size: 500,
      sortBy: 'updatedAt',
      sortOrder: 'DESC',
    });
  }

  private checkCompleted(batches: Batch[]) {
    for (const b of batches) {
      const prev = this.previousStates.get(b.id);
      const wasRunning = prev === BatchState.RUNNING || prev === BatchState.PLANNED;
      const isDone = b.state === BatchState.DONE || b.state === BatchState.FAILED;
      if (wasRunning && isDone) {
        this.showCompletionSnackbar(b);
      }
      this.previousStates.set(b.id, b.state);
    }
  }

  private showCompletionSnackbar(b: Batch) {
    const typeKey = `processType.${b.type || BatchType.GENERATE_SINGLE}`;
    const typeLabel = this.translate.instant(typeKey);
    const pid = b.pid || '—';
    const isFailed = b.state === BatchState.FAILED;
    const key = isFailed ? 'message.processFailed' : 'message.processCompleted';
    const msg = this.translate.instant(key, { type: typeLabel, pid });
    this.appService.showSnackBar(msg, isFailed);
  }
}
